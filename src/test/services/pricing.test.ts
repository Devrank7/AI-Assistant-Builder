import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('pricing', () => {
  it('should define all four pricing plans', async () => {
    const { PRICING_PLANS } = await import('@/lib/pricing');
    expect(PRICING_PLANS.length).toBe(4);

    const ids = PRICING_PLANS.map((p) => p.id);
    expect(ids).toContain('free');
    expect(ids).toContain('starter');
    expect(ids).toContain('pro');
    expect(ids).toContain('enterprise');
  });

  it('should have free plan at $0', async () => {
    const { getPlanById } = await import('@/lib/pricing');
    const free = getPlanById('free');

    expect(free).not.toBeNull();
    expect(free!.monthlyPrice).toBe(0);
    expect(free!.annualPrice).toBe(0);
  });

  it('should mark pro plan as popular', async () => {
    const { getPlanById } = await import('@/lib/pricing');
    const pro = getPlanById('pro');

    expect(pro!.popular).toBe(true);
  });

  it('should return null for invalid plan id', async () => {
    const { getPlanById } = await import('@/lib/pricing');
    const result = getPlanById('nonexistent' as any);

    expect(result).toBeNull();
  });

  it('should have annual price lower than monthly for paid plans', async () => {
    const { PRICING_PLANS } = await import('@/lib/pricing');
    const paidPlans = PRICING_PLANS.filter((p) => p.monthlyPrice > 0);

    for (const plan of paidPlans) {
      expect(plan.annualPrice).toBeLessThan(plan.monthlyPrice);
    }
  });

  it('should return feature comparison table', async () => {
    const { getFeatureComparison } = await import('@/lib/pricing');
    const rows = getFeatureComparison();

    expect(rows.length).toBeGreaterThan(10);
    const widgetsRow = rows.find((r) => r.feature === 'Widgets');
    expect(widgetsRow).toBeDefined();
    expect(widgetsRow!.free).toBe('1');
    expect(widgetsRow!.pro).toBe('Unlimited');
  });
});

describe('planLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should define limits for all plan tiers', async () => {
    const { PLAN_LIMITS } = await import('@/lib/planLimits');

    expect(PLAN_LIMITS.free.widgets).toBe(1);
    expect(PLAN_LIMITS.free.messagesPerMonth).toBe(100);
    expect(PLAN_LIMITS.starter.widgets).toBe(3);
    expect(PLAN_LIMITS.starter.messagesPerMonth).toBe(1000);
    expect(PLAN_LIMITS.pro.widgets).toBe(-1); // unlimited
    expect(PLAN_LIMITS.pro.messagesPerMonth).toBe(-1); // unlimited
    expect(PLAN_LIMITS.enterprise.widgets).toBe(-1);
  });

  it('should allow unlimited messages for pro plan', async () => {
    vi.mock('@/models/ChatLog', () => ({
      default: { countDocuments: vi.fn() },
    }));
    vi.mock('@/models/Client', () => ({
      default: { find: vi.fn() },
    }));

    const { checkMessageLimit } = await import('@/lib/planLimits');
    const result = await checkMessageLimit('user-1', 'pro');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });

  it('should deny messages for none plan', async () => {
    const { checkMessageLimit } = await import('@/lib/planLimits');
    const result = await checkMessageLimit('user-1', 'none');

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
  });

  it('should return correct month start date', async () => {
    const { getCurrentMonthStart } = await import('@/lib/planLimits');
    const start = getCurrentMonthStart();

    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
  });

  it('should allow widgets for unlimited plans', async () => {
    vi.mock('@/models/Client', () => ({
      default: { countDocuments: vi.fn() },
    }));

    const { checkWidgetLimit } = await import('@/lib/planLimits');
    const result = await checkWidgetLimit('user-1', 'enterprise');

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });
});
