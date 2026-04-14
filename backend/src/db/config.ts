'use strict';
export {}; // Force module scope

// Database configuration — supports SQLite (default) and Postgres (Phase 5+)
// Set DB_TYPE=postgres and DATABASE_URL to enable Postgres.

const logger = require('../logger');

export type DbType = 'sqlite' | 'postgres';

export interface DbConfig {
  type: DbType;
  // SQLite
  path?: string;
  // Postgres
  url?: string;
}

function detectConfig(): DbConfig {
  const type = (process.env.DB_TYPE || 'sqlite').toLowerCase() as DbType;

  if (type === 'postgres') {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('[DB] DB_TYPE=postgres requires DATABASE_URL environment variable');
    }
    logger.info('[DB] Configured for PostgreSQL', { url: url.replace(/\/\/.*:.*@/, '//***:***@') });
    return { type: 'postgres', url };
  }

  if (type === 'sqlite') {
    const path = process.env.DB_PATH || process.env.DATABASE_URL || './db/app.db';
    logger.info('[DB] Configured for SQLite', { path });
    return { type: 'sqlite', path };
  }

  throw new Error(`[DB] Unknown DB_TYPE: ${type}. Valid options: sqlite, postgres`);
}

let _config: DbConfig | null = null;

export function getDbConfig(): DbConfig {
  if (!_config) {
    _config = detectConfig();
  }
  return _config;
}
