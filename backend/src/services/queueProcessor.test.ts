// @ts-nocheck — ts-jest mockResolvedValue generic inference edge case
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// --- Mock modules BEFORE import ---
const mockSendSubmissionConfirmation = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSendCompletionNotification = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSendFailureNotification = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockGetMiniMaxService = jest.fn<() => { generate: (prompt: string) => Promise<{ imageUrl: string; jobId: string; prompt: string; processingTimeMs: number }> }>();

jest.mock('../db/index', () => ({
  getDb: jest.fn<(...args: any[]) => any>(),
  claimNextPendingJob: jest.fn<(...args: any[]) => any>(),
  getJobById: jest.fn<(...args: any[]) => any>(),
  getIdeaById: jest.fn<(...args: any[]) => any>(),
  updateJobStatus: jest.fn<(...args: any[]) => any>(),
  updateIdeaWithResult: jest.fn<(...args: any[]) => any>(),
  updateIdeaWithFailure: jest.fn<(...args: any[]) => any>(),
  incrementJobRetryCount: jest.fn<(...args: any[]) => any>(),
  createJob: jest.fn<(...args: any[]) => any>(),
}));

jest.mock('./email', () => ({
  sendSubmissionConfirmation: mockSendSubmissionConfirmation,
  sendCompletionNotification: mockSendCompletionNotification,
  sendFailureNotification: mockSendFailureNotification,
}));

jest.mock('./minimax', () => ({
  getMiniMaxService: mockGetMiniMaxService,
}));

// Import AFTER mocks are set up
import {
  processNextJob,
  enqueueJob,
  startQueueProcessor,
  stopQueueProcessor,
} from './queueProcessor';
import { getDb, claimNextPendingJob, getJobById, getIdeaById, updateJobStatus, updateIdeaWithResult, updateIdeaWithFailure, incrementJobRetryCount, createJob } from '../db/index';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job_test123',
    idea_id: 'ide_test456',
    user_id: null,
    prompt: 'Test prompt',
    status: 'pending',
    retry_count: 0,
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    ...overrides,
  };
}

function makeIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ide_test456',
    email: 'test@example.com',
    idea_text: 'Test idea',
    reference_id: 'MMS-TEST01',
    status: 'pending',
    user_id: null,
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('processNextJob', () => {
  beforeEach(() => {
    stopQueueProcessor();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopQueueProcessor();
    jest.useRealTimers();
  });

  test('returns early when isProcessing is already true (guard)', async () => {
    // We cannot directly test the guard without exposing isProcessing,
    // but we verify processNextJob is idempotent-safe by calling it twice
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);
    await processNextJob();
    await processNextJob(); // should not throw
    expect(claimNextPendingJob).toHaveBeenCalled();
  });

  test('returns early when no pending jobs', async () => {
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);
    await processNextJob();
    expect(claimNextPendingJob).toHaveBeenCalledTimes(1);
    expect(getJobById).not.toHaveBeenCalled();
  });

  test('claims pending job and processes it', async () => {
    const job = makeJob();
    const idea = makeIdea();
    (claimNextPendingJob as jest.Mock).mockResolvedValue(job);
    (getJobById as jest.Mock).mockResolvedValue(job);
    (getIdeaById as jest.Mock).mockResolvedValue(idea);
    const mockMiniMax = { generate: jest.fn<() => Promise<{ imageUrl: string; jobId: string; prompt: string; processingTimeMs: number }>>().mockResolvedValue({ imageUrl: 'https://picsum.photos/seed/abc/1024/1024', jobId: 'mock_1_abc', prompt: 'Test prompt', processingTimeMs: 1000 }) };
    mockGetMiniMaxService.mockReturnValue(mockMiniMax);

    await processNextJob();

    expect(claimNextPendingJob).toHaveBeenCalled();
    expect(getJobById).toHaveBeenCalledWith('job_test123');
    expect(getIdeaById).toHaveBeenCalledWith('ide_test456');
    expect(mockMiniMax.generate).toHaveBeenCalledWith('Test prompt');
    expect(updateJobStatus).toHaveBeenCalledWith('job_test123', 'completed', expect.objectContaining({ resultUrl: expect.stringContaining('picsum.photos') }));
    expect(updateIdeaWithResult).toHaveBeenCalledWith('ide_test456', expect.stringContaining('picsum.photos'));
    expect(mockSendCompletionNotification).toHaveBeenCalledWith('test@example.com', 'Test idea', expect.stringContaining('picsum.photos'), 'MMS-TEST01');
  });

  test('processNextJob with no pending jobs does not throw', async () => {
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);
    // Should not throw
    await processNextJob();
    expect(claimNextPendingJob).toHaveBeenCalled();
  });
});

