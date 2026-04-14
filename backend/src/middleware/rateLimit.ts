'use strict';
export {}; // Force module scope

// Rate limiting middleware — configurable per environment
// Production: strict limits. Development: relaxed for testing.

const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// Global: 100 req/min per IP (all /api routes)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'rate_limited', message: 'Too many requests. Please slow down.' },
});

// Login: 5 attempts per 15 min per IP (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'rate_limited', message: 'Too many login attempts. Please try again in 15 minutes.' },
  keyGenerator: (req: { ip?: string }) => req.ip ?? 'unknown',
});

// Register: 3 registrations per hour per IP (spam protection)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'rate_limited', message: 'Too many registration attempts. Please try again in an hour.' },
  keyGenerator: (req: { ip?: string }) => req.ip ?? 'unknown',
});

// Refresh: 10 requests per minute per IP (token refresh protection)
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'rate_limited', message: 'Too many refresh requests. Please slow down.' },
  keyGenerator: (req: { ip?: string }) => req.ip ?? 'unknown',
});

// Named exports for TypeScript ESM compatibility
export { globalLimiter, loginLimiter, registerLimiter, refreshLimiter };

// Also CommonJS export for compiled CJS runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = { globalLimiter, loginLimiter, registerLimiter, refreshLimiter } as any;
