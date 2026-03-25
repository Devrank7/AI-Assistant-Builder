# Dynamic Integration System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the builder's broken integration flow (LLM hallucination) with a config-driven system: builder creates validated JSON configs, a deterministic engine executes HTTP calls at runtime, and loadWidgetTools() generates Gemini function declarations from those configs.

**Architecture:** Three layers — IntegrationConfig (MongoDB model storing JSON configs), Integration Engine (template resolver + HTTP executor), and extended loadWidgetTools() pipeline. Builder gets 6 new tools replacing the old 12. General-purpose tools (web_search, web_fetch, guide_user, open_connection_wizard) move to coreTools.ts.

**Tech Stack:** Next.js 15, TypeScript, MongoDB/Mongoose, @google/genai SDK, AES-256-GCM encryption, Brave Search API

**Spec:** `docs/superpowers/specs/2026-03-25-dynamic-integration-system-design.md`

---

## File Structure

### New Files

| File                                               | Responsibility                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models/IntegrationConfig.ts`                  | Mongoose model for config-driven integrations (schema, indexes, types)                                                                      |
| `src/lib/integrations/engine.ts`                   | Template resolver, URL validator, auth header builder, HTTP executor, rate limiter                                                          |
| `src/lib/builder/tools/dynamicIntegrationTools.ts` | 6 builder tools: research_api, create_integration, test_integration_config, activate_integration, deactivate_integration, list_integrations |

### Modified Files

| File                                 | Change                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/lib/builder/types.ts`           | Update AGENT_TOOL_NAMES: remove old integration names, add 6 new ones                       |
| `src/lib/builder/tools/coreTools.ts` | Add web_search, web_fetch, guide_user, open_connection_wizard (moved from integrationTools) |
| `src/lib/builder/tools/index.ts`     | Import dynamicIntegrationTools instead of integrationTools                                  |
| `src/lib/widgetTools.ts`             | Add IntegrationConfig loading step to loadWidgetTools()                                     |
| `src/lib/builder/systemPrompt.ts`    | Replace integration instructions with new 5-step flow                                       |

### Deprecated (kept on disk, not imported)

| File                                        | Reason                                               |
| ------------------------------------------- | ---------------------------------------------------- |
| `src/lib/builder/tools/integrationTools.ts` | Replaced by dynamicIntegrationTools.ts + moved tools |

---

## Task 1: IntegrationConfig MongoDB Model

**Files:**

- Create: `src/models/IntegrationConfig.ts`

**Context:** Follow the exact pattern from `src/models/Integration.ts` — Mongoose schema with TypeScript interface, compound indexes, timestamps.

- [ ] **Step 1: Create the model file**

```typescript
// src/models/IntegrationConfig.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationConfigAction {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  bodyTemplate?: unknown;
  queryTemplate?: Record<string, string>;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  responseMapping?: {
    successField?: string;
    dataField?: string;
    errorField?: string;
  };
}

export interface IIntegrationConfig extends Document {
  userId: string;
  clientId: string;
  provider: string;
  displayName: string;
  auth: {
    type: 'api_key' | 'bearer' | 'basic' | 'none';
    credentials: string; // encrypted JSON
    headerName?: string;
    headerPrefix?: string;
    authValueField?: string;
  };
  baseUrl: string;
  actions: IIntegrationConfigAction[];
  config: Record<string, unknown>;
  systemPromptAddition?: string;
  status: 'draft' | 'tested' | 'active' | 'inactive' | 'error';
  lastTestResult?: {
    success: boolean;
    response?: unknown;
    error?: string;
    timestamp: Date;
  };
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigActionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    path: { type: String, required: true },
    headers: { type: Schema.Types.Mixed },
    bodyTemplate: { type: Schema.Types.Mixed },
    queryTemplate: { type: Schema.Types.Mixed },
    inputSchema: {
      type: {
        type: String,
        default: 'object',
      },
      properties: { type: Schema.Types.Mixed, default: {} },
      required: { type: [String], default: [] },
    },
    responseMapping: {
      successField: String,
      dataField: String,
      errorField: String,
    },
  },
  { _id: false }
);

const IntegrationConfigSchema = new Schema<IIntegrationConfig>(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    provider: { type: String, required: true },
    displayName: { type: String, required: true },
    auth: {
      type: {
        type: String,
        enum: ['api_key', 'bearer', 'basic', 'none'],
        required: true,
      },
      credentials: { type: String, required: true },
      headerName: String,
      headerPrefix: String,
      authValueField: String,
    },
    baseUrl: { type: String, required: true },
    actions: { type: [IntegrationConfigActionSchema], required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    systemPromptAddition: String,
    status: {
      type: String,
      enum: ['draft', 'tested', 'active', 'inactive', 'error'],
      default: 'draft',
    },
    lastTestResult: {
      success: Boolean,
      response: Schema.Types.Mixed,
      error: String,
      timestamp: Date,
    },
    consecutiveFailures: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IntegrationConfigSchema.index({ userId: 1, clientId: 1, provider: 1 }, { unique: true });
IntegrationConfigSchema.index({ clientId: 1, status: 1 });

export default mongoose.models.IntegrationConfig ||
  mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);
```

