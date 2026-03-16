import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted() for mock declarations (vitest hoisting requirement)
const { mockVerifyUser, mockConnectDB, mockOrgFindById, mockOrgMemberFind } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockOrgFindById: vi.fn(),
  mockOrgMemberFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Organization', () => ({
  default: { findById: mockOrgFindById },
}));
vi.mock('@/models/OrgMember', () => ({
  default: { find: mockOrgMemberFind },
}));
vi.mock('@/lib/orgAuth', () => ({
  checkPermission: vi.fn().mockReturnValue(true),
}));

import { GET } from './route';

describe('GET /api/org', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 if not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: new Response(JSON.stringify({ success: false }), { status: 401 }),
    });

    const req = new NextRequest('http://localhost/api/org');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns org details when authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'u1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
    });
    mockOrgFindById.mockResolvedValue({
      _id: 'org1',
      name: 'Test Org',
      plan: 'pro',
      limits: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
      toObject: () => ({
        _id: 'org1',
        name: 'Test Org',
        plan: 'pro',
        limits: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
      }),
    });
    mockOrgMemberFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([{ userId: 'u1', role: 'owner' }]),
    });

    const req = new NextRequest('http://localhost/api/org');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Test Org');
    expect(json.data.plan).toBe('pro');
  });
});
