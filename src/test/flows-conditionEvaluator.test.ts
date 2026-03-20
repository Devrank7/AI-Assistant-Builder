// src/test/flows-conditionEvaluator.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateConditions } from '@/lib/flows/conditionEvaluator';
import type { IFlowCondition } from '@/models/Flow';

describe('Condition Evaluator', () => {
  const data = {
    'contact.leadScore': 85,
    'contact.leadTemp': 'hot',
    'contact.channel': 'telegram',
    'event.text': 'What is the pricing for enterprise plan?',
    'event.reason': 'high_value',
  };

  it('should pass eq condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.leadTemp', operator: 'eq', value: 'hot' }];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should fail eq condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.leadTemp', operator: 'eq', value: 'cold' }];
    expect(evaluateConditions(conditions, data)).toBe(false);
  });

  it('should pass neq condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.channel', operator: 'neq', value: 'web' }];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should pass gt condition (number)', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.leadScore', operator: 'gt', value: 80 }];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should fail gt condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.leadScore', operator: 'gt', value: 90 }];
    expect(evaluateConditions(conditions, data)).toBe(false);
  });

  it('should pass lt condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.leadScore', operator: 'lt', value: 90 }];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should pass contains condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'event.text', operator: 'contains', value: 'pricing' }];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should fail contains condition', () => {
    const conditions: IFlowCondition[] = [{ field: 'event.text', operator: 'contains', value: 'refund' }];
    expect(evaluateConditions(conditions, data)).toBe(false);
  });

  it('should pass all conditions (AND logic)', () => {
    const conditions: IFlowCondition[] = [
      { field: 'contact.leadScore', operator: 'gt', value: 80 },
      { field: 'contact.leadTemp', operator: 'eq', value: 'hot' },
    ];
    expect(evaluateConditions(conditions, data)).toBe(true);
  });

  it('should fail if any condition fails (AND logic)', () => {
    const conditions: IFlowCondition[] = [
      { field: 'contact.leadScore', operator: 'gt', value: 80 },
      { field: 'contact.leadTemp', operator: 'eq', value: 'cold' },
    ];
    expect(evaluateConditions(conditions, data)).toBe(false);
  });

  it('should pass with empty conditions array', () => {
    expect(evaluateConditions([], data)).toBe(true);
  });

  it('should fail for missing field', () => {
    const conditions: IFlowCondition[] = [{ field: 'contact.nonexistent', operator: 'eq', value: 'foo' }];
    expect(evaluateConditions(conditions, data)).toBe(false);
  });
});