- [ ] **Step 2: Verify the model compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/models/IntegrationConfig.ts 2>&1 | head -20`
Expected: No errors (or only unrelated existing errors)

- [ ] **Step 3: Commit**

```bash
git add src/models/IntegrationConfig.ts
git commit -m "feat: add IntegrationConfig MongoDB model for config-driven integrations"
```

---

## Task 2: Integration Engine — Template Resolver + HTTP Executor

**Files:**

- Create: `src/lib/integrations/engine.ts`

**Context:** This is the core deterministic engine. It resolves `{{namespace.key}}` templates and executes HTTP requests. Must handle auth header construction for 4 auth types, URL security validation, response size limits, timeouts, and rate limiting via MongoDB.

- [ ] **Step 1: Create the engine directory if needed**

Run: `ls /Users/devlink007/AIAsisstant/AIAsisstant/src/lib/integrations/`
If it exists (it should — it has `core/`), proceed. If not, `mkdir -p src/lib/integrations/`.

- [ ] **Step 2: Write the engine**

```typescript
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
        const resolved = resolveTemplate(v, ctx, optionalInputKeys);
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

    const matches = allTemplates.matchAll(/\{\{(\w+)\.(\w+)\}\}/g);
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
```

- [ ] **Step 3: Verify the engine compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/integrations/engine.ts 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/engine.ts
git commit -m "feat: add Integration Engine — template resolver, HTTP executor, URL validator, rate limiter"
```

---

## Task 3: Update types.ts — AgentToolName

**Files:**

- Modify: `src/lib/builder/types.ts:18-56`

**Context:** The `AGENT_TOOL_NAMES` array controls SSE event typing. Must remove deprecated integration tool names and add the 6 new ones. The `AgentToolName` type is derived from this array.

- [ ] **Step 1: Update AGENT_TOOL_NAMES**

Replace lines 18-56 of `src/lib/builder/types.ts`:

```typescript
export const AGENT_TOOL_NAMES = [
  // Core (13)
  'analyze_site',
  'generate_design',
  'modify_design',
  'select_theme',
  'build_deploy',
  'crawl_knowledge',
  'modify_widget_code',
  'modify_config',
  'modify_structure',
  'modify_component',
  'add_component',
  'rollback',
  'test_widget',
  // General-purpose (moved from integrationTools to coreTools)
  'web_search',
  'web_fetch',
  'guide_user',
  'open_connection_wizard',
  // Dynamic Integration (6 new tools)
  'research_api',
  'create_integration',
  'test_integration_config',
  'activate_integration',
  'deactivate_integration',
  'list_integrations',
  // No-URL builder
  'create_theme_from_scratch',
  'upload_knowledge_text',
  // Proactive (4)
  'analyze_opportunities',
  'suggest_improvements',
  'check_knowledge_gaps',
  'analyze_competitors',
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];
```

- [ ] **Step 2: Grep for references to removed tool names**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && grep -rn "search_api_docs\|write_integration\|connect_integration\|generate_integration\|connect_any_api\|list_user_integrations\|attach_integration_to_widget\|execute_integration_action\|check_integration_health\|enable_ai_actions" --include="*.ts" --include="*.tsx" src/ | grep -v "integrationTools.ts" | grep -v "node_modules"`

Also separately check for old `test_integration` (without `_config` suffix):
Run: `grep -rn '"test_integration"' --include="*.ts" --include="*.tsx" src/ | grep -v "integrationTools.ts" | grep -v "test_integration_config"`

Review each hit. The key places to check:

- `src/app/api/builder/chat/route.ts` — check `toolCallsMade.includes(...)` for any removed names
- `src/lib/builder/systemPrompt.ts` — tool name references in prompt text
- Frontend files in `src/components/` or `src/app/` — SSE tool event handling

For each reference found, note it — it will be fixed in Task 6 (system prompt) or is in `integrationTools.ts` (being deprecated).

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/types.ts
git commit -m "feat: update AgentToolName — remove deprecated integration tools, add 6 new dynamic integration tools"
```

