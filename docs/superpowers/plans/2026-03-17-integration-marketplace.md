# Integration Marketplace Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing basic integrations page into an enterprise-grade marketplace with plugin architecture, connection wizard, health monitoring, and AI Builder integration.

**Architecture:** Evolve the existing `src/lib/integrations/` adapter pattern into a unified plugin system with standardized `IntegrationPlugin` interface. Extend the existing `Integration` model (reused as the spec's `connections` collection — same purpose, adapted field names) to support new fields (status, healthCheck, aiDiagnostic). Add `WidgetIntegration` model for per-widget bindings. Rewrite the integrations page with premium Apple-level UI matching existing dashboard design patterns.

**Deliberate spec adaptations:**

- **Data model:** We reuse the existing `Integration` Mongoose model (with `provider`, `accessToken`, `refreshToken`) rather than creating a new `connections` collection with `integrationSlug` and `credentials` map. This preserves backward compatibility with existing `user-integrations/` API routes.
- **Encryption:** We reuse the existing `src/lib/encryption.ts` (reads `ENCRYPTION_KEY`, format `iv:tag:ciphertext`) rather than creating a new versioned `v1:iv:ciphertext:tag` format. Versioned key rotation is deferred to Phase 2.
- **disconnect():** Plugin interface uses `disconnect(): Promise<void>` (no params) since API Key auth has nothing to revoke. The route handles DB cleanup.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB (Mongoose), Framer Motion, Syne font, lucide-react icons, p-limit (new dependency)

**Spec:** `docs/superpowers/specs/2026-03-17-integration-marketplace-design.md`

---

## File Structure

### New files to create

```
src/lib/integrations/core/
  types.ts                    # PluginInterface, PluginManifest, ExecutionResult, etc.
  PluginRegistry.ts           # Auto-discovery, manifest loading, executeAction
  HealthMonitor.ts            # Cron-based health checks with p-limit concurrency

src/lib/integrations/plugins/
  hubspot/
    manifest.json             # Metadata, authFields, actions
    index.ts                  # IntegrationPlugin implementation (wraps existing hubspotAdapter)
  salesforce/
    manifest.json
    index.ts
  pipedrive/
    manifest.json
    index.ts
  google-calendar/
    manifest.json
    index.ts
  calendly/
    manifest.json
    index.ts
  stripe/
    manifest.json
    index.ts
  telegram/
    manifest.json
    index.ts
  whatsapp/
    manifest.json
    index.ts
  email-smtp/
    manifest.json
    index.ts
  google-sheets/
    manifest.json
    index.ts

src/models/WidgetIntegration.ts    # New model for per-widget bindings

src/app/api/integrations/          # New API routes (replaces user-integrations)
  route.ts                         # GET catalog
  connections/route.ts             # GET user connections
  connect/route.ts                 # POST connect
  test/route.ts                    # POST test connection
  execute/route.ts                 # POST execute action
  disconnect/route.ts              # DELETE disconnect
  health/route.ts                  # GET health status
  widget-attach/route.ts           # POST bind to widget
  widget/[id]/route.ts             # GET integrations for widget

src/app/dashboard/integrations/
  page.tsx                         # REWRITE — premium marketplace UI
  components/
    IntegrationCard.tsx            # Card with 4 states (available, connected, error, coming_soon)
    ConnectionWizard.tsx           # 4-step modal wizard
    CategoryFilter.tsx             # Category pill filters
```

### Files to modify

```
src/models/Integration.ts          # Add: status, lastHealthCheck, lastError, aiDiagnostic fields
src/lib/integrations/types.ts      # Extend with new interfaces (keep existing CRMAdapter/CalendarAdapter)
src/lib/integrations/registry.ts   # Extend to wrap plugins as adapters (backward compat)
package.json                       # Add p-limit dependency
```

### Files to keep (backward compatible)

```
src/lib/integrations/hubspot.ts           # Kept — wrapped by plugin
src/app/api/user-integrations/            # Kept — existing routes remain functional
src/app/api/integrations/sheets/          # IMPORTANT: Existing Google Sheets integration routes — DO NOT touch
src/lib/encryption.ts                     # Kept — reused as-is (existing ENCRYPTION_KEY, not versioned)
src/lib/apiResponse.ts                    # Kept — reused as-is
src/lib/auth.ts                           # Kept — reused as-is
src/lib/builder/tools/integrationTools.ts # Kept — APPEND new tools, do NOT overwrite existing tools
```

---

## Chunk 1: Core Infrastructure (Plugin System + Models)

### Task 1: Install p-limit dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install p-limit**

Run: `npm install p-limit`

- [ ] **Step 2: Verify installation**

Run: `npm ls p-limit`
Expected: `p-limit@X.Y.Z`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add p-limit dependency for concurrent health checks"
```

---

### Task 2: Create plugin type definitions

**Files:**

- Create: `src/lib/integrations/core/types.ts`

- [ ] **Step 1: Create the core types file**

```typescript
// src/lib/integrations/core/types.ts

export interface AuthField {
  key: string;
  label: string;
  type: 'password' | 'text';
  required: boolean;
  placeholder?: string;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, string>; // { name: "string", email: "string", phone: "string?" }
}

export interface PluginManifest {
  slug: string;
  name: string;
  category: 'crm' | 'calendar' | 'payment' | 'notification' | 'data';
  description: string;
  icon: string;
  color: string; // brand color for UI card
  authFields: AuthField[];
  actions: ActionDefinition[];
  healthEndpoint?: string;
  docsUrl?: string;
  status: 'active' | 'coming_soon' | 'deprecated';
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>; // provider-specific data
}

export interface HealthResult {
  healthy: boolean;
  error?: string;
  suggestion?: string; // AI-readable diagnostic
  details?: Record<string, unknown>; // e.g. { contactCount: 1247 }
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retryable?: boolean;
  suggestion?: string;
}

export interface IntegrationPlugin {
  manifest: PluginManifest;

  connect(credentials: Record<string, string>): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  testConnection(credentials: Record<string, string>): Promise<HealthResult>;
  healthCheck(credentials: Record<string, string>): Promise<HealthResult>;

  execute(
    action: string,
    params: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<ExecutionResult>;

  describeCapabilities(): string;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/core/types.ts
git commit -m "feat(integrations): add plugin system type definitions"
```

---

### Task 3: Extend Integration model

**Files:**

- Modify: `src/models/Integration.ts`

The existing model has: `userId, provider, accessToken, refreshToken, tokenExpiry, metadata, isActive`.
We need to add: `status, lastHealthCheck, lastError, aiDiagnostic, integrationSlug` (alias for provider).

- [ ] **Step 1: Extend provider enum AND add new fields to Integration schema**

First, extend the `provider` enum to include all P0 providers (adding `stripe`, `telegram`, `whatsapp`, `email_smtp`, `google_sheets` to the existing list). This MUST be done now — otherwise `Integration.create({ provider: 'stripe' })` will fail Mongoose validation when the connect API routes are built later.

Then add these fields to the schema (after the `isActive` field):

```typescript
// In the provider enum, add these to the existing array:
'stripe', 'telegram', 'whatsapp', 'email_smtp', 'google_sheets'

// New fields after isActive:
status: {
  type: String,
  enum: ['connected', 'error', 'disconnected'],
  default: 'connected',
},
lastHealthCheck: { type: Date },
lastError: { type: String, default: null },
aiDiagnostic: { type: String, default: null },
```

Keep `isActive` for backward compatibility — it maps to `status === 'connected'`.

- [ ] **Step 2: Verify model compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i integration`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/Integration.ts
git commit -m "feat(integrations): extend Integration model with health monitoring fields"
```

---

### Task 4: Create WidgetIntegration model

**Files:**

- Create: `src/models/WidgetIntegration.ts`

- [ ] **Step 1: Create the model**

```typescript
import mongoose from 'mongoose';

const widgetIntegrationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    widgetId: { type: String, required: true, index: true },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', required: true },
    integrationSlug: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    enabledActions: [{ type: String }],
    config: {
      fieldMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
      aiInstruction: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

widgetIntegrationSchema.index({ widgetId: 1, integrationSlug: 1 }, { unique: true });
widgetIntegrationSchema.index({ userId: 1, widgetId: 1 });

export default mongoose.models.WidgetIntegration || mongoose.model('WidgetIntegration', widgetIntegrationSchema);
```

- [ ] **Step 2: Verify model compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i widgetintegration`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/models/WidgetIntegration.ts
git commit -m "feat(integrations): add WidgetIntegration model for per-widget bindings"
```

---

### Task 5: Create PluginRegistry

**Files:**

- Create: `src/lib/integrations/core/PluginRegistry.ts`

- [ ] **Step 1: Create the registry**

```typescript
import { IntegrationPlugin, PluginManifest, ExecutionResult } from './types';
import { decrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

class PluginRegistry {
  private plugins: Map<string, IntegrationPlugin> = new Map();
  private loaded = false;

  // Lazy-load: auto-registers all plugins on first access.
  // This prevents cold-start issues where a route uses the registry
  // before registerAllPlugins() was called.
  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    // Dynamic import to avoid circular deps
    const { registerAllPlugins } = require('@/lib/integrations/plugins');
    registerAllPlugins();
  }

  register(plugin: IntegrationPlugin): void {
    this.plugins.set(plugin.manifest.slug, plugin);
  }

  get(slug: string): IntegrationPlugin | null {
    this.ensureLoaded();
    return this.plugins.get(slug) || null;
  }

  getAllManifests(): PluginManifest[] {
    this.ensureLoaded();
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  async getConnectedManifests(userId: string): Promise<(PluginManifest & { connectionId: string; status: string })[]> {
    await connectDB();
    const connections = await Integration.find({ userId, status: { $ne: 'disconnected' } })
      .select('provider status')
      .lean();

    return connections
      .map((conn: { _id: unknown; provider: string; status: string }) => {
        const plugin = this.plugins.get(conn.provider);
        if (!plugin) return null;
        return {
          ...plugin.manifest,
          connectionId: String(conn._id),
          status: conn.status,
        };
      })
      .filter(Boolean) as (PluginManifest & { connectionId: string; status: string })[];
  }

  async executeAction(
    slug: string,
    action: string,
    params: Record<string, unknown>,
    userId: string,
    widgetId: string
  ): Promise<ExecutionResult> {
    // 1. Validate plugin exists
    const plugin = this.get(slug);
    if (!plugin) return { success: false, error: `Plugin "${slug}" not found` };

    // 2. Validate widget-integration binding
    await connectDB();
    const binding = await WidgetIntegration.findOne({
      userId,
      widgetId,
      integrationSlug: slug,
      enabled: true,
    }).lean();

    if (!binding) {
      return { success: false, error: `Integration "${slug}" not enabled for widget "${widgetId}"` };
    }

    // 3. Validate action is in enabledActions
    if (!binding.enabledActions?.includes(action)) {
      return { success: false, error: `Action "${action}" not enabled for this widget` };
    }

    // 4. Get credentials
    const connection = await Integration.findOne({
      userId,
      provider: slug,
      status: 'connected',
    }).lean();

    if (!connection) {
      return { success: false, error: `No active connection for "${slug}"` };
    }

    // 5. Execute
    const credentials: Record<string, string> = {};
    if (connection.accessToken) credentials.apiKey = decrypt(connection.accessToken);

    return plugin.execute(action, params, credentials);
  }
}

export const pluginRegistry = new PluginRegistry();
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/core/PluginRegistry.ts
git commit -m "feat(integrations): add PluginRegistry with auth-validated executeAction"
```

---

### Task 6: Create HealthMonitor

**Files:**

- Create: `src/lib/integrations/core/HealthMonitor.ts`

- [ ] **Step 1: Create the health monitor**

```typescript
import pLimit from 'p-limit';
import { pluginRegistry } from './PluginRegistry';
import { decrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';

const CONCURRENCY_LIMIT = 20;

let running = false;

export async function checkAllConnections(): Promise<{
  checked: number;
  errors: number;
  skipped: boolean;
}> {
  if (running) return { checked: 0, errors: 0, skipped: true };
  running = true;

  try {
    await connectDB();
    const connections = await Integration.find({ status: 'connected' });
    const limit = pLimit(CONCURRENCY_LIMIT);
    let errorCount = 0;

    await Promise.all(
      connections.map((conn) =>
        limit(async () => {
          const plugin = pluginRegistry.get(conn.provider);
          if (!plugin) return;

          try {
            const credentials: Record<string, string> = {};
            if (conn.accessToken) credentials.apiKey = decrypt(conn.accessToken);

            const result = await plugin.healthCheck(credentials);

            if (!result.healthy) {
              conn.status = 'error';
              conn.lastError = result.error || 'Health check failed';
              conn.aiDiagnostic = result.suggestion || null;
              errorCount++;
            } else {
              conn.status = 'connected';
              conn.lastError = null;
              conn.aiDiagnostic = null;
            }
          } catch (err) {
            conn.status = 'error';
            conn.lastError = err instanceof Error ? err.message : 'Unknown error';
            conn.aiDiagnostic =
              'Health check threw an exception. The API key may be invalid or the service may be down.';
            errorCount++;
          }

          conn.lastHealthCheck = new Date();
          await conn.save();
        })
      )
    );

    return { checked: connections.length, errors: errorCount, skipped: false };
  } finally {
    running = false;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/core/HealthMonitor.ts
git commit -m "feat(integrations): add HealthMonitor with concurrent checks and skip-if-running guard"
```

---

## Chunk 2: Plugin Implementations (P0 Integrations)

### Task 7: Create HubSpot plugin (wrapping existing adapter)

**Files:**

- Create: `src/lib/integrations/plugins/hubspot/manifest.json`
- Create: `src/lib/integrations/plugins/hubspot/index.ts`

- [ ] **Step 1: Create manifest.json**

```json
{
  "slug": "hubspot",
  "name": "HubSpot",
  "category": "crm",
  "description": "CRM & Marketing Automation. Manage contacts, deals, and marketing campaigns.",
  "icon": "/integrations/hubspot.svg",
  "color": "#FF7A59",
  "authFields": [
    { "key": "apiKey", "label": "API Key", "type": "password", "required": true, "placeholder": "pat-na1-xxxxxxxx" }
  ],
  "actions": [
    {
      "id": "createContact",
      "name": "Create Contact",
      "description": "Save a new contact with name, email, and phone",
      "inputSchema": { "email": "string", "name": "string?", "phone": "string?", "company": "string?" }
    },
    {
      "id": "createDeal",
      "name": "Create Deal",
      "description": "Create a new deal in the sales pipeline",
      "inputSchema": { "dealname": "string", "amount": "string?", "pipeline": "string?" }
    },
    {
      "id": "searchContacts",
      "name": "Search Contacts",
      "description": "Search for existing contacts by email or name",
      "inputSchema": { "query": "string" }
    }
  ],
  "healthEndpoint": "/crm/v3/objects/contacts?limit=1",
  "docsUrl": "https://developers.hubspot.com/docs/api/crm/contacts",
  "status": "active"
}
```

- [ ] **Step 2: Create plugin index.ts**

```typescript
import { IntegrationPlugin, ConnectionResult, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://api.hubapi.com';

async function hubspotFetch(path: string, apiKey: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });
}

export const hubspotPlugin: IntegrationPlugin = {
  manifest: manifest as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {
    // API Key auth — nothing to revoke
  },

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await hubspotFetch('/crm/v3/objects/contacts?limit=1', credentials.apiKey);
      if (!res.ok) {
        const status = res.status;
        if (status === 401)
          return {
            healthy: false,
            error: 'Invalid API Key',
            suggestion:
              'The API key is invalid or expired. Generate a new one at HubSpot Settings > Integrations > API Key.',
          };
        return { healthy: false, error: `HubSpot API error: ${status}` };
      }
      const data = await res.json();
      return { healthy: true, details: { contactCount: data.total || 0 } };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or HubSpot service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const apiKey = credentials.apiKey;
    try {
      switch (action) {
        case 'createContact': {
          const res = await hubspotFetch('/crm/v3/objects/contacts', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                email: params.email,
                firstname: typeof params.name === 'string' ? params.name.split(' ')[0] : '',
                lastname: typeof params.name === 'string' ? params.name.split(' ').slice(1).join(' ') : '',
                phone: params.phone || '',
                company: params.company || '',
              },
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}`, retryable: res.status >= 500 };
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }
        case 'createDeal': {
          const res = await hubspotFetch('/crm/v3/objects/deals', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                dealname: params.dealname,
                amount: params.amount || '',
                pipeline: params.pipeline || 'default',
              },
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}`, retryable: res.status >= 500 };
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }
        case 'searchContacts': {
          const res = await hubspotFetch('/crm/v3/objects/contacts/search', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [
                {
                  filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: params.query }],
                },
              ],
              limit: 10,
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}` };
          const data = await res.json();
          return { success: true, data: { contacts: data.results, total: data.total } };
        }
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Execution failed', retryable: true };
    }
  },

  describeCapabilities() {
    return 'HubSpot CRM: Create and search contacts, create deals in the sales pipeline.';
  },
};
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/lib/integrations/plugins/hubspot/
git commit -m "feat(integrations): add HubSpot plugin with manifest and full action implementations"
```

---

### Task 8: Create remaining P0 plugin manifests and stubs

For each of the remaining 9 P0 integrations, create a `manifest.json` and a stub `index.ts` that implements the interface but returns "not yet implemented" for `execute()`. This lets the marketplace UI display all integrations immediately while actions are implemented incrementally.

**Files:**

- Create: `src/lib/integrations/plugins/salesforce/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/pipedrive/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/google-calendar/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/calendly/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/stripe/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/telegram/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/whatsapp/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/email-smtp/{manifest.json,index.ts}`
- Create: `src/lib/integrations/plugins/google-sheets/{manifest.json,index.ts}`

- [ ] **Step 1: Create a `createStubPlugin` helper function**

Create `src/lib/integrations/plugins/_stub.ts`:

```typescript
import { IntegrationPlugin, PluginManifest, HealthResult, ExecutionResult } from '../core/types';

export function createStubPlugin(manifest: PluginManifest): IntegrationPlugin {
  return {
    manifest,

    async connect(credentials) {
      const result = await this.testConnection(credentials);
      return result.healthy ? { success: true } : { success: false, error: result.error };
    },

    async disconnect() {},

    async testConnection(credentials): Promise<HealthResult> {
      // Basic connectivity check — verify API key is non-empty
      const key = credentials.apiKey || credentials.token || Object.values(credentials)[0];
      if (!key) return { healthy: false, error: 'No credentials provided' };
      return { healthy: true, details: { note: 'Stub — real validation not yet implemented' } };
    },

    async healthCheck(credentials) {
      return this.testConnection(credentials);
    },

    async execute(action): Promise<ExecutionResult> {
      return { success: false, error: `Action "${action}" not yet implemented for ${manifest.name}` };
    },

    describeCapabilities() {
      return `${manifest.name}: ${manifest.actions.map((a) => a.name).join(', ')}`;
    },
  };
}
```

- [ ] **Step 2: Create manifest.json and index.ts for each P0 plugin**

Each index.ts imports its manifest and uses `createStubPlugin`:

```typescript
// Example: src/lib/integrations/plugins/salesforce/index.ts
import { createStubPlugin } from '../_stub';
import manifest from './manifest.json';
import type { PluginManifest } from '../../core/types';

export const salesforcePlugin = createStubPlugin(manifest as PluginManifest);
```

Create manifests with proper categories, actions, authFields, colors for:

- **Salesforce** (crm, #00A1E0): createLead, createOpportunity, searchAccounts
- **Pipedrive** (crm, #1E1E1E): createPerson, createDeal, searchPersons
- **Google Calendar** (calendar, #4285F4): getSlots, createEvent, cancelEvent
- **Calendly** (calendar, #006BFF): getEventTypes, getAvailability, createInvitee
- **Stripe** (payment, #635BFF): createPaymentLink, checkPayment, listProducts
- **Telegram** (notification, #26A5E4): sendMessage, sendPhoto
- **WhatsApp** (notification, #25D366): sendMessage, sendTemplate
- **Email (SMTP)** (notification, #EA4335): sendEmail
- **Google Sheets** (data, #0F9D58): appendRow, readRange, searchRows

- [ ] **Step 3: Register all plugins in PluginRegistry**

Create `src/lib/integrations/plugins/index.ts`:

```typescript
import { pluginRegistry } from '../core/PluginRegistry';
import { hubspotPlugin } from './hubspot';
import { salesforcePlugin } from './salesforce';
import { pipedrivePlugin } from './pipedrive';
import { googleCalendarPlugin } from './google-calendar';
import { calendlyPlugin } from './calendly';
import { stripePlugin } from './stripe';
import { telegramPlugin } from './telegram';
import { whatsappPlugin } from './whatsapp';
import { emailSmtpPlugin } from './email-smtp';
import { googleSheetsPlugin } from './google-sheets';

export function registerAllPlugins() {
  [
    hubspotPlugin,
    salesforcePlugin,
    pipedrivePlugin,
    googleCalendarPlugin,
    calendlyPlugin,
    stripePlugin,
    telegramPlugin,
    whatsappPlugin,
    emailSmtpPlugin,
    googleSheetsPlugin,
  ].forEach((plugin) => pluginRegistry.register(plugin));
}
```

- [ ] **Step 4: Verify all plugins compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrations/plugins/
git commit -m "feat(integrations): add P0 plugin manifests and stubs for 10 integrations"
```

---

## Chunk 3: API Routes

### Task 9: Create integration catalog API

**Files:**

- Create: `src/app/api/integrations/route.ts`

- [ ] **Step 1: Create GET /api/integrations (authenticated catalog)**

**IMPORTANT:** This route lives alongside the existing `src/app/api/integrations/sheets/` routes. Do NOT modify or delete the `sheets/` subdirectory.

```typescript
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  // pluginRegistry.getAllManifests() auto-loads plugins via ensureLoaded()
  const manifests = pluginRegistry.getAllManifests();
  return successResponse(manifests);
}
```

- [ ] **Step 2: Verify route works**

Run: `curl http://localhost:3000/api/integrations 2>/dev/null | jq '.data | length'`
Expected: `10`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/integrations/route.ts
git commit -m "feat(integrations): add GET /api/integrations catalog endpoint"
```

---

### Task 10: Create connections, connect, test, disconnect API routes

**Files:**

- Create: `src/app/api/integrations/connections/route.ts`
- Create: `src/app/api/integrations/connect/route.ts`
- Create: `src/app/api/integrations/test/route.ts`
- Create: `src/app/api/integrations/disconnect/route.ts`

- [ ] **Step 1: Create GET /api/integrations/connections**

Returns the current user's connected integrations with status, provider, connectedAt. Never returns decrypted credentials.

Auth: `verifyUser(request)` → filter by `auth.userId`.

- [ ] **Step 2: Create POST /api/integrations/connect**

Accepts `{ slug, credentials }`. Validates slug exists in registry. Calls `plugin.connect(credentials)`. On success, creates/updates Integration record with encrypted credentials. Status = 'connected'.

Auth: `verifyUser(request)` → `auth.userId`.
Security: All credential values encrypted via `encrypt()` before storage.
Rate limiting: Apply `applyRateLimit` (from `@/lib/auth`) — 10 requests/min/user. Return `Errors.tooManyRequests()` on limit exceeded.

- [ ] **Step 3: Create POST /api/integrations/test**

Accepts `{ slug, credentials }`. Calls `plugin.testConnection(credentials)`. Returns health result without storing anything.

Auth: `verifyUser(request)`.

- [ ] **Step 4: Create DELETE /api/integrations/disconnect**

Accepts `{ connectionId }`. Validates ownership (`userId` match). Sets status = 'disconnected', clears credentials. **Cascade deletes** related WidgetIntegration records.

Auth: `verifyUser(request)` → must own the connection.

Key implementation:

```typescript
// 1. Find connection and verify ownership
const connection = await Integration.findOne({ _id: connectionId, userId: auth.userId });
if (!connection) return Errors.notFound('Connection not found');

// 2. Update connection status
connection.status = 'disconnected';
connection.accessToken = undefined;
connection.refreshToken = undefined;
await connection.save();

// 3. Cascade delete all widget bindings for this connection
await WidgetIntegration.deleteMany({ userId: auth.userId, connectionId: connection._id });
```

- [ ] **Step 5: Verify all routes compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/integrations/connections/ src/app/api/integrations/connect/ src/app/api/integrations/test/ src/app/api/integrations/disconnect/
git commit -m "feat(integrations): add connect, connections, test, disconnect API routes"
```

---

### Task 11: Create execute, health, widget-attach, widget/:id API routes

**Files:**

- Create: `src/app/api/integrations/execute/route.ts`
- Create: `src/app/api/integrations/health/route.ts`
- Create: `src/app/api/integrations/widget-attach/route.ts`
- Create: `src/app/api/integrations/widget/[id]/route.ts`

- [ ] **Step 1: Create POST /api/integrations/execute**

Accepts `{ widgetId, slug, action, params }`. Delegates to `pluginRegistry.executeAction()` which validates the (widgetId, slug, action) triple.

Auth: `verifyUser(request)`.
Rate limiting: Apply `applyRateLimit` — 60 requests/min/user. Return `Errors.tooManyRequests()` on limit exceeded.

- [ ] **Step 2: Create GET /api/integrations/health**

Returns health status for all user's connections. Filter by `userId`.

- [ ] **Step 3: Create POST /api/integrations/widget-attach**

Accepts `{ widgetId, connectionId, actions, config }`. Creates WidgetIntegration record. Validates connectionId belongs to user.

Auth: `verifyUser(request)` → `userId` on the new record.

- [ ] **Step 4: Create GET /api/integrations/widget/[id]**

Returns all active integrations for a specific widget. Filter by `userId`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/integrations/execute/ src/app/api/integrations/health/ src/app/api/integrations/widget-attach/ src/app/api/integrations/widget/
git commit -m "feat(integrations): add execute, health, widget-attach, widget API routes"
```

---

## Chunk 4: Premium Marketplace UI

### Task 12: Create IntegrationCard component

**Files:**

- Create: `src/app/dashboard/integrations/components/IntegrationCard.tsx`

- [ ] **Step 1: Build IntegrationCard with 4 states**

The card supports 4 visual states: `available`, `connected`, `error`, `coming_soon`.

Design requirements (matching existing dashboard Apple-level quality):

- Gradient accent line at top (color from manifest category: CRM=blue, Calendar=violet, Payment=green, Notification=amber, Data=cyan)
- Provider icon placeholder (first letter with brand color background) — same pattern as existing page
- Category badge (colored pill)
- Status badge: Connected (green, pulsing dot), Error (red), Coming Soon (gray)
- Connected: show "Connected X days ago", "Used by N widgets"
- Error: show error text, "Fix" button (amber)
- Framer Motion `motion.div` with `staggerItem` variant
- Dark mode support with Tailwind dark classes

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/integrations/components/IntegrationCard.tsx
git commit -m "feat(integrations): add IntegrationCard component with 4 states"
```

---

### Task 13: Create ConnectionWizard component

**Files:**

- Create: `src/app/dashboard/integrations/components/ConnectionWizard.tsx`

- [ ] **Step 1: Build 4-step wizard modal**

Steps:

1. **Credentials** — Dynamic input fields from `authFields` manifest, visibility toggle on password fields. Buttons: [Cancel] [Test Connection →]
2. **Testing** — Calls `POST /api/integrations/test`. Shows animated sequential checks with checkmarks. Success shows details (e.g. "Found 1,247 contacts"). Failure shows error + [Retry].
3. **Available Actions** — Checkboxes for each action from manifest. All checked by default.
4. **Success** — Checkmark animation, "Connected!" message, [Open AI Builder] [Done] buttons.

Design: Use existing `Modal` component as base. Framer Motion `AnimatePresence` for step transitions. Progress bar at top showing steps 1-4.

On Step 4 completion: calls `POST /api/integrations/connect` with credentials, then reloads connections.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/integrations/components/ConnectionWizard.tsx
git commit -m "feat(integrations): add ConnectionWizard 4-step modal"
```

---

### Task 14: Create CategoryFilter component

**Files:**

- Create: `src/app/dashboard/integrations/components/CategoryFilter.tsx`

- [ ] **Step 1: Build category pill filter bar**

Categories: All, CRM, Calendar, Payments, Notifications, Data
Matching the pill filter pattern from My Chats and My Widgets pages.
Active pill has filled accent color, inactive pills are outlined.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/integrations/components/CategoryFilter.tsx
git commit -m "feat(integrations): add CategoryFilter pill component"
```

---

### Task 15: Rewrite Integrations page

**Files:**

- Modify: `src/app/dashboard/integrations/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the page with premium marketplace design**

Design requirements (consistent with Overview, Widgets, Chats, Billing, Settings pages):

**Header:**

- Syne font for "Integrations Marketplace" title
- Subtitle: "Connect your favorite tools to power your widgets"
- Search input (top right)

**Stat cards (3):**

- Connected (count, green gradient)
- Available (count, blue gradient)
- Errors (count, red gradient — only if > 0)
- Use StatCard pattern matching other pages (gradient accent, icon, AnimatedNumber)

**Category pills:**

- [All] [CRM] [Calendar] [Payments] [Notifications] [Data]

**Card grid:**

- 3 columns on desktop, 2 on tablet, 1 on mobile
- `staggerContainer` / `staggerItem` Framer Motion animation
- Connected integrations shown first, then available, then coming soon

**Data fetching:**

- `GET /api/integrations` for catalog manifests
- `GET /api/integrations/connections` for user's connections
- Merge: match connections to manifests by slug

**Integration with wizard:**

- Click "Connect" → opens ConnectionWizard
- Click "Disconnect" → calls `DELETE /api/integrations/disconnect`
- Click "Fix" (on error cards) → opens ConnectionWizard with re-connect flow

**Loading/empty states:**

- Skeleton cards while loading (matching other pages)
- Empty state if no search results

- [ ] **Step 2: Verify page renders**

Run: `npx next build 2>&1 | tail -20` (or check dev server at `/dashboard/integrations`)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/integrations/
git commit -m "feat(integrations): premium marketplace UI with cards, wizard, and category filters"
```

---

## Chunk 5: AI Builder Integration

### Task 16: Add integration tools to AI Builder

**Files:**

- Modify: `src/lib/builder/tools/integrationTools.ts` (**APPEND** to existing file — do NOT overwrite existing tools: `web_search`, `web_fetch`, `search_api_docs`, `write_integration`, `test_integration`, `guide_user`)
- Modify: `src/lib/builder/systemPrompt.ts` (add integration context block)

- [ ] **Step 1: APPEND 5 new tools to existing integrationTools.ts**

**CRITICAL:** The file `src/lib/builder/tools/integrationTools.ts` already exists and contains 6 production tools used by the AI Builder. Read the file first, then APPEND these 5 new tool definitions to the existing `tools` array:

1. `list_user_integrations` — returns connected manifests + status
2. `open_connection_wizard` — returns instruction for UI to open wizard modal
3. `attach_integration_to_widget` — creates WidgetIntegration record
4. `execute_integration_action` — calls pluginRegistry.executeAction with auth validation
5. `check_integration_health` — returns health status for a connection

Each tool function:

- Receives userId from builder session context
- Calls appropriate PluginRegistry / API methods
- Returns structured result for the AI to format as chat message

- [ ] **Step 2: Add integration context injection to systemPrompt.ts**

Modify `src/lib/builder/systemPrompt.ts` to add an integration context section:

- Import `pluginRegistry` from `@/lib/integrations/core/PluginRegistry`
- When building the system prompt, call `pluginRegistry.getConnectedManifests(userId)`
- Format connected integrations as a natural language context block appended to the prompt
- Include status and available actions for each connected integration
- For integrations with `status: 'error'`, include the `aiDiagnostic` field

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/tools/integrationTools.ts src/lib/builder/systemPrompt.ts
git commit -m "feat(integrations): add AI Builder integration tools and context injection"
```

---

## Chunk 6: SVG Icons + Final Polish

### Task 17: Add integration SVG icons

**Files:**

- Create: `public/integrations/*.svg` (10 SVG icons)

- [ ] **Step 1: Add SVG icons for all P0 integrations**

Create simple, clean SVG icons (or use brand-appropriate letter-based fallbacks) for:
hubspot.svg, salesforce.svg, pipedrive.svg, google-calendar.svg, calendly.svg, stripe.svg, telegram.svg, whatsapp.svg, email-smtp.svg, google-sheets.svg

- [ ] **Step 2: Commit**

```bash
git add public/integrations/
git commit -m "feat(integrations): add SVG icons for P0 integrations"
```

---

### Task 18: Create health check cron route

The HealthMonitor function exists but needs a cron trigger to actually run every 30 minutes. Follow the existing pattern from `src/app/api/cron/trial-check/route.ts`.

**Files:**

- Create: `src/app/api/cron/integration-health/route.ts`

- [ ] **Step 1: Create the cron route**

```typescript
import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkAllConnections } from '@/lib/integrations/core/HealthMonitor';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Errors.unauthorized('Invalid cron secret');
  }

  const result = await checkAllConnections();
  return successResponse(result, 'Health check complete');
}
```

- [ ] **Step 2: Add cron config (if using Vercel cron or similar scheduler)**

If deploying to Vercel, add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/integration-health", "schedule": "*/30 * * * *" }]
}
```

If deploying with Docker (as per CLAUDE.md), the cron can be triggered via an external scheduler (e.g., system cron calling `curl http://localhost:3000/api/cron/integration-health`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/integration-health/
git commit -m "feat(integrations): add cron route for health monitoring (every 30 min)"
```

---

### Task 19: Final integration test

- [ ] **Step 1: Verify full build passes**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Manual smoke test**

1. Open `/dashboard/integrations` — verify marketplace renders with all 10 cards
2. Click "Connect" on HubSpot — verify wizard opens with 4 steps
3. Enter test API key — verify test connection step works
4. Complete wizard — verify card shows "Connected" state
5. Refresh page — verify connection persists
6. Click "Disconnect" — verify card returns to available state

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: Integration Marketplace v1 — plugin architecture, marketplace UI, and AI Builder tools"
git push origin main
```
