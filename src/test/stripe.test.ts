import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key_for_testing');

describe('Stripe helpers', () => {
  it('should export price IDs', async () => {
    const { PRICE_IDS } = await import('@/lib/stripe');
    expect(PRICE_IDS.basic_monthly).toBeDefined();
    expect(PRICE_IDS.basic_annual).toBeDefined();
    expect(PRICE_IDS.pro_monthly).toBeDefined();
    expect(PRICE_IDS.pro_annual).toBeDefined();
  });

  it('should resolve correct price ID from plan and period', async () => {
    const { getPriceId, PRICE_IDS } = await import('@/lib/stripe');
    expect(getPriceId('basic', 'monthly')).toBe(PRICE_IDS.basic_monthly);
    expect(getPriceId('pro', 'annual')).toBe(PRICE_IDS.pro_annual);
  });

  it('should derive plan from price ID', async () => {
    const { getPlanFromPriceId, PRICE_IDS } = await import('@/lib/stripe');
    const result = getPlanFromPriceId(PRICE_IDS.pro_monthly);
    expect(result).toEqual({ plan: 'pro', billingPeriod: 'monthly' });
  });
});
