'use strict';
export {}; // Force module scope

const logger = require('../logger');

function lazyGetMiniMaxService() {
  try { return require('./minimax').getMiniMaxService; } catch { return null; }
}
function lazyGetEmailService() {
  try { return require('./email'); } catch { return null; }
}
function lazyGetDb() {
  try { return require('../db/index'); } catch { return null; }
}

const MAX_RETRIES = 3;
const BACKOFF_DELAYS_MS = [10000, 30000, 60000];

let processorInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

export function startQueueProcessor(intervalMs = 5000): void {
  logger.info(`[QueueProcessor] Started with ${intervalMs}ms poll interval`);
  processNextJob().catch((err) => logger.error('[QueueProcessor] Init error', { error: err instanceof Error ? err.message : String(err) }));
  processorInterval = setInterval(() => {
    if (!isProcessing) processNextJob().catch((e) => logger.error('[QueueProcessor] Interval error', { error: e instanceof Error ? e.message : String(e) }));
  }, intervalMs);
}

export function stopQueueProcessor(): void {
  if (processorInterval) { clearInterval(processorInterval); processorInterval = null; logger.info('[QueueProcessor] Stopped'); }
}

export async function processNextJob(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const db = lazyGetDb();
    if (!db) { logger.error('[QueueProcessor] DB module not available'); return; }
    const job = await db.claimNextPendingJob();
    if (!job) return;
    logger.info(`[QueueProcessor] Processing job ${job.id} (idea: ${job.idea_id})`);
    await processJob(job.id);
  } catch (err) {
    logger.error('[QueueProcessor] Error', { error: err instanceof Error ? err.message : String(err) });
  } finally {
    isProcessing = false;
  }
}

async function processJob(jobId: string): Promise<void> {
  const db = lazyGetDb(); const email = lazyGetEmailService(); const miniMaxGetter = lazyGetMiniMaxService();
  if (!db || !email || !miniMaxGetter) { logger.error('[QueueProcessor] Modules unavailable'); return; }

  const job = await db.getJobById(jobId);
  if (!job) { logger.error(`[QueueProcessor] Job ${jobId} not found`); return; }
  const idea = await db.getIdeaById(job.idea_id);
  if (!idea) { logger.error(`[QueueProcessor] Idea ${job.idea_id} not found`); await db.updateJobStatus(jobId, 'failed', { errorMessage: 'Idea not found' }); return; }

  try {
    const miniMax = miniMaxGetter();
    const result = await miniMax.generate(job.prompt);
    await db.updateJobStatus(jobId, 'completed', { resultUrl: result.imageUrl, processedAt: new Date().toISOString() });
    await db.updateIdeaWithResult(idea.id, result.imageUrl);
    logger.info(`[QueueProcessor] Job ${jobId} completed: ${result.imageUrl}`);
    await email.sendCompletionNotification(idea.email, idea.idea_text, result.imageUrl, idea.reference_id);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const retryCount = await db.incrementJobRetryCount(jobId);
    if (retryCount < MAX_RETRIES) {
      const delay = BACKOFF_DELAYS_MS[retryCount - 1] || BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      logger.info(`[QueueProcessor] Job ${jobId} retry ${retryCount}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s`);
      await db.updateJobStatus(jobId, 'pending');
      setTimeout(() => { if (!isProcessing) processNextJob().catch((e) => logger.error('[QueueProcessor] Retry error', { error: e instanceof Error ? e.message : String(e) })); }, delay + Math.random() * 2000);
    } else {
      await db.updateJobStatus(jobId, 'failed', { errorMessage });
      await db.updateIdeaWithFailure(idea.id, errorMessage);
      logger.info(`[QueueProcessor] Job ${jobId} failed permanently`);
      await email.sendFailureNotification(idea.email, idea.idea_text, idea.reference_id);
    }
  }
}

export async function enqueueJob(
  idea: { id: string; reference_id: string; email: string; idea_text: string },
  userId?: string
): Promise<{ jobId: string }> {
  const db = lazyGetDb(); const emailSvc = lazyGetEmailService();
  if (!db) throw new Error('Database not available');
  const { id: jobId } = await db.createJob({ ideaId: idea.id, userId, prompt: idea.idea_text });
  logger.info(`[QueueProcessor] Enqueued job ${jobId} for idea ${idea.id}`);
  if (emailSvc) await emailSvc.sendSubmissionConfirmation(idea.email, idea.idea_text, idea.reference_id);
  setImmediate(() => { processNextJob().catch((err) => logger.error('[QueueProcessor] Immediate error', { error: err instanceof Error ? err.message : String(err) })); });
  return { jobId };
}
