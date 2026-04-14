'use strict';
export {};

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export type IdeaStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: number;
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

function makeId(prefix: string, length: number): string {
  return prefix + randomUUID().replace(/-/g, '').slice(0, length);
}

function getDbPath(): string {
  const { getDbConfig } = require('./config');
  const config = getDbConfig();
  if (config.type === 'postgres') {
    throw new Error('[DB] PostgreSQL driver not yet implemented. Set DB_TYPE=sqlite in .env. See Phase 6 roadmap for Postgres migration.');
  }
  return config.path || process.env.DB_PATH || path.join(__dirname, '..', '..', 'db', 'app.db');
}

let db: Database.Database;

export function resetDb(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): Database.Database {
  const database = getDb();
  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  database.exec(schema);
  return database;
}

function generateReferenceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'MMS-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

// IDEAS
export function createIdea(data: { email: string; idea_text: string; userId?: string }): { id: string; referenceId: string } {
  const database = getDb();
  const id = makeId('ide_', 16);
  const referenceId = generateReferenceId();
  const userId = data.userId !== undefined ? data.userId : null;
  database.prepare(
    'INSERT INTO ideas (id, email, idea_text, reference_id, status, user_id) VALUES (?, ?, ?, ?, \'pending\', ?)'
  ).run(id, data.email, data.idea_text, referenceId, userId);
  return { id, referenceId };
}

export function getIdeaById(id: string): Idea | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
  return (result === undefined ? null : result) as Idea | null;
}

export function getIdeaByReferenceId(ref: string): Idea | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM ideas WHERE reference_id = ?').get(ref);
  return (result === undefined ? null : result) as Idea | null;
}

export function updateIdeaStatus(id: string, status: IdeaStatus, extras: { processed_at?: string } = {}): void {
  const database = getDb();
  const fields = ['status = ?', "updated_at = datetime('now')"];
  const values: (string | number)[] = [status];
  if (extras.processed_at) {
    fields.push('processed_at = ?');
    values.push(extras.processed_at);
  }
  values.push(id);
  database.prepare(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function updateIdeaWithResult(id: string, resultUrl: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare(
    "UPDATE ideas SET status = 'completed', result_url = ?, processed_at = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(resultUrl, now, id);
}

export function updateIdeaWithFailure(id: string, errorMessage: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.prepare(
    "UPDATE ideas SET status = 'failed', error_message = ?, processed_at = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(errorMessage, now, id);
}

// USERS
export function createUser(data: { email: string; passwordHash: string; role?: string }): { id: string } {
  const database = getDb();
  const id = makeId('usr_', 16);
  const role = data.role ?? 'user';
  database.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)').run(id, data.email, data.passwordHash, role);
  return { id };
}

export function getUserById(id: string): User | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return (result === undefined ? null : result) as User | null;
}

export function getUserByEmail(email: string): User | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return (result === undefined ? null : result) as User | null;
}

export function updateUserEmailVerified(id: string, verified: boolean): void {
  const database = getDb();
  database.prepare("UPDATE users SET email_verified = ?, updated_at = datetime('now') WHERE id = ?").run(verified ? 1 : 0, id);
}

// JOBS
export function createJob(data: { ideaId: string; userId?: string; prompt: string }): { id: string } {
  const database = getDb();
  const id = makeId('job_', 16);
  database.prepare(
    'INSERT INTO jobs (id, idea_id, user_id, prompt, status) VALUES (?, ?, ?, ?, \'pending\')'
  ).run(id, data.ideaId, data.userId ?? null, data.prompt);
  return { id };
}

export function getJobById(id: string): Job | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  return (result === undefined ? null : result) as Job | null;
}

export function getJobByIdeaId(ideaId: string): Job | null {
  const database = getDb();
  const result = database.prepare('SELECT * FROM jobs WHERE idea_id = ?').get(ideaId);
  return (result === undefined ? null : result) as Job | null;
}

export function getJobsByUserId(userId: string, limit = 50): Job[] {
  const database = getDb();
  return database.prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as Job[];
}

export function updateJobStatus(
  id: string,
  status: IdeaStatus,
  extras: { resultUrl?: string; errorMessage?: string; processedAt?: string } = {}
): void {
  const database = getDb();
  const fields = ['status = ?', "updated_at = datetime('now')"];
  const values: (string | number | null)[] = [status];
  if (extras.resultUrl !== undefined) { fields.push('result_url = ?'); values.push(extras.resultUrl); }
  if (extras.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(extras.errorMessage); }
  if (extras.processedAt !== undefined) { fields.push('processed_at = ?'); values.push(extras.processedAt); }
  values.push(id);
  database.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function incrementJobRetryCount(id: string): number {
  const database = getDb();
  database.prepare("UPDATE jobs SET retry_count = retry_count + 1, updated_at = datetime('now') WHERE id = ?").run(id);
  const result = database.prepare('SELECT retry_count FROM jobs WHERE id = ?').get(id) as { retry_count: number } | undefined;
  return result ? result.retry_count : 0;
}

export function claimNextPendingJob(): Job | null {
  const database = getDb();
  // Find and atomically update the oldest pending job
  const rows = database.prepare(
    "SELECT id FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
  ).all() as { id: string }[];
  
  if (rows.length === 0) return null;
  
  const jobId = rows[0].id;
  database.prepare(
    "UPDATE jobs SET status = 'processing', updated_at = datetime('now') WHERE id = ? AND status = 'pending'"
  ).run(jobId);
  
  return getJobById(jobId);
}

export { generateReferenceId };
