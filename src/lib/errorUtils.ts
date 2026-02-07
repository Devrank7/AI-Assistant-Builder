import { randomUUID } from 'crypto';

/**
 * Generate a unique error ID for correlation in logs and support tickets
 */
export function generateErrorId(): string {
  return randomUUID();
}

/**
 * Create a standardized error response object with correlation ID
 */
export function createErrorResponse(error: string, status: number, context?: Record<string, unknown>) {
  const errorId = generateErrorId();
  console.error(`[${errorId}]`, error, context || '');
  return { success: false, error, errorId, status };
}
