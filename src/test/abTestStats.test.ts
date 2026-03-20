import { describe, it, expect } from 'vitest';
import { chiSquaredTest, calculateConfidence } from '@/lib/abTestStats';

describe('abTestStats', () => {
  it('returns not significant for small sample', () => {
    const result = chiSquaredTest([
      { visitors: 10, conversions: 1 },
      { visitors: 10, conversions: 2 },
    ]);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it('returns significant for large difference', () => {
    const result = chiSquaredTest([
      { visitors: 1000, conversions: 50 },
      { visitors: 1000, conversions: 120 },
    ]);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('returns not significant for equal rates', () => {
    const result = chiSquaredTest([
      { visitors: 500, conversions: 50 },
      { visitors: 500, conversions: 52 },
    ]);
    expect(result.significant).toBe(false);
  });

  it('calculateConfidence returns correct confidence intervals', () => {
    const ci = calculateConfidence(500, 50);
    expect(ci.rate).toBeCloseTo(0.1, 2);
    expect(ci.lower).toBeLessThan(ci.rate);
    expect(ci.upper).toBeGreaterThan(ci.rate);
    expect(ci.lower).toBeGreaterThan(0);
    expect(ci.upper).toBeLessThan(1);
  });

  it('handles zero visitors gracefully', () => {
    const result = chiSquaredTest([
      { visitors: 0, conversions: 0 },
      { visitors: 0, conversions: 0 },
    ]);
    expect(result.significant).toBe(false);
  });

  it('identifies winner index correctly', () => {
    const result = chiSquaredTest([
      { visitors: 1000, conversions: 50 },
      { visitors: 1000, conversions: 150 },
    ]);
    expect(result.winnerIndex).toBe(1);
  });
});
