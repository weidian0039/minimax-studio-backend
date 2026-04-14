'use strict';
export {}; // Force module scope

// Bull Board — BullMQ monitoring dashboard
// Mounted at /admin/queues, protected by admin role check.
// Only active when QUEUE_TYPE=bullmq and Redis is reachable.

import { Request, Response, NextFunction } from 'express';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { isBullMQReady, getBullMQQueueName } from './queue/bullmqQueue';

let _router: ReturnType<ExpressAdapter['getRouter']> | null = null;

function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'forbidden', message: 'Admin access required' });
    return;
  }
  next();
}

export function createBullBoardRouter(): ReturnType<ExpressAdapter['getRouter']> | null {
  if (!isBullMQReady()) {
    return null;
  }

  try {
    const { Queue } = require('bullmq');
    const IORedis = require('ioredis');

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const queueName = getBullMQQueueName();
    const queue = new Queue(queueName, { connection });

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [queue],
      serverAdapter,
    });

    // Apply admin auth middleware before Bull Board routes
    const router = serverAdapter.getRouter();
    router.use(adminAuthMiddleware);

    _router = router;
    return router;
  } catch (err) {
    const logger = require('./logger');
    logger.warn('[BullBoard] Failed to create board', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export function isBullBoardReady(): boolean {
  return _router !== null;
}
