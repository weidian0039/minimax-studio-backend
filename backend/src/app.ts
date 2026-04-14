'use strict';
const logger = require('./logger');

export {}; // Force module scope

// This module creates the Express app WITHOUT starting the server.
// Used by: server.ts (production) and supertest integration tests.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const os = require('os');

const dbIndex = require('./db/index');
const { default: ideasRouter } = require('./routes/ideas');
const { default: authRouter } = require('./routes/auth');
const { requestHandler, errorHandler } = require('./monitoring');
const { globalLimiter } = require('./middleware/rateLimit');
const { getQueueMode } = require('./queue');
const { getBullMQHealth } = require('./queue/bullmqQueue');
const { isBullBoardReady, createBullBoardRouter } = require('./bullboard');

const NODE_ENV = process.env.NODE_ENV || 'development';

function createApp(): Express.Application {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  const stagingOrigins = [
    'https://staging.minimax-studio.com',
    'https://pr-*.staging.minimax-studio.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const productionOrigins = [
    'https://minimax-studio.com',
  ];
  const allowedOrigins = NODE_ENV === 'production' ? productionOrigins : stagingOrigins;

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      const isAllowed = allowedOrigins.some((o) => {
        if (o.includes('*')) {
          const regex = new RegExp('^' + o.replace(/\*/g, '[^/]+') + '$');
          return regex.test(origin);
        }
        return o === origin;
      });
      if (isAllowed) { callback(null, true); }
      else { callback(new Error('Origin not allowed')); }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  app.use(requestHandler());

  if (NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  app.get('/health', (_req, res) => {
    const memUsed = Math.round(((os.totalmem() - os.freemem()) / 1024 / 1024) * 100) / 100;
    const memTotal = Math.round((os.totalmem() / 1024 / 1024) * 100) / 100;
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        usedMB: memUsed,
        totalMB: memTotal,
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 10000) / 100,
      },
      checks: {
        database: { type: dbIndex.getDbType(), status: 'ok' },
        queue: {
          mode: getQueueMode(),
          status: 'ok',
          ...(getQueueMode() === 'bullmq' ? { redis: getBullMQHealth().connected ? 'connected' : 'disconnected' } : {}),
        },
        rateLimit: { status: 'configured' },
        bullBoard: { active: isBullBoardReady(), url: isBullBoardReady() ? '/admin/queues' : null },
      },
    });
  });

// Bull Board queue dashboard (only available when QUEUE_TYPE=bullmq + Redis reachable)
  const bullBoardRouter = createBullBoardRouter();
  if (bullBoardRouter) {
    app.use('/admin/queues', bullBoardRouter);
  }

  // Global rate limiter on all API routes
  app.use('/api', globalLimiter);
  // Stricter rate limits on auth routes (login + register)
  app.use('/api/auth', authRouter);
  app.use('/api/ideas', ideasRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'not_found', message: 'Endpoint not found' });
  });

  app.use(errorHandler());
  app.use((err, _req, res, _next) => {
    logger.error('[App] Unhandled error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'An unexpected error occurred.' });
  });

  return app;
}

module.exports = { createApp };
