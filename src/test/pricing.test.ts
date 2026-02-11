/**
 * Pricing Library Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePrepaymentPrice,
  getSubscriptionTier,
  getTierByMonths,
  isValidPrepaymentMonths,
  calculateNextPaymentDate,
  buildSubscriptionTiers,
  BASE_MONTHLY_PRICE,
  ANNUAL_DISCOUNT,
  SUBSCRIPTION_TIERS,
} from '@/lib/pricing';

describe('Pricing Library', () => {
  describe('calculatePrepaymentPrice', () => {
    it('should calculate 1 month price correctly', () => {
      const result = calculatePrepaymentPrice(1);
      expect(result.total).toBe(65);
      expect(result.perMonth).toBe(65);
      expect(result.savings).toBe(0);
      expect(result.discount).toBe(0);
    });

    it('should calculate 3 months price correctly (no discount)', () => {
      const result = calculatePrepaymentPrice(3);
      expect(result.total).toBe(195);
      expect(result.perMonth).toBe(65);
      expect(result.savings).toBe(0);
      expect(result.discount).toBe(0);
    });

    it('should calculate 6 months price correctly (no discount)', () => {
      const result = calculatePrepaymentPrice(6);
      expect(result.total).toBe(390);
      expect(result.perMonth).toBe(65);
      expect(result.savings).toBe(0);
      expect(result.discount).toBe(0);
    });

    it('should calculate 12 months price with 15% discount', () => {
      const result = calculatePrepaymentPrice(12);
      expect(result.total).toBe(663);
      expect(result.perMonth).toBe(55.25);
      expect(result.savings).toBe(117);
      expect(result.discount).toBe(0.15);
    });

    it('should apply annual discount for 12+ months', () => {
      const result = calculatePrepaymentPrice(24);
      expect(result.discount).toBe(0.15);
    });

    it('should accept custom base price and discount', () => {
      const result = calculatePrepaymentPrice(12, 100, 0.2);
      expect(result.total).toBe(960);
      expect(result.perMonth).toBe(80);
      expect(result.savings).toBe(240);
      expect(result.discount).toBe(0.2);
    });
  });

  describe('buildSubscriptionTiers', () => {
    it('should build tiers with default params', () => {
      const tiers = buildSubscriptionTiers();
      expect(tiers.monthly.totalPrice).toBe(65);
      expect(tiers.quarterly.totalPrice).toBe(195);
      expect(tiers.semi_annual.totalPrice).toBe(390);
      expect(tiers.annual.totalPrice).toBe(663);
      expect(tiers.annual.pricePerMonth).toBe(55.25);
    });

    it('should build tiers with custom params', () => {
      const tiers = buildSubscriptionTiers(100, 0.2);
      expect(tiers.monthly.totalPrice).toBe(100);
      expect(tiers.quarterly.totalPrice).toBe(300);
      expect(tiers.semi_annual.totalPrice).toBe(600);
      expect(tiers.annual.totalPrice).toBe(960);
      expect(tiers.annual.pricePerMonth).toBe(80);
      expect(tiers.annual.discount).toBe(0.2);
    });
  });

  describe('getSubscriptionTier', () => {
    it('should return monthly for 1 month', () => {
      expect(getSubscriptionTier(1)).toBe('monthly');
    });

    it('should return quarterly for 3 months', () => {
      expect(getSubscriptionTier(3)).toBe('quarterly');
    });

    it('should return semi_annual for 6 months', () => {
      expect(getSubscriptionTier(6)).toBe('semi_annual');
    });

    it('should return annual for 12 months', () => {
      expect(getSubscriptionTier(12)).toBe('annual');
    });

    it('should return quarterly for 4-5 months', () => {
      expect(getSubscriptionTier(4)).toBe('quarterly');
      expect(getSubscriptionTier(5)).toBe('quarterly');
    });

    it('should return semi_annual for 7-11 months', () => {
      expect(getSubscriptionTier(7)).toBe('semi_annual');
      expect(getSubscriptionTier(11)).toBe('semi_annual');
    });
  });

  describe('getTierByMonths', () => {
    it('should return correct tier config', () => {
      const tier = getTierByMonths(12);
      expect(tier).not.toBeNull();
      expect(tier?.id).toBe('annual');
      expect(tier?.totalPrice).toBe(663);
    });

    it('should return null for invalid months', () => {
      const tier = getTierByMonths(5);
      expect(tier).toBeNull();
    });
  });

  describe('isValidPrepaymentMonths', () => {
    it('should return true for valid months', () => {
      expect(isValidPrepaymentMonths(1)).toBe(true);
      expect(isValidPrepaymentMonths(3)).toBe(true);
      expect(isValidPrepaymentMonths(6)).toBe(true);
      expect(isValidPrepaymentMonths(12)).toBe(true);
    });

    it('should return false for invalid months', () => {
      expect(isValidPrepaymentMonths(2)).toBe(false);
      expect(isValidPrepaymentMonths(5)).toBe(false);
      expect(isValidPrepaymentMonths(24)).toBe(false);
    });
  });

  describe('calculateNextPaymentDate', () => {
    it('should add correct number of months', () => {
      const now = new Date();
      const result = calculateNextPaymentDate(3);

      const expectedMonth = now.getMonth() + 3;
      expect(result.getMonth()).toBe(expectedMonth % 12);
    });
  });

  describe('Constants', () => {
    it('should have correct BASE_MONTHLY_PRICE', () => {
      expect(BASE_MONTHLY_PRICE).toBe(65);
    });

    it('should have correct ANNUAL_DISCOUNT', () => {
      expect(ANNUAL_DISCOUNT).toBe(0.15);
    });

    it('should have 4 subscription tiers', () => {
      expect(Object.keys(SUBSCRIPTION_TIERS)).toHaveLength(4);
    });
  });
});
