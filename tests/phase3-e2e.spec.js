/**
 * E2E Test — MiniMax Studio Phase 3
 * Auth + Dashboard Core Paths
 *
 * Tests: 18 total
 *   - Auth: 7 tests
 *   - Dashboard: 5 tests
 *   - Landing Page: 6 tests
 *
 * Run:
 *   cd workspace/tests && npx playwright test phase3-e2e.spec.js
 *
 * Note: Uses mock API (window.USE_MOCK_API = true) so tests run
 * independently of the backend server. Real API is tested via
 * supertest integration tests (22 tests in routes.integration.test.ts).
 */

const { test, expect } = require('@playwright/test');
const http = require('http');
const path = require('path');
const fs = require('fs');

const WORKSPACE = '/Users/dianmacpromax/.paperclip/instances/default/workspaces/5f646d62-8d4b-4c66-a5af-43b7d7e86d4d/workspace';

let server = null;
let serverUrl = '';
let serverReady = false;

async function ensureServer() {
  if (serverReady && server) return;
  if (server) { try { server.close(); } catch (_) {} }
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(WORKSPACE, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      serverUrl = 'http://localhost:' + server.address().port;
      serverReady = true;
      resolve();
    });
  });
}

async function closeServer() {
  if (server) { server.close(); server = null; serverReady = false; }
}

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// ── AUTH PAGE ─────────────────────────────────────────────────────────────────
test.describe('Auth Page', () => {
  test.beforeAll(async () => { await ensureServer(); });
  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => { window.USE_MOCK_API = true; });
  });
  test.afterAll(async () => { await closeServer(); });

  test('T1 — Auth page loads with login form visible', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await expect(page).toHaveTitle(/MiniMax Studio/);
    await expect(page.locator('#authTitle')).toContainText('\u767b\u5f55 Login');
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  test('T2 — Toggle between login and register forms', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#registerForm')).toBeHidden();
    await page.click('#toggleLink');
    await expect(page.locator('#authTitle')).toContainText('\u6ce8\u518c Register');
    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#loginForm')).toBeHidden();
  });

  test('T3 — Login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await expect(page.locator('.dashboard-title')).toBeVisible();
  });

  test('T4 — Login with invalid email shows inline error', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', 'notanemail');
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await expect(page.locator('#loginEmail-error')).toBeVisible();
  });

  test('T5 — Login with wrong credentials shows form error', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', 'wrongpassword');
    await page.click('#loginBtn');
    await page.waitForSelector('#formErrorSummary:not([hidden])', { timeout: 5000 });
    await expect(page.locator('#formErrorSummary')).toContainText(/\u5bc6\u7801|incorrect/i);
  });

  test('T6 — Password show/hide toggle works', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    const pw = page.locator('#loginPassword');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.click('#loginPasswordToggle');
    await expect(pw).toHaveAttribute('type', 'text');
    await page.click('#loginPasswordToggle');
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('T7 — Register shows error for mismatched passwords', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.click('#toggleLink');
    await page.fill('#regEmail', 'newuser@example.com');
    await page.fill('#regPassword', 'password123');
    await page.fill('#regConfirmPassword', 'differentpass');
    await page.click('#registerBtn');
    await expect(page.locator('#regConfirmPassword-error')).toBeVisible();
  });
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
// Note: Uses mock API so tests run independently of the backend.
test.describe('Dashboard', () => {
  test.beforeAll(async () => { await ensureServer(); });
  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => { window.USE_MOCK_API = true; });
  });
  test.afterAll(async () => { await closeServer(); });

  test('T8 — Dashboard loads with ideas after login', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await page.waitForSelector('#ideasGrid:not([hidden])', { timeout: 8000 });
    await expect(page.locator('.dashboard-title')).toContainText('\u6211\u7684\u521b\u610f');
    const cards = await page.locator('.idea-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('T9 — Idea cards show status badges', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await page.waitForSelector('#ideasGrid:not([hidden])', { timeout: 8000 });
    const badge = page.locator('.idea-card-status').first();
    await expect(badge).toBeVisible();
    const cls = await badge.getAttribute('class');
    expect(cls).toMatch(/status-/);
  });

  test('T10 — New Idea modal opens and closes', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await page.waitForSelector('#ideasGrid:not([hidden])', { timeout: 8000 });
    await page.click('#newIdeaBtn');
    await expect(page.locator('#newIdeaModal')).toBeVisible();
    await expect(page.locator('#newIdeaText')).toBeFocused();
    await page.click('#modalCloseBtn');
    await expect(page.locator('#newIdeaModal')).toBeHidden();
  });

  test('T11 — Submit new idea adds card', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await page.waitForSelector('#ideasGrid:not([hidden])', { timeout: 8000 });
    await page.waitForTimeout(1200);
    const initial = await page.locator('.idea-card').count();
    await page.click('#newIdeaBtn');
    await page.fill('#newIdeaText', '\u6d4b\u8bd5\u65b0\u521b\u610f Test idea');
    await page.click('#modalSubmitBtn');
    await expect(page.locator('#newIdeaModal')).toBeHidden({ timeout: 5000 });
    await page.waitForFunction(
      (prevCount) => document.querySelectorAll('.idea-card').length > prevCount,
      initial,
      { timeout: 5000 }
    );
    const updated = await page.locator('.idea-card').count();
    expect(updated).toBe(initial + 1);
  });

  test('T12 — Logout redirects to auth', async ({ page }) => {
    await page.goto(serverUrl + '/auth.html');
    await page.fill('#loginEmail', TEST_EMAIL);
    await page.fill('#loginPassword', TEST_PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/dashboard.html', { timeout: 5000 });
    await page.waitForSelector('#ideasGrid:not([hidden])', { timeout: 8000 });
    await page.click('#logoutBtn');
    await page.waitForURL('**/auth.html', { timeout: 5000 });
  });
});

// ── LANDING PAGE ───────────────────────────────────────────────────────────────
test.describe('Landing Page', () => {
  test.beforeAll(async () => { await ensureServer(); });
  test.afterAll(async () => { await closeServer(); });

  test('T13 — Nav shows Login and Register CTAs', async ({ page }) => {
    await page.goto(serverUrl + '/index.html');
    await expect(page.locator('.nav-login')).toContainText('\u767b\u5f55 Login');
    await expect(page.locator('.nav-register')).toContainText('\u6ce8\u518c Register');
  });

  test('T14 — Hero shows secondary login link', async ({ page }) => {
    await page.goto(serverUrl + '/index.html');
    await expect(page.locator('.hero-secondary-cta')).toBeVisible();
    await expect(page.locator('.hero-login-link')).toContainText('\u767b\u5f55 Login');
    await expect(page.locator('.hero-login-link')).toHaveAttribute('href', 'auth.html');
  });

  test('T15 — Demo showcase section visible', async ({ page }) => {
    await page.goto(serverUrl + '/index.html');
    await expect(page.locator('.demo-section')).toBeVisible();
    await expect(page.locator('.demo-card')).toHaveCount(3);
  });

  test('T16 — Accent color is cyan', async ({ page }) => {
    await page.goto(serverUrl + '/index.html');
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    );
    expect(accent).toBe('#22D3EE');
  });

  test('T17 — Mobile (375px) no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(serverUrl + '/index.html');
    const w = await page.evaluate(() => document.body.scrollWidth);
    expect(w).toBeLessThanOrEqual(375);
  });

  test('T18 — Mobile (390px) no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(serverUrl + '/index.html');
    const w = await page.evaluate(() => document.body.scrollWidth);
    expect(w).toBeLessThanOrEqual(390);
  });
});
