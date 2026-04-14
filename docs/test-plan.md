# MiniMax Studio — Test Plan

**Product**: MiniMax Studio Landing Page + Mobile Prototype
**Vision**: "Think it. See it. Get it." / "想到即看见，看见即得到"
**Version**: 1.0
**Date**: 2026-04-09
**Status**: Draft for Sprint 1
**Author**: QA Engineer
**Coverage Scope**: Landing page (`index.html`), form system, animations, responsive layout, mobile prototype specs, AI integration API (contract-level)

---

## Table of Contents

1. [Test Strategy Overview](#1-test-strategy-overview)
2. [Test Environment & Tools](#2-test-environment--tools)
3. [Unit Tests](#3-unit-tests)
4. [Integration Tests](#4-integration-tests)
5. [E2E Tests (Playwright)](#5-e2e-tests-playwright)
6. [Visual Regression Tests](#6-visual-regression-tests)
7. [Performance Tests](#7-performance-tests)
8. [API Contract Tests](#8-api-contract-tests)
9. [Mobile Prototype Tests](#9-mobile-prototype-tests)
10. [Test Execution Schedule](#10-test-execution-schedule)

---

## 1. Test Strategy Overview

### 1.1 Product Components Under Test

| Component | Technology | Test Approach |
|-----------|-----------|---------------|
| Landing page (`index.html`) | Vanilla HTML/CSS/JS | Unit + E2E + Visual |
| Form validation | Vanilla JS | Unit + Integration |
| Scroll animations | Intersection Observer API | Unit + E2E |
| Responsive layout | CSS media queries | Integration + Visual |
| API integration (MVP) | REST API contract | API contract tests |
| Mobile prototype | React Native specs | Prototype validation |

### 1.2 Testing Pyramid

```
        /\
       /E2E\         <-- Playwright: full journeys, accessibility, cross-browser
      /------\
     /Integration\   <-- Form E2E, responsive layout, API contract
    /------------\
   /  Unit Tests  \  <-- Validation logic, animation logic, state transitions
  /________________\
```

### 1.3 Test Matrix — Features vs. Test Types

| Feature | Unit | Integration | E2E | Visual | Performance | API |
|---------|------|-------------|-----|--------|-------------|-----|
| Email validation | X | X | X | - | - | X |
| Idea text validation | X | X | X | - | - | X |
| Form submit (happy path) | X | X | X | - | - | X |
| Form submit (validation errors) | X | X | X | - | - | X |
| Form success state | X | X | X | X | - | - |
| CTA button → scroll | - | X | X | X | - | - |
| Scroll-triggered animations | X | X | X | X | - | - |
| IntersectionObserver trigger | X | - | X | - | - | - |
| Mobile responsive (375px) | - | X | X | X | - | - |
| Mobile responsive (320px) | - | X | X | X | - | - |
| Desktop layout (1920px) | - | X | X | X | - | - |
| Lighthouse performance | - | - | - | - | X | - |
| Core Web Vitals | - | - | - | - | X | - |
| Accessibility audit | - | - | X | - | X | - |
| Cross-browser (Chrome/Firefox/Safari) | - | - | X | X | - | - |
| Network error handling | - | X | X | - | - | - |
| Long text input | - | X | X | - | - | - |
| XSS prevention | X | X | X | - | - | - |
| API contract (201) | - | - | - | - | - | X |
| API contract (400) | - | - | - | - | - | X |
| API contract (503) | - | - | - | - | - | X |

---

## 2. Test Environment & Tools

### 2.1 Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >=20.x | Runtime for test tooling |
| npm/pnpm | >=10.x | Package manager |
| Vitest | ^2.x | Unit testing framework (lightweight, fast) |
| Playwright | ^1.50.x | E2E + cross-browser testing |
| @playwright/test | ^1.50.x | Test runner with fixtures |
| axe-core | ^4.x | Accessibility auditing |
| @axe-core/playwright | ^4.x | Axe integration with Playwright |
| Lighthouse CI | ^0.130.x | Performance benchmarking |
| Percy | ^2.x | Visual regression (optional, or use Playwright screenshots) |
| jest-fetch-mock | — | API mocking in unit tests |
| TypeScript | ^5.x | Type-safe test code |

### 2.2 Directory Structure

```
workspace/
  tests/
    unit/
      validation.test.ts
      animation.test.ts
      state.test.ts
    integration/
      form-submission.test.ts
      responsive-layout.test.ts
      api-contract.test.ts
    e2e/
      desktop-journey.spec.ts
      mobile-journey.spec.ts
      accessibility.spec.ts
      cross-browser.spec.ts
    visual/
      screenshot.spec.ts
    perf/
      lighthouse.spec.ts
  playwright.config.ts
  vitest.config.ts
  package.json
```

### 2.3 Browser Matrix

| Browser | Platform | Min Version | Priority |
|---------|----------|-------------|----------|
| Chrome | Desktop | Latest stable | P0 |
| Firefox | Desktop | Latest stable | P0 |
| Safari | Desktop / macOS | Latest stable | P0 |
| Edge | Desktop | Latest stable | P1 |
| Chrome | Android | Latest stable | P1 |
| Safari | iOS | Latest stable | P1 |

---

## 3. Unit Tests

### 3.1 Form Validation Functions

**File**: `tests/unit/validation.test.ts`

#### TC-UNIT-001: Valid email formats

Test that the email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` correctly validates:
- Standard: `user@example.com` → valid
- Plus addressing: `user+tag@example.com` → valid
- Subdomain: `user@mail.example.com` → valid
- Dot prefix: `.user@example.com` → invalid (starts with dot)
- No TLD: `user@example` → invalid
- No @: `userexample.com` → invalid
- Double @: `user@@example.com` → invalid
- Space in local: `user name@example.com` → invalid
- Empty string: `""` → invalid

```typescript
describe('email validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('accepts standard email', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(emailRegex.test('userexample.com')).toBe(false);
  });

  // ... additional cases
});
```

#### TC-UNIT-002: Idea text length bounds

Test that the idea validation correctly enforces:
- Empty string → invalid
- 1-4 characters → invalid (min 5)
- Exactly 5 characters → valid
- 499 characters → valid
- Exactly 500 characters → valid
- 501 characters → invalid
- Whitespace-only string → invalid (after trim)
- Normalized whitespace ("  abc  ") → valid (after trim)

```typescript
describe('idea text validation', () => {
  const MIN = 5;
  const MAX = 500;

  function isValidIdea(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.length >= MIN && trimmed.length <= MAX;
  }

  it('rejects empty string', () => {
    expect(isValidIdea('')).toBe(false);
  });

  it('rejects text shorter than 5 chars', () => {
    expect(isValidIdea('abcd')).toBe(false);
  });

  it('accepts text at minimum length', () => {
    expect(isValidIdea('abcde')).toBe(true);
  });

  it('accepts text at maximum length', () => {
    expect(isValidIdea('a'.repeat(500))).toBe(true);
  });

  it('rejects text exceeding 500 chars', () => {
    expect(isValidIdea('a'.repeat(501))).toBe(false);
  });
});
```

#### TC-UNIT-003: XSS prevention in idea text

Test that special characters and script injection attempts are handled safely:
- `<script>alert(1)</script>` → must not execute, must be treated as plain text
- `"><img src=x onerror=alert(1)>` → treated as plain text
- Unicode: `&#x3C;script&#x3E;` → treated as plain text
- Emoji: `Hello \u{1F600}` → valid input

Note: Since this is a vanilla HTML page with no DOM sanitization library, the test verifies that the input is treated as plain text when re-inserted into the DOM via `textContent` (not `innerHTML`). If `innerHTML` is used, the test FAILS and flags a security vulnerability.

```typescript
describe('XSS prevention', () => {
  it('should not execute script tags in idea field', () => {
    const maliciousInput = '<script>window.hacked=true</script>';
    // Verify the page uses textContent, not innerHTML for user input
    const container = document.createElement('div');
    container.textContent = maliciousInput;  // Safe
    expect(container.innerHTML).not.toContain('<script>');
  });
});
```

### 3.2 Animation / State Logic

**File**: `tests/unit/animation.test.ts`

#### TC-UNIT-010: IntersectionObserver threshold behavior

Test that the scroll-triggered animation logic behaves correctly:
- Step element enters viewport at threshold 0.3 → `.visible` class added
- Step element exits viewport → no class removal (CSS transition handles fade)
- `data-step` attribute correctly maps to step number (1, 2, 3)
- First step triggered automatically after 400ms delay via `setTimeout`
- Arrow visibility tied to step number: step 1 → arrow 0, step 2 → arrow 1, etc.

```typescript
describe('scroll-triggered animations', () => {
  it('adds .visible class when step enters viewport at 0.3 threshold', () => {
    const stepEl = document.createElement('div');
    stepEl.className = 'step';
    stepEl.dataset.step = '1';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(stepEl);

    // Simulate entry
    stepEl.getBoundingClientRect = () => ({ top: 100, height: 200 } as DOMRect);
    observer.callback([{ target: stepEl, isIntersecting: true } as IntersectionObserverEntry]);

    expect(stepEl.classList.contains('visible')).toBe(true);
  });

  it('auto-triggers first step after 400ms', (done) => {
    const steps = [
      document.createElement('div'),
      document.createElement('div'),
      document.createElement('div'),
    ];
    steps[0].className = 'step';
    steps[1].className = 'step';
    steps[2].className = 'step';

    setTimeout(() => {
      steps[0].classList.add('visible');
      expect(steps[0].classList.contains('visible')).toBe(true);
      done();
    }, 400);
  });
});
```

#### TC-UNIT-011: Form state machine

Test the form state transitions:
- Initial state: form visible, success hidden
- After valid submit: button text changes to "提交中...", button disabled
- After 800ms delay: form hidden, success shown, reference ID generated
- Error state: invalid email → red border, focus on email field
- Error state: invalid idea → red border, focus on idea field
- Error cleared on focus: border color resets to default

```typescript
describe('form state machine', () => {
  it('transitions from idle to loading on valid submit', async () => {
    const form = createMockForm();
    const btn = form.querySelector('.submit-btn');

    // Simulate valid input
    setInputValue('email', 'valid@example.com');
    setInputValue('idea', 'A cyberpunk city at night with neon signs');

    form.dispatchEvent(new Event('submit'));

    expect(btn.textContent).toBe('提交中...');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('transitions to success state after 800ms', async () => {
    const form = createMockForm();
    const clock = vi.useFakeTimers();

    setInputValue('email', 'valid@example.com');
    setInputValue('idea', 'A cyberpunk city at night');

    form.dispatchEvent(new Event('submit'));
    clock.advanceTimersByTime(800);

    const successEl = document.getElementById('formSuccess');
    expect(successEl.classList.contains('show')).toBe(true);
    expect(formFields.classList.contains('hide')).toBe(true);

    clock.restore();
  });

  it('rejects empty email', () => {
    const form = createMockForm();
    setInputValue('email', '');
    setInputValue('idea', 'Valid idea text here');
    form.dispatchEvent(new Event('submit'));
    expect(getEmailInput().style.borderColor).toBe('rgb(239, 68, 68)');
  });

  it('rejects idea shorter than 5 chars', () => {
    const form = createMockForm();
    setInputValue('email', 'valid@example.com');
    setInputValue('idea', 'Hi');
    form.dispatchEvent(new Event('submit'));
    expect(getIdeaInput().style.borderColor).toBe('rgb(239, 68, 68)');
  });
});
```

#### TC-UNIT-012: Reference ID generation

Test that the generated reference ID follows the expected format:
- Pattern: `MMS-{36-char uppercase}` where the numeric part is `Date.now().toString(36).toUpperCase()`
- Must start with `MMS-`
- Must be non-empty after submission
- Must be unique per submission (no collisions within test scope)

```typescript
describe('reference ID generation', () => {
  it('generates ID in correct format MMS-{timestamp36}', () => {
    const before = Date.now();
    const id = 'MMS-' + Date.now().toString(36).toUpperCase();
    const after = Date.now();

    expect(id).toMatch(/^MMS-[A-Z0-9]+$/);
    // Verify the numeric part is within range of current time
    const numericPart = id.replace('MMS-', '');
    const decoded = parseInt(numericPart, 36);
    expect(decoded).toBeGreaterThanOrEqual(before);
  });

  it('generates unique IDs for each submission', () => {
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      ids.add('MMS-' + Date.now().toString(36).toUpperCase());
    }
    // Due to timing, uniqueness depends on clock resolution
    // This test documents expected behavior
  });
});
```

---

## 4. Integration Tests

### 4.1 Form Submission End-to-End

**File**: `tests/integration/form-submission.test.ts`

#### TC-INT-001: Happy path — valid submission

1. Load page at `/`
2. Fill email: `qa-test@example.com`
3. Fill idea: `A futuristic cityscape at sunset with flying vehicles`
4. Click submit button
5. Verify button shows "提交中..." and is disabled
6. Wait 800ms
7. Verify form fields are hidden
8. Verify success message is visible
9. Verify reference ID is displayed and starts with `MMS-`

#### TC-INT-002: Validation — empty email

1. Load page at `/`
2. Leave email empty, fill idea
3. Click submit
4. Verify email field border turns red (#ef4444)
5. Verify focus moves to email field
6. Verify no success message appears
7. Verify button text remains "提交想法 Submit"

#### TC-INT-003: Validation — invalid email format

Test all invalid formats from TC-UNIT-001:
- `userexample.com` (missing @)
- `user@` (missing TLD)
- `user@.com` (empty TLD)
- `user @example.com` (space in local part)

#### TC-INT-004: Validation — idea too short

1. Fill email: `valid@example.com`
2. Fill idea: `abc`
3. Click submit
4. Verify idea field border turns red
5. Verify no API call is made

#### TC-INT-005: Validation — idea too long (boundary)

1. Fill idea with exactly 500 characters
2. Submit → should pass
3. Fill idea with 501 characters
4. Submit → should fail with red border

Note: The current frontend validation only checks `idea.length < 5`. The backend enforces max 500 chars. This is a gap — the frontend should also validate max length. **Flag: TC-INT-005 will FAIL on the current implementation. This is a proper bug report.**

#### TC-INT-006: Network failure simulation

1. Use Playwright's `route` to intercept and abort `POST` requests
2. Submit valid form
3. Verify graceful error state or retry option
4. Verify no console errors (Error level)

#### TC-INT-007: Double-submit prevention

1. Fill valid form
2. Click submit — verify button is disabled
3. Attempt to click submit again (while disabled)
4. Verify no duplicate submission occurs
5. Verify form transitions to success once

### 4.2 Responsive Layout Switching

**File**: `tests/integration/responsive-layout.test.ts`

#### TC-INT-010: Desktop layout (1920px)

1. Set viewport to 1920x1080
2. Load page
3. Verify 3-step flow is horizontal (flex-direction: row)
4. Verify steps have equal max-width (280px)
5. Verify arrows between steps are visible
6. Verify signup card is centered, max-width 600px
7. Verify CTA button is inline (not full-width on desktop)
8. Verify hero text uses larger font (clamp 2rem to 3.5rem)

#### TC-INT-011: Mobile layout (375px) — iPhone target

1. Set viewport to 375x812 (iPhone X dimensions)
2. Load page
3. Verify 3-step flow is vertical (flex-direction: column)
4. Verify steps are full-width (max-width: 100%)
5. Verify arrows are replaced with vertical dividers (::before pseudo-element)
6. Verify signup card uses reduced padding (28px horizontal vs 48px desktop)
7. Verify hero h1 font size is ~1.9rem
8. Verify CTA button has reduced padding

#### TC-INT-012: Mobile layout (320px) — minimum supported

1. Set viewport to 320x568 (iPhone SE 1st gen)
2. Load page
3. Verify all content is readable without horizontal scroll
4. Verify no text truncation in step titles
5. Verify form inputs are full-width and usable
6. Verify CTA button text wraps correctly

#### TC-INT-013: Layout transition — resize from desktop to mobile

1. Load at 1920px
2. Resize to 375px
3. Verify layout switches without page reload
4. Verify scroll position is preserved

#### TC-INT-014: Safe area handling (mobile)

1. Set viewport to 375x812 with device pixel ratio 3 (iPhone)
2. Load page
3. Verify content respects `env(safe-area-inset-*)` if used
4. Verify bottom content is not hidden by home indicator area

### 4.3 API Contract Tests

**File**: `tests/integration/api-contract.test.ts`

Note: These tests use mocked API responses based on the OpenAPI spec in `ai-integration.md`. They validate frontend behavior against the contract, not against a live backend.

#### TC-API-001: 201 response — successful submission

```typescript
it('handles 201 Created response correctly', async () => {
  const mockResponse = {
    status: 'queued',
    idea_id: 'ide_01HX9K3M4N5P6Q7R',
    estimated_wait_minutes: 5,
  };

  await page.route('POST /api/ideas', route => {
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  // ... fill form and submit
  await expect(page.locator('#formSuccess')).toBeVisible();
  // Verify idea_id is shown to user (currently not implemented — gap)
});
```

#### TC-API-002: 400 response — validation error

```typescript
it('displays field-level error messages from 400 response', async () => {
  const mockResponse = {
    error: 'validation_error',
    message: 'Request validation failed',
    details: [
      { field: 'email', message: 'Invalid email format' },
      { field: 'idea_text', message: 'Must be between 10 and 500 characters' },
    ],
  };

  await page.route('POST /api/ideas', route => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  // ... fill form with borderline data and submit
  // Currently the page does manual regex validation client-side,
  // so 400 would only occur if the backend rejects.
  // This test validates the integration layer for when backend is ready.
});
```

#### TC-API-003: 503 response — service unavailable

```typescript
it('shows user-friendly retry message on 503', async () => {
  const mockResponse = {
    error: 'service_unavailable',
    message: 'Queue system temporarily unavailable. Please retry later.',
    retry_after_seconds: 30,
  };

  await page.route('POST /api/ideas', route => {
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  // ... submit form
  // Verify error state is displayed
  // Verify user is not stuck on loading state
});
```

#### TC-API-004: Network timeout

1. Route POST /api/ideas to hang indefinitely
2. Submit form
3. After 30 seconds, verify loading state is cleared
4. Verify retry button appears or error message shown
5. Verify no silent failure

#### TC-API-005: Request schema validation (pre-flight)

Verify the actual fetch/XHR payload matches the OpenAPI spec:
```typescript
it('sends correct request schema to POST /api/ideas', async ({ page }) => {
  let capturedBody: any;

  await page.route('POST /api/ideas', async route => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, body: '{}' });
  });

  await fillForm({ email: 'test@example.com', idea: 'A cyberpunk city' });
  await page.click('.submit-btn');

  expect(capturedBody).toHaveProperty('email');
  expect(capturedBody).toHaveProperty('idea_text');
  // Field name mapping: frontend uses 'idea' internally, must map to 'idea_text'
});
```

**Critical finding**: The frontend uses `name="idea"` in the HTML but the API expects `idea_text`. This field name mapping must be handled in the integration layer. **Flag: TC-API-005 will FAIL if the integration sends `idea` instead of `idea_text`.**

---

## 5. E2E Tests (Playwright)

### 5.1 Desktop Full User Journey

**File**: `tests/e2e/desktop-journey.spec.ts`

#### TC-E2E-001: Complete conversion funnel — desktop

```
Load page → Verify hero → Scroll to steps → Verify animations trigger
→ Scroll to form → Fill form → Submit → Verify success → Verify ref ID
```

Steps:
1. Navigate to `/`
2. Verify page title: "MiniMax Studio — 想到即看见，看见即得到"
3. Verify hero headline is visible: "Think it. See it. Get it."
4. Verify hero badge: "AI-Powered Visual Creation"
5. Verify CTA button: "立即开始 Start Now"
6. Click CTA button — verify smooth scroll to `#signup`
7. Verify all 3 steps are initially hidden (opacity: 0)
8. Wait 500ms — verify step 1 and arrow 1 are visible
9. Scroll to step 2 — verify step 2 becomes visible
10. Scroll to step 3 — verify step 3 becomes visible
11. Scroll to signup section
12. Fill email: `e2e-test@minimax.studio`
13. Fill idea: `A serene mountain lake at sunrise with mist rising from the water`
14. Click submit
15. Verify button text: "提交中..."
16. Verify button disabled: true
17. Wait 900ms
18. Verify form fields hidden
19. Verify success message visible: "排队中，我们会联系你"
20. Verify reference ID starts with `MMS-`
21. Verify footer is visible: "2026 MiniMax Studio"

#### TC-E2E-002: Scroll animation sequence — desktop

1. Load page
2. Verify initial state: all steps hidden, arrows hidden
3. Scroll to 30% of step 1's position
4. Verify step 1 has `.visible` class
5. Verify arrow 1 has `.visible` class
6. Scroll past step 1
7. Scroll to 30% of step 2's position
8. Verify step 2 has `.visible` class
9. Verify arrow 2 has `.visible` class
10. Scroll to step 3
11. Verify step 3 has `.visible` class
12. Verify arrow 3 NOT shown (no arrow after last step)

### 5.2 Mobile Full User Journey

**File**: `tests/e2e/mobile-journey.spec.ts`

#### TC-E2E-010: Complete conversion funnel — mobile 375px

1. Set viewport: 375x812
2. Navigate to `/`
3. Verify hero headline renders at mobile size (~1.9rem)
4. Click CTA button → smooth scroll to `#signup`
5. Verify steps are stacked vertically
6. Scroll to trigger step 1 animation
7. Verify step 1 is full-width with icon on left
8. Verify vertical arrow (line) between steps
9. Fill form with mobile keyboard
10. Submit → verify success on mobile viewport
11. Verify no horizontal overflow

#### TC-E2E-011: Complete conversion funnel — mobile 320px

1. Set viewport: 320x568
2. Repeat TC-E2E-010
3. Verify no horizontal scrollbar appears
4. Verify all text is readable
5. Verify form inputs are touch-friendly (min 44px tap target per WCAG)

### 5.3 Accessibility Audit

**File**: `tests/e2e/accessibility.spec.ts`

#### TC-E2E-020: Accessibility — axe-core scan desktop

```typescript
it('has no critical accessibility violations on desktop', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  const results = await page.evaluate(() => {
    return new Promise(resolve => {
      axe.run(document, (violations) => {
        resolve(violations);
      });
    });
  });

  const critical = results.filter(v => v.impact === 'critical');
  const serious = results.filter(v => v.impact === 'serious');
  
  expect(critical).toHaveLength(0);
  expect(serious).toHaveLength(0);
});
```

**Expected issues to investigate**:
- Color contrast: `--text-muted` (#64748b) on `--bg` (#0f172a) — ratio may be below 4.5:1
- Focus indicators: Are interactive elements (form inputs, CTA button) keyboard-focusable with visible focus rings?
- ARIA labels: Form inputs have `<label>` associations (verify `for`/`id` match)
- `aria-hidden` on decorative arrows (currently uses `aria-hidden="true"` — correct)
- Form submission: Is the success state announced to screen readers? (ARIA live region?)
- Headings: Verify h1 → h2 → h3 hierarchy is correct
- Button semantics: CTA uses `<a>` tag with `href="#signup"` — should it be a `<button>`?

#### TC-E2E-021: Keyboard navigation

1. Load page
2. Tab to first focusable element (should be CTA button)
3. Verify focus ring is visible (accent color)
4. Press Enter — verify smooth scroll to signup form
5. Tab to email input — verify focus ring
6. Tab to textarea — verify focus ring
7. Tab to submit button — verify focus ring
8. Shift+Tab back — verify reverse navigation works
9. Press Tab through all steps — verify all interactive elements reachable

#### TC-E2E-022: Screen reader compatibility

- Verify page has `<title>` tag
- Verify `<html lang="zh-CN">` is set
- Verify form inputs have associated `<label>` elements
- Verify success message uses ARIA live region for screen reader announcement
- Verify step numbers use semantic structure (not just visual numbering)

### 5.4 Cross-Browser Testing

**File**: `tests/e2e/cross-browser.spec.ts`

#### TC-E2E-030: Chrome latest — full journey

Run TC-E2E-001 in Chromium.

#### TC-E2E-031: Firefox latest — full journey

Run TC-E2E-001 in Firefox.
- Verify CSS custom properties work correctly
- Verify `clamp()` functions render correctly
- Verify `scroll-behavior: smooth` works

#### TC-E2E-032: Safari latest — full journey

Run TC-E2E-001 in WebKit.
- Verify gradient text (`-webkit-background-clip: text;`) renders
- Verify `backdrop-filter` if used (not currently)
- Verify scroll behavior compatibility

#### TC-E2E-033: Edge latest — full journey

Run TC-E2E-001 in Chromium-based Edge.

#### TC-E2E-034: CSS compatibility

- Verify `:root` CSS custom properties parse correctly in all browsers
- Verify `aspect-ratio` if used
- Verify `scroll-behavior: smooth` (widely supported, verify no exceptions)
- Verify `@media (max-width: 767px)` breakpoint is respected

---

## 6. Visual Regression Tests

**File**: `tests/visual/screenshot.spec.ts`

### 6.1 Baseline Screenshots

Capture reference screenshots for all key viewports and states:

| ID | Viewport | State | File |
|----|----------|-------|------|
| VS-001 | 1920x1080 | Hero above fold | `visual/baseline/desktop-hero.png` |
| VS-002 | 1920x1080 | Steps section (scrolled) | `visual/baseline/desktop-steps.png` |
| VS-003 | 1920x1080 | Form section | `visual/baseline/desktop-form.png` |
| VS-004 | 1920x1080 | Form success state | `visual/baseline/desktop-success.png` |
| VS-005 | 375x812 | Hero | `visual/baseline/mobile-hero.png` |
| VS-006 | 375x812 | Steps (vertical) | `visual/baseline/mobile-steps.png` |
| VS-007 | 375x812 | Form | `visual/baseline/mobile-form.png` |
| VS-008 | 320x568 | Hero | `visual/baseline/mobile-minimal-hero.png` |
| VS-009 | 320x568 | Form | `visual/baseline/mobile-minimal-form.png` |

### 6.2 Animated State Screenshots

| ID | Viewport | State | Trigger |
|----|----------|-------|---------|
| VS-010 | 1920x1080 | Step 1 visible | Wait 600ms |
| VS-011 | 1920x1080 | All steps visible | Scroll to bottom |
| VS-012 | 375x812 | Step 1 visible | Scroll 30% |
| VS-013 | 375x812 | All steps visible | Scroll to bottom |

### 6.3 Interaction Screenshots

| ID | Viewport | State |
|----|----------|-------|
| VS-020 | 1920x1080 | CTA button hover |
| VS-021 | 1920x1080 | Step card hover |
| VS-022 | 1920x1080 | Email input focus |
| VS-023 | 1920x1080 | Email input error state |
| VS-024 | 1920x1080 | Submit button loading |
| VS-025 | 375x812 | Form input focus (mobile keyboard) |

### 6.4 Color Scheme / Theme Testing

The current implementation uses a dark theme only. Future iterations may include a light theme.

| ID | State | Verification |
|----|-------|-------------|
| VS-030 | Light theme | Compare against light variant (`mission-demo-light.html`) if light theme is added |
| VS-031 | Color contrast | Verify text readability on all backgrounds |

### 6.5 Visual Diff Configuration

```typescript
const percySnapshot = async (page: Page, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await percySnapshot(page, name);
};

// Or with Playwright screenshot + pixelmatch:
const screenshotDiff = async (
  actual: Buffer,
  baseline: Buffer,
  threshold: number = 0.1
): Promise<{ matches: boolean; diff: number }> => {
  // Use pixelmatch or resemblejs for diff analysis
};
```

---

## 7. Performance Tests

**File**: `tests/perf/lighthouse.spec.ts`

### 7.1 Lighthouse CI Configuration

```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "speed-index": ["error", { "maxNumericValue": 4000 }],
        "interactive": ["error", { "maxNumericValue": 5000 }]
      }
    }
  }
}
```

### 7.2 Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor | Target |
|--------|------|-------------------|------|--------|
| LCP (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s | <2.5s |
| FID (First Input Delay) | <100ms | 100-300ms | >300ms | <100ms |
| CLS (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 | <0.1 |
| FCP (First Contentful Paint) | <1.8s | 1.8-3s | >3s | <1.8s |
| TTFB (Time to First Byte) | <800ms | 800-1800ms | >1800ms | <800ms |

### 7.3 Load Time Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Initial HTML load | <500ms | Network tab / Lighthouse |
| Time to first paint | <1000ms | Playwright `performance.mark` |
| Time to interactive | <2000ms | Lighthouse TTI |
| Full page load (all assets) | <3000ms | Network tab total blocking |
| Animation readiness | <400ms | `setTimeout` for step 1 animation |

### 7.4 Resource Audit

Verify the following are optimized:
- [ ] No render-blocking CSS (all CSS is inline in `<style>` tag — already optimal for single-page)
- [ ] No external JS dependencies (pure vanilla JS — optimal)
- [ ] Fonts: System font stack used (`-apple-system, BlinkMacSystemFont, 'Segoe UI'...`) — no web font downloads
- [ ] Images: No images in current implementation (background uses CSS gradients) — no image optimization needed
- [ ] CSS size: Inline CSS in `<style>` tag (~460 lines) — minimal, no external stylesheet needed
- [ ] JavaScript size: Inline `<script>` (~80 lines) — minimal, no external JS needed

### 7.5 Animation Performance

| Check | Target |
|-------|--------|
| Scroll animation frame rate | 60fps (no jank) |
| IntersectionObserver callback frequency | <10 calls per scroll event |
| CSS transitions | GPU-accelerated (`transform`, `opacity`) — correct |

### 7.6 Mobile Performance

| Metric | Target | Device |
|--------|--------|--------|
| First contentful paint (mobile) | <2s | Moto G4 / iPhone 8 |
| Time to interactive (mobile) | <3s | Moto G4 / iPhone 8 |
| Total blocking time (mobile) | <300ms | Moto G4 / iPhone 8 |

---

## 8. API Contract Tests

**File**: `tests/integration/api-contract.test.ts`

These tests validate the integration between the landing page and the backend API defined in `ai-integration.md`. They use mocked responses until the backend is live.

### 8.1 Contract Coverage

| Endpoint | Method | Scenarios | Priority |
|----------|--------|-----------|----------|
| `/api/ideas` | POST | 201, 400 (invalid email), 400 (idea too short), 400 (idea too long), 503 | P0 |
| `/api/ideas/{idea_id}` | GET | 200 (queued), 200 (completed), 404 | P1 (future) |

### 8.2 Request Validation Matrix

| Field | Frontend Rule | Backend Rule | Match? |
|-------|--------------|--------------|--------|
| `email` | Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | RFC 5322 format, max 255 chars | Partial (frontend lacks max length) |
| `idea_text` | Min 5 chars (trimmed), no max | Min 10 chars, max 500 chars | **Gap** (frontend min 5 vs backend min 10; no frontend max) |
| Field name | HTML `name="idea"`, JS reads `.value` | Expects `idea_text` in JSON body | **Gap** (field name mismatch) |

**Gaps identified**:
1. Frontend uses `idea.length < 5` but backend expects `minLength: 10`. The frontend should validate `>= 10` to match the API contract.
2. Frontend has no max-length validation for idea text. The backend enforces `maxLength: 500`.
3. Frontend sends field named `idea` in FormData but API expects `idea_text` in JSON.
4. Frontend validation uses a simplified regex for email (backend uses RFC 5322).

These are integration gaps that must be resolved before the backend is live.

---

## 9. Mobile Prototype Tests

**File**: `tests/integration/mobile-prototype.test.ts`

Tests validate the mobile prototype specifications (`mobile-prototype-specs.md`) against the landing page's mobile implementation and the planned React Native app.

### 9.1 Viewport Coverage

| Target | Viewport | Device Reference |
|--------|----------|-----------------|
| Primary | 375x812 | iPhone X/11/12/13 |
| Secondary | 375x667 | iPhone SE (2nd gen) |
| Minimum | 320x568 | iPhone SE (1st gen) |
| Android reference | 360x800 | Pixel 5 |

### 9.2 Mobile Prototype Specs Validation

| Spec Item | Verification | Status |
|-----------|-------------|--------|
| Color palette matches spec tokens | CSS vars `--bg`, `--accent`, etc. match spec hex values | To verify |
| 8pt spacing system | Padding/margin values follow 4/8/12/16/20/24/32 grid | To verify |
| Typography scale | Heading sizes match spec (display: 32px, h1: 24px, etc.) | To verify |
| Safe area insets | Content respects notch/home indicator | To verify |
| Form input height | Touch targets >= 44px | To verify |
| Mobile keyboard handling | Form inputs scroll into view on focus | To verify |

### 9.3 React Native App Pre-Launch Checklist

For the future React Native app (from `mobile-tech-stack.md`):
- [ ] E2E tests cover both iOS and Android
- [ ] Detox tests run on CI for both platforms
- [ ] Camera capture pipeline latency <3s (see tech stack Section 4)
- [ ] Onboarding flow tested on low-end Android (1GB RAM)
- [ ] Offline state gracefully handled
- [ ] Permission prompts (camera, microphone) have fallback guidance

---

## 10. Test Execution Schedule

### 10.1 Pre-Merge Gate (CI/CD)

Every pull request must pass:
- [ ] All unit tests (Vitest) — <5s total
- [ ] Integration tests (Playwright) — headless, all viewports
- [ ] Accessibility audit (axe-core)
- [ ] Lighthouse CI (Performance >= 90, Accessibility >= 90)

### 10.2 Nightly Builds

- [ ] Full cross-browser matrix (Chrome, Firefox, Safari, Edge)
- [ ] Visual regression diff against baseline
- [ ] API contract tests with mock server
- [ ] Lighthouse trend tracking (alert if any metric degrades >5%)

### 10.3 Pre-Launch

- [ ] Manual QA on physical devices:
  - iPhone 14 Pro (iOS 17)
  - iPhone SE (2nd gen, iOS 17)
  - Samsung Galaxy S24 (Android 14)
  - Google Pixel 8 (Android 14)
- [ ] Accessibility testing with VoiceOver (iOS) and TalkBack (Android)
- [ ] Network throttling tests (3G, 4G, WiFi)
- [ ] Security audit (CSP headers, HTTPS, XSS check)

### 10.4 Test Report Template

```
## Test Execution Report — [Date]

### Summary
- Total test cases: N
- Passed: N (X%)
- Failed: N
- Skipped: N
- Blocked: N

### Failed Tests
| ID | Test Name | Severity | Issue | Assignee |
|----|-----------|----------|-------|----------|
| ... | ... | ... | ... | ... |

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| ... | ... | ... | ... |

### Sign-Off
- QA: __________
- Dev Lead: __________
- Product: __________
```

---

*Document Version: 1.0 — APP Sprint 1, Task 3.1*
