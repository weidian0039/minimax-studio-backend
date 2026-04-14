import { describe, test, expect } from '@jest/globals';
import { signAccessToken, signRefreshToken, verifyToken, verifyRefreshToken } from '../auth/jwt';
import { hashPassword, comparePassword } from '../auth/password';

describe('JWT', () => {
  const originalSecret = process.env.JWT_SECRET;
  afterAll(() => { process.env.JWT_SECRET = originalSecret; });

  test('signs and verifies access token', () => {
    process.env.JWT_SECRET = 'test-secret-123';
    const payload = { userId: '123', email: 'test@test.com', role: 'user' };
    const token = signAccessToken(payload);
    const verified = verifyToken(token);
    expect(verified.userId).toBe('123');
    expect(verified.email).toBe('test@test.com');
    expect(verified.role).toBe('user');
  });

  test('signs and verifies refresh token', () => {
    process.env.JWT_SECRET = 'test-secret-123';
    const payload = { userId: '456' };
    const token = signRefreshToken(payload);
    const verified = verifyRefreshToken(token);
    expect(verified.userId).toBe('456');
  });

  test('verifyToken throws on invalid token', () => {
    process.env.JWT_SECRET = 'test-secret-123';
    expect(() => verifyToken('invalid.token.here')).toThrow('Invalid or expired token');
  });

  test('verifyRefreshToken throws on invalid token', () => {
    process.env.JWT_SECRET = 'test-secret-123';
    expect(() => verifyRefreshToken('invalid.token.here')).toThrow('Invalid or expired refresh token');
  });
});

describe('Password', () => {
  test('hashes and compares password correctly', async () => {
    const hash = await hashPassword('testpassword123');
    expect(await comparePassword('testpassword123', hash)).toBe(true);
    expect(await comparePassword('wrongpassword', hash)).toBe(false);
  });

  test('hashes are different each time (salt)', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
    expect(await comparePassword('samepassword', hash1)).toBe(true);
    expect(await comparePassword('samepassword', hash2)).toBe(true);
  });
});