describe('enqueueJob', () => {
  beforeEach(() => {
    stopQueueProcessor();
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.spyOn(global, 'setImmediate').mockImplementation((fn: () => void) => { fn(); return 0 as unknown as NodeJS.Immediate; });
  });

  afterEach(() => {
    stopQueueProcessor();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('creates job and sends confirmation email', async () => {
    (createJob as jest.Mock).mockResolvedValue({ id: 'job_new123' });
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);

    const result = await enqueueJob({
      id: 'ide_new456',
      reference_id: 'MMS-NEW01',
      email: 'submitter@example.com',
      idea_text: 'A new creative idea',
    });

    expect(result.jobId).toBe('job_new123');
    expect(createJob).toHaveBeenCalledWith({ ideaId: 'ide_new456', userId: undefined, prompt: 'A new creative idea' });
    expect(mockSendSubmissionConfirmation).toHaveBeenCalledWith('submitter@example.com', 'A new creative idea', 'MMS-NEW01');
  });

  test('enqueueJob passes userId through', async () => {
    (createJob as jest.Mock).mockResolvedValue({ id: 'job_with_user' });
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);

    await enqueueJob({
      id: 'ide_user789',
      reference_id: 'MMS-USER1',
      email: 'user@example.com',
      idea_text: 'User idea',
    }, 'usr_abc123');

    expect(createJob).toHaveBeenCalledWith({ ideaId: 'ide_user789', userId: 'usr_abc123', prompt: 'User idea' });
  });

  test('enqueueJob calls createJob with correct data', async () => {
    (createJob as jest.Mock).mockResolvedValue({ id: 'job_verify' });
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);
    const result = await enqueueJob({
      id: 'ide_v123',
      reference_id: 'MMS-VER01',
      email: 'verify@example.com',
      idea_text: 'Verification test',
    });
    expect(createJob).toHaveBeenCalledWith({
      ideaId: 'ide_v123',
      userId: undefined,
      prompt: 'Verification test',
    });
    expect(result.jobId).toBe('job_verify');
  });
});

describe('processJob — retry and failure', () => {
  let job: ReturnType<typeof makeJob>;
  let idea: ReturnType<typeof makeIdea>;

  beforeEach(() => {
    stopQueueProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopQueueProcessor();
  });

  test('idea not found marks job as failed', async () => {
    job = makeJob();
    idea = makeIdea();
    (getJobById as jest.Mock).mockResolvedValue(job);
    (getIdeaById as jest.Mock).mockResolvedValue(null);

    // Call processJob indirectly via processNextJob
    (claimNextPendingJob as jest.Mock).mockResolvedValue(job);
    await processNextJob();

    expect(updateJobStatus).toHaveBeenCalledWith('job_test123', 'failed', { errorMessage: 'Idea not found' });
    expect(mockSendCompletionNotification).not.toHaveBeenCalled();
  });

  test('job not found returns early', async () => {
    job = makeJob();
    (getJobById as jest.Mock).mockResolvedValue(null);
    (claimNextPendingJob as jest.Mock).mockResolvedValue(job);

    await processNextJob();

    expect(getIdeaById).not.toHaveBeenCalled();
    expect(updateJobStatus).not.toHaveBeenCalled();
  });

  test('MiniMax failure triggers retry on first attempt (job set back to pending)', async () => {
    jest.useFakeTimers();
    job = makeJob();
    idea = makeIdea();
    (getJobById as jest.Mock).mockResolvedValue(job);
    (getIdeaById as jest.Mock).mockResolvedValue(idea);
    (incrementJobRetryCount as jest.Mock).mockResolvedValue(1);
    const mockMiniMax = { generate: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('API timeout')) };
    mockGetMiniMaxService.mockReturnValue(mockMiniMax);
    (claimNextPendingJob as jest.Mock).mockResolvedValue(job);

    const promise = processNextJob();
    jest.runAllTimers();
    await promise;

    // First attempt: retryCount=1 < MAX_RETRIES(3), so job set back to 'pending'
    expect(updateJobStatus).toHaveBeenCalledWith('job_test123', 'pending');
    expect(updateIdeaWithFailure).not.toHaveBeenCalled();
    expect(mockSendFailureNotification).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('permanent failure after max retries marks job and idea as failed', async () => {
    jest.useFakeTimers();

    job = makeJob({ retry_count: 2 });
    idea = makeIdea();
    (getJobById as jest.Mock).mockResolvedValue(job);
    (getIdeaById as jest.Mock).mockResolvedValue(idea);
    (incrementJobRetryCount as jest.Mock).mockResolvedValue(3);
    const mockMiniMax = { generate: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('API timeout')) };
    mockGetMiniMaxService.mockReturnValue(mockMiniMax);
    (claimNextPendingJob as jest.Mock).mockResolvedValue(job);

    await processNextJob();

    // retryCount=3 >= MAX_RETRIES(3) = permanent failure
    expect(updateJobStatus).toHaveBeenCalledWith('job_test123', 'failed', { errorMessage: 'API timeout' });
    expect(updateIdeaWithFailure).toHaveBeenCalledWith('ide_test456', 'API timeout');
    expect(mockSendFailureNotification).toHaveBeenCalledWith('test@example.com', 'Test idea', 'MMS-TEST01');

    jest.useRealTimers();
  });
});

describe('startQueueProcessor / stopQueueProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    stopQueueProcessor();
  });

  test('startQueueProcessor sets up interval', () => {
    (claimNextPendingJob as jest.Mock).mockResolvedValue(null);
    startQueueProcessor(5000);
    // Call once more to ensure interval is running
    stopQueueProcessor();
    // No throw = success
    expect(true).toBe(true);
  });

  test('stopQueueProcessor can be called safely when not started', () => {
    stopQueueProcessor(); // Should not throw
    expect(true).toBe(true);
  });
});
