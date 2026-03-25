# OAuth2 Authorization Code + Client Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `oauth2_auth_code` and `oauth2_client_credentials` auth types to the integration engine so the AI builder agent can connect to any OAuth2-based API.

**Architecture:** Two new auth types in `engine.ts` buildAuthHeader(). Client Credentials uses in-memory token cache (like service_account). Auth Code uses server-side callback with PKCE, OAuthState MongoDB model for CSRF protection, and a Promise-based refresh lock for concurrent safety.

**Tech Stack:** Node.js crypto (PKCE, state), Mongoose (OAuthState model), Next.js App Router (callback route), existing AES-256-GCM encryption.

---

## File Structure

### New Files

| File                                  | Responsibility                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/models/OAuthState.ts`            | Mongoose model for OAuth2 state + PKCE code_verifier. TTL index for auto-cleanup.                       |
| `src/app/api/oauth/callback/route.ts` | GET handler for OAuth2 callback. Exchanges code for tokens, updates IntegrationConfig.                  |
| `src/test/oauth2-engine.test.ts`      | Unit tests for new auth types in engine.ts (client credentials, auth code refresh, PKCE, refresh lock). |

### Modified Files

| File                                               | What Changes                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models/IntegrationConfig.ts`                  | Add `oauth2_auth_code` and `oauth2_client_credentials` to auth type enum. Add `tokenUrl` field.                                                         |
| `src/lib/integrations/engine.ts`                   | Add two new cases in `buildAuthHeader()`. Add refresh lock. Add `configId` param. Update `executeAction()` to pass configId. Update `validateConfig()`. |
| `src/lib/builder/tools/dynamicIntegrationTools.ts` | Add `start_oauth_flow` tool. Add `tokenUrl` param to `create_integration`.                                                                              |
| `src/lib/builder/types.ts`                         | Add `start_oauth_flow` to `AGENT_TOOL_NAMES`.                                                                                                           |
| `src/lib/builder/systemPrompt.ts`                  | Add OAuth2 flow guidance for agent.                                                                                                                     |

---

### Task 1: Update IntegrationConfig Model

**Files:**

- Modify: `src/models/IntegrationConfig.ts`

- [ ] **Step 1: Add new auth types and tokenUrl to TypeScript interface**

In `src/models/IntegrationConfig.ts`, update the `auth.type` union at line 31 and add `tokenUrl`:

```typescript
// Line 30-37: Replace auth type definition
  auth: {
    type: 'api_key' | 'bearer' | 'basic' | 'none' | 'oauth2_service_account' | 'oauth2_auth_code' | 'oauth2_client_credentials';
    credentials: string;
    headerName?: string;
    headerPrefix?: string;
    authValueField?: string;
    scopes?: string[];
    tokenUrl?: string;
  };
```

- [ ] **Step 2: Update Mongoose schema enum and add tokenUrl field**

In the same file, update the schema at line 88-98:

```typescript
// Line 88-98: Replace auth schema definition
    auth: {
      type: {
        type: String,
        enum: ['api_key', 'bearer', 'basic', 'none', 'oauth2_service_account', 'oauth2_auth_code', 'oauth2_client_credentials'],
        required: true,
      },
      credentials: { type: String, required: true },
      headerName: String,
      headerPrefix: String,
      authValueField: String,
      scopes: { type: [String], default: undefined },
      tokenUrl: String,
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "IntegrationConfig\.ts|engine\.ts"`
Expected: No errors from these files (pre-existing test errors are OK)

- [ ] **Step 4: Commit**

```bash
git add src/models/IntegrationConfig.ts
git commit -m "feat: add oauth2_auth_code and oauth2_client_credentials to IntegrationConfig model"
```

---

### Task 2: Add `oauth2_client_credentials` to engine.ts

**Files:**

- Modify: `src/lib/integrations/engine.ts`
- Test: `src/test/oauth2-engine.test.ts`

- [ ] **Step 1: Write failing tests for client credentials flow**

Create `src/test/oauth2-engine.test.ts`:

```typescript
/**
 * OAuth2 Engine Tests — Client Credentials + Auth Code refresh
 * Tests do NOT call external APIs — all deterministic with mocked fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the exported functions directly
// Mock fetch globally for token exchange tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Must import AFTER stubbing fetch
const engineModule = await import('@/lib/integrations/engine');
const { buildAuthHeader, validateConfig } = engineModule;

describe('oauth2_client_credentials in buildAuthHeader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch token and return Bearer header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'cc_token_123', expires_in: 3600, token_type: 'Bearer' }),
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read', 'write'],
    };
    const decrypted = { client_id: 'my_id', client_secret: 'my_secret' };

    const result = await buildAuthHeader(auth, decrypted);
    expect(result).toEqual({ Authorization: 'Bearer cc_token_123' });

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/token');
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('grant_type=client_credentials');
    expect(opts.body).toContain('scope=read+write');
  });

  it('should use cached token on second call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'cached_token', expires_in: 3600, token_type: 'Bearer' }),
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'cache_test_id', client_secret: 'cache_test_secret' };

    await buildAuthHeader(auth, decrypted);
    const result = await buildAuthHeader(auth, decrypted);

    expect(result).toEqual({ Authorization: 'Bearer cached_token' });
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one fetch, second used cache
  });

  it('should throw on missing client_id', async () => {
    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_secret: 'only_secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('client_id');
  });

  it('should throw on missing tokenUrl', async () => {
    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'id', client_secret: 'secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('tokenUrl');
  });

  it('should throw on token exchange failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid_client',
    });

    const auth = {
      type: 'oauth2_client_credentials' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
    };
    const decrypted = { client_id: 'bad_id', client_secret: 'bad_secret' };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('token exchange failed');
  });
});

describe('validateConfig with new auth types', () => {
  it('should accept oauth2_client_credentials with valid fields', () => {
    const result = validateConfig({
      authType: 'oauth2_client_credentials',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'https://auth.example.com/token',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject oauth2_client_credentials without client_id', () => {
    const result = validateConfig({
      authType: 'oauth2_client_credentials',
      credentials: { client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'https://auth.example.com/token',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('client_id'))).toBe(true);
  });

  it('should reject oauth2_auth_code without tokenUrl', () => {
    const result = validateConfig({
      authType: 'oauth2_auth_code',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tokenUrl'))).toBe(true);
  });

  it('should reject non-HTTPS tokenUrl in production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const result = validateConfig({
      authType: 'oauth2_auth_code',
      credentials: { client_id: 'id', client_secret: 'secret' },
      baseUrl: 'https://api.example.com',
      actions: [],
      config: {},
      tokenUrl: 'http://insecure.example.com/token',
    });
    process.env.NODE_ENV = origEnv;
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('HTTPS'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/oauth2-engine.test.ts`
Expected: FAIL (functions don't handle new auth types yet)

- [ ] **Step 3: Implement `oauth2_client_credentials` in `buildAuthHeader()`**

In `src/lib/integrations/engine.ts`, add a retry helper and `getClientCredentialsToken()` after `getServiceAccountToken()` (after line 183):

```typescript
/**
 * Retry a fetch with exponential backoff (max 3 attempts).
 * Only retries on 429 (rate limit) or 5xx server errors.
 */
async function fetchWithRetry(url: string, opts: RequestInit, maxAttempts = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, opts);
    if (response.ok || attempt === maxAttempts || (response.status < 429 && response.status !== 408)) {
      return response;
    }
    // Only retry on 408, 429, 5xx
    if (response.status !== 408 && response.status !== 429 && response.status < 500) {
      return response;
    }
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    await new Promise((r) => setTimeout(r, delay));
  }
  // Unreachable, but TypeScript needs it
  throw new Error('fetchWithRetry: exhausted attempts');
}
```

```typescript
/**
 * Fetch an access token using OAuth2 Client Credentials grant.
 * Caches the token until 5 minutes before expiry.
 */
async function getClientCredentialsToken(
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  scopes: string[] = []
): Promise<string> {
  const cacheKey = `cc:${crypto
    .createHash('sha256')
    .update(clientId + clientSecret)
    .digest('hex')}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const bodyParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scopes.length > 0) {
    bodyParams.set('scope', scopes.join(' '));
  }

  const response = await fetchWithRetry(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Client credentials token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number; token_type?: string };
  if (data.token_type && data.token_type.toLowerCase() !== 'bearer') {
    console.warn(`[engine] Unexpected token_type "${data.token_type}" from ${tokenUrl}, using as Bearer`);
  }
  const token = data.access_token;
  TOKEN_CACHE.set(cacheKey, { token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 });

  return token;
}
```

Then add the case in `buildAuthHeader()` switch, before `case 'none':`:

```typescript
    case 'oauth2_client_credentials': {
      const clientId = decrypted.client_id as string;
      const clientSecret = decrypted.client_secret as string;
      const tokenUrl = auth.tokenUrl;
      const scopes = auth.scopes || [];
      if (!clientId || !clientSecret) {
        throw new Error('Client credentials auth requires client_id and client_secret in credentials');
      }
      if (!tokenUrl) {
        throw new Error('Client credentials auth requires tokenUrl in auth config');
      }
      const token = await getClientCredentialsToken(clientId, clientSecret, tokenUrl, scopes);
      return { Authorization: `Bearer ${token}` };
    }
