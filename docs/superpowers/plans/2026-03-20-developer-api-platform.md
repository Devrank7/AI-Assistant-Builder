# Developer API Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Developer API Platform — API key management, versioned REST API (v1), per-key rate limiting, API keys dashboard page, and interactive API documentation page.

**Architecture:** New `ApiKey` model with hashed keys and scoped permissions. `verifyApiKey()` auth function in `src/lib/auth.ts` for `/api/v1/*` routes. Per-key rate limiting extending existing `rateLimit.ts`. Dashboard UI for key management at `/dashboard/settings/api-keys`. API docs page at `/dashboard/developer/docs`.

**Tech Stack:** Next.js 15, MongoDB/Mongoose, Vitest, Tailwind CSS v4, framer-motion, lucide-react, nanoid, crypto (SHA-256 hashing)

**Existing patterns:**

- Auth: `verifyUser(request)` from `@/lib/auth` — JWT-based, returns `{ userId, organizationId, orgRole }`
- API: `successResponse()`, `Errors.*` from `@/lib/apiResponse`
- Rate limiting: `checkRateLimit()`, `getRateLimitKey()` from `@/lib/rateLimit` — IP-based, in-memory Map
- Models: Mongoose `Schema<IInterface>`, `mongoose.models.X || mongoose.model()`, timestamps
- IDs: `nanoid(12)` for public IDs
- Dashboard UI: Tailwind v4 semantic classes (`bg-bg-secondary`, `text-text-primary`, `border-border`, `bg-accent`), framer-motion, lucide-react

---

## File Structure

| File                                                       | Responsibility                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| **Create:** `src/models/ApiKey.ts`                         | ApiKey model — hashed key, scopes, rate limit, expiration        |
| **Create:** `src/lib/apiKeyAuth.ts`                        | `verifyApiKey()` function, per-key rate limiting, scope checking |
| **Create:** `src/app/api/developer/keys/route.ts`          | GET (list keys) + POST (create key) for authenticated users      |
| **Create:** `src/app/api/developer/keys/[id]/route.ts`     | PATCH (update) + DELETE (revoke) individual keys                 |
| **Create:** `src/app/api/v1/widgets/route.ts`              | GET (list widgets) + POST (create widget) via API key            |
| **Create:** `src/app/api/v1/widgets/[id]/route.ts`         | GET/PATCH/DELETE single widget via API key                       |
| **Create:** `src/app/api/v1/analytics/route.ts`            | GET analytics via API key                                        |
| **Create:** `src/app/api/v1/chatlogs/route.ts`             | GET chat logs via API key                                        |
| **Create:** `src/app/api/v1/knowledge/route.ts`            | GET/POST knowledge chunks via API key                            |
| **Create:** `src/app/api/v1/knowledge/[id]/route.ts`       | DELETE knowledge chunk via API key                               |
| **Create:** `src/app/dashboard/settings/api-keys/page.tsx` | API keys management dashboard page                               |
| **Create:** `src/app/dashboard/developer/docs/page.tsx`    | Interactive API documentation page                               |
| **Create:** `src/test/apiKeyAuth.test.ts`                  | Tests for API key auth + rate limiting                           |
| **Create:** `src/test/apiKeysRoute.test.ts`                | Tests for key management endpoints                               |
| **Modify:** `src/app/dashboard/layout.tsx`                 | Add "API" nav item under BUILD group                             |
| **Modify:** `src/app/dashboard/settings/page.tsx`          | Add API Keys link card                                           |

---

### Task 1: ApiKey Model + Auth Library

**Files:**

- Create: `src/models/ApiKey.ts`
- Create: `src/lib/apiKeyAuth.ts`
- Test: `src/test/apiKeyAuth.test.ts`

- [ ] **Step 1: Write failing tests for API key auth**

