'use strict';
const logger = require('./logger');

export {}; // Force module scope

// Queue adapter:
//   QUEUE_TYPE=in-process  (default) → in-process polling via queueProcessor
//   QUEUE_TYPE=bullmq               → BullMQ + Redis (graceful fallback to in-process)

const qp = require('./services/queueProcessor');
const bullmq = require('./queue/bullmqQueue');

const pendingJobs: Array<{ ideaId: string; userId?: string; prompt: string }> = [];

const QUEUE_TYPE = (process.env.QUEUE_TYPE || 'in-process').toLowerCase();
let _bullmqActive = false;

interface EnqueueJobParams {
  id: string;
  reference_id: string;
  email: string;
  idea_text: string;
}

export async function enqueueJob(job: EnqueueJobParams, userId: string | undefined): Promise<void> {
  const { id, reference_id, email, idea_text } = job;
  try {
    // Always create the DB job record + send confirmation email
    const { jobId } = await qp.enqueueJob({ id, reference_id, email, idea_text }, userId);
    logger.info(`[Queue] Enqueued idea ${id}`, { jobId, mode: _bullmqActive ? 'bullmq' : 'in-process' });

    // If BullMQ is active, add to Redis queue so worker picks it up.
    // The in-process setImmediate from qp.enqueueJob will see status='processing'
    // once the BullMQ worker claims it, and gracefully noop.
    if (_bullmqActive) {
      await bullmq.enqueueToBullMQ({ id, reference_id, email, idea_text }, jobId, userId);
    }

    pendingJobs.push({ ideaId: id, userId, prompt: idea_text });
  } catch (err) {
    logger.error('[Queue] enqueue failed', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export function drainQueue(): void {
  pendingJobs.length = 0;
  logger.info('[Queue] Stub drained');
}

export async function startQueueProcessor(intervalMs = 5000): Promise<void> {
  if (QUEUE_TYPE === 'bullmq') {
    const success: boolean = await bullmq.initBullMQ();
    if (success) {
      _bullmqActive = true;
      logger.info('[Queue] BullMQ mode active — in-process interval disabled');
      return;
    }
    logger.warn('[Queue] BullMQ unavailable — falling back to in-process polling');
  }
  // In-process mode (default or BullMQ fallback)
  _bullmqActive = false;
  qp.startQueueProcessor(intervalMs);
}

export async function stopQueueProcessor(): Promise<void> {
  if (_bullmqActive) {
    await bullmq.closeBullMQ();
    _bullmqActive = false;
  } else {
    qp.stopQueueProcessor();
  }
}

export function getQueueMode(): string {
  return _bullmqActive ? 'bullmq' : 'in-process';
}
