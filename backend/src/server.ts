'use strict';
const logger = require('./logger');

export {}; // Force module scope

require('dotenv').config();
const { initMonitoring, setupGlobalErrorHandlers } = require('./monitoring');
initMonitoring();
setupGlobalErrorHandlers();

const http = require('http');
const dbIndex = require('./db/index');
const { startQueueProcessor, stopQueueProcessor } = require('./queue');
const { createApp } = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();

Promise.resolve(dbIndex.initDb()).then(() => {
  logger.info('[Server] Database initialized');
}).catch((err) => {
  logger.error('[Server] DB init failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

if (NODE_ENV !== 'test') {
  const queuePollInterval = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '5000', 10);
  Promise.resolve(startQueueProcessor(queuePollInterval)).catch((err) => {
    logger.error('[Server] Queue processor start failed', { error: err instanceof Error ? err.message : String(err) });
  });
}

const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`[Server] MiniMax Studio API running on http://localhost:${PORT}`);
  logger.info(`[Server] Environment: ${NODE_ENV}`);
});

function shutdown(signal) {
  logger.info(`\n[Server] ${signal} received. Shutting down...`);
  Promise.resolve(stopQueueProcessor()).catch((err) => {
    logger.warn('[Server] Queue stop error', { error: err instanceof Error ? err.message : String(err) });
  }).finally(() => {
    server.close(() => {
      logger.info('[Server] HTTP server closed');
      Promise.resolve(dbIndex.closeDb()).finally(() => {
        logger.info('[Server] DB closed');
        process.exit(0);
      });
    });
  });
  setTimeout(() => { logger.error('[Server] Forced exit'); process.exit(1); }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