---

## Task 4: Dynamic Integration Tools — 6 Builder Tools

**Files:**

- Create: `src/lib/builder/tools/dynamicIntegrationTools.ts`

**Context:** These are the 6 new builder tools. They follow the exact `ToolDefinition` pattern from `coreTools.ts` — exported as `const dynamicIntegrationTools: ToolDefinition[]`. Each tool has `name`, `description`, `parameters`, `category: 'integration'`, and an `executor(args, ctx)` function that returns `{ success: boolean, ... }`.

**Dependencies:** `IntegrationConfig` model (Task 1), `engine.ts` (Task 2), encryption from `@/lib/encryption`

- [ ] **Step 1: Create dynamicIntegrationTools.ts**

```typescript
// src/lib/builder/tools/dynamicIntegrationTools.ts
import type { ToolDefinition } from '../toolRegistry';
import IntegrationConfig from '@/models/IntegrationConfig';
import AISettings from '@/models/AISettings';
import WidgetIntegration from '@/models/WidgetIntegration';
import { encrypt } from '@/lib/encryption';
import { validateConfig, executeAction } from '@/lib/integrations/engine';
import { loadWidgetTools } from '@/lib/widgetTools';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';
import connectDB from '@/lib/mongodb';

// ── Helper: web search via Brave ─────────────────────────────────────────

async function braveSearch(query: string, count = 5): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).map((r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  } catch {
    return [];
  }
}

async function fetchPageMarkdown(url: string, maxLen = 30000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WinBixAI-Builder/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return `[Error: HTTP ${res.status}]`;
    const html = await res.text();
    // Simple HTML to text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text.slice(0, maxLen);
  } catch (err) {
    return `[Error: ${(err as Error).message}]`;
  }
}

// ── Helper: Build unified actionsSystemPrompt ────────────────────────────

async function buildUnifiedActionsPrompt(
  clientId: string,
  userId: string
): Promise<{ prompt: string; actionCount: number }> {
  let prompt = '## Available Integration Actions\n\n';
  let actionCount = 0;

  // 1. Plugin-based integrations (from WidgetIntegration)
  const bindings = await WidgetIntegration.find({ widgetId: clientId, enabled: true }).lean();
  for (const binding of bindings) {
    const plugin = pluginRegistry.get(binding.integrationSlug);
    if (!plugin) continue;
    for (const actionId of binding.enabledActions || []) {
      const actionDef = plugin.manifest.actions.find((a: { id: string }) => a.id === actionId);
      if (!actionDef) continue;
      const toolName = `${binding.integrationSlug}_${actionId}`;
      prompt += `- **${toolName}**: ${actionDef.description}\n`;
      actionCount++;
    }
  }

  // 2. Config-driven integrations (from IntegrationConfig)
  const configs = await IntegrationConfig.find({ clientId, status: 'active' }).lean();
  for (const config of configs) {
    for (const action of config.actions) {
      const toolName = `${config.provider}_${action.id}`;
      prompt += `- **${toolName}**: ${action.description}\n`;
      actionCount++;
    }
    if (config.systemPromptAddition) {
      prompt += `\n${config.systemPromptAddition}\n`;
    }
  }

  return { prompt, actionCount };
}

// ── Tools ────────────────────────────────────────────────────────────────

export const dynamicIntegrationTools: ToolDefinition[] = [
  // ─── 1. research_api ───────────────────────────────────────────────────
  {
    name: 'research_api',
    description:
      'Research an API documentation to understand endpoints, authentication, and parameters. Use before creating an integration config. Returns raw documentation text.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'API provider name (e.g., "telegram", "hubspot", "stripe")' },
        topic: { type: 'string', description: 'Specific topic to research (e.g., "send message", "create contact")' },
      },
      required: ['provider', 'topic'],
    },
    category: 'integration',
    async executor(args) {
      const provider = args.provider as string;
      const topic = args.topic as string;

      const results = await braveSearch(`${provider} API documentation ${topic}`, 5);
      if (results.length === 0) {
        return {
          success: false,
          error: 'No documentation found. Ask the user for the API base URL and endpoint details.',
        };
      }

      // Fetch top 2 results
      const docs: string[] = [];
      for (const r of results.slice(0, 2)) {
        const content = await fetchPageMarkdown(r.url, 15000);
        docs.push(`## ${r.title}\nURL: ${r.url}\n\n${content}`);
      }

      return {
        success: true,
        searchResults: results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
        documentation: docs.join('\n\n---\n\n'),
      };
    },
  },

  // ─── 2. create_integration ─────────────────────────────────────────────
  {
    name: 'create_integration',
    description:
      'Create a new integration config for a widget. Validates the config structure, encrypts credentials, and saves as draft. Must call test_integration_config after to verify it works.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Integration provider slug (e.g., "telegram", "hubspot")' },
        displayName: { type: 'string', description: 'Human-readable name (e.g., "Telegram Notifications")' },
        authType: { type: 'string', description: 'Auth type: "api_key", "bearer", "basic", or "none"' },
        credentials: { type: 'string', description: 'JSON string with auth credentials (e.g., {"token": "abc123"})' },
        authValueField: {
          type: 'string',
          description: 'Which credential field to use for auth header (e.g., "token", "apiKey")',
        },
        headerName: {
          type: 'string',
          description: 'Auth header name (default: "Authorization" for bearer, "X-API-Key" for api_key)',
        },
        headerPrefix: {
          type: 'string',
          description: 'Auth header value prefix (default: "Bearer " for bearer, "" for api_key)',
        },
        baseUrl: {
          type: 'string',
          description:
            'Base URL with optional {{auth.X}} templates (e.g., "https://api.telegram.org/bot{{auth.token}}")',
        },
        actions: {
          type: 'string',
          description:
            'JSON array of action definitions with id, name, description, method, path, bodyTemplate, inputSchema',
        },
        config: { type: 'string', description: 'JSON object with static config values (e.g., {"chat_id": "123456"})' },
        systemPromptAddition: {
          type: 'string',
          description: 'Extra instructions for the widget AI about this integration',
        },
      },
      required: ['provider', 'displayName', 'authType', 'credentials', 'baseUrl', 'actions'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      // Parse JSON params
      let credentials: Record<string, unknown>;
      let actions: Array<Record<string, unknown>>;
      let config: Record<string, unknown>;
      try {
        credentials = JSON.parse(args.credentials as string);
      } catch {
        return { success: false, error: 'Invalid JSON in credentials parameter' };
      }
      try {
        actions = JSON.parse(args.actions as string);
      } catch {
        return { success: false, error: 'Invalid JSON in actions parameter' };
      }
      try {
        config = args.config ? JSON.parse(args.config as string) : {};
      } catch {
        return { success: false, error: 'Invalid JSON in config parameter' };
      }

      if (!ctx.clientId) {
        return { success: false, error: 'No widget built yet. Build a widget first before adding integrations.' };
      }

      // Validate
      const validation = validateConfig({
        authType: args.authType as string,
        authValueField: args.authValueField as string | undefined,
        credentials,
        baseUrl: args.baseUrl as string,
        actions: actions as any[],
        config,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: `Config validation failed:\n${validation.errors.join('\n')}`,
          errors: validation.errors,
        };
      }

      // Encrypt credentials
      const encryptedCreds = encrypt(JSON.stringify(credentials));

      // Upsert (allows fixing a broken draft)
      const doc = await IntegrationConfig.findOneAndUpdate(
        { userId: ctx.userId, clientId: ctx.clientId, provider: args.provider as string },
        {
          displayName: args.displayName as string,
          auth: {
            type: args.authType as string,
            credentials: encryptedCreds,
            headerName: (args.headerName as string) || undefined,
            headerPrefix: (args.headerPrefix as string) || undefined,
            authValueField: args.authValueField as string | undefined,
          },
          baseUrl: args.baseUrl as string,
          actions,
          config,
          systemPromptAddition: (args.systemPromptAddition as string) || undefined,
          status: 'draft',
          consecutiveFailures: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return {
        success: true,
        configId: doc._id.toString(),
        provider: args.provider,
        actionsCreated: actions.map((a: any) => a.id),
        message: `Integration config created as draft. Now call test_integration_config to verify it works.`,
      };
    },
  },

  // ─── 3. test_integration_config ────────────────────────────────────────
  {
    name: 'test_integration_config',
    description:
      'Test an integration config by executing a real API call. Use after create_integration to verify the config works. Updates status to "tested" on success.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId returned by create_integration' },
        actionId: { type: 'string', description: 'Which action to test (e.g., "send_message")' },
        testInputs: {
          type: 'string',
          description: 'JSON with test input values (e.g., {"message": "Test from WinBix"})',
        },
      },
      required: ['configId', 'actionId', 'testInputs'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }

      let testInputs: Record<string, unknown>;
      try {
        testInputs = JSON.parse(args.testInputs as string);
      } catch {
        return { success: false, error: 'Invalid JSON in testInputs parameter' };
      }

      ctx.write({ type: 'progress', message: `Testing ${configDoc.provider} integration...` });

      const result = await executeAction(configDoc, args.actionId as string, testInputs);

      // Update test result
      configDoc.lastTestResult = {
        success: result.success,
        response: result.data,
        error: result.error,
        timestamp: new Date(),
      };

      if (result.success) {
        configDoc.status = 'tested';
        configDoc.consecutiveFailures = 0;
      }

      await configDoc.save();

      if (result.success) {
        return {
          success: true,
          message: `Test passed! Action "${args.actionId}" executed successfully. Call activate_integration to make it live.`,
          response: result.data,
        };
      } else {
        return {
          success: false,
          error: `Test failed: ${result.error}. Fix the config with create_integration and test again.`,
          details: result.data,
        };
      }
    },
  },

  // ─── 4. activate_integration ───────────────────────────────────────────
  {
    name: 'activate_integration',
    description:
      'Activate a tested integration on the widget. Makes its actions available to the widget AI as callable tools. Must call test_integration_config first.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId to activate' },
      },
      required: ['configId'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }
      if (configDoc.status === 'draft') {
        return {
          success: false,
          error: 'Integration must be tested first. Call test_integration_config before activating.',
        };
      }

      // Set active
      configDoc.status = 'active';
      await configDoc.save();

      // Build unified actionsSystemPrompt
      const { prompt, actionCount } = await buildUnifiedActionsPrompt(configDoc.clientId, ctx.userId);

      // Update AISettings
      await AISettings.findOneAndUpdate(
        { clientId: configDoc.clientId },
        {
          actionsEnabled: true,
          actionsSystemPrompt: prompt,
        },
        { upsert: true }
      );

      // Verify tools load
      const tools = await loadWidgetTools(configDoc.clientId);
      const expectedToolNames = configDoc.actions.map((a) => `${configDoc.provider}_${a.id}`);
      const loadedNames = tools.declarations.map((d) => d.name);
      const allLoaded = expectedToolNames.every((n) => loadedNames.includes(n));

      return {
        success: true,
        activeActions: expectedToolNames,
        totalActions: actionCount,
        widgetToolsVerified: allLoaded,
        message: allLoaded
          ? `Integration activated! Widget now has ${expectedToolNames.length} new tool(s): ${expectedToolNames.join(', ')}`
          : `Integration activated but some tools failed to load. Check the config.`,
      };
    },
  },

  // ─── 5. deactivate_integration ─────────────────────────────────────────
  {
    name: 'deactivate_integration',
    description:
      'Deactivate an integration, removing its tools from the widget. The config is preserved and can be reactivated later.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId to deactivate' },
      },
      required: ['configId'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }

      configDoc.status = 'inactive';
      await configDoc.save();

      // Rebuild prompt without this integration
      const { prompt, actionCount } = await buildUnifiedActionsPrompt(configDoc.clientId, ctx.userId);

      if (actionCount === 0) {
        await AISettings.findOneAndUpdate(
          { clientId: configDoc.clientId },
          { actionsEnabled: false, actionsSystemPrompt: '' }
        );
      } else {
        await AISettings.findOneAndUpdate({ clientId: configDoc.clientId }, { actionsSystemPrompt: prompt });
      }

      return {
        success: true,
        message: `Integration "${configDoc.displayName}" deactivated. ${actionCount} actions remain active.`,
      };
    },
  },

  // ─── 6. list_integrations ──────────────────────────────────────────────
  {
    name: 'list_integrations',
    description:
      'List all integrations for the current widget (both marketplace plugins and config-driven integrations).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    category: 'integration',
    async executor(args, ctx) {
      if (!ctx.clientId) {
        return { success: false, error: 'No widget built yet.' };
      }

      await connectDB();
      const integrations: Array<{
        provider: string;
        displayName: string;
        status: string;
        type: 'plugin' | 'config';
        actions: string[];
      }> = [];

      // Plugin-based
      const bindings = await WidgetIntegration.find({ widgetId: ctx.clientId, enabled: true }).lean();
      for (const binding of bindings) {
        const plugin = pluginRegistry.get(binding.integrationSlug);
        integrations.push({
          provider: binding.integrationSlug,
          displayName: plugin?.manifest.name || binding.integrationSlug,
          status: 'active',
          type: 'plugin',
          actions: (binding.enabledActions || []) as string[],
        });
      }

      // Config-driven
      const configs = await IntegrationConfig.find({ clientId: ctx.clientId }).lean();
      for (const config of configs) {
        integrations.push({
          provider: config.provider,
          displayName: config.displayName,
          status: config.status,
          type: 'config',
          actions: config.actions.map((a) => a.id),
        });
      }

      return {
        success: true,
        integrations,
        total: integrations.length,
      };
    },
  },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/builder/tools/dynamicIntegrationTools.ts 2>&1 | head -30`

Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/tools/dynamicIntegrationTools.ts
git commit -m "feat: add 6 dynamic integration builder tools — research_api, create_integration, test_integration_config, activate_integration, deactivate_integration, list_integrations"
```

