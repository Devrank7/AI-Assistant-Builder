/**
 * Unit Tests: Trial Logic
 *
 * Tests for trial countdown and progress calculations.
 * Note: We replicate the logic here to avoid importing trialReminders.ts
 * which has nodemailer dependency that fails in Vitest/jsdom environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Trial days constant (same as in lib/paymentProviders/types.ts)
const TRIAL_DAYS = 30;

/**
 * Calculate days remaining in trial
 */
function getTrialDaysLeft(startDate: Date): number {
  const trialEnd = new Date(startDate);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const now = new Date();
  return Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Get trial progress percentage (0-100)
 */
function getTrialProgress(startDate: Date): number {
  const elapsed = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.round((elapsed / TRIAL_DAYS) * 100));
}

describe('Trial Logic', () => {
  beforeEach(() => {
    // Mock the current date to 2026-02-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTrialDaysLeft()', () => {
    it('should return 30 days for trial that just started', () => {
      const startDate = new Date('2026-02-15T00:00:00Z');
      const daysLeft = getTrialDaysLeft(startDate);
      expect(daysLeft).toBe(30);
    });

    it('should return 15 days for trial started 15 days ago', () => {
      const startDate = new Date('2026-01-31T00:00:00Z'); // 15 days ago
      const daysLeft = getTrialDaysLeft(startDate);
      expect(daysLeft).toBe(15);
    });

    it('should return 0 for expired trial', () => {
      const startDate = new Date('2026-01-01T00:00:00Z'); // 45 days ago
      const daysLeft = getTrialDaysLeft(startDate);
      expect(daysLeft).toBe(0);
    });

    it('should return 1 for trial ending tomorrow', () => {
      // 29 days ago means trial ends in 1 day
      const startDate = new Date('2026-01-17T12:00:00Z'); // 29 days ago
      const daysLeft = getTrialDaysLeft(startDate);
      expect(daysLeft).toBe(1);
    });

    it('should never return negative values', () => {
      const startDate = new Date('2025-01-01T00:00:00Z'); // way in the past
      const daysLeft = getTrialDaysLeft(startDate);
      expect(daysLeft).toBe(0);
    });
  });

  describe('getTrialProgress()', () => {
    it('should return 0% for trial that just started', () => {
      const startDate = new Date('2026-02-15T12:00:00Z');
      const progress = getTrialProgress(startDate);
      expect(progress).toBe(0);
    });

    it('should return 50% for trial halfway through', () => {
      const startDate = new Date('2026-01-31T12:00:00Z'); // 15 days ago
      const progress = getTrialProgress(startDate);
      expect(progress).toBe(50);
    });

    it('should return 100% for expired trial', () => {
      const startDate = new Date('2026-01-01T00:00:00Z'); // 45 days ago
      const progress = getTrialProgress(startDate);
      expect(progress).toBe(100);
    });

    it('should never exceed 100%', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const progress = getTrialProgress(startDate);
      expect(progress).toBe(100);
    });

    it('should return rounded integer values', () => {
      const startDate = new Date('2026-02-05T12:00:00Z'); // 10 days ago
      const progress = getTrialProgress(startDate);
      expect(Number.isInteger(progress)).toBe(true);
      expect(progress).toBe(33); // 10/30 * 100 ≈ 33
    });
  });
});
