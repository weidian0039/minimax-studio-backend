'use strict';
export {}; // Force module scope
const os = require('os');

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    usedMB: Math.round(((total - free) / 1024 / 1024) * 100) / 100,
    totalMB: Math.round((total / 1024 / 1024) * 100) / 100,
    usagePercent: Math.round(((total - free) / total) * 10000) / 100,
  };
}

async function checkDatabase(db: any) {
  const start = Date.now();
  try {
    await db.raw('SELECT 1');
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkRedis(redis: any) {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    return pong === 'PONG'
      ? { status: 'ok', latencyMs: Date.now() - start }
      : { status: 'degraded', error: `Unexpected: ${pong}` };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

async function buildHealthResponse(deps: { db?: any; redis?: any }, version?: string) {
  const { db, redis } = deps;
  const [dbHealth, redisHealth] = await Promise.all([
    db ? checkDatabase(db) : { status: 'not_configured' },
    redis ? checkRedis(redis) : { status: 'not_configured' },
  ]);
  const memory = getMemoryUsage();
  const overallStatus =
    dbHealth.status === 'error' || redisHealth.status === 'error'
      ? 'degraded'
      : 'ok';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: version || '1.0.0',
    memory,
    checks: { database: dbHealth, redis: redisHealth },
  };
}

module.exports = { getMemoryUsage, checkDatabase, checkRedis, buildHealthResponse };
