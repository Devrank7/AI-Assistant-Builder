import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret-key-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-key-32chars!');

describe('JWT utilities', () => {
  it('should sign and verify an access token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('@/lib/jwt');
    const token = signAccessToken({ userId: 'user123', email: 'test@test.com' });
    expect(typeof token).toBe('string');
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe('user123');
    expect(payload.email).toBe('test@test.com');
  });

  it('should sign and verify a refresh token', async () => {
    const { signRefreshToken, verifyRefreshToken } = await import('@/lib/jwt');
    const token = signRefreshToken({ userId: 'user123' });
    const payload = verifyRefreshToken(token);
    expect(payload.userId).toBe('user123');
  });

  it('should reject expired tokens', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyAccessToken } = await import('@/lib/jwt');
    const expired = jwt.default.sign({ userId: 'u1', email: 'e@e.com' }, 'test-access-secret-key-32chars!!', {
      expiresIn: '0s',
    });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});
