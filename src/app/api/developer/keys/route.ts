import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';
import Organization from '@/models/Organization';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { hashApiKey, generateApiKey } from '@/lib/apiKeyAuth';

const MAX_KEYS_PER_ORG = 10;

const PLAN_API_LIMITS: Record<string, { allowed: boolean; rateLimit: number }> = {
  free: { allowed: false, rateLimit: 0 },
  starter: { allowed: true, rateLimit: 60 },
  pro: { allowed: true, rateLimit: 300 },
  enterprise: { allowed: true, rateLimit: 1000 },
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };

    const keys = await ApiKey.find(query)
      .select(
        'keyPrefix name environment scopes status rateLimit ipWhitelist expiresAt lastUsedAt totalRequests createdAt'
      )
      .sort({ createdAt: -1 });

    return successResponse({ keys });
  } catch (error) {
    console.error('List API keys error:', error);
    return Errors.internal('Failed to list API keys');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    // Check plan allows API access
    const orgId = auth.organizationId;
    let plan = 'free';
    if (orgId) {
      const org = await Organization.findById(orgId).select('plan');
      plan = org?.plan || 'free';
    }

    const planLimits = PLAN_API_LIMITS[plan] || PLAN_API_LIMITS.free;
    if (!planLimits.allowed) {
      return Errors.forbidden('API access requires Starter plan or higher');
    }

    // Check key count limit
    const keyQuery = orgId ? { organizationId: orgId } : { userId: auth.userId };
    const existingCount = await ApiKey.countDocuments({ ...keyQuery, status: 'active' });
    if (existingCount >= MAX_KEYS_PER_ORG) {
      return Errors.badRequest(`Maximum ${MAX_KEYS_PER_ORG} active API keys allowed`);
    }

    const body = await request.json();
    const { name, environment = 'live', scopes = ['read'], expiresInDays, ipWhitelist = [] } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Errors.badRequest('Key name is required');
    }

    const rawKey = generateApiKey(environment);
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 16) + '...';

    const apiKey = await ApiKey.create({
      keyHash,
      keyPrefix,
      name: name.trim(),
      userId: auth.userId,
      organizationId: orgId || auth.userId,
      environment,
      scopes: Array.isArray(scopes) ? scopes : ['read'],
      rateLimit: planLimits.rateLimit,
      ipWhitelist: Array.isArray(ipWhitelist) ? ipWhitelist : [],
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
    });

    return successResponse({
      key: {
        id: apiKey._id,
        rawKey,
        keyPrefix,
        name: apiKey.name,
        environment: apiKey.environment,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return Errors.internal('Failed to create API key');
  }
}
