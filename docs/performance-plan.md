# Performance Optimization Plan: MiniMax Studio Landing Page

**Author:** P7 Staff Engineer
**Date:** 2026-04-09
**Baseline:** `index.html` — single-file, 669 lines, inline CSS, inline JS, no external dependencies, no images, system fonts only. Estimated first load: ~0.3-0.5s on fast 3G (CSS/HTML), near-instant on repeat.

**Performance Budget:**
| Metric | Target | Notes |
|--------|--------|-------|
| LCP (Largest Contentful Paint) | < 1.5s | Hero heading + CTA button |
| FID (First Input Delay) | < 50ms | Inline JS is minimal |
| INP (Interaction to Next Paint) | < 100ms | Form interaction only |
| CLS (Cumulative Layout Shift) | < 0.05 | Steps section highest risk |
| TTI (Time to Interactive) | < 1.0s | No heavy JS; inline JS is ~80 lines |
| Total Blocking Time | < 50ms | Virtually no main-thread work |
| HTML payload | < 25 KB | Currently ~17 KB uncompressed |
| Total page weight | < 50 KB | Currently ~20 KB (CSS+HTML+JS) |

> **Current status:** The page is already extremely lean. Most optimizations below address **future scaling** (new images, new features, backend wiring) and **defensive hardening** against performance regressions.

---

## 1. Critical Rendering Path

### 1.1 Inline CSS Strategy

**Current state:** All CSS (~460 lines) is in a `<style>` tag inside `<head>`. This is optimal for a single-file landing page — zero extra HTTP requests, no render-blocking external stylesheets.

**Action:** Keep inline. When the project grows to multiple pages, extract critical CSS (hero + nav + above-fold CTA) into inline `<style>` and defer the full stylesheet.

**Target change:** N/A — no change needed now.

---

### 1.2 Preload Hints for Above-the-Fold Content

**Current state:** No `<link rel="preload">` hints. For a page with no external resources, this is fine.

**Action (deferred):** If a hero background image or logo SVG is added, preload it above the fold:
```html
<!-- Only add when a hero image exists -->
<link rel="preload" as="image" href="/assets/hero.webp" type="image/webp">
```
For any external assets (fonts, icons), use `rel="preconnect"` to establish early TCP connections:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
```

---

### 1.3 Font Loading

**Current state:** System font stack only — zero font download overhead. This is the best possible strategy for this page.

**Action:** Maintain system fonts for the landing page. If brand fonts are required for a future product app, use `font-display: swap` and preload the WOFF2 file.

**Risk:** None. System fonts are fastest.

---

### 1.4 Above-the-Fold Content Delivery

**Current state:** The hero section (LCP element likely the `<h1>`) renders immediately. No images, no external CSS blocking.

**Action:** No immediate changes. When adding hero imagery:
- Use `<img fetchpriority="high">` on the hero image.
- Never lazy-load the LCP image.
- Use WebP with JPEG fallback.

---

## 2. Image Strategy

**Current state:** Zero images. All visual interest comes from CSS gradients, emoji characters, and CSS-only decorative elements (grid background, box shadows). This is the ideal starting point.

### 2.1 When Images Are Added

**Format priority:** AVIF > WebP > JPEG

- Use AVIF for photographs with transparency or complex gradients.
- Use WebP for general imagery with lossy compression.
- Never ship PNG for photographic content.
- SVG for logos, icons, and illustrations — already well-suited to the design system.

**Responsive images:**
```html
<picture>
  <source srcset="/assets/hero.avif" type="image/avif">
  <source srcset="/assets/hero.webp" type="image/webp">
  <img src="/assets/hero.jpg" alt="Hero description" width="1100" height="600" loading="eager" fetchpriority="high">