---

## Task 5: Move General Tools from integrationTools to coreTools

**Files:**

- Modify: `src/lib/builder/tools/coreTools.ts`
- Modify: `src/lib/builder/tools/integrationTools.ts` (read-only — copy tools from here)

**Context:** `web_search`, `web_fetch`, `guide_user`, and `open_connection_wizard` are general-purpose tools currently in `integrationTools.ts`. They need to move to `coreTools.ts` because `integrationTools.ts` will be deprecated (no longer imported in `index.ts`).

- [ ] **Step 1: Read current integrationTools.ts to identify exact tool definitions**

Read these tool definitions from `src/lib/builder/tools/integrationTools.ts`:

- `web_search` (around lines 11-30)
- `web_fetch` (around lines 31-49)
- `guide_user` (around lines 156-205)
- `open_connection_wizard` (around lines 206-236)

Also read the helper functions they depend on (e.g., `webSearch()`, `webFetch()`).

- [ ] **Step 2: Add the 4 tools to the end of the coreTools array in coreTools.ts**

Append the 4 tool definitions to the `coreTools` array.

**Critical details:**

- `web_search` uses a `webSearch()` helper — check if it's imported from `../webSearch` or defined inline in integrationTools. Import the same helper into coreTools.
- `web_fetch` uses a `webFetch()` helper — same approach, import from existing location.
- `guide_user` sends a `crm_instruction` SSE event via `ctx.write()` — no special imports needed.
- `open_connection_wizard` sends an `open_connection_wizard` SSE event — no special imports needed.
- Do NOT carry over `universalApiTool`, `validateGeneratedCode`, or any other integration-specific helpers. Only the 4 tools listed.