```

- [ ] **Step 4: Update `validateConfig()` to accept new auth types**

In `src/lib/integrations/engine.ts`, update `validateConfig()`:

1. Update the auth type whitelist (line 448):

```typescript
if (
  ![
    'api_key',
    'bearer',
    'basic',
    'none',
    'oauth2_service_account',
    'oauth2_auth_code',
    'oauth2_client_credentials',
  ].includes(params.authType)
) {
  errors.push(
    `Invalid auth type: "${params.authType}". Must be: api_key, bearer, basic, none, oauth2_service_account, oauth2_auth_code, oauth2_client_credentials`
  );
}
```

2. Add validation for the new types, after the service account block (after line 477):

```typescript
// client credentials auth
if (params.authType === 'oauth2_client_credentials') {
  if (!('client_id' in params.credentials)) {
    errors.push('Client credentials auth requires "client_id" in credentials');
  }
  if (!('client_secret' in params.credentials)) {
    errors.push('Client credentials auth requires "client_secret" in credentials');
  }
  if (!params.tokenUrl) {
    errors.push('Client credentials auth requires tokenUrl');
  } else {
    const tokenUrlCheck = validateUrl(params.tokenUrl);
    if (!tokenUrlCheck.valid) errors.push(`tokenUrl: ${tokenUrlCheck.error}`);
  }
}

