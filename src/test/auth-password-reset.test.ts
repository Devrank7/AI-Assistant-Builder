import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/passwords', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2a$12$newhashedpassword'),
  validatePassword: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/jwt', () => ({
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user123', email: 'test@example.com' }),
  setAuthCookies: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({
  applyRateLimit: vi.fn().mockReturnValue(null),
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user123',
    user: { email: 'test@example.com', plan: 'basic', subscriptionStatus: 'active' },
  }),
}));

vi.mock('@/lib/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockSave = vi.fn().mockResolvedValue(undefined);
const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  passwordHash: '$2a$12$existinghash',
  emailVerified: false,
  emailVerificationToken: 'valid-verification-token',
  passwordResetToken: null,
  passwordResetExpires: null,
  refreshTokens: ['token1', 'token2'],
  save: mockSave,
};

vi.mock('@/models/User', () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

function makeRequest(body: Record<string, unknown>, url = 'http://localhost:3000/api/auth/test') {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Forgot Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  it('returns success even for non-existent email', async () => {
    const User = (await import('@/models/User')).default;
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const response = await POST(makeRequest({ email: 'nonexistent@example.com' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('If an account');
  });

  it('returns success for existing email and sends reset email', async () => {
    const User = (await import('@/models/User')).default;
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockUser, save: mockSave });

    const { sendPasswordResetEmail } = await import('@/lib/emailService');

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const response = await POST(makeRequest({ email: 'test@example.com' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.any(String));
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns bad request when email is missing', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Reset Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  it('resets password with valid token', async () => {
    const User = (await import('@/models/User')).default;
    const userWithSave = { ...mockUser, save: mockSave };
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(userWithSave);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const response = await POST(makeRequest({ token: 'valid-token', password: 'NewPass123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('reset successfully');
    expect(userWithSave.passwordResetToken).toBeNull();
    expect(userWithSave.passwordResetExpires).toBeNull();
    expect(userWithSave.refreshTokens).toEqual([]);
    expect(mockSave).toHaveBeenCalled();
  });

  it('fails with expired/invalid token', async () => {
    const User = (await import('@/models/User')).default;
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const response = await POST(makeRequest({ token: 'expired-token', password: 'NewPass123' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid or expired');
  });

  it('fails when password validation fails', async () => {
    const { validatePassword } = await import('@/lib/passwords');
    (validatePassword as ReturnType<typeof vi.fn>).mockReturnValueOnce('Password must be at least 8 characters');

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const response = await POST(makeRequest({ token: 'valid-token', password: 'short' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('fails when token or password is missing', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const response = await POST(makeRequest({ token: 'valid-token' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Verify Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  it('verifies email with valid token', async () => {
    const User = (await import('@/models/User')).default;
    const userWithSave = { ...mockUser, save: mockSave };
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(userWithSave);

    const { POST } = await import('@/app/api/auth/verify-email/route');
    const response = await POST(makeRequest({ token: 'valid-verification-token' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('verified successfully');
    expect(userWithSave.emailVerified).toBe(true);
    expect(userWithSave.emailVerificationToken).toBeNull();
    expect(mockSave).toHaveBeenCalled();
  });

  it('fails with invalid token', async () => {
    const User = (await import('@/models/User')).default;
    (User.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/verify-email/route');
    const response = await POST(makeRequest({ token: 'invalid-token' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid verification token');
  });

  it('fails when token is missing', async () => {
    const { POST } = await import('@/app/api/auth/verify-email/route');
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Rate Limit Config', () => {
  it('auth rate limit is set to 5 requests per 60 seconds', async () => {
    const { RATE_LIMITS } = await import('@/lib/rateLimit');
    expect(RATE_LIMITS.auth).toEqual({ windowMs: 60000, maxRequests: 5 });
  });
});