</picture>
```

### 2.2 Lazy Loading

**Rule:** Any image below the fold must use `loading="lazy"`:
```html
<img src="/assets/step-illustration.svg" alt="Step illustration" loading="lazy" decoding="async">
```

**Rule:** The LCP image (first meaningful paint element) must use `loading="eager"` and `fetchpriority="high"`. Never lazy-load the LCP candidate.

**Rule:** Add explicit `width` and `height` attributes on all images to reserve layout space and prevent CLS.

### 2.3 Image Optimization Checklist

| Checkpoint | Standard |
|------------|----------|
| Format | AVIF primary, WebP fallback |
| Compression | CLI tools: `cwebp -q 80`, `avifenc` |
| Responsive | `srcset` at 1x, 2x, 3x DPR breakpoints |
| Lazy | All below-fold images |
| Dimensions | Explicit `width`/`height` to prevent CLS |
| Alt text | Every `<img>` has descriptive `alt` |
| Decorative | Use `alt=""` and `aria-hidden="true"` for decorative images |

---

## 3. JavaScript Optimization

**Current state:** ~80 lines of vanilla JS inline at `</body>`. No frameworks, no libraries, no bundler output. Main-thread work is minimal:
- `IntersectionObserver` setup (browser-native, highly optimized)
- `querySelectorAll` for step elements
- `addEventListener` for form submit and focus events
- `setTimeout` for animation delay

This is already best-in-class for a static landing page.

### 3.1 Future JS Additions

**Code splitting:** If a future feature requires a large JS library (e.g., a video player, chart library), load it only on the page that needs it:
```html
<script src="/js/video-player.js" defer></script>
```
Never load heavy JS on the landing page unless it is essential for the hero experience.

**Module-based architecture:** When JS exceeds ~200 lines, extract into a `<script type="module">` for automatic deferral and better caching:
```html
<script type="module" src="/js/main.js"></script>
```
Module scripts are always deferred by default and only executed when the HTML parser is done.

### 3.2 Form Submission

**Current state:** Form submission is simulated with `setTimeout` — no network request.

**Action (Phase 2):** When wiring to a real API endpoint, use `fetch()` with the following optimizations:

```javascript
// Use AbortController to cancel stale requests
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, idea }),
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // handle success
} catch (err) {
  if (err.name === 'AbortError') {
    showError('请求超时，请重试');
  } else {
    showError('提交失败，请稍后重试');
  }
}
```

### 3.3 IntersectionObserver Tuning

**Current state:** `threshold: 0.3` triggers animation when 30% of the step is visible.

**Tuning:** Lower threshold (0.15) for faster perceived reveal, but avoid triggering on elements still outside viewport:
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('visible')) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // Stop observing once animated
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
```

**Important:** Call `observer.unobserve()` after adding `.visible` to prevent re-triggering on scroll-back. This reduces observer callback overhead.

---

## 4. CSS Optimization

### 4.1 Current State

- ~460 lines of CSS inline in `<style>`.
- No external stylesheet — zero HTTP requests.
- CSS custom properties used throughout — good maintainability.
- No unused styles (confirmed via manual review).
- No vendor framework (no Tailwind, no Bootstrap) — lean output.

**Assessment:** CSS is already well-optimized. No immediate refactoring needed.

### 4.2 Critical CSS Extraction (for multi-page growth)

When the project adds a second page, extract above-the-fold CSS into inline `<style>` and load the full stylesheet with `media="print" onload="this.media='all'"` pattern for non-blocking delivery:

```html
<!-- Non-blocking full stylesheet -->
<link rel="stylesheet" href="/css/main.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/css/main.css"></noscript>
```

### 4.3 Content Visibility

For the `footer` and any below-fold sections that are not immediately needed:

```css
footer {
  content-visibility: auto;
  contain-intrinsic-size: 1px 200px; /* Approximate footer height */
}
```

This tells the browser it can skip rendering and layout computation for off-screen content until it approaches the viewport.

### 4.4 Will-Change for Animated Elements

The step cards animate via `opacity` and `transform`. Promote these to the compositor layer to avoid paint:

```css
.step.visible {
  opacity: 1;
  transform: translateY(0);
  will-change: opacity, transform;
}
.step {
  will-change: opacity, transform;
}
```

**Warning:** Do not apply `will-change` to too many elements — it reserves GPU memory. Apply only to actively animating elements.

### 4.5 Unused CSS Audit (Future)

When adding external CSS or component libraries, audit for unused rules:
```bash
npx uncss http://localhost:3000 --ignore ['#signup', '.generating']
```

---

## 5. Caching Strategy

### 5.1 HTTP Cache Headers (Server-Side)

