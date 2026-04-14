import path from 'path';
import fs from 'fs';

// Set DB_PATH BEFORE importing the module to ensure isolated DB per test
const testDbDir = path.join(__dirname, '..');
const testDbPath = path.join(testDbDir, 'test_temp.db');

// Set env BEFORE any require
process.env.DB_PATH = testDbPath;

// Clean up any existing test DB files
for (const suffix of ['', '-wal', '-shm']) {
  try { fs.unlinkSync(testDbPath + suffix); } catch { /* ignore */ }
}

import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import {
  initDb, createUser, getUserById, getUserByEmail,
  createIdea, getIdeaById,
  createJob, getJobById, updateJobStatus, claimNextPendingJob,
  updateIdeaWithResult, updateIdeaWithFailure
} from './database';

beforeEach(() => {
  // Clean DB state between tests by deleting and reinitializing
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(testDbPath + suffix); } catch { /* ignore */ }
  }
  initDb();
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(testDbPath + suffix); } catch { /* ignore */ }
  }
});

describe('User CRUD', () => {
  test('createUser and getUserById', () => {
    const { id } = createUser({ email: 'test@example.com', passwordHash: 'hashed_pw' });
    expect(id).toMatch(/^usr_/);
    const user = getUserById(id);
    expect(user).not.toBeNull();
    expect(user!.email).toBe('test@example.com');
    expect(user!.role).toBe('user');
    expect(user!.email_verified).toBe(0);
  });

  test('createUser with admin role', () => {
    const { id } = createUser({ email: 'admin@example.com', passwordHash: 'hash', role: 'admin' });
    const user = getUserById(id);
    expect(user!.role).toBe('admin');
  });

  test('getUserByEmail finds user', () => {
    const { id } = createUser({ email: 'findme@example.com', passwordHash: 'hash' });
    const user = getUserByEmail('findme@example.com');
    expect(user).not.toBeNull();
    expect(user!.id).toBe(id);
  });

  test('getUserByEmail returns null for non-existent', () => {
    expect(getUserByEmail('nonexistent@example.com')).toBeNull();
  });

  test('getUserById returns null for non-existent', () => {
    expect(getUserById('usr_nonexistent')).toBeNull();
  });
});

describe('Idea CRUD', () => {
  test('createIdea generates id and referenceId', () => {
    const { id, referenceId } = createIdea({ email: 'idea@example.com', idea_text: 'A great idea' });
    expect(id).toMatch(/^ide_/);
    expect(referenceId).toMatch(/^MMS-[A-Z0-9]{6}$/);
  });

  test('getIdeaById retrieves idea', () => {
    const { id } = createIdea({ email: 'find@example.com', idea_text: 'Another idea' });
    const idea = getIdeaById(id);
    expect(idea).not.toBeNull();
    expect(idea!.idea_text).toBe('Another idea');
    expect(idea!.status).toBe('pending');
  });

  test('getIdeaById returns null for non-existent', () => {
    expect(getIdeaById('ide_nonexistent')).toBeNull();
  });
});

describe('Job CRUD', () => {
  test('createJob and getJobById', () => {
    const { id: ideaId } = createIdea({ email: 'job@example.com', idea_text: 'Job test' });
    const { id: jobId } = createJob({ ideaId, prompt: 'Job test prompt' });
    expect(jobId).toMatch(/^job_/);
    const job = getJobById(jobId);
    expect(job).not.toBeNull();
    expect(job!.idea_id).toBe(ideaId);
    expect(job!.status).toBe('pending');
    expect(job!.retry_count).toBe(0);
  });

  test.skip('claimNextPendingJob atomically claims pending jobs', () => {
    const { id: ideaId } = createIdea({ email: 'claim@example.com', idea_text: 'Claim test' });
    const { id: jobId1 } = createJob({ ideaId, prompt: 'Claim prompt 1' });
    const { id: jobId2 } = createJob({ ideaId, prompt: 'Claim prompt 2' });

    const claimed = claimNextPendingJob();
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe('processing');
    // The claimed job must be one of the two we just created
    expect([jobId1, jobId2]).toContain(claimed!.id);

    const claimed2 = claimNextPendingJob();
    expect(claimed2).not.toBeNull();
    expect(claimed2!.id).not.toBe(claimed!.id);
    expect([jobId1, jobId2]).toContain(claimed2!.id);

    const claimed3 = claimNextPendingJob();
    expect(claimed3).toBeNull();
  });

  test('updateJobStatus updates status and extras', () => {
    const { id: ideaId } = createIdea({ email: 'status@example.com', idea_text: 'Status test' });
    const { id: jobId } = createJob({ ideaId, prompt: 'Status prompt' });
    updateJobStatus(jobId, 'completed', { resultUrl: 'https://example.com/image.png' });
    const job = getJobById(jobId);
    expect(job!.status).toBe('completed');
    expect(job!.result_url).toBe('https://example.com/image.png');
  });

  test('updateIdeaWithResult marks idea as completed', () => {
    const { id } = createIdea({ email: 'result@example.com', idea_text: 'Result test' });
    updateIdeaWithResult(id, 'https://cdn.example.com/result.png');
    const idea = getIdeaById(id);
    expect(idea!.status).toBe('completed');
    expect(idea!.result_url).toBe('https://cdn.example.com/result.png');
  });

  test('updateIdeaWithFailure marks idea as failed', () => {
    const { id } = createIdea({ email: 'fail@example.com', idea_text: 'Fail test' });
    updateIdeaWithFailure(id, 'MiniMax API timeout');
    const idea = getIdeaById(id);
    expect(idea!.status).toBe('failed');
    expect(idea!.error_message).toBe('MiniMax API timeout');
  });
});
