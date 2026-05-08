'use strict';
const logger = require('./logger');

export {}; // Force module scope

// Standalone BullMQ worker entry point for Railway / Docker worker container.
// QUEUE_TYPE is always 'bullmq' in this process — no in-process fallback.

require('dotenv').config();
const { initMonitoring, setupGlobalErrorHandlers } = require('./monitoring');
initMonitoring();
setupGlobalErrorHandlers();

// Force bullmq mode — this process is the queue worker only
process.env.QUEUE_TYPE = 'bullmq';

const dbIndex = require('./db/index');
const bullmq = require('./queue/bullmqQueue');

async function start(): Promise<void> {
  logger.info('[Worker] Initializing...');

  // Initialize database connection
  await dbIndex.initDb();
  logger.info('[Worker] Database initialized');

  // Start BullMQ worker
  const success = await bullmq.initBullMQ();
  if (!success) {
    logger.error('[Worker] BullMQ init failed — exiting');
    process.exit(1);
  }

  logger.info('[Worker] BullMQ worker active — waiting for jobs');
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`[Worker] ${signal} received. Shutting down...`);
  try {
    await bullmq.closeBullMQ();
    await dbIndex.closeDb();
    logger.info('[Worker] Graceful shutdown complete');
  } catch (err) {
    logger.error('[Worker] Shutdown error', { error: err instanceof Error ? err.message : String(err) });
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  logger.error('[Worker] Fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
