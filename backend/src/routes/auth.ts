'use strict';
const logger = require('../logger');

export {}; // Force module scope

import { Router, Request, Response } from 'express';
import { hashPassword, comparePassword } from '../auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { createUser, getUserByEmail, getUserById } from '../db/index';
import { requireAuth } from '../middleware/auth';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Password must be at least 8 characters' });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Invalid email format' });
    return;
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'conflict', message: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const { id: userId } = await createUser({ email, passwordHash });
    const accessToken = signAccessToken({ userId, email, role: 'user' });
    const refreshToken = signRefreshToken({ userId });

    res.status(201).json({ success: true, data: { userId, accessToken, refreshToken } });
  } catch (err) {
    logger.error('[Auth] Register error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'Registration failed. Please try again.' });
  }
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'Email and password are required' });
    return;
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid credentials' });
      return;
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    res.status(200).json({ success: true, data: { userId: user.id, accessToken, refreshToken } });
  } catch (err) {
    logger.error('[Auth] Login error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ success: false, error: 'internal_error', message: 'Login failed. Please try again.' });
  }
});

router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'validation_error', message: 'refreshToken is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ success: false, error: 'unauthorized', message: 'User not found' });
      return;
    }
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    res.status(200).json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid or expired refresh token' });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, error: 'unauthorized', message: 'User not found' });
    return;
  }
  res.status(200).json({ success: true, data: { userId: user.userId, email: user.email } });
});

// Logout is stateless — JWT is discarded by client. Server returns 200 for API completeness.
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

export default router;
