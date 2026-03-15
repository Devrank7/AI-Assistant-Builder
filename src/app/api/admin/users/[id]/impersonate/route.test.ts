import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserFindById, mockJwtSign } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFindById: vi.fn(),
  mockJwtSign: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { findById: mockUserFindById },
}));
vi.mock('jsonwebtoken', () => ({ default: { sign: mockJwtSign } }));

import { POST } from './route';

const PARAMS = { params: Promise.resolve({ id: 'user123' }) };

describe('POST /api/admin/users/[id]/impersonate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
    process.env.JWT_SECRET = 'test-secret';
  });

  it('returns impersonation token and cabinet URL', async () => {
    const fakeUser = { _id: 'user123', email: 'alice@test.com', name: 'Alice' };
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeUser),
    });
    mockJwtSign.mockReturnValue('signed.jwt.token');

    const req = new NextRequest('http://localhost/api/admin/users/user123/impersonate', { method: 'POST' });
    const res = await POST(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.token).toBe('signed.jwt.token');
    expect(json.data.url).toContain('/cabinet');
    expect(json.data.email).toBe('alice@test.com');
    expect(json.data.expiresAt).toBeDefined();
  });

  it('returns 404 when user not found', async () => {
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest('http://localhost/api/admin/users/user123/impersonate', { method: 'POST' });
    const res = await POST(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 500 when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    const fakeUser = { _id: 'user123', email: 'alice@test.com', name: 'Alice' };
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeUser),
    });

    const req = new NextRequest('http://localhost/api/admin/users/user123/impersonate', { method: 'POST' });
    const res = await POST(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
