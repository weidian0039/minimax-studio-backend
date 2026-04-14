# MiniMax Studio — QA Checklist

**Product**: MiniMax Studio Landing Page + Mobile Prototype
**Vision**: "Think it. See it. Get it." / "想到即看见，看见即得到"
**Version**: 1.0
**Date**: 2026-04-09
**Status**: Draft for Sprint 1 Launch Readiness
**Author**: QA Engineer

This checklist covers all quality gates required for launch. Check every item before going live.

---

## Table of Contents

1. [Functional Completeness](#1-functional-completeness)
2. [Browser Compatibility](#2-browser-compatibility)
3. [Mobile Responsiveness](#3-mobile-responsiveness)
4. [Accessibility (WCAG 2.1 AA)](#4-accessibility-wcag-21-aa)
5. [Performance](#5-performance)
6. [Security](#6-security)
7. [SEO](#7-seo)
8. [Error States & Edge Cases](#8-error-states--edge-cases)
9. [Visual Quality](#9-visual-quality)
10. [API Integration](#10-api-integration)
11. [Content & Localization](#11-content--localization)
12. [Pre-Launch Final Sign-Off](#12-pre-launch-final-sign-off)

---

## 1. Functional Completeness

### 1.1 Navigation & CTAs

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 1.1.1 | Logo and brand name are visible in navigation | [ ] | [ ] | |
| 1.1.2 | "Beta" badge displays next to logo | [ ] | [ ] | |
| 1.1.3 | Hero CTA button "立即开始 Start Now" is visible and clickable | [ ] | [ ] | |
| 1.1.4 | CTA button scrolls smoothly to `#signup` section | [ ] | [ ] | |
| 1.1.5 | No dead links or broken buttons on the page | [ ] | [ ] | |

### 1.2 Hero Section

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 1.2.1 | Hero badge "AI-Powered Visual Creation" is visible | [ ] | [ ] | |
| 1.2.2 | Hero headline "Think it. See it. Get it." renders correctly | [ ] | [ ] | |
| 1.2.3 | Gradient text styling applied to "See it." | [ ] | [ ] | |
| 1.2.4 | Hero subtitle in Chinese displays correctly | [ ] | [ ] | |
| 1.2.5 | Page background grid pattern is visible | [ ] | [ ] | |

### 1.3 Three-Step Flow

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 1.3.1 | Step 01 "想到" card is visible with icon, title, description | [ ] | [ ] | |
| 1.3.2 | Step 02 "看见" card is visible with icon, title, description | [ ] | [ ] | |
| 1.3.3 | Step 03 "得到" card is visible with icon, title, description | [ ] | [ ] | |
| 1.3.4 | Latency labels display correctly on each step | [ ] | [ ] | |
| 1.3.5 | Arrows between steps are visible on desktop | [ ] | [ ] | |
| 1.3.6 | Scroll-triggered animations trigger correctly (IntersectionObserver at 30% threshold) | [ ] | [ ] | |
| 1.3.7 | Step 1 auto-triggers after 400ms even without scroll | [ ] | [ ] | |
| 1.3.8 | All steps remain visible after appearing (no re-hiding) | [ ] | [ ] | |

### 1.4 Signup Form

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 1.4.1 | Email input field is present with correct label | [ ] | [ ] | |
| 1.4.2 | Idea textarea field is present with correct label | [ ] | [ ] | |
| 1.4.3 | Submit button reads "提交想法 Submit" | [ ] | [ ] | |
| 1.4.4 | Form submits on button click | [ ] | [ ] | |
| 1.4.5 | Form submits on Enter key in email field | [ ] | [ ] | |
| 1.4.6 | Form does NOT submit when Enter is pressed in textarea | [ ] | [ ] | |
| 1.4.7 | Success message "排队中，我们会联系你" displays after submission | [ ] | [ ] | |
| 1.4.8 | Reference ID (MMS-xxxxxxxx) displays in success state | [ ] | [ ] | |
| 1.4.9 | Button text changes to "提交中..." during submission | [ ] | [ ] | |
| 1.4.10 | Button is disabled during submission | [ ] | [ ] | |
| 1.4.11 | Form fields are hidden after successful submission | [ ] | [ ] | |
| 1.4.12 | Multiple rapid clicks do not create duplicate submissions | [ ] | [ ] | |

### 1.5 Footer

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 1.5.1 | Footer renders with copyright text | [ ] | [ ] | |
| 1.5.2 | Copyright year is correct (2026) | [ ] | [ ] | |

---

## 2. Browser Compatibility

Test all checkpoints on the specified browsers. Use real browsers or Playwright with headed mode.

### 2.1 Chrome (Desktop)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 2.1.1 | Page loads without crash | [ ] | [ ] | |
| 2.1.2 | CSS custom properties (dark theme colors) render correctly | [ ] | [ ] | |
| 2.1.3 | Gradient text renders correctly | [ ] | [ ] | |
| 2.1.4 | Scroll animations trigger and complete without jank | [ ] | [ ] | |
| 2.1.5 | Form validation (email, idea) works correctly | [ ] | [ ] | |
| 2.1.6 | Smooth scroll behavior works | [ ] | [ ] | |
| 2.1.7 | No console errors (Error level) | [ ] | [ ] | |
| 2.1.8 | No layout shifts after page load (CLS check) | [ ] | [ ] | |

### 2.2 Firefox (Desktop)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 2.2.1 | Page loads without crash | [ ] | [ ] | |
| 2.2.2 | Dark theme colors render correctly | [ ] | [ ] | |
| 2.2.3 | Gradient text renders correctly | [ ] | [ ] | |
| 2.2.4 | Scroll animations work | [ ] | [ ] | |
| 2.2.5 | Form submission flow works | [ ] | [ ] | |
| 2.2.6 | No console errors (Error level) | [ ] | [ ] | |

### 2.3 Safari (Desktop/macOS)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 2.3.1 | Page loads without crash | [ ] | [ ] | |
| 2.3.2 | `-webkit-background-clip: text` gradient renders | [ ] | [ ] | |
| 2.3.3 | System font stack renders correctly (SF Pro Display, SF Mono) | [ ] | [ ] | |
| 2.3.4 | Smooth scroll works | [ ] | [ ] | |
| 2.3.5 | Form submission flow works | [ ] | [ ] | |
| 2.3.6 | No WebKit-specific rendering issues | [ ] | [ ] | |
| 2.3.7 | No console errors (Error level) | [ ] | [ ] | |

### 2.4 Microsoft Edge

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 2.4.1 | Page loads without crash | [ ] | [ ] | |
| 2.4.2 | All content renders correctly | [ ] | [ ] | |
| 2.4.3 | Form submission flow works | [ ] | [ ] | |
| 2.4.4 | No console errors (Error level) | [ ] | [ ] | |

---

## 3. Mobile Responsiveness

### 3.1 iPhone (375px width)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 3.1.1 | Page renders without horizontal overflow | [ ] | [ ] | |
| 3.1.2 | Hero headline renders at ~1.9rem (not clipped) | [ ] | [ ] | |
| 3.1.3 | Steps stack vertically (not horizontal) | [ ] | [ ] | |
| 3.1.4 | Step icons are on the left, text flows on the right | [ ] | [ ] | |
| 3.1.5 | Arrows are replaced with vertical dividers | [ ] | [ ] | |
| 3.1.6 | Signup card has reduced padding (28px horizontal) | [ ] | [ ] | |
| 3.1.7 | Form inputs are full-width | [ ] | [ ] | |
| 3.1.8 | CTA button fits within viewport width | [ ] | [ ] | |
| 3.1.9 | No horizontal scrollbar appears | [ ] | [ ] | |
| 3.1.10 | Scroll animations trigger correctly on mobile | [ ] | [ ] | |

### 3.2 iPhone SE / Small Phone (320px width)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 3.2.1 | All text is readable (no truncation) | [ ] | [ ] | |
| 3.2.2 | Form inputs are fully visible and usable | [ ] | [ ] | |
| 3.2.3 | CTA button text wraps correctly if needed | [ ] | [ ] | |
| 3.2.4 | No horizontal overflow | [ ] | [ ] | |
| 3.2.5 | Step titles not clipped | [ ] | [ ] | |

### 3.3 iOS Safari (Testing Notes)

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 3.3.1 | Viewport meta tag prevents unwanted zooming | [ ] | [ ] | |
| 3.3.2 | Form inputs do not cause viewport issues on focus | [ ] | [ ] | |
| 3.3.3 | Safe area insets respected (notch/home indicator) | [ ] | [ ] | |
| 3.3.4 | Keyboard does not obscure form fields | [ ] | [ ] | |

### 3.4 Android Chrome

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 3.4.1 | Page renders correctly at 375px | [ ] | [ ] | |
| 3.4.2 | Page renders correctly at 360px (common Android width) | [ ] | [ ] | |
| 3.4.3 | Touch targets are >= 44px | [ ] | [ ] | |
| 3.4.4 | Form submission works on touch | [ ] | [ ] | |

### 3.5 Layout Breakpoints

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 3.5.1 | Desktop layout (>= 768px): horizontal steps, centered content | [ ] | [ ] | |
| 3.5.2 | Mobile layout (< 768px): vertical steps, reduced padding | [ ] | [ ] | |
| 3.5.3 | No layout shift when resizing between breakpoints | [ ] | [ ] | |

---

## 4. Accessibility (WCAG 2.1 AA)

### 4.1 Perceivable

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 4.1.1 | All text has color contrast ratio >= 4.5:1 (normal text) | [ ] | [ ] | Check: `--text-muted` (#64748b) on `--bg` (#0f172a) |
| 4.1.2 | Large text (>= 18pt or >= 14pt bold) has contrast >= 3:1 | [ ] | [ ] | |
| 4.1.3 | No information conveyed by color alone | [ ] | [ ] | (Error states also show icon + border color) |
| 4.1.4 | All images have alt text or are marked decorative | [ ] | [ ] | (No images currently; verify if added) |
| 4.1.5 | Decorative elements use `aria-hidden="true"` | [ ] | [ ] | Arrows currently use this correctly |

### 4.2 Operable

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 4.2.1 | All interactive elements are keyboard-accessible | [ ] | [ ] | |
| 4.2.2 | Tab key navigates through all focusable elements | [ ] | [ ] | |
| 4.2.3 | Focus indicator is visible on all interactive elements | [ ] | [ ] | Check: focus ring uses `box-shadow` on input focus |
| 4.2.4 | No keyboard traps | [ ] | [ ] | |
| 4.2.5 | Page has skip-to-content link (if needed) | [ ] | [ ] | For a single-page landing, may not be required |
| 4.2.6 | CTA button is activatable via Enter key | [ ] | [ ] | |
| 4.2.7 | Submit button is activatable via Enter key | [ ] | [ ] | |
| 4.2.8 | Page title updates appropriately | [ ] | [ ] | |
| 4.2.9 | No content flashes or blinks | [ ] | [ ] | |

### 4.3 Understandable

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 4.3.1 | Page has `<html lang="zh-CN">` set | [ ] | [ ] | Currently correct |
| 4.3.2 | Form inputs have associated `<label>` elements | [ ] | [ ] | Verify `for`/`id` attributes match |
| 4.3.3 | Error messages are clear and in the user's language | [ ] | [ ] | |
| 4.3.4 | Placeholder text does not serve as the only label | [ ] | [ ] | Placeholder used as hint; label present |
| 4.3.5 | Semantic heading hierarchy is correct (h1 > h2 > h3) | [ ] | [ ] | |

### 4.4 Robust

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 4.4.1 | Valid HTML (use W3C validator) | [ ] | [ ] | |
| 4.4.2 | No duplicate IDs in the DOM | [ ] | [ ] | |
| 4.4.3 | ARIA attributes are valid and used correctly | [ ] | [ ] | |
| 4.4.4 | Page works with screen reader (VoiceOver/NVDA) | [ ] | [ ] | |
| 4.4.5 | Success state is announced to screen readers | [ ] | [ ] | **Gap**: No ARIA live region on `#formSuccess` |

### 4.5 Screen Reader Testing

| # | Screen Reader | Checkpoint | Pass | Fail | Notes |
|---|---------------|-----------|:----:|:----:|-------|
| 4.5.1 | VoiceOver (macOS Safari) | Page title announced | [ ] | [ ] | |
| 4.5.2 | VoiceOver | Form labels announced correctly | [ ] | [ ] | |
| 4.5.3 | VoiceOver | Submit button announced | [ ] | [ ] | |
| 4.5.4 | VoiceOver | Success message announced after submit | [ ] | [ ] | |
| 4.5.5 | NVDA (Windows Firefox) | All checkpoints above | [ ] | [ ] | |

---

## 5. Performance

### 5.1 Lighthouse Scores

| # | Metric | Target | Actual | Pass | Fail | Notes |
|---|--------|--------|--------|:----:|:----:|-------|
| 5.1.1 | Performance score | >= 90 | | [ ] | [ ] | |
| 5.1.2 | Accessibility score | >= 90 | | [ ] | [ ] | |
| 5.1.3 | Best Practices score | >= 90 | | [ ] | [ ] | |
| 5.1.4 | SEO score | >= 90 | | [ ] | [ ] | |
| 5.1.5 | First Contentful Paint (FCP) | < 1.8s | | [ ] | [ ] | |
| 5.1.6 | Largest Contentful Paint (LCP) | < 2.5s | | [ ] | [ ] | |
| 5.1.7 | Total Blocking Time (TBT) | < 300ms | | [ ] | [ ] | |
| 5.1.8 | Cumulative Layout Shift (CLS) | < 0.1 | | [ ] | [ ] | |
| 5.1.9 | Speed Index | < 4.0s | | [ ] | [ ] | |
| 5.1.10 | Time to Interactive (TTI) | < 3.8s | | [ ] | [ ] | |

### 5.2 Load Time Benchmarks

| # | Metric | Target | Pass | Fail | Notes |
|---|--------|--------|:----:|:----:|-------|
| 5.2.1 | Initial HTML response | < 500ms | [ ] | [ ] | |
| 5.2.2 | First paint | < 1s | [ ] | [ ] | |
| 5.2.3 | Full page interactive | < 2s | [ ] | [ ] | |
| 5.2.4 | All resources loaded | < 3s | [ ] | [ ] | |

### 5.3 Animation Performance

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 5.3.1 | Scroll animations run at 60fps (no visible jank) | [ ] | [ ] | |
| 5.3.2 | Step reveal animation is smooth (opacity + translateY) | [ ] | [ ] | |
| 5.3.3 | No CSS animation causes layout reflow | [ ] | [ ] | |
| 5.3.4 | Animations use GPU-accelerated properties only | [ ] | [ ] | |

### 5.4 Resource Efficiency

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 5.4.1 | No external JavaScript files loaded | [ ] | [ ] | All JS is inline |
| 5.4.2 | No external CSS files loaded | [ ] | [ ] | All CSS is inline |
| 5.4.3 | No web font downloads (system fonts used) | [ ] | [ ] | |
| 5.4.4 | Total CSS size < 20KB | [ ] | [ ] | ~15KB inline |
| 5.4.5 | Total JS size < 5KB | [ ] | [ ] | ~2KB inline |
| 5.4.6 | No third-party tracking scripts | [ ] | [ ] | |
| 5.4.7 | No unnecessary polyfills | [ ] | [ ] | |

---

## 6. Security

### 6.1 Transport Security

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 6.1.1 | Site is served over HTTPS in production | [ ] | [ ] | |
| 6.1.2 | No mixed content (HTTP resources on HTTPS page) | [ ] | [ ] | |
| 6.1.3 | HSTS header present (production) | [ ] | [ ] | |

### 6.2 Content Security Policy

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 6.2.1 | CSP header is configured | [ ] | [ ] | |
| 6.2.2 | `script-src` restricts inline scripts appropriately | [ ] | [ ] | |
| 6.2.3 | `default-src` is set to restrict | [ ] | [ ] | |
| 6.2.4 | `object-src: 'none'` is set | [ ] | [ ] | |
| 6.2.5 | X-Frame-Options or CSP frame-ancestors is set | [ ] | [ ] | |

### 6.3 Input Sanitization

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 6.3.1 | User input is set via `textContent` (not `innerHTML`) | [ ] | [ ] | Verify in JS code |
| 6.3.2 | XSS payloads in idea field do not execute | [ ] | [ ] | Test: `<script>alert(1)</script>` |
| 6.3.3 | HTML entities are escaped if rendered | [ ] | [ ] | |
| 6.3.4 | No `eval()` or `new Function()` used with user input | [ ] | [ ] | |
| 6.3.5 | Form input is trimmed before validation | [ ] | [ ] | `value.trim()` used |

### 6.4 Console & Error Handling

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 6.4.1 | No console.error calls in production code | [ ] | [ ] | |
| 6.4.2 | No unhandled promise rejections | [ ] | [ ] | |
| 6.4.3 | No uncaught exceptions | [ ] | [ ] | |
| 6.4.4 | Network failures show user-friendly error | [ ] | [ ] | |
| 6.4.5 | Error messages do not leak sensitive information | [ ] | [ ] | |

### 6.5 Form Security

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 6.5.1 | CSRF token present on form (when backend is ready) | [ ] | [ ] | Backend feature |
| 6.5.2 | Rate limiting documented or implemented | [ ] | [ ] | Backend feature |
| 6.5.3 | No sensitive data in URL parameters | [ ] | [ ] | |
| 6.5.4 | Email input has `autocomplete="email"` attribute | [ ] | [ ] | |
| 6.5.5 | Password fields use `autocomplete` appropriately | [ ] | [ ] | N/A for this page |

---

## 7. SEO

### 7.1 On-Page SEO

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 7.1.1 | Page has `<title>` tag with brand + tagline | [ ] | [ ] | "MiniMax Studio — 想到即看见，看见即得到" |
| 7.1.2 | Page has single `<h1>` element | [ ] | [ ] | |
| 7.1.3 | Heading hierarchy is logical (h1 > h2 > h3) | [ ] | [ ] | |
| 7.1.4 | `<meta name="description">` is present | [ ] | [ ] | |
| 7.1.5 | `<meta name="viewport">` is correctly set | [ ] | [ ] | |
| 7.1.6 | Canonical URL is set | [ ] | [ ] | |
| 7.1.7 | `lang` attribute is set on `<html>` | [ ] | [ ] | Currently `lang="zh-CN"` |
| 7.1.8 | No duplicate content issues | [ ] | [ ] | |

### 7.2 Open Graph / Social Tags

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 7.2.1 | `<meta property="og:title">` is present | [ ] | [ ] | |
| 7.2.2 | `<meta property="og:description">` is present | [ ] | [ ] | |
| 7.2.3 | `<meta property="og:type">` is present | [ ] | [ ] | |
| 7.2.4 | `<meta property="og:url">` is present | [ ] | [ ] | |
| 7.2.5 | `<meta name="twitter:card">` is present | [ ] | [ ] | |
| 7.2.6 | OG image meta tag is present | [ ] | [ ] | Optional for now |
| 7.2.7 | All OG tags are filled with accurate content | [ ] | [ ] | |

### 7.3 Technical SEO

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 7.3.1 | robots.txt is present and configured | [ ] | [ ] | |
| 7.3.2 | sitemap.xml is present | [ ] | [ ] | |
| 7.3.3 | Page renders content without JavaScript | [ ] | [ ] | Progressive enhancement check |
| 7.3.4 | No render-blocking resources | [ ] | [ ] | Inline CSS/JS is optimal |
| 7.3.5 | Structured data / schema markup (if applicable) | [ ] | [ ] | |

### 7.4 Performance for SEO

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 7.4.1 | Core Web Vitals meet thresholds (see Section 5) | [ ] | [ ] | |
| 7.4.2 | Mobile-first rendering is correct | [ ] | [ ] | |
| 7.4.3 | No intrusive interstitials | [ ] | [ ] | |

---

## 8. Error States & Edge Cases

### 8.1 Form Validation Errors

| # | Scenario | Expected Behavior | Pass | Fail | Notes |
|---|----------|------------------|:----:|:----:|-------|
| 8.1.1 | Submit with empty email | Red border, focus on email | [ ] | [ ] | |
| 8.1.2 | Submit with empty idea | Red border, focus on idea | [ ] | [ ] | |
| 8.1.3 | Submit with invalid email (no @) | Red border, focus on email | [ ] | [ ] | |
| 8.1.4 | Submit with invalid email (no TLD) | Red border, focus on email | [ ] | [ ] | |
| 8.1.5 | Submit with idea < 5 chars | Red border, focus on idea | [ ] | [ ] | |
| 8.1.6 | Submit with idea = 5 chars | Accept (current min=5, backend min=10 — gap) | [ ] | [ ] | |
| 8.1.7 | Submit with idea > 500 chars | Backend should reject (frontend has no max check) | [ ] | [ ] | |
| 8.1.8 | Both fields empty | Show email error first | [ ] | [ ] | |
| 8.1.9 | Email valid, idea invalid | Show idea error only | [ ] | [ ] | |
| 8.1.10 | Error cleared on focus | Border color resets to default | [ ] | [ ] | |

### 8.2 Network / API Error Handling

| # | Scenario | Expected Behavior | Pass | Fail | Notes |
|---|----------|------------------|:----:|:----:|-------|
| 8.2.1 | Network timeout (>30s) | Show error state, enable retry | [ ] | [ ] | |
| 8.2.2 | API returns 400 | Show field-level error messages | [ ] | [ ] | Backend integration |
| 8.2.3 | API returns 503 | Show retry message with delay | [ ] | [ ] | Backend integration |
| 8.2.4 | CORS error | Show clear error (if applicable) | [ ] | [ ] | |
| 8.2.5 | Malformed JSON response | Graceful degradation, no crash | [ ] | [ ] | |
| 8.2.6 | Connection refused | User-friendly error message | [ ] | [ ] | |

### 8.3 Edge Cases

| # | Scenario | Expected Behavior | Pass | Fail | Notes |
|---|----------|------------------|:----:|:----:|-------|
| 8.3.1 | Very long email (250+ chars) | Truncated or validated | [ ] | [ ] | |
| 8.3.2 | Special characters in idea: `!@#$%^&*()` | Treated as plain text, not executed | [ ] | [ ] | |
| 8.3.3 | Unicode text in idea: Chinese, Japanese, emoji | Saved and displayed correctly | [ ] | [ ] | |
| 8.3.4 | XSS attempt: `<script>alert(1)</script>` | Displayed as text, not executed | [ ] | [ ] | |
| 8.3.5 | XSS attempt: `<img onerror=alert(1) src=x>` | Displayed as text, not executed | [ ] | [ ] | |
| 8.3.6 | Rapid multiple submissions | Only first submission processed | [ ] | [ ] | |
| 8.3.7 | Submit button clicked while loading | Ignored (button disabled) | [ ] | [ ] | |
| 8.3.8 | Tab navigation through form | All fields reachable and usable | [ ] | [ ] | |
| 8.3.9 | Browser back button after submission | Page state preserved | [ ] | [ ] | |
| 8.3.10 | Page refresh during submission | Handled gracefully (no duplicate) | [ ] | [ ] | |
| 8.3.11 | Very fast scroll through page | Animations trigger without jank | [ ] | [ ] | |
| 8.3.12 | Print page | Layout renders correctly | [ ] | [ ] | |

---

## 9. Visual Quality

### 9.1 Desktop Visual Checkpoints

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 9.1.1 | Dark background (#0f172a) renders correctly | [ ] | [ ] | |
| 9.1.2 | Grid pattern background is visible | [ ] | [ ] | |
| 9.1.3 | Card backgrounds (#1e293b) render correctly | [ ] | [ ] | |
| 9.1.4 | Accent color (#7c3aed / purple) renders on CTAs | [ ] | [ ] | |
| 9.1.5 | Gradient text on "See it." displays correctly | [ ] | [ ] | |
| 9.1.6 | Hover states on step cards (border color change) | [ ] | [ ] | |
| 9.1.7 | Hover states on CTA button (lift + glow) | [ ] | [ ] | |
| 9.1.8 | Focus ring on inputs (purple glow) | [ ] | [ ] | |
| 9.1.9 | Error state (red border) renders correctly | [ ] | [ ] | |
| 9.1.10 | Success state (green checkmark, green text) | [ ] | [ ] | |
| 9.1.11 | Footer separator border renders | [ ] | [ ] | |
| 9.1.12 | Navigation bar border renders | [ ] | [ ] | |

### 9.2 Mobile Visual Checkpoints

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 9.2.1 | Vertical step layout is visually clean | [ ] | [ ] | |
| 9.2.2 | Vertical dividers (instead of arrows) render | [ ] | [ ] | |
| 9.2.3 | Hero layout fits in mobile viewport | [ ] | [ ] | |
| 9.2.4 | Signup card padding is appropriate for mobile | [ ] | [ ] | |
| 9.2.5 | CTA button looks good on mobile | [ ] | [ ] | |

### 9.3 Animation / Motion Quality

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 9.3.1 | Step reveal: smooth opacity transition | [ ] | [ ] | |
| 9.3.2 | Step reveal: smooth translateY transition | [ ] | [ ] | |
| 9.3.3 | Arrow reveal: smooth opacity transition | [ ] | [ ] | |
| 9.3.4 | Pulse animation on generating state | [ ] | [ ] | |
| 9.3.5 | CTA button hover: smooth transform | [ ] | [ ] | |
| 9.3.6 | Submit button hover: smooth transform | [ ] | [ ] | |
| 9.3.7 | Smooth scroll behavior (no instant jump) | [ ] | [ ] | |

### 9.4 Visual Regression Baseline

| # | Asset | Baseline Created | Current Matches | Notes |
|---|-------|:---------------:|:---------------:|-------|
| 9.4.1 | Desktop hero | [ ] | [ ] | |
| 9.4.2 | Desktop steps | [ ] | [ ] | |
| 9.4.3 | Desktop form | [ ] | [ ] | |
| 9.4.4 | Desktop success | [ ] | [ ] | |
| 9.4.5 | Mobile hero (375px) | [ ] | [ ] | |
| 9.4.6 | Mobile steps (375px) | [ ] | [ ] | |
| 9.4.7 | Mobile form (375px) | [ ] | [ ] | |
| 9.4.8 | Mobile hero (320px) | [ ] | [ ] | |
| 9.4.9 | Error state (email invalid) | [ ] | [ ] | |
| 9.4.10 | Loading state | [ ] | [ ] | |

---

## 10. API Integration

Note: These items apply when the backend is ready. The frontend currently uses simulated submission.

### 10.1 Backend Integration Readiness

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 10.1.1 | Field name mapping: frontend sends `idea_text` not `idea` | [ ] | [ ] | **Gap**: Currently sends `idea` |
| 10.1.2 | Frontend validates idea min length = 10 (matches backend) | [ ] | [ ] | **Gap**: Frontend min=5, backend min=10 |
| 10.1.3 | Frontend validates idea max length = 500 (matches backend) | [ ] | [ ] | **Gap**: Frontend has no max |
| 10.1.4 | Frontend handles 201 response with `idea_id` display | [ ] | [ ] | |
| 10.1.5 | Frontend handles 400 field-level errors | [ ] | [ ] | |
| 10.1.6 | Frontend handles 503 with retry message | [ ] | [ ] | |
| 10.1.7 | Frontend handles network timeout (>30s) | [ ] | [ ] | |
| 10.1.8 | Request body matches OpenAPI schema | [ ] | [ ] | |

### 10.2 API Contract Verification

| # | Endpoint | Method | Scenario | Pass | Fail | Notes |
|---|----------|--------|----------|:----:|:----:|-------|
| 10.2.1 | `/api/ideas` | POST | Valid submission -> 201 | [ ] | [ ] | |
| 10.2.2 | `/api/ideas` | POST | Invalid email -> 400 | [ ] | [ ] | |
| 10.2.3 | `/api/ideas` | POST | Idea too short -> 400 | [ ] | [ ] | |
| 10.2.4 | `/api/ideas` | POST | Idea too long -> 400 | [ ] | [ ] | |
| 10.2.5 | `/api/ideas` | POST | Service unavailable -> 503 | [ ] | [ ] | |
| 10.2.6 | `/api/ideas/{id}` | GET | Idea queued -> 200 | [ ] | [ ] | Future |
| 10.2.7 | `/api/ideas/{id}` | GET | Idea completed -> 200 | [ ] | [ ] | Future |
| 10.2.8 | `/api/ideas/{id}` | GET | Not found -> 404 | [ ] | [ ] | Future |

---

## 11. Content & Localization

### 11.1 Text Content

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 11.1.1 | Hero badge: "AI-Powered Visual Creation" | [ ] | [ ] | |
| 11.1.2 | Hero headline: "Think it. See it. Get it." | [ ] | [ ] | |
| 11.1.3 | Hero subtitle (Chinese): "输入你的创意想法..." | [ ] | [ ] | |
| 11.1.4 | CTA button: "立即开始 Start Now" | [ ] | [ ] | |
| 11.1.5 | Step 01: "想到" | [ ] | [ ] | |
| 11.1.6 | Step 02: "看见" | [ ] | [ ] | |
| 11.1.7 | Step 03: "得到" | [ ] | [ ] | |
| 11.1.8 | Form title: "加入我们" | [ ] | [ ] | |
| 11.1.9 | Form subtitle: "成为首批体验用户，获取内测资格" | [ ] | [ ] | |
| 11.1.10 | Email label: "邮箱地址" | [ ] | [ ] | |
| 11.1.11 | Idea label: "你的创意想法" | [ ] | [ ] | |
| 11.1.12 | Submit button: "提交想法 Submit" | [ ] | [ ] | |
| 11.1.13 | Success heading: "排队中，我们会联系你" | [ ] | [ ] | |
| 11.1.14 | Success body: "感谢你的提交！我们的团队将尽快与您联系。" | [ ] | [ ] | |
| 11.1.15 | Footer: "2026 MiniMax Studio. All rights reserved." | [ ] | [ ] | |
| 11.1.16 | No placeholder text used as only label | [ ] | [ ] | |

### 11.2 Text Length / Truncation

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 11.2.1 | Long email input does not overflow container | [ ] | [ ] | |
| 11.2.2 | Long idea text wraps correctly in textarea | [ ] | [ ] | |
| 11.2.3 | Long step descriptions wrap correctly | [ ] | [ ] | |
| 11.2.4 | Reference ID displays without truncation | [ ] | [ ] | |

### 11.3 Localization Readiness

| # | Checkpoint | Pass | Fail | Notes |
|---|-----------|:----:|:----:|-------|
| 11.3.1 | Page supports mixed Chinese/English content | [ ] | [ ] | |
| 11.3.2 | Font stack includes Chinese font families | [ ] | [ ] | `'PingFang SC'`, `'Microsoft YaHei'` |
| 11.3.3 | Text renders correctly in CJK characters | [ ] | [ ] | |
| 11.3.4 | Emoji characters render correctly in idea field | [ ] | [ ] | |

---

## 12. Pre-Launch Final Sign-Off

Complete this section after all previous checks pass.

### 12.1 Test Summary

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Functional Completeness | 29 | | | |
| Browser Compatibility | 18 | | | |
| Mobile Responsiveness | 21 | | | |
| Accessibility | 20 | | | |
| Performance | 20 | | | |
| Security | 15 | | | |
| SEO | 16 | | | |
| Error States & Edge Cases | 26 | | | |
| Visual Quality | 21 | | | |
| API Integration | 15 | | | |
| Content & Localization | 12 | | | |
| **TOTAL** | **213** | | | |

### 12.2 Blocker Issues

List any FAIL items that must be resolved before launch:

| # | Issue | Severity | Owner | Deadline | Status |
|---|-------|----------|-------|----------|--------|
| 1 | Frontend sends `idea` instead of `idea_text` in API request | High | Frontend | Before backend integration | Open |
| 2 | Frontend idea validation min=5, backend expects min=10 | High | Frontend | Before backend integration | Open |
| 3 | Frontend has no max length validation for idea (backend expects max=500) | High | Frontend | Before backend integration | Open |
| 4 | Success message lacks ARIA live region for screen readers | Medium | Frontend | Before launch | Open |
| 5 | Color contrast: `--text-muted` (#64748b) on `--bg` (#0f172a) may fail 4.5:1 | Medium | Design | Before launch | Open |

### 12.3 Risk Acknowledgment

List known risks that are accepted for launch:

| # | Risk | Impact | Accepted By | Date |
|---|------|--------|-------------|------|
| 1 | Light theme not implemented (dark-only) | Low | | |
| 2 | No live status polling (future feature) | Low | | |
| 3 | Mobile prototype is spec-only, not yet implemented | Medium | | |

### 12.4 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Engineer | | | |
| Frontend Developer | | | |
| Product Manager | | | |
| Tech Lead | | | |

### 12.5 Launch Criteria

All items below must be PASS before launch:

- [ ] Total passed >= 200 / 213 (>= 93% pass rate)
- [ ] All High severity blockers resolved
- [ ] Lighthouse Performance >= 90
- [ ] Lighthouse Accessibility >= 90
- [ ] No critical axe-core violations
- [ ] No console errors on Chrome, Firefox, Safari
- [ ] Form submission works end-to-end
- [ ] API field mapping resolved before backend integration
- [ ] Security review completed (CSP, XSS)

---

*Document Version: 1.0 — APP Sprint 1, Task 3.2*
