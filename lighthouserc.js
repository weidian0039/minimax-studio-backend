/**
 * Lighthouse CI Configuration — MiniMax Studio Landing Page
 *
 * Usage:
 *   npm install -g @lhci/cli
 *   lhci autorun
 *
 * Or with Lighthouse CI GitHub Action:
 *   uses: treosh/lighthouse-ci-action@v11
 *   with:
 *     configPath: './lighthouserc.js'
 *
 * @type {import('@lhci/cli').LHCIConfig}
 */
module.exports = {
  ci: {
    collect: {
      // Static file server — serves index.html from current directory
      staticDistDir: '.',
      // Number of runs per URL for averaging
      numberOfRuns: 3,
      // Start server settings (inline, no external server needed for static HTML)
      startServerCommand: 'npx http-server . -p 9000 --silent',
      startServerReadyPattern: 'HTTP server running',
      startServerReadyTimeout: 10000,
      // URLs to audit
      url: [
        'http://localhost:9000/workspace/index.html',
      ],
      // Settings
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        extraHeaders: {
          // CSP headers for testing (set by server, not meta tag for Lighthouse)
          // This ensures CSP doesn't block inline resources during audit
        },
      },
    },
    assert: {
      // Budget targets per Task 3
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.90 }],
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 2500 }],
        // Accessibility (WCAG 2.1 AA)
        'categories:accessibility': ['error', { minScore: 0.90 }],
        // Best Practices
        'categories:best-practices': ['error', { minScore: 0.90 }],
        // SEO
        'categories:seo': ['error', { minScore: 0.90 }],
        // Specific audits
        'uses-long-cache-ttl': 'warn',
        'uses-optimized-images': 'warn',
        'uses passive listeners to improve scrolling performance': 'warn',
        'meta-viewport': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'color-contrast': ['error', { minScore: 0.9 }],
        'label': 'error',
        'button-name': 'error',
        'link-name': 'error',
        'aria-required-attr': 'error',
        'aria-valid-attr': 'error',
        'uses-passive-event-listeners': 'warn',
        'uses-text-compression': 'warn',
        'render-blocking-resources': 'warn',
        'unused-css-rules': 'warn',
        // PWA
        'service-worker': 'off',
        'installable-manifest': 'off',
        'apple-touch-icon': 'off',
        'maskable-icon': 'off',
      },
    },
    upload: {
      // Target: temporary public storage (LHCI server)
      // For GitHub Actions, use 'temporary-public-storage'
      target: 'temporary-public-storage',
    },
    // Server is optional — if not configured, uses temporary-public-storage
    server: {
      port: 9001,
      storage: './.lighthouseci',
    },
  },
};
