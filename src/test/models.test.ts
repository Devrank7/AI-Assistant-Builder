/**
 * Unit Tests: Model Pricing
 *
 * Tests for src/lib/models.ts - Gemini model registry and pricing calculations
 */

import { describe, it, expect } from 'vitest';
import { GEMINI_MODELS, getModel, getDefaultModel, calculateCost, getModelIds } from '@/lib/models';

describe('Gemini Model Registry', () => {
  describe('GEMINI_MODELS', () => {
    it('should have at least 5 models defined', () => {
      expect(GEMINI_MODELS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have exactly one default model', () => {
      const defaults = GEMINI_MODELS.filter((m) => m.isDefault);
      expect(defaults.length).toBe(1);
    });

    it('should have valid pricing for all models', () => {
      for (const model of GEMINI_MODELS) {
        expect(model.pricing.inputPer1M).toBeGreaterThan(0);
        expect(model.pricing.outputPer1M).toBeGreaterThan(0);
        expect(model.pricing.outputPer1M).toBeGreaterThanOrEqual(model.pricing.inputPer1M);
      }
    });

    it('should have required fields for all models', () => {
      for (const model of GEMINI_MODELS) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBe('google');
        expect(model.maxOutputTokens).toBeGreaterThan(0);
        expect(['lite', 'standard', 'pro']).toContain(model.tier);
      }
    });
  });

  describe('getModel()', () => {
    it('should return the correct model by ID', () => {
      const model = getModel('gemini-3-flash');
      expect(model.id).toBe('gemini-3-flash');
      expect(model.name).toBe('Gemini 3 Flash');
    });

    it('should return default model for unknown ID', () => {
      const model = getModel('unknown-model-xyz');
      expect(model.isDefault).toBe(true);
    });

    it('should return gemini-3-flash-lite correctly', () => {
      const model = getModel('gemini-3-flash-lite');
      expect(model.tier).toBe('lite');
      expect(model.pricing.inputPer1M).toBe(0.05);
    });
  });

  describe('getDefaultModel()', () => {
    it('should return gemini-3-flash as default', () => {
      const model = getDefaultModel();
      expect(model.id).toBe('gemini-3-flash');
      expect(model.isDefault).toBe(true);
    });
  });

  describe('calculateCost()', () => {
    it('should calculate cost correctly for gemini-3-flash', () => {
      // 1M input tokens + 1M output tokens = $0.10 + $0.40 = $0.50
      const cost = calculateCost('gemini-3-flash', 1_000_000, 1_000_000);
      expect(cost).toBe(0.5);
    });

    it('should calculate cost correctly for small token counts', () => {
      // 1000 input + 500 output on gemini-3-flash
      // (1000/1M) * 0.10 + (500/1M) * 0.40 = 0.0001 + 0.0002 = 0.0003
      const cost = calculateCost('gemini-3-flash', 1000, 500);
      expect(cost).toBeCloseTo(0.0003, 6);
    });

    it('should calculate cost correctly for pro models', () => {
      // gemini-3-pro: $1.25/1M input, $5.00/1M output
      // 10000 input + 5000 output
      const cost = calculateCost('gemini-3-pro', 10000, 5000);
      // (10000/1M) * 1.25 + (5000/1M) * 5.00 = 0.0125 + 0.025 = 0.0375
      expect(cost).toBeCloseTo(0.0375, 6);
    });

    it('should handle zero tokens', () => {
      const cost = calculateCost('gemini-3-flash', 0, 0);
      expect(cost).toBe(0);
    });

    it('should use default model for unknown ID', () => {
      const unknownCost = calculateCost('unknown-model', 1_000_000, 1_000_000);
      const defaultCost = calculateCost('gemini-3-flash', 1_000_000, 1_000_000);
      expect(unknownCost).toBe(defaultCost);
    });
  });

  describe('getModelIds()', () => {
    it('should return array of all model IDs', () => {
      const ids = getModelIds();
      expect(ids).toContain('gemini-3-flash');
      expect(ids).toContain('gemini-3-flash-lite');
      expect(ids).toContain('gemini-3-pro');
      expect(ids.length).toBe(GEMINI_MODELS.length);
    });
  });
});
