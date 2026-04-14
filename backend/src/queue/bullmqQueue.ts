'use strict';
export {}; // Force module scope

const logger = require('../logger');

// BullMQ v5 queue implementation.
// Activated when QUEUE_TYPE=bullmq and REDIS_URL is reachable.
// Falls back gracefully to in-process queue if Redis is unavailable.

const QUEUE_NAME = 'minimax-ideas';
const MAX_ATTEMPTS = 3;

interface IdeaJobData {
  ideaId: string;
  jobId: string;
  email: string;
  ideaText: string;
  referenceId: string;
  userId?: string;
}

let _queue: any = null;
let _worker: any = null;
let _redisConnection: any = null;
let _workerConnection: any = null;

async function processIdeaJob(job: any): Promise<void> {
  const data: IdeaJobData = job.data;
  logger.info(`[BullMQ] Processing idea ${data.ideaId}`, { jobId: data.jobId, bullId: job.id });

  const db = require('../db/index');
  const email = require('../services/email');
  const { getMiniMaxService } = require('../services/minimax');

  const idea = await db.getIdeaById(data.ideaId);
  if (!idea) throw new Error(`Idea ${data.ideaId} not found in DB`);

  const miniMax = getMiniMaxService();
  const result = await miniMax.generate(data.ideaText);

  await db.updateJobStatus(data.jobId, 'completed', {
    resultUrl: result.imageUrl,
    processedAt: new Date().toISOString(),
  });
  await db.updateIdeaWithResult(data.ideaId, result.imageUrl);

  await email.sendCompletionNotification(data.email, data.ideaText, result.imageUrl, data.referenceId);
  logger.info(`[BullMQ] Idea ${data.ideaId} completed`, { imageUrl: result.imageUrl });
}

export async function initBullMQ(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    const { Queue, Worker } = require('bullmq');
    const IORedis = require('ioredis');

    // Test Redis reachability before committing
    const probe = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });

    try {
      await probe.connect();
      await probe.ping();
      await probe.quit();
    } catch (probeErr) {
      const msg = probeErr instanceof Error ? probeErr.message : String(probeErr);
      logger.warn('[BullMQ] Redis not reachable, skipping BullMQ init', { url: redisUrl, error: msg });
      return false;
    }

    // Real connections: maxRetriesPerRequest: null is required by BullMQ
    _redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    _workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    _queue = new Queue(QUEUE_NAME, {
      connection: _redisConnection,
      defaultJobOptions: {
        attempts: MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    _worker = new Worker(QUEUE_NAME, processIdeaJob, {
      connection: _workerConnection,
      concurrency: 2,
    });

    _worker.on('completed', (job: any) => {
      logger.info('[BullMQ] Worker job completed', { bullId: job.id });
    });

    _worker.on('failed', (job: any, err: Error) => {
      logger.error('[BullMQ] Worker job failed', {
        bullId: job?.id,
        attempts: job?.attemptsMade,
        error: err.message,
      });
    });

    _worker.on('error', (err: Error) => {
      logger.error('[BullMQ] Worker error', { error: err.message });
    });

    logger.info('[BullMQ] Initialized', { queue: QUEUE_NAME, redisUrl: redisUrl.replace(/:\/\/.*@/, '://***@') });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('[BullMQ] Init failed, will use in-process queue', { error: msg });
    return false;
  }
}

export async function enqueueToBullMQ(
  idea: { id: string; reference_id: string; email: string; idea_text: string },
  jobId: string,
  userId?: string
): Promise<void> {
  if (!_queue) throw new Error('[BullMQ] Queue not initialized');

  const data: IdeaJobData = {
    ideaId: idea.id,
    jobId,
    email: idea.email,
    ideaText: idea.idea_text,
    referenceId: idea.reference_id,
    userId,
  };

  await _queue.add('process-idea', data, {
    jobId: `idea-${idea.id}`,
  });

  logger.info('[BullMQ] Enqueued idea', { ideaId: idea.id, jobId });
}

export async function closeBullMQ(): Promise<void> {
  try {
    if (_worker) { await _worker.close(); _worker = null; }
    if (_queue) { await _queue.close(); _queue = null; }
    if (_redisConnection) { await _redisConnection.quit(); _redisConnection = null; }
    if (_workerConnection) { await _workerConnection.quit(); _workerConnection = null; }
    logger.info('[BullMQ] Connections closed');
  } catch (err) {
    logger.warn('[BullMQ] Error during close', { error: err instanceof Error ? err.message : String(err) });
  }
}

export function isBullMQReady(): boolean {
  return _queue !== null && _worker !== null;
}

// Call at request time, not import time — BullMQ connection is async
export function getBullMQHealth(): { connected: boolean } {
  return { connected: isBullMQReady() };
}

export function getBullMQQueueName(): string {
  return QUEUE_NAME;
}