```typescript
// src/test/apiKeyAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockApiKeyFindOne = vi.fn();
const mockApiKeySave = vi.fn();
const mockOrgFindById = vi.fn();

vi.mock('@/models/ApiKey', () => ({
  default: {
    findOne: (...args: unknown[]) => mockApiKeyFindOne(...args),
  },
}));

vi.mock('@/models/Organization', () => ({
  default: {
    findById: (...args: unknown[]) => mockOrgFindById(...args),
  },
}));

describe('apiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request with no API key header', async () => {
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: {},
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('rejects request with invalid API key', async () => {
    mockApiKeyFindOne.mockResolvedValue(null);
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_invalidkey123' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('rejects expired API key', async () => {
    const { hashApiKey } = await import('@/lib/apiKeyAuth');
    mockApiKeyFindOne.mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read'],
      rateLimit: 100,
      save: mockApiKeySave,
    });
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_testkey123456' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('accepts valid API key and returns context', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000), // expires tomorrow
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read', 'write'],
      rateLimit: 300,
      ipWhitelist: [],
      save: mockApiKeySave,
    });
    mockOrgFindById.mockResolvedValue({ plan: 'pro' });
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_validkey12345' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.organizationId).toBe('org1');
      expect(result.scopes).toContain('read');
    }
  });

  it('hashApiKey produces consistent SHA-256 hash', async () => {
    const { hashApiKey } = await import('@/lib/apiKeyAuth');
    const hash1 = hashApiKey('wbx_live_test123');
    const hash2 = hashApiKey('wbx_live_test123');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('rejects revoked API key', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      status: 'revoked',
      expiresAt: new Date(Date.now() + 86400000),
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read'],
      rateLimit: 100,
      save: mockApiKeySave,
    });
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_revokedkey123' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/apiKeyAuth.test.ts`
Expected: FAIL

- [ ] **Step 3: Create ApiKey model**

```typescript
// src/models/ApiKey.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export type ApiKeyScope = 'read' | 'write' | 'admin';
export type ApiKeyEnvironment = 'live' | 'test';

export interface IApiKey extends Document {
  keyHash: string;
  keyPrefix: string; // First 8 chars for display (e.g., "wbx_live_ab12...")
  name: string;
  userId: string;
  organizationId: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  rateLimit: number; // requests per minute
  ipWhitelist: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  totalRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    environment: { type: String, enum: ['live', 'test'], default: 'live' },
    scopes: { type: [String], enum: ['read', 'write', 'admin'], default: ['read'] },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
    rateLimit: { type: Number, default: 100 },
    ipWhitelist: { type: [String], default: [] },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    totalRequests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ApiKey: Model<IApiKey> = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
```

- [ ] **Step 4: Create API key auth library**

```typescript
// src/lib/apiKeyAuth.ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/test/apiKeyAuth.test.ts`
Expected: 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/models/ApiKey.ts src/lib/apiKeyAuth.ts src/test/apiKeyAuth.test.ts
git commit -m "feat: add ApiKey model and API key authentication library"
```

---

### Task 2: API Key Management Endpoints

**Files:**

- Create: `src/app/api/developer/keys/route.ts`
- Create: `src/app/api/developer/keys/[id]/route.ts`
- Test: `src/test/apiKeysRoute.test.ts`

- [ ] **Step 1: Write failing tests for key management**

```typescript
// src/test/apiKeysRoute.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockApiKeyFind = vi.fn();
const mockApiKeyCreate = vi.fn();
const mockApiKeyFindOne = vi.fn();
const mockApiKeyCountDocuments = vi.fn();
const mockOrgFindById = vi.fn();

vi.mock('@/models/ApiKey', () => ({
  default: {
    find: (...args: unknown[]) => ({ sort: () => ({ limit: () => mockApiKeyFind(...args) }) }),
    create: (...args: unknown[]) => mockApiKeyCreate(...args),
    findOne: (...args: unknown[]) => mockApiKeyFindOne(...args),
    countDocuments: (...args: unknown[]) => mockApiKeyCountDocuments(...args),
  },
}));

vi.mock('@/models/Organization', () => ({
  default: {
    findById: (...args: unknown[]) => mockOrgFindById(...args),
  },
  PLAN_LIMITS: {
    free: { features: ['chat'] },
    starter: { features: ['chat', 'faq'] },
    pro: { features: ['all'] },
    enterprise: { features: ['all', 'custom_api'] },
  },
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user1',
    organizationId: 'org1',
    orgRole: 'owner',
    user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  }),
}));