// auth code
if (params.authType === 'oauth2_auth_code') {
  if (!('client_id' in params.credentials)) {
    errors.push('Auth code auth requires "client_id" in credentials');
  }
  if (!('client_secret' in params.credentials)) {
    errors.push('Auth code auth requires "client_secret" in credentials');
  }
  if (!params.tokenUrl) {
    errors.push('Auth code auth requires tokenUrl');
  } else {
    const tokenUrlCheck = validateUrl(params.tokenUrl);
    if (!tokenUrlCheck.valid) errors.push(`tokenUrl: ${tokenUrlCheck.error}`);
  }
}
```

3. Update the `validateConfig` function signature to accept `tokenUrl`:

```typescript
export function validateConfig(params: {
  authType: string;
  authValueField?: string;
  credentials: Record<string, unknown>;
  baseUrl: string;
  actions: IIntegrationConfigAction[];
  config: Record<string, unknown>;
  tokenUrl?: string;
}): { valid: boolean; errors: string[] } {
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/test/oauth2-engine.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Verify full TypeScript compilation**

Run: `npx tsc --noEmit 2>&1 | grep -E "engine\.ts|IntegrationConfig\.ts"`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/integrations/engine.ts src/test/oauth2-engine.test.ts
git commit -m "feat: add oauth2_client_credentials auth type with token caching"
```

---

### Task 3: Add `oauth2_auth_code` with refresh lock to engine.ts

**Files:**

- Modify: `src/lib/integrations/engine.ts`
- Modify: `src/test/oauth2-engine.test.ts`

- [ ] **Step 1: Write failing tests for auth code refresh**

Add to `src/test/oauth2-engine.test.ts`:

```typescript
describe('oauth2_auth_code in buildAuthHeader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return existing token when not expired', async () => {
    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'valid_token',
      refresh_token: 'refresh_123',
      token_expiry: Date.now() + 600_000, // 10 min from now
    };

    const result = await buildAuthHeader(auth, decrypted);
    expect(result).toEqual({ Authorization: 'Bearer valid_token' });
    expect(mockFetch).not.toHaveBeenCalled(); // No refresh needed
  });

  it('should refresh expired token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_token_456',
        expires_in: 3600,
        token_type: 'bearer',
        refresh_token: 'new_refresh_789',
      }),
    });

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired_token',
      refresh_token: 'refresh_123',
      token_expiry: Date.now() - 1000, // Expired
    };

    // Note: configId needed for DB persistence, but without DB the refresh still returns the token
    const result = await buildAuthHeader(auth, decrypted, 'test_config_id');
    expect(result).toEqual({ Authorization: 'Bearer new_token_456' });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://auth.example.com/token');
    expect(opts.body).toContain('grant_type=refresh_token');
    expect(opts.body).toContain('refresh_token=refresh_123');
  });

  it('should throw when refresh fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'invalid_grant',
    });

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired',
      refresh_token: 'bad_refresh',
      token_expiry: Date.now() - 1000,
    };

    await expect(buildAuthHeader(auth, decrypted, 'test_id')).rejects.toThrow('refresh failed');
  });

  it('should throw without access_token in credentials', async () => {
    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      // No access_token or refresh_token
    };

    await expect(buildAuthHeader(auth, decrypted)).rejects.toThrow('not yet authorized');
  });

  it('should only call fetch once for concurrent refresh requests', async () => {
    // Delayed response to ensure both calls are in-flight
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  access_token: 'concurrent_token',
                  expires_in: 3600,
                  token_type: 'bearer',
                  refresh_token: 'new_refresh',
                }),
              }),
            50
          )
        )
    );

    const auth = {
      type: 'oauth2_auth_code' as const,
      credentials: '',
      tokenUrl: 'https://auth.example.com/token',
    };
    const decrypted = {
      client_id: 'id',
      client_secret: 'secret',
      access_token: 'expired',
      refresh_token: 'refresh_concurrent',
      token_expiry: Date.now() - 1000,
    };

    const [r1, r2] = await Promise.all([
      buildAuthHeader(auth, decrypted, 'concurrent_config'),
      buildAuthHeader(auth, decrypted, 'concurrent_config'),
    ]);

    expect(r1).toEqual({ Authorization: 'Bearer concurrent_token' });
    expect(r2).toEqual({ Authorization: 'Bearer concurrent_token' });
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only ONE fetch despite two calls
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/oauth2-engine.test.ts`
Expected: New tests FAIL

- [ ] **Step 3: Implement `oauth2_auth_code` with refresh lock**

In `src/lib/integrations/engine.ts`, add the refresh lock map after TOKEN_CACHE (line 111):

```typescript
// Concurrent refresh lock — prevents multiple refreshes for the same configId
const REFRESH_LOCKS = new Map<string, Promise<string>>();
```

Add the `refreshAuthCodeToken` function after `getClientCredentialsToken`:

```typescript
/**
 * Refresh an OAuth2 auth code token. Uses a per-configId lock to prevent
 * concurrent refreshes from invalidating each other (refresh token rotation).
 */
