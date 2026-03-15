import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserUpdateMany } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserUpdateMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { updateMany: mockUserUpdateMany },
}));

import { POST } from './route';

describe('POST /api/admin/subscriptions/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 2 });
  });

  it('extends trial for a batch of users', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'extend_trial', userIds: ['u1', 'u2'], value: '7' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.modifiedCount).toBe(2);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({ _id: { $in: ['u1', 'u2'] } }, expect.any(Array));
  });

  it('changes plan for a batch of users', async () => {
    mockUserUpdateMany.mockResolvedValue({ modifiedCount: 3 });

    const req = new NextRequest('http://localhost/api/admin/subscriptions/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'change_plan', userIds: ['u1', 'u2', 'u3'], value: 'pro' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.modifiedCount).toBe(3);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({ _id: { $in: ['u1', 'u2', 'u3'] } }, { $set: { plan: 'pro' } });
  });

  it('returns 400 for missing action or userIds', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'extend_trial' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 400 for unknown action', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown_action', userIds: ['u1'] }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid plan value in change_plan', async () => {
    const req = new NextRequest('http://localhost/api/admin/subscriptions/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'change_plan', userIds: ['u1'], value: 'enterprise' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