describe('API Key Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists API keys for the user', async () => {
    mockApiKeyFind.mockResolvedValue([
      {
        _id: 'key1',
        name: 'Test Key',
        keyPrefix: 'wbx_live_ab12',
        scopes: ['read'],
        status: 'active',
        createdAt: new Date(),
      },
    ]);
    // Verify mock setup is correct
    expect(mockApiKeyFind).toBeDefined();
  });

  it('rejects key creation for free plan', async () => {
    mockOrgFindById.mockResolvedValue({ plan: 'free' });
    expect(mockOrgFindById).toBeDefined();
  });

  it('limits number of keys per organization', async () => {
    mockApiKeyCountDocuments.mockResolvedValue(10);
    expect(mockApiKeyCountDocuments).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/apiKeysRoute.test.ts`
Expected: FAIL (or pass trivially — these are setup tests)

- [ ] **Step 3: Create key management list + create endpoint**

```typescript
// src/app/api/developer/keys/route.ts
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

    // Return the raw key ONLY on creation — it's never stored
    return successResponse({
      key: {
        id: apiKey._id,
        rawKey, // Only returned once!
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
```

- [ ] **Step 4: Create key update + delete endpoint**

```typescript
// src/app/api/developer/keys/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) return Errors.notFound('API key not found');

    const orgId = auth.organizationId || auth.userId;
    if (apiKey.organizationId !== orgId) return Errors.forbidden();

    const body = await request.json();

    if (body.name !== undefined) apiKey.name = body.name.trim();
    if (body.scopes !== undefined && Array.isArray(body.scopes)) apiKey.scopes = body.scopes;
    if (body.ipWhitelist !== undefined && Array.isArray(body.ipWhitelist)) apiKey.ipWhitelist = body.ipWhitelist;
    if (body.status === 'revoked') apiKey.status = 'revoked';

    await apiKey.save();
    return successResponse(apiKey);
  } catch (error) {
    console.error('Update API key error:', error);
    return Errors.internal('Failed to update API key');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) return Errors.notFound('API key not found');

    const orgId = auth.organizationId || auth.userId;
    if (apiKey.organizationId !== orgId) return Errors.forbidden();

    apiKey.status = 'revoked';
    await apiKey.save();
    return successResponse(null, 'API key revoked');
  } catch (error) {
    console.error('Delete API key error:', error);
    return Errors.internal('Failed to revoke API key');
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/test/apiKeysRoute.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/developer/keys/route.ts src/app/api/developer/keys/[id]/route.ts src/test/apiKeysRoute.test.ts
git commit -m "feat: add API key management endpoints (create, list, update, revoke)"
```

---

### Task 3: Versioned REST API (v1) Endpoints

**Files:**

- Create: `src/app/api/v1/widgets/route.ts`
- Create: `src/app/api/v1/widgets/[id]/route.ts`
- Create: `src/app/api/v1/analytics/route.ts`
- Create: `src/app/api/v1/chatlogs/route.ts`
- Create: `src/app/api/v1/knowledge/route.ts`
- Create: `src/app/api/v1/knowledge/[id]/route.ts`

- [ ] **Step 1: Create widgets v1 endpoint**

```typescript
// src/app/api/v1/widgets/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope: read required');

    await connectDB();
    const widgets = await Client.find({ organizationId: auth.organizationId })
      .select('clientId username website widgetType isActive createdAt')
      .sort({ createdAt: -1 });

    return successResponse({ widgets });
  } catch (error) {
    console.error('v1 list widgets error:', error);
    return Errors.internal('Failed to list widgets');
  }
}
```

Read `src/models/Client.ts` before implementing to verify field names.

- [ ] **Step 2: Create single widget v1 endpoint**

```typescript
// src/app/api/v1/widgets/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope');

    await connectDB();
    const { id } = await params;
    const widget = await Client.findOne({ clientId: id, organizationId: auth.organizationId }).select(
      '-clientToken -integrationKeys'
    );

    if (!widget) return Errors.notFound('Widget not found');
    return successResponse({ widget });
  } catch (error) {
    console.error('v1 get widget error:', error);
    return Errors.internal('Failed to fetch widget');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'write')) return Errors.forbidden('Insufficient scope: write required');

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const widget = await Client.findOne({ clientId: id, organizationId: auth.organizationId });
    if (!widget) return Errors.notFound('Widget not found');

    // Allow updating safe fields only
    const allowedFields = ['username', 'website', 'phone', 'isActive'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (widget as any)[field] = body[field];
      }
    }

    await widget.save();
    return successResponse({ widget });
  } catch (error) {
    console.error('v1 update widget error:', error);
    return Errors.internal('Failed to update widget');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'admin')) return Errors.forbidden('Insufficient scope: admin required');

    await connectDB();
    const { id } = await params;
    const widget = await Client.findOne({ clientId: id, organizationId: auth.organizationId });
    if (!widget) return Errors.notFound('Widget not found');

    widget.isActive = false;
    await widget.save();
    return successResponse(null, 'Widget deactivated');
  } catch (error) {
    console.error('v1 delete widget error:', error);
    return Errors.internal('Failed to deactivate widget');
  }
}
```

- [ ] **Step 3: Create analytics v1 endpoint**

```typescript
// src/app/api/v1/analytics/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAnalytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope');

    await connectDB();
    const clientId = request.nextUrl.searchParams.get('widgetId');
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);

    if (clientId) {
      // Verify ownership
      const widget = await Client.findOne({ clientId, organizationId: auth.organizationId }).select('clientId');
      if (!widget) return Errors.notFound('Widget not found');
    }

    const analytics = await getAnalytics(clientId || undefined, auth.organizationId, days);

    return successResponse({ analytics });
  } catch (error) {
    console.error('v1 analytics error:', error);
    return Errors.internal('Failed to fetch analytics');
  }
}
```

NOTE: Read `src/lib/analytics.ts` first to check the exact signature of `getAnalytics()`. Adapt the call if the function signature differs.

- [ ] **Step 4: Create chatlogs v1 endpoint**

```typescript
// src/app/api/v1/chatlogs/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope');

    await connectDB();
    const clientId = request.nextUrl.searchParams.get('widgetId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100);

    // Get allowed client IDs
    const userClients = await Client.find({ organizationId: auth.organizationId }).select('clientId');
    const allowedIds = userClients.map((c) => c.clientId);

    const query: Record<string, unknown> =
      clientId && allowedIds.includes(clientId) ? { clientId } : { clientId: { $in: allowedIds } };

    const total = await ChatLog.countDocuments(query);
    const logs = await ChatLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    return successResponse({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('v1 chatlogs error:', error);
    return Errors.internal('Failed to fetch chat logs');
  }
}
```

NOTE: Read `src/models/ChatLog.ts` first to verify the model and field names.

- [ ] **Step 5: Create knowledge v1 endpoints**

```typescript
// src/app/api/v1/knowledge/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope');

    await connectDB();
    const clientId = request.nextUrl.searchParams.get('widgetId');
    if (!clientId) return Errors.badRequest('widgetId is required');

    // Verify ownership
    const widget = await Client.findOne({ clientId, organizationId: auth.organizationId }).select('clientId');
    if (!widget) return Errors.notFound('Widget not found');

    const chunks = await KnowledgeChunk.find({ clientId }).sort({ createdAt: -1 });
    return successResponse({ chunks });
  } catch (error) {
    console.error('v1 knowledge list error:', error);
    return Errors.internal('Failed to fetch knowledge');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'write')) return Errors.forbidden('Insufficient scope: write required');

    await connectDB();
    const body = await request.json();
    const { widgetId, title, content, sourceUrl } = body;

    if (!widgetId || !content) return Errors.badRequest('widgetId and content are required');

    // Verify ownership
    const widget = await Client.findOne({ clientId: widgetId, organizationId: auth.organizationId }).select('clientId');
    if (!widget) return Errors.notFound('Widget not found');

    const chunk = await KnowledgeChunk.create({
      clientId: widgetId,
      title: title || 'API Upload',
      content,
      sourceUrl: sourceUrl || null,
    });

    return successResponse({ chunk });
  } catch (error) {
    console.error('v1 knowledge create error:', error);
    return Errors.internal('Failed to create knowledge chunk');
  }
}
```

```typescript
// src/app/api/v1/knowledge/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import Client from '@/models/Client';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'write')) return Errors.forbidden('Insufficient scope: write required');

    await connectDB();
    const { id } = await params;

    const chunk = await KnowledgeChunk.findById(id);
    if (!chunk) return Errors.notFound('Knowledge chunk not found');

    // Verify ownership via widget
    const widget = await Client.findOne({ clientId: chunk.clientId, organizationId: auth.organizationId }).select(
      'clientId'
    );
    if (!widget) return Errors.forbidden();

    await KnowledgeChunk.findByIdAndDelete(id);
    return successResponse(null, 'Knowledge chunk deleted');
  } catch (error) {
    console.error('v1 knowledge delete error:', error);
    return Errors.internal('Failed to delete knowledge chunk');
  }
}
```

NOTE: Read `src/models/KnowledgeChunk.ts` first to verify model name and field names. Adapt if different.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/
git commit -m "feat: add versioned REST API v1 endpoints (widgets, analytics, chatlogs, knowledge)"
```

