import { describe, it, expect } from 'vitest';
import { PRICING_PLANS, getPlanById, getFeatureComparison } from '../pricing';

describe('pricing', () => {
  it('has 4 plans in correct order', () => {
    expect(PRICING_PLANS).toHaveLength(4);
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'enterprise']);
  });

  it('getPlanById returns correct plan', () => {
    const starter = getPlanById('starter');
    expect(starter).toBeDefined();
    expect(starter!.monthlyPrice).toBe(29);
    expect(starter!.annualPrice).toBe(24);
  });

  it('getPlanById returns null for unknown plan', () => {
    expect(getPlanById('unknown' as any)).toBeNull();
  });

  it('free plan has $0 pricing', () => {
    const free = getPlanById('free');
    expect(free!.monthlyPrice).toBe(0);
    expect(free!.annualPrice).toBe(0);
  });

  it('enterprise plan has correct pricing', () => {
    const ent = getPlanById('enterprise');
    expect(ent!.monthlyPrice).toBe(299);
  });

  it('getFeatureComparison returns non-empty array', () => {
    const features = getFeatureComparison();
    expect(features.length).toBeGreaterThan(5);
    expect(features[0]).toHaveProperty('feature');
    expect(features[0]).toHaveProperty('free');
    expect(features[0]).toHaveProperty('starter');
    expect(features[0]).toHaveProperty('pro');
    expect(features[0]).toHaveProperty('enterprise');
  });
});