async function refreshAuthCodeToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  configId?: string
): Promise<{ access_token: string; refresh_token: string; token_expiry: number }> {
  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetchWithRetry(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    // If configId provided, mark config as error in DB (best-effort)
    if (configId) {
      try {
        const IntegrationConfig = (await import('@/models/IntegrationConfig')).default;
        await IntegrationConfig.findByIdAndUpdate(configId, { status: 'error' });
      } catch {
        /* best effort */
      }
    }
    throw new Error(`OAuth2 token refresh failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type?: string;
  };

  if (data.token_type && data.token_type.toLowerCase() !== 'bearer') {
    console.warn(`[engine] Unexpected token_type "${data.token_type}" from ${tokenUrl}`);
  }

  const tokenExpiry = Date.now() + data.expires_in * 1000;
  const newRefreshToken = data.refresh_token || refreshToken;

  // Persist refreshed tokens to DB atomically if configId available
  if (configId) {
    try {
      const { encrypt, decrypt: dec } = await import('@/lib/encryption');
      const IntegrationConfig = (await import('@/models/IntegrationConfig')).default;
      const config = await IntegrationConfig.findById(configId);
      if (config) {
        const existingCreds = JSON.parse(dec(config.auth.credentials));
        const updatedCreds = {
          ...existingCreds,
          access_token: data.access_token,
          refresh_token: newRefreshToken,
          token_expiry: tokenExpiry,
        };
        await IntegrationConfig.findOneAndUpdate(
          { _id: configId },
          { 'auth.credentials': encrypt(JSON.stringify(updatedCreds)) }
        );
      }
    } catch (err) {
      console.error('[engine] Failed to persist refreshed tokens:', (err as Error).message);
    }
  }

  return {
    access_token: data.access_token,
    refresh_token: newRefreshToken,
    token_expiry: tokenExpiry,
  };
}
```

Then add the case in `buildAuthHeader()` switch, before `case 'oauth2_client_credentials':`:

```typescript
    case 'oauth2_auth_code': {
      const accessToken = decrypted.access_token as string;
      const refreshToken = decrypted.refresh_token as string;
      const tokenExpiry = decrypted.token_expiry as number;
      const tokenUrl = auth.tokenUrl;
      const clientId = decrypted.client_id as string;
      const clientSecret = decrypted.client_secret as string;

      if (!accessToken || !refreshToken) {
        throw new Error('OAuth2 auth code: not yet authorized. User must complete the OAuth flow first.');
      }
      if (!tokenUrl) {
        throw new Error('OAuth2 auth code requires tokenUrl in auth config');
      }

      // Token still valid (5 min safety margin)
      if (tokenExpiry && tokenExpiry > Date.now() + 5 * 60 * 1000) {
        return { Authorization: `Bearer ${accessToken}` };
      }

      // Token expired — refresh with per-configId lock
      const lockKey = configId || 'default';
      let lockPromise = REFRESH_LOCKS.get(lockKey);
      if (!lockPromise) {
        lockPromise = refreshAuthCodeToken(refreshToken, clientId, clientSecret, tokenUrl, configId)
          .then((result) => {
            REFRESH_LOCKS.delete(lockKey);
            return result.access_token;
          })
          .catch((err) => {
            REFRESH_LOCKS.delete(lockKey);
            throw err;
          });
        REFRESH_LOCKS.set(lockKey, lockPromise);
      }

      const newToken = await lockPromise;
      return { Authorization: `Bearer ${newToken}` };
    }
```

- [ ] **Step 4: Update `buildAuthHeader()` signature to accept `configId`**

Change the function signature (line 187-189):

```typescript
export async function buildAuthHeader(
  auth: IIntegrationConfig['auth'],
  decrypted: Record<string, unknown>,
  configId?: string
): Promise<Record<string, string>> {
```

- [ ] **Step 5: Update `executeAction()` to pass configId**

In `executeAction()`, update the call to `buildAuthHeader` (around line 324-325):

```typescript
// 7. Build headers
let authHeaders: Record<string, string>;
try {
  authHeaders = await buildAuthHeader(config.auth, decrypted, config._id?.toString());
} catch (err) {
  return { success: false, error: `Auth error: ${(err as Error).message}` };
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/test/oauth2-engine.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/integrations/engine.ts src/test/oauth2-engine.test.ts
git commit -m "feat: add oauth2_auth_code auth type with refresh lock and token persistence"
```

---

### Task 4: Create OAuthState Model

**Files:**

- Create: `src/models/OAuthState.ts`

- [ ] **Step 1: Create the OAuthState Mongoose model**

Create `src/models/OAuthState.ts`:

```typescript
// src/models/OAuthState.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IOAuthState extends Document {
  state: string;
  configId: string;
  sessionId: string;
  userId: string;
  codeVerifier: string;
  createdAt: Date;
  expiresAt: Date;
}

const OAuthStateSchema = new Schema<IOAuthState>({
  state: { type: String, required: true, unique: true },
  configId: { type: String, required: true },
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  codeVerifier: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
});

// TTL index — MongoDB auto-deletes documents when expiresAt passes
OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OAuthState || mongoose.model<IOAuthState>('OAuthState', OAuthStateSchema);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "OAuthState"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/OAuthState.ts
git commit -m "feat: add OAuthState model with TTL index for OAuth2 CSRF protection"
```

---

### Task 5: Add `start_oauth_flow` Tool and Update `create_integration`

**Files:**

- Modify: `src/lib/builder/tools/dynamicIntegrationTools.ts`
- Modify: `src/lib/builder/types.ts`

- [ ] **Step 1: Add `start_oauth_flow` to AGENT_TOOL_NAMES**

In `src/lib/builder/types.ts`, add `'start_oauth_flow'` to the `AGENT_TOOL_NAMES` array after `'list_integrations'` (line 44):

```typescript
  'list_integrations',
  'start_oauth_flow',
```

- [ ] **Step 2: Add `tokenUrl` parameter to `create_integration` tool**

In `src/lib/builder/tools/dynamicIntegrationTools.ts`, add `tokenUrl` property to the `create_integration` parameters object (after `headerPrefix`, around line 157):

```typescript
        tokenUrl: {
          type: 'string',
          description: 'Token endpoint URL for OAuth2 flows (required for oauth2_auth_code and oauth2_client_credentials)',
        },
```

- [ ] **Step 3: Pass `tokenUrl` in `create_integration` executor**

In the `create_integration` executor, update the `validateConfig` call to pass tokenUrl (around line 205-212):

```typescript
const validation = validateConfig({
  authType: args.authType as string,
  authValueField: args.authValueField as string | undefined,
  credentials,
  baseUrl: args.baseUrl as string,
  actions: actions as any[],
  config,
  tokenUrl: args.tokenUrl as string | undefined,
});
```

And update the auth object in the `findOneAndUpdate` call (around line 230-236):

```typescript
          auth: {
            type: args.authType as string,
            credentials: encryptedCreds,
            headerName: (args.headerName as string) || undefined,
            headerPrefix: (args.headerPrefix as string) || undefined,
            authValueField: args.authValueField as string | undefined,
            ...(args.scopes ? { scopes: JSON.parse(args.scopes as string) } : {}),
            ...(args.tokenUrl ? { tokenUrl: args.tokenUrl as string } : {}),
          },
```

- [ ] **Step 4: Add `start_oauth_flow` tool definition**

In `src/lib/builder/tools/dynamicIntegrationTools.ts`, add the new tool after the `list_integrations` tool definition. Find the end of the `list_integrations` tool (it ends with `},`) and add:

```typescript
  // ─── 7. start_oauth_flow ──────────────────────────────────────────────
  {
    name: 'start_oauth_flow',
    description:
      'Start OAuth2 Authorization Code flow. Generates a secure authorization URL with PKCE that the user must visit to grant access. Only use for oauth2_auth_code integrations.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'ID of the IntegrationConfig (from create_integration)' },
        authorizationUrl: {
          type: 'string',
          description: 'Provider authorization endpoint (e.g., "https://accounts.google.com/o/oauth2/v2/auth")',
        },
        scopes: {
          type: 'string',
          description: 'JSON array of OAuth2 scopes (e.g., ["https://www.googleapis.com/auth/calendar"])',
        },
        extraParams: {
          type: 'string',
          description:
            'Optional JSON object of extra query params (e.g., {"access_type": "offline"} for Google refresh tokens)',
        },
      },
      required: ['configId', 'authorizationUrl', 'scopes'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();
      const crypto = await import('crypto');
      const { validateUrl } = await import('@/lib/integrations/engine');
      const { decrypt } = await import('@/lib/encryption');
      const OAuthState = (await import('@/models/OAuthState')).default;

      // Validate authorizationUrl
      const authUrl = args.authorizationUrl as string;
      const urlCheck = validateUrl(authUrl);
      if (!urlCheck.valid) {
        return { success: false, error: `Invalid authorization URL: ${urlCheck.error}` };
      }

      // Load integration config
      const config = await IntegrationConfig.findOne({
        _id: args.configId as string,
        userId: ctx.userId,
      });
      if (!config) {
        return { success: false, error: 'Integration config not found' };
      }
      if (config.auth.type !== 'oauth2_auth_code') {
        return { success: false, error: `Auth type is "${config.auth.type}", expected "oauth2_auth_code"` };
      }

      // Get client_id from encrypted credentials
      let decrypted: Record<string, unknown>;
      try {
        decrypted = JSON.parse(decrypt(config.auth.credentials));
      } catch {
        return { success: false, error: 'Failed to decrypt credentials' };
      }
      const clientId = decrypted.client_id as string;
      if (!clientId) {
        return { success: false, error: 'No client_id in credentials' };
      }

      // Parse scopes
      let scopes: string[];
      try {
        scopes = JSON.parse(args.scopes as string);
      } catch {
        return { success: false, error: 'Invalid JSON in scopes parameter' };
      }

      // Parse extraParams
      let extraParams: Record<string, string> = {};
      if (args.extraParams) {
        try {
          extraParams = JSON.parse(args.extraParams as string);
        } catch {
          return { success: false, error: 'Invalid JSON in extraParams parameter' };
        }
      }

      // Generate PKCE code_verifier (64 bytes → base64url) and code_challenge (SHA-256)
      const codeVerifier = crypto.randomBytes(64).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

      // Generate state (32 bytes → hex)
      const state = crypto.randomBytes(32).toString('hex');

      // Save OAuthState to MongoDB (TTL: 15 minutes)
      await OAuthState.create({
        state,
        configId: config._id.toString(),
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        codeVerifier,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Build authorization URL
      const redirectUri = process.env.NODE_ENV === 'production'
        ? 'https://winbixai.com/api/oauth/callback'
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/oauth/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...extraParams,
      });

      const fullAuthUrl = `${authUrl}?${params.toString()}`;

      return {
        success: true,
        authorizationUrl: fullAuthUrl,
        message: `Send this link to the user so they can authorize the integration. The link expires in 15 minutes.`,
        expiresIn: '15 minutes',
      };
    },
  },
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "dynamicIntegrationTools|types\.ts"`
Expected: No errors from these files

- [ ] **Step 6: Commit**

```bash
git add src/lib/builder/tools/dynamicIntegrationTools.ts src/lib/builder/types.ts
git commit -m "feat: add start_oauth_flow tool and tokenUrl support in create_integration"
```

---

### Task 6: Create OAuth Callback Route

**Files:**

- Create: `src/app/api/oauth/callback/route.ts`

- [ ] **Step 1: Create the callback route**

Create `src/app/api/oauth/callback/route.ts`:

```typescript
// src/app/api/oauth/callback/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import OAuthState from '@/models/OAuthState';
import IntegrationConfig from '@/models/IntegrationConfig';
import { decrypt, encrypt } from '@/lib/encryption';

function htmlResponse(title: string, message: string, success: boolean): Response {
  const color = success ? '#22c55e' : '#ef4444';
  const icon = success ? '&#10004;' : '&#10006;';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
  .card { text-align: center; padding: 48px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; }
  .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
  h1 { font-size: 24px; margin: 0 0 12px; color: #111827; }
  p { color: #6b7280; margin: 0; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Error path — provider denied access
    if (error) {
      // Clean up OAuthState if we have a state param
      if (state) {
        try {
          await connectDB();
          await OAuthState.deleteOne({ state });
        } catch {
          /* best effort */
        }
      }
      const safeDesc = (errorDescription || error).replace(/[<>"'&]/g, '');
      return htmlResponse(
        'Authorization Failed',
        `The provider denied access: ${safeDesc}. Return to the chat and try again.`,
        false
      );
    }

    if (!code || !state) {
      return htmlResponse('Invalid Request', 'Missing authorization code or state parameter.', false);
    }

    await connectDB();

    // 1. Look up OAuthState
    const oauthState = await OAuthState.findOne({ state });
    if (!oauthState) {
      return htmlResponse(
        'Link Expired',
        'This authorization link has expired. Return to the chat and request a new one.',
        false
      );
    }

    if (oauthState.expiresAt < new Date()) {
      await OAuthState.deleteOne({ state });
      return htmlResponse(
        'Link Expired',
        'This authorization link has expired. Return to the chat and request a new one.',
        false
      );
    }

    // 2. Load IntegrationConfig
    const config = await IntegrationConfig.findById(oauthState.configId);
    if (!config) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Integration configuration not found. Return to the chat.', false);
    }

    // Verify userId matches
    if (config.userId !== oauthState.userId) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Authorization Failed', 'Session mismatch — this link belongs to a different user.', false);
    }

    // 3. Decrypt credentials
    let decrypted: Record<string, unknown>;
    try {
      decrypted = JSON.parse(decrypt(config.auth.credentials));
    } catch {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Failed to read integration credentials.', false);
    }

    const clientId = decrypted.client_id as string;
    const clientSecret = decrypted.client_secret as string;
    const tokenUrl = config.auth.tokenUrl;

    if (!tokenUrl) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Missing token URL in integration config.', false);
    }

    // 4. Exchange code for tokens
    const redirectUri =
      process.env.NODE_ENV === 'production'
        ? 'https://winbixai.com/api/oauth/callback'
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/oauth/callback`;

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: oauthState.codeVerifier,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[oauth/callback] Token exchange failed:', tokenResponse.status, errorText);
      await OAuthState.deleteOne({ state });
      return htmlResponse(
        'Authorization Failed',
        'Failed to exchange authorization code for tokens. Please try again.',
        false
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
    };

    if (tokenData.token_type && tokenData.token_type.toLowerCase() !== 'bearer') {
      console.warn(`[oauth/callback] Unexpected token_type: ${tokenData.token_type}`);
    }

    // 5. Update IntegrationConfig with tokens
    const updatedCreds = {
      ...decrypted,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_expiry: Date.now() + tokenData.expires_in * 1000,
    };
    config.auth.credentials = encrypt(JSON.stringify(updatedCreds));
    await config.save();

    // 6. Clean up OAuthState
    await OAuthState.deleteOne({ state });

    return htmlResponse(
      'Authorization Successful!',
      'You can close this tab and return to the chat. The integration is now connected.',
      true
    );
  } catch (error) {
    console.error('[oauth/callback] Unexpected error:', error);
    return htmlResponse('Error', 'An unexpected error occurred. Please return to the chat and try again.', false);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "oauth"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/oauth/callback/route.ts
git commit -m "feat: add OAuth2 callback route for code-to-token exchange"
```

---

### Task 7: Update System Prompt

**Files:**

- Modify: `src/lib/builder/systemPrompt.ts`

- [ ] **Step 1: Add OAuth2 flow guidance to system prompt**

In `src/lib/builder/systemPrompt.ts`, find the section about Google APIs via Service Account (search for `### Google APIs via Service Account`) and add the following new sections right after it (before `## Communication Style`):

```typescript
### OAuth2 Authorization Code Flow (browser consent):
When the API requires user authorization (Facebook, Shopify, Salesforce, Zoom, HubSpot, Google user APIs):
1. research_api → discover authorizationUrl, tokenUrl, scopes
2. Ask user for client_id + client_secret (from provider's Developer Console)
3. create_integration with authType "oauth2_auth_code", tokenUrl, credentials {client_id, client_secret}
4. start_oauth_flow with configId, authorizationUrl, scopes (for Google: add extraParams {"access_type": "offline"})
5. Send the returned URL to user in chat: "Click this link to authorize: [link]"
6. Wait for user to confirm they completed authorization
7. test_integration_config → verify API works with obtained tokens
8. activate_integration

**IMPORTANT:** After start_oauth_flow, the user MUST click the link and authorize. Do NOT proceed to test_integration_config until the user confirms they completed authorization.

### OAuth2 Client Credentials Flow (server-to-server):
When the API uses machine-to-machine auth (Twilio, Zoom Server-to-Server, Auth0 M2M):
1. research_api → discover tokenUrl, scopes
2. Ask user for client_id + client_secret
3. create_integration with authType "oauth2_client_credentials", tokenUrl, scopes, credentials {client_id, client_secret}
4. test_integration_config → engine auto-fetches token and tests
5. activate_integration

### Choosing the Right Auth Type:
- API key or token → "bearer" or "api_key"
- Username + password → "basic"
- Google service account JSON → "oauth2_service_account"
- User must authorize in browser (Facebook, Shopify, Google user) → "oauth2_auth_code"
- Server-to-server with client_id + secret (no browser) → "oauth2_client_credentials"
- Public API, no auth → "none"

### Provider-Specific Notes:
- Google OAuth: always include extraParams { "access_type": "offline" } in start_oauth_flow to get a refresh_token
- Facebook: scopes are comma-separated (not space), use extraParams if needed
- Some providers require client_id/secret in Authorization Basic header for token exchange — engine handles both formats
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit 2>&1 | grep "systemPrompt"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/systemPrompt.ts
git commit -m "feat: add OAuth2 flow guidance to builder system prompt"
```

---

### Task 8: TypeScript Verification and Full Build

**Files:**

- All modified files

- [ ] **Step 1: Run full TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No new errors from modified files. Pre-existing test file errors are acceptable.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run src/test/oauth2-engine.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run existing integration tests to check for regressions**

Run: `npx vitest run src/test/integration-codegen.test.ts`
Expected: All existing tests still PASS (backward compatibility)

- [ ] **Step 4: Verify full build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit any build fixes**

If the build revealed issues, fix and commit them here.

```bash
git add -A
git commit -m "fix: resolve any build issues from OAuth2 changes"
```

---

### Task 9: Deploy to Production

**Files:**

- None (deployment only)

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to production server**

```bash
ssh -i ~/.ssh/dev-access-key.pem -o StrictHostKeyChecking=no ubuntu@16.171.39.113 \
  "cd ~/winbixai && git pull origin main && npm ci && NODE_OPTIONS='--max-old-space-size=4096' npm run build && pm2 restart winbixai"
```

Expected: Build succeeds, pm2 shows `online`.

- [ ] **Step 3: Verify deployment**

```bash
ssh -i ~/.ssh/dev-access-key.pem -o StrictHostKeyChecking=no ubuntu@16.171.39.113 "pm2 status winbixai"
```

Expected: Status `online`.