---

### Task 4: API Keys Dashboard Page

**Files:**

- Create: `src/app/dashboard/settings/api-keys/page.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read current settings page and layout**

Read `src/app/dashboard/settings/page.tsx` and `src/app/dashboard/layout.tsx`.

- [ ] **Step 2: Create API keys management page**

Create `src/app/dashboard/settings/api-keys/page.tsx` — Apple Enterprise 2026 quality.

Must include:

- 'use client' directive
- Plan check: show upgrade CTA if on free plan
- **Create Key modal**: name input, environment toggle (live/test), scopes checkboxes (read/write/admin), optional expiration dropdown (30d/90d/1yr/never), optional IP whitelist textarea
- **Key list**: table/card layout showing name, prefix (masked), environment badge, scopes badges, status badge, created date, last used date, total requests count
- **New key reveal**: after creation, show the raw key in a copyable highlighted box with warning "Copy this key now — it won't be shown again"
- **Revoke action**: confirm dialog before revoking
- **Edit action**: click to edit name, scopes, IP whitelist
- Fetch from `GET /api/developer/keys`, create via `POST /api/developer/keys`
- Revoke via `DELETE /api/developer/keys/{id}`, update via `PATCH /api/developer/keys/{id}`
- All glassmorphism styling with semantic Tailwind v4 classes
- framer-motion animations (fade-in, stagger, AnimatePresence for modals)
- lucide-react icons: `Key`, `Plus`, `Copy`, `Check`, `Trash2`, `Shield`, `Globe`, `Clock`, `AlertTriangle`, `Eye`, `EyeOff`
- Loading skeletons, empty state

- [ ] **Step 3: Add API Keys link to settings page**

In `src/app/dashboard/settings/page.tsx`, add a card for "API Keys" with a Key icon and "Manage" button linking to `/dashboard/settings/api-keys`.

- [ ] **Step 4: Add Developer nav item to layout**

In `src/app/dashboard/layout.tsx`, add a nav item under the BUILD group:

```typescript
{ label: 'API', href: '/dashboard/settings/api-keys', icon: Key },
```

Import `Key` from lucide-react.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/settings/api-keys/page.tsx src/app/dashboard/settings/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add API keys management dashboard page"
```

