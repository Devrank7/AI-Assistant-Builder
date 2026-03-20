import crypto from 'crypto';
import connectDB from './mongodb';
import ApiKey from '@/models/ApiKey';
import Organization from '@/models/Organization';
import { Errors } from './apiResponse';
import { checkRateLimit } from './rateLimit';
import type { ApiKeyScope } from '@/models/ApiKey';

export type ApiKeyAuthResult =
  | {
      authenticated: true;
      userId: string;
      organizationId: string;
      scopes: ApiKeyScope[];
      keyId: string;
      plan: string;
    }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(environment: 'live' | 'test' = 'live'): string {
  const prefix = `wbx_${environment}_`;
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${random}`;
}

export async function verifyApiKey(request: Request): Promise<ApiKeyAuthResult> {
  const rawKey = request.headers.get('x-winbix-key');
  if (!rawKey) {
    return { authenticated: false, response: Errors.unauthorized('Missing X-WinBix-Key header') };
  }

  await connectDB();

  const keyHash = hashApiKey(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash });

  if (!apiKey) {
    return { authenticated: false, response: Errors.unauthorized('Invalid API key') };
  }

  if (apiKey.status === 'revoked') {
    return { authenticated: false, response: Errors.unauthorized('API key has been revoked') };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { authenticated: false, response: Errors.unauthorized('API key has expired') };
  }

  // IP whitelist check
  if (apiKey.ipWhitelist.length > 0) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    if (!apiKey.ipWhitelist.includes(ip)) {
      return { authenticated: false, response: Errors.unauthorized('IP not whitelisted') };
    }
  }

  // Per-key rate limiting
  const rateLimitResult = checkRateLimit(`apikey:${apiKey._id}`, { windowMs: 60_000, maxRequests: apiKey.rateLimit });
  if (!rateLimitResult.allowed) {
    return { authenticated: false, response: Errors.unauthorized('Rate limit exceeded') };
  }

  // Update usage stats (fire-and-forget)
  apiKey.lastUsedAt = new Date();
  apiKey.totalRequests += 1;
  apiKey.save().catch(() => {});

  // Get org plan
  const org = await Organization.findById(apiKey.organizationId).select('plan');

  return {
    authenticated: true,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes,
    keyId: apiKey._id.toString(),
    plan: org?.plan || 'free',
  };
}

export function requireScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (scopes.includes('admin')) return true;
  return scopes.includes(required);
}
