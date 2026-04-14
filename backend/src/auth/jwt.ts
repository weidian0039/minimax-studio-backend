'use strict';
export {}; // Force module scope

import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
}
