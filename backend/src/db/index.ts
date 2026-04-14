'use strict';
export {}; // Force CJS + ES module interop

// Database abstraction layer — single import point for all DB operations.
//
// All functions return Promise<T> — uniform async interface for both drivers.
// Routes always use: await dbIndex.createIdea(...) etc.
//
// DB_TYPE=sqlite  → better-sqlite3 (wrapped async)
// DB_TYPE=postgres → pg Pool (native async)

import * as sqlite from './database';
import * as postgres from './postgres';
import { IdeaStatus } from './database';

const logger = require('../logger');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// ── Forward wrappers ─────────────────────────────────────────────────────────────

export const initDb = DB_TYPE === 'postgres'
  ? () => postgres.initDb()
  : () => { sqlite.initDb(); return Promise.resolve(); };

export const resetDb = DB_TYPE === 'postgres'
  ? () => Promise.resolve()
  : () => { sqlite.resetDb(); };

export const closeDb = DB_TYPE === 'postgres'
  ? () => postgres.closePool()
  : () => { sqlite.resetDb(); };

export const getDbType = () => DB_TYPE as 'sqlite' | 'postgres';

export const getDb = DB_TYPE === 'postgres'
  ? (null as any)
  : () => sqlite.getDb();

export const isDbReady = DB_TYPE === 'postgres'
  ? async () => { try { await postgres.getPool().query('SELECT 1'); return true; } catch { return false; } }
  : () => Promise.resolve(true);

// ── Ideas ─────────────────────────────────────────────────────────────────────

export const createIdea = DB_TYPE === 'postgres'
  ? (data: { email: string; idea_text: string; userId?: string }) => postgres.createIdea(data)
  : (data: { email: string; idea_text: string; userId?: string }) => Promise.resolve(sqlite.createIdea(data));

export const getIdeaById = DB_TYPE === 'postgres'
  ? (id: string) => postgres.getIdeaById(id)
  : (id: string) => Promise.resolve(sqlite.getIdeaById(id));

export const getIdeaByReferenceId = DB_TYPE === 'postgres'
  ? (ref: string) => postgres.getIdeaByReferenceId(ref)
  : (ref: string) => Promise.resolve(sqlite.getIdeaByReferenceId(ref));

export const updateIdeaStatus = DB_TYPE === 'postgres'
  ? (id: string, status: IdeaStatus, extras?: { processed_at?: string }) => postgres.updateIdeaStatus(id, status, extras)
  : (id: string, status: IdeaStatus, extras?: { processed_at?: string }) => { sqlite.updateIdeaStatus(id, status, extras); return Promise.resolve(); };

export const updateIdeaWithResult = DB_TYPE === 'postgres'
  ? (id: string, url: string) => postgres.updateIdeaWithResult(id, url)
  : (id: string, url: string) => { sqlite.updateIdeaWithResult(id, url); return Promise.resolve(); };

export const updateIdeaWithFailure = DB_TYPE === 'postgres'
  ? (id: string, err: string) => postgres.updateIdeaWithFailure(id, err)
  : (id: string, err: string) => { sqlite.updateIdeaWithFailure(id, err); return Promise.resolve(); };

// ── Users ─────────────────────────────────────────────────────────────────────

export const createUser = DB_TYPE === 'postgres'
  ? (data: { email: string; passwordHash: string; role?: string }) => postgres.createUser(data)
  : (data: { email: string; passwordHash: string; role?: string }) => Promise.resolve(sqlite.createUser(data));

export const getUserById = DB_TYPE === 'postgres'
  ? (id: string) => postgres.getUserById(id)
  : (id: string) => Promise.resolve(sqlite.getUserById(id));

export const getUserByEmail = DB_TYPE === 'postgres'
  ? (email: string) => postgres.getUserByEmail(email)
  : (email: string) => Promise.resolve(sqlite.getUserByEmail(email));

export const updateUserEmailVerified = DB_TYPE === 'postgres'
  ? (id: string, v: boolean) => postgres.updateUserEmailVerified(id, v)
  : (id: string, v: boolean) => { sqlite.updateUserEmailVerified(id, v); return Promise.resolve(); };

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const createJob = DB_TYPE === 'postgres'
  ? (data: { ideaId: string; userId?: string; prompt: string }) => postgres.createJob(data)
  : (data: { ideaId: string; userId?: string; prompt: string }) => Promise.resolve(sqlite.createJob(data));

export const getJobById = DB_TYPE === 'postgres'
  ? (id: string) => postgres.getJobById(id)
  : (id: string) => Promise.resolve(sqlite.getJobById(id));

export const getJobByIdeaId = DB_TYPE === 'postgres'
  ? (ideaId: string) => postgres.getJobByIdeaId(ideaId)
  : (ideaId: string) => Promise.resolve(sqlite.getJobByIdeaId(ideaId));

export const getJobsByUserId = DB_TYPE === 'postgres'
  ? (userId: string, limit?: number) => postgres.getJobsByUserId(userId, limit)
  : (userId: string, limit?: number) => Promise.resolve(sqlite.getJobsByUserId(userId, limit));

export const updateJobStatus = DB_TYPE === 'postgres'
  ? (id: string, status: IdeaStatus, extras?: { resultUrl?: string; errorMessage?: string; processedAt?: string }) => postgres.updateJobStatus(id, status, extras)
  : (id: string, status: IdeaStatus, extras?: { resultUrl?: string; errorMessage?: string; processedAt?: string }) => { sqlite.updateJobStatus(id, status, extras); return Promise.resolve(); };

export const incrementJobRetryCount = DB_TYPE === 'postgres'
  ? (id: string) => postgres.incrementJobRetryCount(id)
  : (id: string) => Promise.resolve(sqlite.incrementJobRetryCount(id));

export const claimNextPendingJob = DB_TYPE === 'postgres'
  ? () => postgres.claimNextPendingJob()
  : () => Promise.resolve(sqlite.claimNextPendingJob());

// ── Log driver selection at module load ────────────────────────────────────────
logger.info(`[DB-Index] Driver: ${DB_TYPE}`);