For a static landing page, aggressive caching is safe:

| Asset | Header |
|-------|--------|
| `index.html` | `Cache-Control: no-cache` (or short `max-age=3600`) to allow instant updates |
| CSS/JS (versioned) | `Cache-Control: max-age=31536000, immutable` |
| Images (versioned) | `Cache-Control: max-age=31536000, immutable` |
| API endpoints | `Cache-Control: no-store` |

**Versioning approach:** Append a content hash to filenames:
```
main.css -> main.a3f9b2c1.css
index.html -> index.html (always re-fetched, but content-addressed subresources cached forever)
```

### 5.2 Service Worker for PWA (Future)

Implement a service worker for offline support and repeat-visit speed:

```javascript
// sw.js — Service Worker
const CACHE_NAME = 'minimax-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Network-first for HTML (always fresh), cache-first for static assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => 
        cached || fetch(event.request)
      )
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

---

## 6. CDN Strategy

### 6.1 Current Assessment

The page has zero external dependencies — no CDN is needed currently. All assets are inline or absent.

### 6.2 When to Introduce a CDN

| Scenario | CDN Use |
|----------|---------|
| Serving images | Cloudflare, Vercel Blob, AWS CloudFront with image optimization (WebP/AVIF conversion at edge) |
| Serving versioned JS/CSS | Any CDN with `immutable` cache headers |
| Real-time API | Vercel Edge Functions, Cloudflare Workers |
| Font delivery | Google Fonts (self-host WOFF2 for privacy) |

### 6.3 Recommended CDN Configuration (When Applicable)

- **Edge caching:** Set TTL to 1 year for versioned static assets.
- **Image optimization:** Use Cloudflare Images or similar to serve WebP/AVIF automatically via `<img src="cdn.url/image.jpg?width=400&format=webp">`.
- **Compression:** Ensure CDN edge nodes serve Brotli-compressed responses (preferred over gzip for 15-25% better compression).
- **HTTP/2:** All CDN providers support HTTP/2 by default — verify HTTP/3 is enabled for mobile users.

---

## 7. Performance Budget Enforcement

### 7.1 Budget Thresholds

| Metric | Good | Needs Attention | Critical |
|--------|------|-----------------|----------|
| LCP | < 1.5s | 1.5s - 2.5s | > 2.5s |
| FID / INP | < 50ms | 50ms - 100ms | > 100ms |
| CLS | < 0.05 | 0.05 - 0.1 | > 0.1 |
| Total JS | < 50 KB | 50 KB - 150 KB | > 150 KB |
| Total CSS | < 20 KB | 20 KB - 50 KB | > 50 KB |
| Total page weight | < 100 KB | 100 KB - 500 KB | > 500 KB |
| Requests | < 10 | 10 - 30 | > 30 |

### 7.2 Enforcement

Integrate performance budget checks into CI:

```yaml
# .github/workflows/performance.yml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun --collect.url=http://localhost:3000 \
    --assert.preset=lighthouse:recommended \
    --assert.assertions.categories.performance=[{"id":"performance","maxScore":0.9}]
```

### 7.3 Bundle Size Monitoring

```bash
# For any JS bundle added to the project:
npx bundlesize
```

Configure `bundlesize.config.json`:
```json
[
  {
    "path": "./dist/main.js",
    "maxSize": "50kB"
  },
  {
    "path": "./dist/main.css",
    "maxSize": "20kB"
  }
]
```

---

## 8. Monitoring: Core Web Vitals

### 8.1 Real-User Monitoring (RUM)

For production, collect real-user Core Web Vitals data:

```javascript
// web-vitals.js — lightweight (1.2 KB gzipped)
import { onLCP, onFID, onCLS, onINP } from 'web-vitals';