**Important:** Keep the exact same tool names, descriptions, and parameter schemas. Only change the location — behavior must be identical.

- [ ] **Step 3: Verify coreTools.ts compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/builder/tools/coreTools.ts 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/builder/tools/coreTools.ts
git commit -m "refactor: move web_search, web_fetch, guide_user, open_connection_wizard from integrationTools to coreTools"
```

---

## Task 6: Update Tool Registry — index.ts

**Files:**

- Modify: `src/lib/builder/tools/index.ts`

**Context:** Currently imports and registers `integrationTools` from `./integrationTools`. Must switch to `dynamicIntegrationTools` from `./dynamicIntegrationTools`. The general-purpose tools are now in `coreTools` (Task 5).

- [ ] **Step 1: Update the import and registration**

In `src/lib/builder/tools/index.ts`:

1. Replace: `import { integrationTools } from './integrationTools';`
   With: `import { dynamicIntegrationTools } from './dynamicIntegrationTools';`

2. In `createToolRegistry()`, replace:
   `for (const tool of integrationTools) registry.register(tool);`
   With:
   `for (const tool of dynamicIntegrationTools) registry.register(tool);`

- [ ] **Step 2: Verify index.ts compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/builder/tools/index.ts 2>&1 | head -20`

- [ ] **Step 3: Verify full project compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit 2>&1 | tail -20`

Fix any remaining type errors from the tool swap.

- [ ] **Step 4: Commit**

```bash
git add src/lib/builder/tools/index.ts
git commit -m "refactor: swap integrationTools for dynamicIntegrationTools in tool registry"
```

---

## Task 7: Extend loadWidgetTools() — Config-Driven Integrations

**Files:**

- Modify: `src/lib/widgetTools.ts:300-377`

**Context:** After existing plugin-based loading (steps 1-4), add step 5: load IntegrationConfig records for the widget and generate Gemini function declarations + engine-based executors.

- [ ] **Step 1: Add imports at top of widgetTools.ts**

Add near the top imports:

```typescript
import IntegrationConfig from '@/models/IntegrationConfig';
import { executeAction as engineExecuteAction } from '@/lib/integrations/engine';
```

- [ ] **Step 2: Add step 5 inside loadWidgetTools(), before the return statement**

After the existing step 4 (line ~374, before `return { declarations, executors, hasIntegrations };`):

```typescript
// 5. Load config-driven integrations (from IntegrationConfig)
const integrationConfigs = await IntegrationConfig.find({
  clientId,
  status: 'active',
}).lean();

