// src/lib/integrations/engine.ts
import { decrypt } from '@/lib/encryption';
import crypto from 'crypto';
import type { IIntegrationConfig, IIntegrationConfigAction } from '@/models/IntegrationConfig';

// ── Types ────────────────────────────────────────────────────────────────

export interface EngineContext {
  auth: Record<string, unknown>;
  config: Record<string, unknown>;
  input: Record<string, unknown>;
}

export interface EngineResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Template Resolution ──────────────────────────────────────────────────

const TEMPLATE_RE = /\{\{(\w+)\.(\w+)\}\}/g;
const TEMPLATE_TEST_RE = /\{\{(\w+)\.(\w+)\}\}/; // no g flag — safe for .test()

/**
 * Resolve all {{namespace.key}} templates in a string.
 * - auth.X → from decrypted credentials
 * - config.X → from static config values
 * - input.X → from runtime function call args
 *
 * Missing required variables throw. Missing optional input vars resolve to "".
 */
export function resolveTemplate(
  template: string,
  ctx: EngineContext,
  optionalInputKeys: Set<string> = new Set()
): string {
  return template.replace(TEMPLATE_RE, (match, namespace, key) => {
    const ns = ctx[namespace as keyof EngineContext];
    if (!ns || !(key in (ns as Record<string, unknown>))) {
      if (namespace === 'input' && optionalInputKeys.has(key)) {
        return '';
      }
      throw new Error(`Template variable ${match} not found in ${namespace}`);
    }
    const value = (ns as Record<string, unknown>)[key];
    return String(value ?? '');
  });
}

/**
 * Deep-resolve templates in any JSON value (string, object, array).
 */
export function resolveDeep(value: unknown, ctx: EngineContext, optionalInputKeys: Set<string> = new Set()): unknown {
  if (typeof value === 'string') {
    return resolveTemplate(value, ctx, optionalInputKeys);
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveDeep(v, ctx, optionalInputKeys));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const resolvedValue = resolveDeep(v, ctx, optionalInputKeys);
      // Omit keys whose value resolved to empty string from optional input
      if (resolvedValue === '' && typeof v === 'string' && TEMPLATE_TEST_RE.test(v)) {
        const templateMatch = v.match(/\{\{input\.(\w+)\}\}/);
        if (templateMatch && optionalInputKeys.has(templateMatch[1])) {
          continue; // Skip this key entirely
        }
      }
      result[k] = resolvedValue;
    }
    return result;
  }
  return value;
}

// ── URL Security ─────────────────────────────────────────────────────────

const PRIVATE_IP_RE =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|::1|localhost)$/i;

export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    // Allow localhost in dev
    const isDev = process.env.NODE_ENV !== 'production';
    if (parsed.protocol !== 'https:') {
      if (isDev && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        // OK in dev
      } else {
        return { valid: false, error: `URL must use HTTPS: ${url}` };
      }
    }
    if (PRIVATE_IP_RE.test(parsed.hostname)) {
      if (isDev && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        // OK in dev
      } else {
        return { valid: false, error: `URL points to private network: ${parsed.hostname}` };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: `Invalid URL: ${url}` };
  }
}

// ── OAuth2 Service Account (JWT → Access Token) ─────────────────────────

const TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

// Concurrent refresh lock — prevents multiple refreshes for the same configId
const REFRESH_LOCKS = new Map<string, Promise<string>>();