function sendToAnalytics({ name, value, id, rating }) {
  // Replace with your analytics endpoint
  navigator.sendBeacon('/api/vitals', JSON.stringify({
    metric: name,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    id,
    rating, // 'good' | 'needs-improvement' | 'poor'
    url: location.href,
    userAgent: navigator.userAgent
  }));
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

### 8.2 Synthetic Monitoring (CI/CD)

Run Lighthouse on every pull request to catch regressions before deployment:

```bash
# Local measurement
npx lighthouse https://staging.minimax.studio \
  --preset=desktop \
  --output=json \
  --output-path=./lighthouse-report.json

# Check specific scores
cat ./lighthouse-report.json | jq '.categories.performance.score'
```

### 8.3 Field Data (Search Console)

Register the site in Google Search Console and monitor the Core Web Vitals report under "Experience" > "Core Web Vitals". Set up alerts for p75 LCP > 2.5s or CLS > 0.1 across the site's URLs.

### 8.4 Dashboard

Recommended tooling stack for ongoing monitoring:

| Purpose | Tool |
|---------|------|
| RUM | Cloudflare Browser Insights, or self-hosted `web-vitals` endpoint |
| Synthetic | Lighthouse CI (GitHub Actions), WebPageTest (weekly) |
| Alerting | Grafana + Prometheus (for self-hosted) or Datadog |
| Real-user segments | Filter by device type (mobile/desktop), geography, connection speed |

---

## 9. Implementation Roadmap

### Phase 1: Quick Wins (Before Launch)

- [ ] Add CSP meta tag (S-1)
- [ ] Add `will-change` and `unobserve()` to step animations (P-2)
- [ ] Add `prefers-reduced-motion` media query (B-3)
- [ ] Add `aria-live` to form success region (A-1)
- [ ] Add skip navigation link (A-7)
- [ ] Add meta description (A-6)
- [ ] Optimize grid background from double-gradient to SVG (P-1)

**Estimated effort:** 2-4 hours
**Expected gains:** LCP unchanged, CLS improvement, full WCAG AA coverage

### Phase 2: Backend Wiring (Before Public Beta)

- [ ] Wire form submission to real API with CSRF protection (S-3)
- [ ] Implement error message elements with `aria-describedby` (C-1, A-4)
- [ ] Add `autocomplete` attributes to form fields (S-2)
- [ ] Implement fetch with AbortController timeout (3.2)
- [ ] Set up `web-vitals` RUM collection

**Estimated effort:** 4-8 hours
**Expected gains:** Functional form, real user data collection, FID tracking

### Phase 3: Image & Asset Pipeline (Feature Release)

- [ ] Hero image with WebP/AVIF, preload hint, explicit dimensions
- [ ] Step illustration SVGs
- [ ] Favicon (SVG format)
- [ ] `content-visibility: auto` on below-fold sections
- [ ] CDN integration for image delivery
- [ ] Lighthouse CI in GitHub Actions

**Estimated effort:** 4-6 hours
**Expected gains:** LCP < 1.5s maintained, SEO boost from images, CI regression detection

### Phase 4: PWA & Caching (Post-Launch)

- [ ] Service worker implementation (5.2)
- [ ] Offline fallback page
- [ ] App manifest for installability
- [ ] HTTP/2 push / HTTP/3 verification
- [ ] Real-user monitoring dashboard

**Estimated effort:** 6-10 hours
**Expected gains:** Repeat visit speed, offline resilience, installable PWA

---

## 10. Summary of Key Recommendations

| Priority | Action | Metric Impact | Effort |
|----------|--------|--------------|--------|
| **1** | Add CSP meta tag | Security hardening | 10 min |
| **2** | Fix grid background (SVG) | INP / Scrolling | 15 min |
| **3** | Add `will-change` + `unobserve()` to steps | CLS | 5 min |
| **4** | Add `prefers-reduced-motion` | Accessibility | 5 min |
| **5** | Add `aria-live` + skip link + meta description | A11y / SEO | 20 min |
| **6** | Wire form with error messages + CSRF | Completeness | 4-6 hrs |
| **7** | Image pipeline (WebP/AVIF + CDN) | LCP / SEO | 4-6 hrs |
| **8** | Service worker + PWA manifest | Repeat visits | 6-10 hrs |

**Overall assessment:** The landing page is already a lean, well-structured baseline. Performance is excellent for a static marketing page. The primary risks are **future feature creep** (images, heavy JS) and **backend wiring** (CSRF, error handling). Disciplined adherence to this plan — especially the performance budget enforcement in CI and the image optimization checklist — will keep the page in the green across all Core Web Vitals targets.
