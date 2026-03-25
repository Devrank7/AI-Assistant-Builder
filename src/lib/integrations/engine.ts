// src/lib/integrations/engine.ts
import { decrypt } from '@/lib/encryption';
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

// ── Auth Header Construction ─────────────────────────────────────────────

export function buildAuthHeader(
  auth: IIntegrationConfig['auth'],
  decrypted: Record<string, unknown>
): Record<string, string> {
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
  const headers: Record<string, string> = {
    ...buildAuthHeader(config.auth, decrypted),
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
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Auth type
  if (!['api_key', 'bearer', 'basic', 'none'].includes(params.authType)) {
    errors.push(`Invalid auth type: "${params.authType}". Must be: api_key, bearer, basic, none`);
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
