interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

if (typeof globalThis !== 'undefined') {
  const cleanupTimer = setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key);
      }
    },
    5 * 60 * 1000
  );
  // Allow Node.js process to exit cleanly even if timer is still active
  if (cleanupTimer.unref) cleanupTimer.unref();
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  auth: { windowMs: 60000, maxRequests: 5 },
  chat: { windowMs: 60 * 1000, maxRequests: 30 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
  webhook: { windowMs: 60 * 1000, maxRequests: 50 },
  demoGenerate: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
} as const;

export function checkRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining, resetAt: entry.resetAt };
}

export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `${prefix}:${ip}`;
}