function base64url(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a signed JWT for Google service account auth.
 * Uses RS256 (RSA + SHA-256) as required by Google's OAuth2 token endpoint.
 */
function createServiceAccountJWT(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
  tokenUri: string = 'https://oauth2.googleapis.com/token'
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: scopes.join(' '),
    aud: tokenUri,
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const segments = [base64url(JSON.stringify(header)), base64url(JSON.stringify(payload))];
  const signingInput = segments.join('.');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey);

  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Exchange a service account JWT for an access token.
 * Caches the token until 5 minutes before expiry.
 */
async function getServiceAccountToken(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
  tokenUri: string = 'https://oauth2.googleapis.com/token'
): Promise<string> {
  const cacheKey = `${clientEmail}:${scopes.join(',')}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const jwt = createServiceAccountJWT(clientEmail, privateKey, scopes, tokenUri);

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Service account token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const token = data.access_token;
  // Cache with 5 minute safety margin
  TOKEN_CACHE.set(cacheKey, { token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 });

  return token;
}

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
    if (response.status !== 408 && response.status !== 429 && response.status < 500) {
      return response;
    }
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error('fetchWithRetry: exhausted attempts');
}

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

// ── Auth Header Construction ─────────────────────────────────────────────

export async function buildAuthHeader(
  auth: IIntegrationConfig['auth'],
  decrypted: Record<string, unknown>,
  configId?: string
): Promise<Record<string, string>> {
  switch (auth.type) {
    case 'bearer': {
      const field = auth.authValueField || 'token';
      const value = decrypted[field];
      if (!value) return {};
      const headerName = auth.headerName || 'Authorization';
      const prefix = auth.headerPrefix ?? 'Bearer ';
      return { [headerName]: `${prefix}${value}` };
    }
    case 'api_key': {
      const field = auth.authValueField || 'apiKey';
      const value = decrypted[field];
      if (!value) return {};
      const headerName = auth.headerName || 'X-API-Key';
      const prefix = auth.headerPrefix ?? '';
      return { [headerName]: `${prefix}${value}` };
    }
    case 'basic': {
      const username = decrypted.username || '';
      const password = decrypted.password || '';
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    case 'oauth2_service_account': {
      const clientEmail = decrypted.client_email as string;
      const privateKey = decrypted.private_key as string;
      const tokenUri = (decrypted.token_uri as string) || 'https://oauth2.googleapis.com/token';
      const scopes = auth.scopes || [];
      if (!clientEmail || !privateKey) {
        throw new Error('Service account credentials require client_email and private_key');
      }
      if (scopes.length === 0) {
        throw new Error('Service account auth requires at least one scope in auth.scopes');
      }
      const token = await getServiceAccountToken(clientEmail, privateKey, scopes, tokenUri);
      return { Authorization: `Bearer ${token}` };
    }
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
    case 'none':
    default:
      return {};
  }
}

// ── Rate Limiting ────────────────────────────────────────────────────────
// In-memory rate limiter. Acceptable for single-instance Docker deployment (current prod).
// If scaling to multiple instances, migrate to MongoDB TTL counter or Redis.

const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

export function checkRateLimit(clientId: string, provider: string): { allowed: boolean; error?: string } {
  const key = `${clientId}:${provider}`;
  const now = Date.now();
  const entry = rateLimitCounters.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitCounters.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, error: `Rate limit exceeded (${RATE_LIMIT}/min). Try again in ${waitSec}s.` };
  }

  entry.count++;
  return { allowed: true };
}

// ── Main Executor ────────────────────────────────────────────────────────

const MAX_RESPONSE_SIZE = 50 * 1024; // 50KB
const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds

export async function executeAction(
  config: IIntegrationConfig,
  actionId: string,
  inputs: Record<string, unknown>
): Promise<EngineResult> {
  // 1. Find action
  const action = config.actions.find((a) => a.id === actionId);
  if (!action) {
    return { success: false, error: `Action "${actionId}" not found in integration config` };
  }

  // 2. Rate limit
  const rateCheck = checkRateLimit(config.clientId, config.provider);
  if (!rateCheck.allowed) {
    return { success: false, error: rateCheck.error };
  }

  // 3. Decrypt credentials
  let decrypted: Record<string, unknown>;
  try {
    decrypted = JSON.parse(decrypt(config.auth.credentials));
  } catch {
    return { success: false, error: 'Failed to decrypt integration credentials' };
  }

  // 4. Build template context
  const optionalInputKeys = new Set<string>();
  const requiredKeys = new Set(action.inputSchema.required || []);
  for (const key of Object.keys(action.inputSchema.properties || {})) {
    if (!requiredKeys.has(key)) optionalInputKeys.add(key);
  }

  const ctx: EngineContext = {
    auth: decrypted,
    config: config.config || {},
    input: inputs,
  };

  // 5. Resolve URL
  let baseUrl: string;
  let path: string;
  try {
    baseUrl = resolveTemplate(config.baseUrl, ctx);
    path = resolveTemplate(action.path, ctx, optionalInputKeys);
  } catch (err) {
    return { success: false, error: `URL template error: ${(err as Error).message}` };
  }

  const fullUrl = `${baseUrl.replace(/\/+$/, '')}${path}`;

  // 6. Validate URL
  const urlCheck = validateUrl(fullUrl);
  if (!urlCheck.valid) {
    return { success: false, error: urlCheck.error! };
  }

  // 7. Build headers
  let authHeaders: Record<string, string>;
  try {
    authHeaders = await buildAuthHeader(config.auth, decrypted, config._id?.toString());
  } catch (err) {
    return { success: false, error: `Auth error: ${(err as Error).message}` };
  }
  const headers: Record<string, string> = {
    ...authHeaders,
    ...(action.headers || {}),
  };

  // Resolve templates in header values
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string' && v.includes('{{')) {
      try {
        headers[k] = resolveTemplate(v, ctx, optionalInputKeys);
      } catch (err) {
        return { success: false, error: `Header template error for "${k}": ${(err as Error).message}` };
      }
    }
  }

  // 8. Build body or query params
  let body: string | undefined;
  let finalUrl = fullUrl;

  if (['POST', 'PUT', 'PATCH'].includes(action.method) && action.bodyTemplate) {
    try {
      const resolved = resolveDeep(action.bodyTemplate, ctx, optionalInputKeys);
      body = JSON.stringify(resolved);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    } catch (err) {
      return { success: false, error: `Body template error: ${(err as Error).message}` };
    }
  }

  if (action.method === 'GET' && action.queryTemplate) {
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(action.queryTemplate)) {
        const resolved = resolveTemplate(v as string, ctx, optionalInputKeys);
        if (resolved) params.set(k, resolved);
      }
      const qs = params.toString();
      if (qs) finalUrl += `?${qs}`;
    } catch (err) {
      return { success: false, error: `Query template error: ${(err as Error).message}` };
    }
  }

  // 9. Execute HTTP request
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(finalUrl, {
      method: action.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Read response with size limit
    const text = await response.text();
    const truncated = text.length > MAX_RESPONSE_SIZE ? text.slice(0, MAX_RESPONSE_SIZE) + '...[truncated]' : text;

    let parsed: unknown;
    try {
      parsed = JSON.parse(truncated);
    } catch {
      parsed = truncated;
    }

    // 10. Apply response mapping
    const mapping = action.responseMapping;
    if (mapping && typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;

      if (mapping.successField) {
        const isSuccess = !!obj[mapping.successField];
        if (!isSuccess) {
          const errMsg = mapping.errorField
            ? String(obj[mapping.errorField] || '')
            : `API returned ${mapping.successField}=false`;
          return { success: false, error: errMsg, data: mapping.dataField ? obj[mapping.dataField] : obj };
        }
      }

      if (mapping.dataField) {
        return { success: response.ok, data: obj[mapping.dataField] };
      }
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${truncated.slice(0, 500)}` };
    }

    return { success: true, data: parsed };
  } catch (err) {
    clearTimeout(timeout);
    const msg = (err as Error).message;
    if (msg.includes('abort')) {
      return { success: false, error: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` };
    }
    return { success: false, error: `HTTP request failed: ${msg}` };
  }
}

// ── Validation (used by create_integration tool) ─────────────────────────

export function validateConfig(params: {
  authType: string;
  authValueField?: string;
  credentials: Record<string, unknown>;
  baseUrl: string;
  actions: IIntegrationConfigAction[];
  config: Record<string, unknown>;
  tokenUrl?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Auth type
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

  // authValueField for bearer/api_key
  if (['bearer', 'api_key'].includes(params.authType)) {
    const field = params.authValueField || (params.authType === 'bearer' ? 'token' : 'apiKey');
    if (!(field in params.credentials)) {
      errors.push(`Auth credentials missing field "${field}" required for ${params.authType} auth`);
    }
  }

  // basic auth
  if (params.authType === 'basic') {
    if (!('username' in params.credentials) || !('password' in params.credentials)) {
      errors.push('Basic auth requires "username" and "password" in credentials');
    }
  }

  // service account auth
  if (params.authType === 'oauth2_service_account') {
    if (!('client_email' in params.credentials)) {
      errors.push('Service account auth requires "client_email" in credentials');
    }
    if (!('private_key' in params.credentials)) {
      errors.push('Service account auth requires "private_key" in credentials');
    }
  }

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

  // URL
  const urlCheck = validateUrl(params.baseUrl.replace(/\{\{[^}]+\}\}/g, 'placeholder'));
  if (!urlCheck.valid) {
    errors.push(urlCheck.error!);
  }

  // Actions
  const actionIds = new Set<string>();
  for (const action of params.actions) {
    if (actionIds.has(action.id)) {
      errors.push(`Duplicate action ID: "${action.id}"`);
    }
    actionIds.add(action.id);

    // Validate templates reference existing variables
    const allTemplates = JSON.stringify({
      path: action.path,
      body: action.bodyTemplate,
      query: action.queryTemplate,
      headers: action.headers,
    });

    const matches = Array.from(allTemplates.matchAll(/\{\{(\w+)\.(\w+)\}\}/g));
    for (const m of matches) {
      const [, namespace, key] = m;
      if (namespace === 'config' && !(key in params.config)) {
        errors.push(`Template {{config.${key}}} in action "${action.id}" — key "${key}" not found in config`);
      }
      if (namespace === 'auth' && !(key in params.credentials)) {
        errors.push(`Template {{auth.${key}}} in action "${action.id}" — key "${key}" not found in credentials`);
      }
      if (namespace === 'input') {
        const props = action.inputSchema?.properties || {};
        if (!(key in props)) {
          errors.push(
            `Template {{input.${key}}} in action "${action.id}" — key "${key}" not in inputSchema.properties`
          );
        }
      }
      if (!['auth', 'config', 'input'].includes(namespace)) {
        errors.push(
          `Unknown template namespace "{{${namespace}.${key}}}" in action "${action.id}". Use: auth, config, input`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