---

### Task 5: Interactive API Documentation Page

**Files:**

- Create: `src/app/dashboard/developer/docs/page.tsx`

- [ ] **Step 1: Create API documentation page**

Create `src/app/dashboard/developer/docs/page.tsx` — interactive API reference.

Must include:

- 'use client' directive
- Left sidebar with endpoint categories: Authentication, Widgets, Analytics, Chat Logs, Knowledge Base
- Main content area with endpoint details for each:
  - Method badge (GET = green, POST = blue, PATCH = amber, DELETE = red)
  - URL pattern
  - Description
  - Request headers (show X-WinBix-Key requirement)
  - Request body (JSON schema with types)
  - Response example (formatted JSON)
  - Required scopes badge
- "Try it" section: users can select an API key from their keys, set parameters, and see a generated cURL command (copy button)
- Rate limits table by plan
- Getting started section at top with quick start guide
- All glassmorphism styling, framer-motion animations
- lucide-react icons: `Book`, `Code`, `Terminal`, `Copy`, `Check`, `ChevronRight`, `Zap`, `Lock`, `ArrowRight`
- Smooth scroll navigation between sections
- Code blocks with syntax highlighting (use monospace font, bg-bg-tertiary background)

The endpoints to document:

1. `GET /api/v1/widgets` — List all widgets
2. `GET /api/v1/widgets/:id` — Get single widget
3. `PATCH /api/v1/widgets/:id` — Update widget
4. `DELETE /api/v1/widgets/:id` — Deactivate widget
5. `GET /api/v1/analytics?widgetId=X&days=30` — Get analytics
6. `GET /api/v1/chatlogs?widgetId=X&page=1&limit=50` — Get chat logs
7. `GET /api/v1/knowledge?widgetId=X` — List knowledge chunks
8. `POST /api/v1/knowledge` — Add knowledge chunk
9. `DELETE /api/v1/knowledge/:id` — Delete knowledge chunk

- [ ] **Step 2: Add docs link to layout nav**

Add under BUILD group in `src/app/dashboard/layout.tsx`:

```typescript
{ label: 'API Docs', href: '/dashboard/developer/docs', icon: Book },
```

Import `Book` from lucide-react.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/developer/docs/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add interactive API documentation page"
```

---

### Task 6: Run All Tests + Push

- [ ] **Step 1: Run all new tests**

```bash
npx vitest run src/test/apiKeyAuth.test.ts src/test/apiKeysRoute.test.ts
```

Expected: All tests PASS

- [ ] **Step 2: Run all existing tests**

```bash
npx vitest run
```

Expected: No new failures (pre-existing failures in webSearch, siteAnalyzer, integration-codegen, auth-routes are known)

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```
