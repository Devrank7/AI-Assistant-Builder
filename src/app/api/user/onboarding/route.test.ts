import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockUserFindByIdAndUpdate } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFindByIdAndUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { findByIdAndUpdate: mockUserFindByIdAndUpdate },
}));

import { POST } from './route';

describe('POST /api/user/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ niche: 'dental' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('marks onboarding as completed with niche', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user123',
      organizationId: null,
      orgRole: null,
      user: { email: 'test@test.com', plan: 'free', subscriptionStatus: 'trial' },
    });
    mockUserFindByIdAndUpdate.mockResolvedValue({ onboardingCompleted: true, niche: 'dental' });

    const req = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ niche: 'dental' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      'user123',
      { onboardingCompleted: true, niche: 'dental' },
      { new: true }
    );
  });
});
