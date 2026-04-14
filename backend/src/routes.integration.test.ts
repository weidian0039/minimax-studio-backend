'use strict';
export {}; // Force module scope

// Integration tests — spawns server in child process with isolated DB
// Run: npm test -- --testPathPattern=integration

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as child_process from 'child_process';

const TEST_PORT = 19999;
let serverProcess: child_process.ChildProcess;

function httpReq(method: string, urlPath: string, body?: object, token?: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const opts: http.RequestOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode ?? 0, body: { raw: data } }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const post = (p: string, b: object, t?: string) => httpReq('POST', p, b, t);
const get = (p: string, t?: string) => httpReq('GET', p, undefined, t);

beforeAll(async () => {
  // Create isolated test DB
  const testDbDir = path.join(__dirname, '..');
  const testDbPath = path.join(testDbDir, 'test_integration.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  // Spawn server in child process with test DB
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DB_PATH: testDbPath,
    PORT: String(TEST_PORT),
  };
  serverProcess = child_process.spawn(
    process.execPath,
    [path.join(__dirname, '../dist/server.js')],
    { env, stdio: 'pipe' }
  );

  // Wait for server to start
  await new Promise<void>((resolve) => {
    serverProcess.stdout?.on('data', (chunk) => {
      const line = chunk.toString();
      if (line.includes('MiniMax Studio API running')) resolve();
    });
    serverProcess.stderr?.on('data', (chunk) => {
      // Ignore stderr from Sentry etc
    });
    // Timeout fallback
    setTimeout(resolve, 3000);
  });
  await new Promise(r => setTimeout(r, 500)); // Extra buffer
});

afterAll(() => {
  serverProcess?.kill();
  const testDbPath = path.join(__dirname, '..', 'test_integration.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('returns 201 with userId and tokens', async () => {
    const { status, body } = await post('/api/auth/register', { email: 'alice@test.com', password: 'Password123!' });
    expect(status).toBe(201);
    const r = body as { success: boolean; data: { userId: string; accessToken: string; refreshToken: string } };
    expect(r.success).toBe(true);
    expect(r.data.userId?.startsWith('usr_')).toBe(true);
    expect(r.data.accessToken?.split('.').length).toBe(3);
  });

  test('returns 409 for duplicate email', async () => {
    await post('/api/auth/register', { email: 'dup@test.com', password: 'Password123!' });
    const { status, body } = await post('/api/auth/register', { email: 'dup@test.com', password: 'OtherPass!' });
    expect(status).toBe(409);
    const r = body as { success: boolean; error: string };
    expect(r.error).toBe('conflict');
  });

  test('returns 400 for invalid email', async () => {
    const { status, body } = await post('/api/auth/register', { email: 'not-email', password: 'Password123!' });
    expect(status).toBe(400);
    const r = body as { success: boolean; error: string };
    expect(r.error).toBe('validation_error');
  });

  test('returns 400 for short password', async () => {
    const { status } = await post('/api/auth/register', { email: 'shortpw@test.com', password: '123' });
    expect(status).toBe(400);
  });

  test('returns 400 when email missing', async () => {
    const { status } = await post('/api/auth/register', { password: 'Password123!' });
    expect(status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await post('/api/auth/register', { email: 'carol@test.com', password: 'LoginPass1!' });
  });

  test('returns 200 with tokens for valid credentials', async () => {
    const { status, body } = await post('/api/auth/login', { email: 'carol@test.com', password: 'LoginPass1!' });
    expect(status).toBe(200);
    const r = body as { success: boolean; data: { accessToken: string } };
    expect(r.success).toBe(true);
    expect(r.data.accessToken?.split('.').length).toBe(3);
  });

  test('returns 401 for wrong password', async () => {
    const { status, body } = await post('/api/auth/login', { email: 'carol@test.com', password: 'Wrong!' });
    expect(status).toBe(401);
    const r = body as { success: boolean; error: string };
    expect(r.error).toBe('unauthorized');
  });

  test('returns 401 for unknown email', async () => {
    const { status, body } = await post('/api/auth/login', { email: 'nobody@test.com', password: 'Pass!' });
    expect(status).toBe(401);
    const r = body as { success: boolean; error: string };
    expect(r.error).toBe('unauthorized');
  });
});

