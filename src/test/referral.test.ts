import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockUserFindOne = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockReferralCreate = vi.fn();
const mockReferralCountDocuments = vi.fn();
const mockReferralFind = vi.fn(() => ({ sort: vi.fn(() => ({ limit: vi.fn(() => []) })) }));

vi.mock('@/models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockUserFindByIdAndUpdate(...args),
  },
}));

vi.mock('@/models/Referral', () => ({
  default: {
    create: (...args: unknown[]) => mockReferralCreate(...args),
    countDocuments: (...args: unknown[]) => mockReferralCountDocuments(...args),
    find: (...args: unknown[]) => mockReferralFind(...args),
  },
}));

describe('referral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateReferralCode returns existing code if user has one', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: 'ABC123' });
    const { generateReferralCode } = await import('@/lib/referral');
    const code = await generateReferralCode('u1');
    expect(code).toBe('ABC123');
  });

  it('generateReferralCode creates new code if user has none', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: null });
    mockUserFindByIdAndUpdate.mockResolvedValue({ referralCode: 'NEW123' });
    const { generateReferralCode } = await import('@/lib/referral');
    const code = await generateReferralCode('u1');
    expect(code).toBeTruthy();
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalled();
  });

  it('applyReferral creates referral record and returns true', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'referrer1', referralCode: 'REF1' });
    mockReferralCreate.mockResolvedValue({ referrerId: 'referrer1', refereeId: 'newuser1' });
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('REF1', 'newuser1');
    expect(result).toBe(true);
    expect(mockReferralCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        referrerId: 'referrer1',
        refereeId: 'newuser1',
        code: 'REF1',
      })
    );
  });

  it('applyReferral returns false for invalid code', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('INVALID', 'newuser1');
    expect(result).toBe(false);
  });

  it('applyReferral returns false if user refers themselves', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: 'SELF' });
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('SELF', 'u1');
    expect(result).toBe(false);
  });

  it('getReferralStats returns correct counts', async () => {
    mockReferralCountDocuments.mockResolvedValue(5);
    mockReferralFind.mockReturnValue({
      sort: vi.fn(() => ({ limit: vi.fn(() => [{ refereeId: 'r1', createdAt: new Date(), rewardApplied: true }]) })),
    });
    const { getReferralStats } = await import('@/lib/referral');
    const stats = await getReferralStats('u1');
    expect(stats.totalReferrals).toBe(5);
  });
});
