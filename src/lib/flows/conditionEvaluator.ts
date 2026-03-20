// src/lib/flows/conditionEvaluator.ts
import type { IFlowCondition } from '@/models/Flow';

/**
 * Evaluate all conditions against a flat data map.
 * All conditions must pass (AND logic).
 * Data keys are dotted paths like 'contact.leadScore'.
 */
export function evaluateConditions(conditions: IFlowCondition[], data: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((cond) => {
    const actual = data[cond.field];
    if (actual === undefined || actual === null) return false;

    switch (cond.operator) {
      case 'eq':
        return String(actual) === String(cond.value);
      case 'neq':
        return String(actual) !== String(cond.value);
      case 'gt':
        return Number(actual) > Number(cond.value);
      case 'lt':
        return Number(actual) < Number(cond.value);
      case 'contains':
        return String(actual).toLowerCase().includes(String(cond.value).toLowerCase());
      default:
        return false;
    }
  });
}
