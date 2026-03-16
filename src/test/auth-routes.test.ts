import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock mongodb
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Mock bcryptjs used by passwords
const mockHashedPassword = '$2a$12$mockhash';
const mockHashedRefreshToken = '$2a$12$mockrefreshhash';
let hashCallCount = 0;

vi.mock('@/lib/passwords', () => ({
  hashPassword: vi.fn().mockImplementation(() => {
    hashCallCount++;
    if (hashCallCount % 2 === 1) return Promise.resolve(mockHashedPassword);
    return Promise.resolve(mockHashedRefreshToken);
  }),
  comparePassword: vi.fn().mockResolvedValue(true),
  validatePassword: vi.fn().mockReturnValue(null),
}));

// Mock jwt
vi.mock('@/lib/jwt', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user123', email: 'test@example.com' }),
  verifyRefreshToken: vi.fn().mockReturnValue({ userId: 'user123' }),
  setAuthCookies: vi.fn().mockResolvedValue(undefined),
  clearAuthCookies: vi.fn().mockResolvedValue(undefined),
}));

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) => {
      if (name === 'refresh_token') return { value: 'mock-refresh-token' };
      if (name === 'access_token') return { value: 'mock-access-token' };
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock rate limiting
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/apiResponse');
  return {
    applyRateLimit: vi.fn().mockReturnValue(null),
    verifyUser: vi.fn().mockResolvedValue({
      authenticated: true,
      userId: 'user123',
      user: { email: 'test@example.com', plan: 'none', subscriptionStatus: 'trial' },
    }),
  };
});

// Mock User model
const mockUser = {
  _id: { toString: () => 'user123' },
  email: 'test@example.com',
  passwordHash: mockHashedPassword,
  name: 'Test User',
  plan: 'none',
  subscriptionStatus: 'trial',
  emailVerified: false,
  refreshTokens: ['$2a$12$mockrefreshhash'],
  save: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/models/User', () => {
  const findOneFn = vi.fn();
  const findByIdFn = vi.fn();
  const createFn = vi.fn();

  return {
    default: {
      findOne: findOneFn,
      findById: findByIdFn,
      create: createFn,
    },
  };
});

// --- Imports (after mocks) ---
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { POST as refreshHandler } from '@/app/api/auth/refresh/route';
import { GET as meHandler } from '@/app/api/auth/me/route';
import User from '@/models/User';
import { validatePassword } from '@/lib/passwords';
import { verifyRefreshToken, verifyAccessToken } from '@/lib/jwt';
import { comparePassword } from '@/lib/passwords';
import { applyRateLimit } from '@/lib/auth';

// Helper to create NextRequest
function createRequest(method: string, body?: Record<string, unknown>, cookieEntries?: Record<string, string>) {
  const url = 'http://localhost:3000/api/auth/test';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init: Record<string, any> = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  const req = new NextRequest(url, init);
  if (cookieEntries) {
    for (const [key, value] of Object.entries(cookieEntries)) {
      req.cookies.set(key, value);
    }
  }
  return req;
}

async function parseResponse(response: Response) {
  return response.json();
}

