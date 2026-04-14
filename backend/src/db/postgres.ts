'use strict';
export {}; // Force module scope

// PostgreSQL driver — same API surface as database.ts, but async.
// Activated when DB_TYPE=postgres and DATABASE_URL is set.
// All functions return Promises (unlike the synchronous SQLite driver).

import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

const logger = require('../logger');

export type IdeaStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  email: string;
  idea_text: string;
  reference_id: string;
  status: IdeaStatus;
  user_id: string | null;
  result_url: string | null;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface Job {
  id: string;
  idea_id: string;
  user_id: string | null;
  status: IdeaStatus;
  prompt: string;
  result_url: string | null;
  error_message: string | null;
  retry_count: number;
  minmax_job_id: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

// ────────────────────────────────────────────────────────────────────────────────
// Connection pool singleton
// ────────────────────────────────────────────────────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('[DB-PG] DATABASE_URL environment variable is required when DB_TYPE=postgres');
    }
    _pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    _pool.on('error', (err: Error) => {
      logger.error('[DB-PG] Pool error', { error: err.message });
    });
    logger.info('[DB-PG] Pool created', {
      url: connectionString.replace(/\/\/.*:.*@/, '//***:***@'),
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info('[DB-PG] Pool closed');
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Schema initialization
// ────────────────────────────────────────────────────────────────────────────────

const SCHEMA_PG = `
CREATE TABLE IF NOT EXISTS users (
  id              TEXT        PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS ideas (
  id            TEXT        PRIMARY KEY,
  email         TEXT        NOT NULL,
  idea_text     TEXT        NOT NULL,
  reference_id  TEXT        UNIQUE NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  user_id       TEXT,
  result_url    TEXT,
  retry_count   INTEGER     NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ideas_email        ON ideas(email);
CREATE INDEX IF NOT EXISTS idx_ideas_reference_id ON ideas(reference_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status       ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id      ON ideas(user_id);

CREATE TABLE IF NOT EXISTS jobs (
  id             TEXT        PRIMARY KEY,
  idea_id        TEXT        NOT NULL,
  user_id        TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt         TEXT        NOT NULL,
  result_url     TEXT,
  error_message  TEXT,
  retry_count    INTEGER     NOT NULL DEFAULT 0,
  minmax_job_id  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_idea_id     ON jobs(idea_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id     ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs(created_at DESC);
`;

export async function initDb(): Promise<Pool> {
  const pool = getPool();
  await pool.query(SCHEMA_PG);
  logger.info('[DB-PG] Schema initialized');
  return pool;
}

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────

function makeId(prefix: string, length: number): string {
  return prefix + randomUUID().replace(/-/g, '').slice(0, length);
}

function generateReferenceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'MMS-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

function toIso(d: Date | string | null): string | null {
  if (d === null) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

function rowToIdea(row: any): Idea {
  return {
    ...row,
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at) ?? '',
    processed_at: toIso(row.processed_at),
  };
}

function rowToUser(row: any): User {
  return {
    ...row,
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at) ?? '',
  };
}

function rowToJob(row: any): Job {
  return {
    ...row,
    created_at: toIso(row.created_at) ?? '',
    updated_at: toIso(row.updated_at) ?? '',
    processed_at: toIso(row.processed_at),
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// IDEAS
// ────────────────────────────────────────────────────────────────────────────────

export async function createIdea(
  data: { email: string; idea_text: string; userId?: string }
): Promise<{ id: string; referenceId: string }> {
  const pool = getPool();
  const id = makeId('ide_', 16);
  const referenceId = generateReferenceId();
  const userId = data.userId !== undefined ? data.userId : null;
  await pool.query(
    `INSERT INTO ideas (id, email, idea_text, reference_id, status, user_id)
     VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [id, data.email, data.idea_text, referenceId, userId]
  );
  return { id, referenceId };
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM ideas WHERE id = $1', [id]);
  return rows.length > 0 ? rowToIdea(rows[0]) : null;
}

export async function getIdeaByReferenceId(ref: string): Promise<Idea | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM ideas WHERE reference_id = $1', [ref]);
  return rows.length > 0 ? rowToIdea(rows[0]) : null;
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus,
  extras: { processed_at?: string } = {}
): Promise<void> {
  const pool = getPool();
  const fields = ['status = $1', 'updated_at = NOW()'];
  const values: (string | null)[] = [status];
  if (extras.processed_at) {
    fields.push(`processed_at = $${values.length + 1}`);
    values.push(extras.processed_at);
  }
  values.push(id);
  await pool.query(
    `UPDATE ideas SET ${fields.join(', ')} WHERE id = $${values.length}`,
    values
  );
}

export async function updateIdeaWithResult(id: string, resultUrl: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE ideas SET status = 'completed', result_url = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [resultUrl, id]
  );
}

export async function updateIdeaWithFailure(id: string, errorMessage: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE ideas SET status = 'failed', error_message = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [errorMessage, id]
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// USERS
// ────────────────────────────────────────────────────────────────────────────────

export async function createUser(
  data: { email: string; passwordHash: string; role?: string }
): Promise<{ id: string }> {
  const pool = getPool();
  const id = makeId('usr_', 16);
  const role = data.role ?? 'user';
  await pool.query(
    'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [id, data.email, data.passwordHash, role]
  );
  return { id };
}

export async function getUserById(id: string): Promise<User | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

export async function updateUserEmailVerified(id: string, verified: boolean): Promise<void> {
  const pool = getPool();
  await pool.query(
    'UPDATE users SET email_verified = $1, updated_at = NOW() WHERE id = $2',
    [verified, id]
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// JOBS
// ────────────────────────────────────────────────────────────────────────────────

export async function createJob(
  data: { ideaId: string; userId?: string; prompt: string }
): Promise<{ id: string }> {
  const pool = getPool();
  const id = makeId('job_', 16);
  await pool.query(
    `INSERT INTO jobs (id, idea_id, user_id, prompt, status) VALUES ($1, $2, $3, $4, 'pending')`,
    [id, data.ideaId, data.userId ?? null, data.prompt]
  );
  return { id };
}

export async function getJobById(id: string): Promise<Job | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
  return rows.length > 0 ? rowToJob(rows[0]) : null;
}

export async function getJobByIdeaId(ideaId: string): Promise<Job | null> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM jobs WHERE idea_id = $1', [ideaId]);
  return rows.length > 0 ? rowToJob(rows[0]) : null;
}

export async function getJobsByUserId(userId: string, limit = 50): Promise<Job[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows.map(rowToJob);
}

export async function updateJobStatus(
  id: string,
  status: IdeaStatus,
  extras: { resultUrl?: string; errorMessage?: string; processedAt?: string } = {}
): Promise<void> {
  const pool = getPool();
  const fields = ['status = $1', 'updated_at = NOW()'];
  const values: (string | null)[] = [status];
  if (extras.resultUrl !== undefined) {
    fields.push(`result_url = $${values.length + 1}`);
    values.push(extras.resultUrl);
  }
  if (extras.errorMessage !== undefined) {
    fields.push(`error_message = $${values.length + 1}`);
    values.push(extras.errorMessage);
  }
  if (extras.processedAt !== undefined) {
    fields.push(`processed_at = $${values.length + 1}`);
    values.push(extras.processedAt);
  }
  values.push(id);
  await pool.query(
    `UPDATE jobs SET ${fields.join(', ')} WHERE id = $${values.length}`,
    values
  );
}

export async function incrementJobRetryCount(id: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE jobs SET retry_count = retry_count + 1, updated_at = NOW() WHERE id = $1 RETURNING retry_count`,
    [id]
  );
  return rows.length > 0 ? rows[0].retry_count : 0;
}

export async function claimNextPendingJob(): Promise<Job | null> {
  const pool = getPool();
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const jobId = rows[0].id;
    const { rows: updated } = await client.query(
      `UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [jobId]
    );
    await client.query('COMMIT');
    return updated.length > 0 ? rowToJob(updated[0]) : null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { generateReferenceId };
