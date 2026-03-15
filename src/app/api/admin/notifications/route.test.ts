import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserFind } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { find: mockUserFind },
}));

import { GET } from './route';

describe('GET /api/admin/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  const makeChainable = (result: unknown[]) => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  });

  it('returns an alerts array on success', async () => {
    mockUserFind.mockReturnValue(makeChainable([]));
    const req = new NextRequest('http://localhost/api/admin/notifications');
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('includes past_due alerts with danger severity', async () => {
    const pastDueUser = { _id: 'u1', email: 'due@test.com', name: 'Due User' };
    mockUserFind.mockReturnValueOnce(makeChainable([pastDueUser])).mockReturnValueOnce(makeChainable([]));
    const req = new NextRequest('http://localhost/api/admin/notifications');
    const res = await GET(req);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].type).toBe('past_due');
    expect(json.data[0].severity).toBe('danger');
  });

  it('includes trial_expiring alerts with warning severity', async () => {
    const trialUser = { _id: 'u2', email: 'trial@test.com', name: 'Trial User', trialEndsAt: new Date() };
    mockUserFind.mockReturnValueOnce(makeChainable([])).mockReturnValueOnce(makeChainable([trialUser]));
    const req = new NextRequest('http://localhost/api/admin/notifications');
    const res = await GET(req);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].type).toBe('trial_expiring');
    expect(json.data[0].severity).toBe('warning');
  });
});