describe('GET /api/auth/me', () => {
  let token: string;
  beforeAll(async () => {
    const { body } = await post('/api/auth/register', { email: 'eve@test.com', password: 'Password123!' });
    token = ((body as { data: { accessToken: string } }).data).accessToken;
  });

  test('returns user data with valid token', async () => {
    const { status, body } = await get('/api/auth/me', token);
    expect(status).toBe(200);
    const r = body as { success: boolean; data: { email: string } };
    expect(r.data.email).toBe('eve@test.com');
  });

  test('returns 401 without token', async () => {
    const { status, body } = await get('/api/auth/me');
    expect(status).toBe(401);
    const r = body as { success: boolean };
    expect(r.success).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  let token: string;
  beforeAll(async () => {
    const { body } = await post('/api/auth/register', { email: 'logout@test.com', password: 'Password123!' });
    token = ((body as { data: { accessToken: string } }).data).accessToken;
  });

  test('returns 200 with valid token', async () => {
    const { status, body } = await post('/api/auth/logout', {}, token);
    expect(status).toBe(200);
    const r = body as { success: boolean };
    expect(r.success).toBe(true);
  });

  test('returns 401 without token', async () => {
    const { status, body } = await post('/api/auth/logout', {});
    expect(status).toBe(401);
    const r = body as { success: boolean };
    expect(r.success).toBe(false);
  });
});

describe('POST /api/auth/refresh', () => {
  test('returns new access token', async () => {
    const { body: regBody } = await post('/api/auth/register', { email: 'refresh@test.com', password: 'Password123!' });
    const refreshToken = ((regBody as { data: { refreshToken: string } }).data).refreshToken;
    const { status, body } = await post('/api/auth/refresh', { refreshToken });
    expect(status).toBe(200);
    const r = body as { success: boolean; data: { accessToken: string } };
    expect(r.data.accessToken?.split('.').length).toBe(3);
  });

  test('returns 401 for invalid token', async () => {
    const { status } = await post('/api/auth/refresh', { refreshToken: 'bad.token.here' });
    expect(status).toBe(401);
  });
});

// ── Ideas ─────────────────────────────────────────────────────────────────────

describe('POST /api/ideas', () => {
  let token: string;
  beforeAll(async () => {
    const { body } = await post('/api/auth/register', { email: 'ideas@test.com', password: 'Password123!' });
    token = ((body as { data: { accessToken: string } }).data).accessToken;
  });

  test('returns 201 with idea id and reference', async () => {
    const { status, body } = await post('/api/ideas', { idea_text: 'My brilliant startup idea for Phase 4' }, token);
    expect(status).toBe(201);
    const r = body as { success: boolean; data: { id: string; referenceId: string; status: string } };
    expect(r.data.id?.startsWith('ide_')).toBe(true);
    expect(r.data.referenceId?.startsWith('MMS-')).toBe(true);
    expect(r.data.status).toBe('queued');
  });

  test('returns 400 when idea_text missing', async () => {
    const { status, body } = await post('/api/ideas', {}, token);
    expect(status).toBe(400);
    const r = body as { success: boolean; error: string };
    expect(r.error).toBe('validation_error');
  });

  test('returns 400 when idea_text too short', async () => {
    const { status, body } = await post('/api/ideas', { idea_text: 'Hi' }, token);
    expect(status).toBe(400);
    const r = body as { success: boolean };
    expect(r.success).toBe(false);
  });

  test('returns 401 without token', async () => {
    const { status, body } = await post('/api/ideas', { idea_text: 'Test' });
    expect(status).toBe(401);
    const r = body as { success: boolean };
    expect(r.success).toBe(false);
  });
});

describe('GET /api/ideas/:id', () => {
  let token: string;
  let ideaId: string;
  beforeAll(async () => {
    const { body: regBody } = await post('/api/auth/register', { email: 'getidea@test.com', password: 'Password123!' });
    token = ((regBody as { data: { accessToken: string } }).data).accessToken;
    const { body: ideaBody } = await post('/api/ideas', { idea_text: 'Idea to fetch' }, token);
    ideaId = ((ideaBody as { data: { id: string } }).data).id;
  });

  test('returns idea for owner', async () => {
    const { status, body } = await get(`/api/ideas/${ideaId}`, token);
    expect(status).toBe(200);
    const r = body as { success: boolean; data: { idea_text: string } };
    expect(r.data.idea_text).toBe('Idea to fetch');
  });

  test('returns 400 for malformed id', async () => {
    const { status } = await get('/api/ideas/bad-id', token);
    expect(status).toBe(400);
  });
});

// ── System ───────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const { status, body } = await get('/health');
    expect(status).toBe(200);
    const r = body as { status: string; checks: { database: { status: string } } };
    expect(r.status).toBe('ok');
    expect(r.checks.database.status).toBe('ok');
  });
});

describe('Unknown routes', () => {
  test('returns 404', async () => {
    const { status, body } = await get('/api/nonexistent');
    expect(status).toBe(404);
    const r = body as { error: string };
    expect(r.error).toBe('not_found');
  });
});
