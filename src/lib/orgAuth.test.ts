import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOrgMemberFindOne, mockOrganizationFindById, mockConnectDB } = vi.hoisted(() => ({
  mockOrgMemberFindOne: vi.fn(),
  mockOrganizationFindById: vi.fn(),
  mockConnectDB: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/OrgMember', () => ({
  default: { findOne: mockOrgMemberFindOne },
}));
vi.mock('@/models/Organization', () => ({
  default: { findById: mockOrganizationFindById },
  PLAN_LIMITS: {
    free: { maxWidgets: 1, maxMessages: 100, maxTeamMembers: 1, features: ['chat'] },
    starter: { maxWidgets: 3, maxMessages: 1000, maxTeamMembers: 2, features: ['chat', 'faq', 'form'] },
    pro: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
    enterprise: {
      maxWidgets: 999,
      maxMessages: 999999,
      maxTeamMembers: 999,
      features: ['all', 'whitelabel', 'custom_api'],
    },
  },
}));

import { getOrgForUser, checkPermission, PERMISSIONS } from './orgAuth';

describe('getOrgForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns org and role when membership exists', async () => {
    mockOrgMemberFindOne.mockResolvedValue({ organizationId: 'org1', role: 'admin' });
    mockOrganizationFindById.mockResolvedValue({ _id: 'org1', plan: 'pro', name: 'Test Org', limits: {} });

    const result = await getOrgForUser('user1');
    expect(result).toEqual({
      organization: expect.objectContaining({ _id: 'org1', plan: 'pro' }),
      role: 'admin',
    });
  });

  it('returns null when no membership', async () => {
    mockOrgMemberFindOne.mockResolvedValue(null);
    const result = await getOrgForUser('user1');
    expect(result).toBeNull();
  });
});

describe('checkPermission', () => {
  it('owner can manage billing', () => {
    expect(checkPermission('owner', 'manage_billing')).toBe(true);
  });

  it('admin cannot manage billing', () => {
    expect(checkPermission('admin', 'manage_billing')).toBe(false);
  });

  it('editor can create widgets', () => {
    expect(checkPermission('editor', 'create_widgets')).toBe(true);
  });

  it('viewer can only view', () => {
    expect(checkPermission('viewer', 'view_analytics')).toBe(true);
    expect(checkPermission('viewer', 'create_widgets')).toBe(false);
  });
});
