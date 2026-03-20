import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockRAFindOne = vi.fn();
const mockRACreate = vi.fn();
const mockRAFindById = vi.fn();
const mockRAFindByIdAndUpdate = vi.fn();

vi.mock('@/models/ResellerAccount', () => ({
  default: {
    findOne: (...args: unknown[]) => mockRAFindOne(...args),
    create: (...args: unknown[]) => mockRACreate(...args),
    findById: (...args: unknown[]) => mockRAFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockRAFindByIdAndUpdate(...args),
  },
}));

vi.mock('@/models/Organization', () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: 'org-sub-1', name: 'Sub Org', plan: 'basic' }),
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

vi.mock('@/models/User', () => ({
  default: {
    create: vi.fn().mockResolvedValue({ _id: 'user-sub-1', email: 'test@test.com' }),
    countDocuments: vi.fn().mockResolvedValue(5),
  },
}));

describe('resellerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createResellerAccount creates a new reseller', async () => {
    mockRAFindOne.mockResolvedValue(null); // No existing
    const mockAccount = {
      _id: 'ra-1',
      organizationId: 'org-1',
      name: 'Test Reseller',
      email: 'r@test.com',
      company: 'Test Corp',
      status: 'active',
      subAccounts: [],
    };
    mockRACreate.mockResolvedValue(mockAccount);

    const { createResellerAccount } = await import('@/lib/resellerService');
    const result = await createResellerAccount('org-1', {
      name: 'Test Reseller',
      email: 'r@test.com',
      company: 'Test Corp',
    });

    expect(result.status).toBe('active');
    expect(result.organizationId).toBe('org-1');
    expect(mockRACreate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        status: 'active',
      })
    );
  });

  it('createResellerAccount throws if already exists', async () => {
    mockRAFindOne.mockResolvedValue({ _id: 'existing' });

    const { createResellerAccount } = await import('@/lib/resellerService');
    await expect(
      createResellerAccount('org-1', { name: 'Test', email: 'r@test.com', company: 'Corp' })
    ).rejects.toThrow('Reseller account already exists');
  });

  it('getResellerDashboard returns dashboard data', async () => {
    const mockReseller = {
      _id: 'ra-1',
      subAccounts: [{ organizationId: 'sub-1', name: 'Sub 1', createdAt: new Date() }],
      totalRevenue: 50000,
      maxSubAccounts: 50,
      billingOverride: { markupPercent: 20 },
    };
    mockRAFindById.mockResolvedValue(mockReseller);

    const { getResellerDashboard } = await import('@/lib/resellerService');
    const dashboard = await getResellerDashboard('ra-1');

    expect(dashboard).toHaveProperty('totalAccounts');
    expect(dashboard).toHaveProperty('totalRevenue');
    expect(dashboard).toHaveProperty('activeUsers');
    expect(dashboard.totalAccounts).toBe(1);
    expect(dashboard.totalRevenue).toBe(50000);
  });
});