// --- Tests ---

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hashCallCount = 0;

    // Reset default mock behaviors
    vi.mocked(validatePassword).mockReturnValue(null);
    vi.mocked(applyRateLimit).mockReturnValue(null);
    vi.mocked(comparePassword).mockResolvedValue(true);
  });

  // ==================== REGISTER ====================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        ...mockUser,
        refreshTokens: [],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findOne).mockResolvedValue(null);
      vi.mocked(User.create).mockResolvedValue(newUser as any);

      const req = createRequest('POST', {
        email: 'new@example.com',
        password: 'Password1',
        name: 'New User',
      });

      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Registration successful');
      expect(data.data.email).toBeDefined();
    });

    it('should return 400 for missing fields', async () => {
      const req = createRequest('POST', { email: 'test@example.com' });
      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const req = createRequest('POST', {
        email: 'not-an-email',
        password: 'Password1',
        name: 'Test',
      });
      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid email');
    });

    it('should return 400 for weak password', async () => {
      vi.mocked(validatePassword).mockReturnValue('Password must be at least 8 characters');

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test',
      });
      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('Password');
    });

    it('should return 400 if user already exists', async () => {
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'Password1',
        name: 'Test',
      });
      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('already exists');
    });
  });

  // ==================== LOGIN ====================
  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const loginUser = {
        ...mockUser,
        refreshTokens: [],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findOne).mockResolvedValue(loginUser as any);
      vi.mocked(comparePassword).mockResolvedValue(true);

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'Password1',
      });
      const res = await loginHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('test@example.com');
      expect(data.data.name).toBe('Test User');
    });

    it('should return 400 for missing fields', async () => {
      const req = createRequest('POST', { email: 'test@example.com' });
      const res = await loginHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 401 for wrong email', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null);

      const req = createRequest('POST', {
        email: 'wrong@example.com',
        password: 'Password1',
      });
      const res = await loginHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid email or password');
    });

    it('should return 401 for wrong password', async () => {
      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(comparePassword).mockResolvedValue(false);

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'WrongPass1',
      });
      const res = await loginHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid email or password');
    });
  });

  // ==================== LOGOUT ====================
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ userId: 'user123' });
      const logoutUser = {
        ...mockUser,
        refreshTokens: ['$2a$12$mockrefreshhash'],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findById).mockResolvedValue(logoutUser as any);
      vi.mocked(comparePassword).mockResolvedValue(true);

      const req = createRequest('POST');
      const res = await logoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });

    it('should succeed even without refresh token', async () => {
      // Override the next/headers mock for this test
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as any);

      const req = createRequest('POST');
      const res = await logoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ==================== REFRESH ====================
  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ userId: 'user123' });
      const refreshUser = {
        ...mockUser,
        refreshTokens: ['$2a$12$mockrefreshhash'],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findById).mockResolvedValue(refreshUser as any);
      vi.mocked(comparePassword).mockResolvedValue(true);

      const req = createRequest('POST');
      const res = await refreshHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Token refreshed successfully');
    });

    it('should return 401 when no refresh token', async () => {
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn().mockReturnValue(undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as any);

      const req = createRequest('POST');
      const res = await refreshHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('No refresh token');
    });

    it('should return 401 when token is invalid', async () => {
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = createRequest('POST');
      const res = await refreshHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid or expired');
    });

    it('should return 401 when user not found', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ userId: 'user123' });
      vi.mocked(User.findById).mockResolvedValue(null);

      const req = createRequest('POST');
      const res = await refreshHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('User not found');
    });

    it('should return 401 when refresh token not in user tokens', async () => {
      vi.mocked(verifyRefreshToken).mockReturnValue({ userId: 'user123' });
      const userWithTokens = {
        ...mockUser,
        refreshTokens: ['some-other-hash'],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findById).mockResolvedValue(userWithTokens as any);
      vi.mocked(comparePassword).mockResolvedValue(false);

      const req = createRequest('POST');
      const res = await refreshHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('not recognized');
    });
  });

  // ==================== ME ====================
  describe('GET /api/auth/me', () => {
    it('should return user info', async () => {
      vi.mocked(verifyAccessToken).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
      });

      const selectMock = vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
        plan: 'none',
        subscriptionStatus: 'trial',
        emailVerified: false,
      });
      vi.mocked(User.findById).mockReturnValue({ select: selectMock } as any);

      const req = createRequest('GET', undefined, { access_token: 'mock-access-token' });
      const res = await meHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('test@example.com');
      expect(data.data.name).toBe('Test User');
      expect(data.data.plan).toBe('none');
      expect(data.data.subscriptionStatus).toBe('trial');
      expect(data.data.emailVerified).toBe(false);
    });

    it('should return 401 when no access token', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
      });

      const res = await meHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('Not authenticated');
    });

    it('should return 401 when token is invalid', async () => {
      vi.mocked(verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = createRequest('GET', undefined, { access_token: 'bad-token' });
      const res = await meHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid or expired');
    });

    it('should return 401 when user not found', async () => {
      vi.mocked(verifyAccessToken).mockReturnValue({
        userId: 'user123',
        email: 'test@example.com',
      });
      const selectMock = vi.fn().mockResolvedValue(null);
      vi.mocked(User.findById).mockReturnValue({ select: selectMock } as any);

      const req = createRequest('GET', undefined, { access_token: 'mock-access-token' });
      const res = await meHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.error).toContain('User not found');
    });
  });

  // ==================== RATE LIMITING ====================
  describe('Rate limiting', () => {
    it('should return 429 when rate limited on register', async () => {
      const { Errors } = await import('@/lib/apiResponse');
      vi.mocked(applyRateLimit).mockReturnValue(Errors.tooManyRequests('Rate limit exceeded. Try again later.'));

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'Password1',
        name: 'Test',
      });
      const res = await registerHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });

    it('should return 429 when rate limited on login', async () => {
      const { Errors } = await import('@/lib/apiResponse');
      vi.mocked(applyRateLimit).mockReturnValue(Errors.tooManyRequests('Rate limit exceeded. Try again later.'));

      const req = createRequest('POST', {
        email: 'test@example.com',
        password: 'Password1',
      });
      const res = await loginHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });
  });
});
