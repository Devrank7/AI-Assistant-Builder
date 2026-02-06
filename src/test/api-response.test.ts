import { describe, it, expect } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

describe('Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const key = `test-${Date.now()}`;
    const result = checkRateLimit(key, RATE_LIMITS.api);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.api.maxRequests - 1);
  });

  it('should block requests exceeding limit', () => {
    const key = `test-block-${Date.now()}`;
    const limit = { windowMs: 60000, maxRequests: 3 };

    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, limit);
      expect(result.allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, limit);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('should track remaining requests correctly', () => {
    const key = `test-remaining-${Date.now()}`;
    const limit = { windowMs: 60000, maxRequests: 5 };

    const r1 = checkRateLimit(key, limit);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(key, limit);
    expect(r2.remaining).toBe(3);
  });
});

describe('Validation schemas', () => {
  it('should validate chat message', async () => {
    const { chatMessageSchema } = await import('@/lib/validation');

    const valid = chatMessageSchema.safeParse({
      clientId: 'client-1',
      message: 'Hello, how are you?',
      sessionId: 'session-123',
    });
    expect(valid.success).toBe(true);

    const invalid = chatMessageSchema.safeParse({
      message: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('should reject oversized messages', async () => {
    const { chatMessageSchema } = await import('@/lib/validation');

    const result = chatMessageSchema.safeParse({
      message: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('should validate pagination params', async () => {
    const { paginationSchema } = await import('@/lib/validation');

    const valid = paginationSchema.safeParse({ page: '2', limit: '20' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.page).toBe(2);
      expect(valid.data.limit).toBe(20);
    }
  });
});
