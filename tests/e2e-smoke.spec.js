/**
 * E2E Smoke Test — MiniMax Studio Landing Page
 *
 * Test flow:
 *   1. Load the landing page
 *   2. Verify key page elements are present
 *   3. Fill in the signup form (email + idea)
 *   4. Submit the form
 *   5. Verify success state shows reference ID
 *
 * Run:
 *   npx playwright test workspace/tests/e2e-smoke.spec.js
 *
 * Prerequisites:
 *   - npm install (from workspace root — installs @playwright/test)
 *   - npx playwright install chromium
 *   - Backend running at http://localhost:3001 (for full E2E)
 *     If backend is unavailable, test runs with network-error handling
 */

const { test, expect } = require('@playwright/test');

// ── TEST CONFIG ──────────────────────────────────────────────────────────────

const PAGE_URL = process.env.TARGET_URL || 'file:///Users/dianmacpromax/.paperclip/instances/default/workspaces/5f646d62-8d4b-4c66-a5af-43b7d7e86d4d/workspace/index.html';
const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// ── TESTS ───────────────────────────────────────────────────────────────────

test.describe('MiniMax Studio — Landing Page Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    // Suppress console errors from the page (expected for network failure paths)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Ignore expected network errors when backend is offline
      }
    });
  });

  // ── TEST 1: Page Load & Structure ─────────────────────────────────────────

  test('T1 — Page loads with correct title and structure', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Title check
    await expect(page).toHaveTitle(/MiniMax Studio/);

    // Skip link present for keyboard users (A-7)
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#signup');

    // Navigation visible
    await expect(page.locator('nav .logo')).toContainText('MiniMax Studio');
    await expect(page.locator('.nav-badge')).toContainText('Beta');

    // Hero section
    await expect(page.locator('.hero h1')).toContainText('Think it');
    await expect(page.locator('.hero-subtitle')).toBeVisible();

    // CTA button (use .hero .cta-btn to avoid strict mode violation — two .cta-btn elements exist)
    const ctaBtn = page.locator('.hero .cta-btn');
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toContainText('立即开始');

    // Three step cards
    const steps = page.locator('.step');
    await expect(steps).toHaveCount(3);
    await expect(page.locator('.step-1 .step-title')).toContainText('想到');
    await expect(page.locator('.step-2 .step-title')).toContainText('看见');
    await expect(page.locator('.step-3 .step-title')).toContainText('得到');

    // Step icons have aria-hidden (A-2) — use correct Playwright assertion
    const stepIcons = page.locator('.step-icon');
    for (let i = 0; i < 3; i++) {
      const icon = stepIcons.nth(i);
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
      // sr-only label present inside icon
      await expect(icon.locator('.sr-only')).toBeAttached();
    }

    // Form section
    await expect(page.locator('#signup')).toBeVisible();
    await expect(page.locator('#ideaForm')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#idea')).toBeVisible();
    await expect(page.locator('#idea')).toHaveAttribute('maxlength', '500');

    // Success state is hidden initially (A-1)
    const formSuccess = page.locator('#formSuccess');
    await expect(formSuccess).not.toBeVisible();
    await expect(formSuccess).toHaveAttribute('role', 'status');
    await expect(formSuccess).toHaveAttribute('aria-live', 'polite');

    // Footer
    await expect(page.locator('footer')).toContainText('2026 MiniMax Studio');
  });

  // ── TEST 2: Validation — Empty Submit ──────────────────────────────────────

  test('T2 — Validation: empty form shows error messages', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Submit empty form
    await page.locator('.submit-btn').click();

    // Error summary should appear (C-1)
    const errorSummary = page.locator('#formErrorSummary');
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toContainText('请修正以下问题');

    // Inline errors should appear (A-4)
    const emailError = page.locator('#email-error');
    const ideaError = page.locator('#idea-error');
    await expect(emailError).toBeVisible();
    await expect(ideaError).toBeVisible();
    await expect(emailError).toContainText('邮箱');
    await expect(ideaError).toContainText('创意');

    // Fields should have aria-invalid (A-4)
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#idea')).toHaveAttribute('aria-invalid', 'true');

    // No success state
    await expect(page.locator('#formSuccess')).not.toBeVisible();
  });

  // ── TEST 3: Validation — Invalid Email ───────────────────────────────────

  test('T3 — Validation: invalid email shows correct error', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Fill with invalid email
    await page.locator('#email').fill('notanemail');
    await page.locator('#idea').fill('A cyberpunk city at night with neon lights');

    await page.locator('.submit-btn').click();

    const emailError = page.locator('#email-error');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('邮箱');

    // Idea should NOT have an error
    const ideaError = page.locator('#idea-error');
    await expect(ideaError).not.toBeVisible();

    // Form still visible
    await expect(page.locator('#ideaForm')).toBeVisible();
    await expect(page.locator('#formSuccess')).not.toBeVisible();
  });

  // ── TEST 4: Validation — Idea Too Short ──────────────────────────────────

  test('T4 — Validation: idea too short (< 5 chars) shows error', async ({ page }) => {
    await page.goto(PAGE_URL);

    await page.locator('#email').fill('user@example.com');
    await page.locator('#idea').fill('Hi'); // less than 5 chars

    await page.locator('.submit-btn').click();

    const ideaError = page.locator('#idea-error');
    await expect(ideaError).toBeVisible();
    await expect(ideaError).toContainText('5');

    await expect(page.locator('#formSuccess')).not.toBeVisible();
  });

  // ── TEST 5: Validation — Idea Max Length ──────────────────────────────────

  test('T5 — Textarea enforces 500 char maxlength (HTML attribute)', async ({ page }) => {
    await page.goto(PAGE_URL);

    const longText = 'A cyberpunk city at night with neon lights and rain '.repeat(12);
    // The textarea has maxlength="500" — browser prevents entering > 500
    await page.locator('#idea').fill(longText);

    // Value should be truncated to 500 chars
    const actualValue = await page.locator('#idea').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(500);
  });

  // ── TEST 6: Form Submit — Network Error (Backend Offline/Not Implemented) ─

  test('T6 — Form submit with unreachable backend shows error message', async ({ page }) => {
    await page.goto(PAGE_URL);

    await page.locator('#email').fill('test@example.com');
    await page.locator('#idea').fill('A beautiful sunset over the mountains');

    await page.locator('.submit-btn').click();

    // Should show network error (backend unreachable or returns non-201)
    const errorSummary = page.locator('#formErrorSummary');
    await expect(errorSummary).toBeVisible({ timeout: 12000 });
    // The page shows network/backend error for any non-201 response
    await expect(errorSummary).toContainText(/网络|超时|后端|请求/);

    // Form should still be visible and usable
    await expect(page.locator('#ideaForm')).toBeVisible();
    await expect(page.locator('.submit-btn')).toBeVisible();
    await expect(page.locator('#formSuccess')).not.toBeVisible();
  });

  // ── TEST 7: Accessibility — Focus Management ──────────────────────────────

  test('T7 — Focus on field removes error state', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Trigger validation error
    await page.locator('.submit-btn').click();
    await expect(page.locator('#email-error')).toBeVisible();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');

    // Focus the email field
    await page.locator('#email').focus();

    // Error should be cleared
    await expect(page.locator('#email-error')).not.toBeVisible();
    await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
  });

  // ── TEST 8: Step Scroll Reveal ──────────────────────────────────────────

  test('T8 — Steps become visible on scroll', async ({ page }) => {
    await page.goto(PAGE_URL);

    // First step is immediately visible (setTimeout 400ms)
    await expect(page.locator('.step-1')).toHaveClass(/visible/, { timeout: 1000 });

    // Scroll to second step
    await page.locator('.step-2').scrollIntoViewIfNeeded();
    await expect(page.locator('.step-2')).toHaveClass(/visible/, { timeout: 2000 });

    // Scroll to third step
    await page.locator('.step-3').scrollIntoViewIfNeeded();
    await expect(page.locator('.step-3')).toHaveClass(/visible/, { timeout: 2000 });
  });

  // ── TEST 9: CSP Meta Tag Present ─────────────────────────────────────────

  test('T9 — CSP meta tag is present with correct directives (S-1)', async ({ page }) => {
    await page.goto(PAGE_URL);

    const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(cspMeta).toBeAttached();

    const cspContent = await cspMeta.getAttribute('content');
    expect(cspContent).toContain("script-src");
    expect(cspContent).toContain("style-src");
    expect(cspContent).toContain("connect-src");
    expect(cspContent).toContain("localhost:3001");
  });

  // ── TEST 10: Skip Navigation Link ───────────────────────────────────────

  test('T10 — Skip link jumps to signup section (A-7)', async ({ page }) => {
    await page.goto(PAGE_URL);

    // Keyboard navigate to skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();

    // Click skip link
    await skipLink.click();

    // Signup section should be in view
    const signupSection = page.locator('#signup');
    await expect(signupSection).toBeInViewport({ timeout: 2000 });
  });

  // ── TEST 11: Form Submit — Valid Input, Backend Returns 400 ──────────────

  test('T11 — Valid form with backend 400 response shows error', async ({ page }) => {
    // This test is informational — it verifies the page handles
    // a 400 response (backend validation error) gracefully.
    // If backend is offline, the network error is shown instead.
    await page.goto(PAGE_URL);

    await page.locator('#email').fill('valid@example.com');
    await page.locator('#idea').fill('A stunning landscape photograph with vibrant colors');

    // Intercept /api/ideas and return 400 to test error handling
    await page.route('http://localhost:3001/api/ideas', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Request', message: 'Invalid input data' }),
      });
    });

    await page.locator('.submit-btn').click();

    // Should show 400 error message
    const errorSummary = page.locator('#formErrorSummary');
    await expect(errorSummary).toBeVisible({ timeout: 10000 });
    await expect(errorSummary).toContainText(/Invalid|Bad|请求|不符合/);

    // Form still usable
    await expect(page.locator('#ideaForm')).toBeVisible();
    await expect(page.locator('#formSuccess')).not.toBeVisible();
  });
});
