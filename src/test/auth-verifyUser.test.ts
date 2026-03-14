import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn() },
}));
vi.mock('@/models/Client', () => ({ default: {} }));

describe('verifyUser', () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
  });

  it('should reject requests without access_token cookie', async () => {
    const { verifyUser } = await import('@/lib/auth');
    const request = new NextRequest('http://localhost:3000/api/test');
    const result = await verifyUser(request);
    expect(result.authenticated).toBe(false);
  });

  it('should authenticate valid user with correct token', async () => {
    const { signAccessToken } = await import('@/lib/jwt');
    const User = (await import('@/models/User')).default;

    const token = signAccessToken({ userId: 'user123', email: 'test@example.com' });
    (User.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        plan: 'basic',
        subscriptionStatus: 'active',
      }),
    });

    const { verifyUser } = await import('@/lib/auth');
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { Cookie: `access_token=${token}` },
    });

    const result = await verifyUser(request);
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.userId).toBe('user123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.plan).toBe('basic');
    }
  });

  it('should reject expired or invalid tokens', async () => {
    const { verifyUser } = await import('@/lib/auth');
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { Cookie: 'access_token=invalid-token' },
    });
    const result = await verifyUser(request);
    expect(result.authenticated).toBe(false);
  });
});
