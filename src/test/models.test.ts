/**
 * Unit Tests: Model Pricing
 *
 * Tests for src/lib/models.ts - Gemini model registry and pricing calculations
 */

import { describe, it, expect } from 'vitest';
import { GEMINI_MODELS, getModel, getDefaultModel, calculateCost, getModelIds } from '@/lib/models';

describe('Gemini Model Registry', () => {
  describe('GEMINI_MODELS', () => {
    it('should have at least 3 models defined', () => {
      expect(GEMINI_MODELS.length).toBeGreaterThanOrEqual(3);
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
      const model = getModel('gemini-3-flash-preview');
      expect(model.id).toBe('gemini-3-flash-preview');
      expect(model.name).toBe('Gemini 3 Flash');
    });

    it('should return default model for unknown ID', () => {
      const model = getModel('unknown-model-xyz');
      expect(model.isDefault).toBe(true);
    });

    it('should return gemini-3.1-flash-lite-preview correctly', () => {
      const model = getModel('gemini-3.1-flash-lite-preview');
      expect(model.tier).toBe('lite');
    });
  });

  describe('getDefaultModel()', () => {
    it('should return gemini-3-flash-preview as default', () => {
      const model = getDefaultModel();
      expect(model.id).toBe('gemini-3-flash-preview');
      expect(model.isDefault).toBe(true);
    });
  });

  describe('calculateCost()', () => {
    it('should calculate cost correctly for gemini-3-flash-preview', () => {
      // 1M input tokens + 1M output tokens = $0.50 + $3.00 = $3.50
      const cost = calculateCost('gemini-3-flash-preview', 1_000_000, 1_000_000);
      expect(cost).toBe(3.5);
    });

    it('should calculate cost correctly for small token counts', () => {
      // 1000 input + 500 output on gemini-3-flash-preview
      // (1000/1M) * 0.50 + (500/1M) * 3.00 = 0.0005 + 0.0015 = 0.002
      const cost = calculateCost('gemini-3-flash-preview', 1000, 500);
      expect(cost).toBeCloseTo(0.002, 6);
    });

    it('should calculate cost correctly for pro models', () => {
      // gemini-3.1-pro-preview: $2.00/1M input, $12.00/1M output
      // 10000 input + 5000 output
      const cost = calculateCost('gemini-3.1-pro-preview', 10000, 5000);
      // (10000/1M) * 2.00 + (5000/1M) * 12.00 = 0.02 + 0.06 = 0.08
      expect(cost).toBeCloseTo(0.08, 6);
    });

    it('should handle zero tokens', () => {
      const cost = calculateCost('gemini-3-flash-preview', 0, 0);
      expect(cost).toBe(0);
    });

    it('should use default model for unknown ID', () => {
      const unknownCost = calculateCost('unknown-model', 1_000_000, 1_000_000);
      const defaultCost = calculateCost('gemini-3-flash-preview', 1_000_000, 1_000_000);
      expect(unknownCost).toBe(defaultCost);
    });
  });

  describe('getModelIds()', () => {
    it('should return array of all model IDs', () => {
      const ids = getModelIds();
      expect(ids).toContain('gemini-3-flash-preview');
      expect(ids).toContain('gemini-3.1-flash-lite-preview');
      expect(ids).toContain('gemini-3.1-pro-preview');
      expect(ids.length).toBe(GEMINI_MODELS.length);
    });
  });
});