for (const config of integrationConfigs) {
  for (const action of config.actions) {
    const toolName = `${config.provider}_${action.id}`;

    // Build Gemini function declaration from action.inputSchema
    const properties: Record<string, { type: Type; description: string }> = {};
    const required: string[] = action.inputSchema.required || [];

    for (const [key, prop] of Object.entries(action.inputSchema.properties || {})) {
      properties[key] = {
        type: mapSchemaType(prop.type),
        description: prop.description,
      };
    }

    declarations.push({
      name: toolName,
      description: `[${config.displayName}] ${action.description}`,
      parameters: {
        type: Type.OBJECT,
        properties,
        required,
      },
    });

    // Capture config reference for executor closure
    const configRef = config;
    const actionId = action.id;

    executors.set(toolName, async (args) => {
      try {
        // Re-fetch config from DB for fresh credentials (in case they were rotated)
        const freshConfig = await IntegrationConfig.findById(configRef._id);
        if (!freshConfig || freshConfig.status !== 'active') {
          return { success: false, error: `Integration "${configRef.displayName}" is no longer active` };
        }

        const result = await engineExecuteAction(freshConfig, actionId, args);

        // Track consecutive failures for error status transition
        if (!result.success) {
          freshConfig.consecutiveFailures = (freshConfig.consecutiveFailures || 0) + 1;
          if (freshConfig.consecutiveFailures >= 3) {
            freshConfig.status = 'error';
            console.error(
              `[widgetTools] Integration "${configRef.provider}" marked as error after 3 consecutive failures`
            );
          }
          await freshConfig.save();
        } else if (freshConfig.consecutiveFailures > 0) {
          freshConfig.consecutiveFailures = 0;
          await freshConfig.save();
        }

        return result as Record<string, unknown>;
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    });

    hasIntegrations = true;
  }
}
```

- [ ] **Step 3: Verify widgetTools.ts compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/widgetTools.ts 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/widgetTools.ts
git commit -m "feat: extend loadWidgetTools() to load config-driven integrations from IntegrationConfig model"
```

---

## Task 8: Update Builder System Prompt

**Files:**

- Modify: `src/lib/builder/systemPrompt.ts`

**Context:** Replace the current integration instructions (which reference old tools like `write_integration`, `connect_integration`, etc.) with the new 5-step flow using `research_api`, `create_integration`, `test_integration_config`, `activate_integration`.

- [ ] **Step 1: Read current system prompt to find exact integration section**

Read `src/lib/builder/systemPrompt.ts` lines 200-400 to find the integration instructions block.

- [ ] **Step 2: Replace the integration instructions**

Find the section that starts with integration-related instructions (likely around "INTEGRATION", "connect", "write_integration") and replace it with:

```typescript
`
## INTEGRATION FLOW (MANDATORY)

When the user asks to connect ANY API or service (Telegram, CRM, calendar, payments, etc.):

1. **RESEARCH**: Call research_api to understand the API's endpoints, authentication, and parameters.
2. **ASK CREDENTIALS**: Ask the user for their API key/token. NEVER guess or hallucinate credentials.
3. **CREATE CONFIG**: Call create_integration with the full JSON config including provider, auth, baseUrl, actions, and config.
4. **TEST**: Call test_integration_config with real test data. If it fails, analyze the error, fix the config, and retry.
5. **ACTIVATE**: Call activate_integration to make it live on the widget.

### INTEGRATION RULES (CRITICAL):
- NEVER skip test_integration_config. An untested integration is NOT connected.
- NEVER tell the user "connected" or "done" until activate_integration returns success.
- If test_integration_config fails, explain the error clearly and fix the config.
- If you don't know the API structure, call research_api first.
- For Telegram: after getting the bot token, research how to get chat_id via getUpdates, then include it in config.
- Use list_integrations to check what's already connected before adding duplicates.
- Use deactivate_integration to disconnect an integration the user no longer wants.

### INTEGRATION TOOLS AVAILABLE:
- research_api: Research API documentation
- create_integration: Create integration config (returns configId)
- test_integration_config: Test with real API call
- activate_integration: Make live on widget
- deactivate_integration: Disconnect from widget
- list_integrations: Show all integrations
`;
```

- [ ] **Step 3: Remove any remaining references to old tool names in the prompt**

Search the entire systemPrompt.ts for: `write_integration`, `connect_integration`, `search_api_docs`, `test_integration`, `generate_integration`, `enable_ai_actions`, `attach_integration_to_widget`, `connect_any_api`, `execute_integration_action`, `check_integration_health`

Remove or replace each occurrence with the appropriate new tool name.

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/builder/systemPrompt.ts 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/systemPrompt.ts
git commit -m "feat: update builder system prompt with new 5-step integration flow"
```

---

## Task 9: Build Verification + Codebase-Wide Cleanup

**Files:**

- Potentially modify: any file referencing deprecated tool names

**Context:** Final verification that the entire project compiles, no references to deprecated tools remain in active code, and the app starts successfully.

- [ ] **Step 1: Full TypeScript compilation check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit 2>&1 | tail -30`

Fix any errors.

- [ ] **Step 2: Grep for remaining references to deprecated tool names in active code**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && grep -rn "write_integration\|connect_integration\|search_api_docs\|generate_integration\|connect_any_api\|list_user_integrations\|attach_integration_to_widget\|execute_integration_action\|check_integration_health\|enable_ai_actions" --include="*.ts" --include="*.tsx" src/ | grep -v "integrationTools.ts" | grep -v "node_modules" | grep -v ".d.ts"`

For each hit:

- If in `route.ts` `toolCallsMade.includes(...)` → update to new tool names or remove
- If in frontend components → update to new tool names
- If in other system prompt files → update references

- [ ] **Step 3: Check `test_integration` references (without `_config` suffix)**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && grep -rn '"test_integration"' --include="*.ts" --include="*.tsx" src/ | grep -v "integrationTools.ts" | grep -v "test_integration_config"`

These are references to the OLD `test_integration` tool. Update or remove each one.

- [ ] **Step 4: Verify the app starts**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npm run build 2>&1 | tail -30`

If the build succeeds, the migration is complete.

- [ ] **Step 5: Commit any cleanup changes**

```bash
git add -A
git commit -m "chore: clean up deprecated integration tool references across codebase"
```

---

## Task 10: Integration Test — Manual Verification

**Files:** None (verification only)

**Context:** Verify the end-to-end flow works by starting the dev server and testing with a real Telegram bot token.

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npm run dev`

- [ ] **Step 2: Verify loadWidgetTools loads config-driven tools**

Create a test script or use the API to:

1. Create an IntegrationConfig directly in MongoDB (status: "active")
2. Call `loadWidgetTools(clientId)` and verify the tools appear in declarations

- [ ] **Step 3: Verify builder tool registration**

Check that `createToolRegistry()` includes the 6 new tools:

- research_api
- create_integration
- test_integration_config
- activate_integration
- deactivate_integration
- list_integrations

And the 4 moved tools still work:

- web_search
- web_fetch
- guide_user
- open_connection_wizard

- [ ] **Step 4: Verify no old tools are registered**

Check that `createToolRegistry()` does NOT include:

- write_integration
- connect_integration
- search_api_docs
- generate_integration
- connect_any_api
- etc.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat: dynamic integration system — complete implementation"
```

---

## Dependency Graph

```
Task 1 (IntegrationConfig model) ─┐
                                   ├→ Task 4 (dynamic tools) ─┐
Task 2 (Integration Engine) ──────┘                            │
                                                               ├→ Task 6 (index.ts swap) ──→ Task 9 (verification)
Task 3 (types.ts) ────────────────────────────────────────────┘                                      │
                                                                                                      ↓
Task 5 (move tools to coreTools) ──→ Task 6                                                    Task 10 (manual test)

Task 7 (extend loadWidgetTools) ──→ Task 9

Task 8 (system prompt) ──→ Task 9
```

**Parallelizable tasks:**

- Tasks 1, 2, 3 can run in parallel (no dependencies between them)
- Tasks 5 and 8 can run in parallel with Task 4
- Task 6 depends on Tasks 4 + 5
- Task 7 depends on Tasks 1 + 2
- Task 9 depends on everything
- Task 10 depends on Task 9
