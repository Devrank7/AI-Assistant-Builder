# Integration Codegen Framework — Design Spec

**Date:** 2026-03-19
**Status:** Approved (pending implementation plan)
**Goal:** Enable Gemini to add any API integration to any widget with near-zero errors, using deterministic code generation instead of AI-written code.

---

## Problem

Gemini can customize widgets (colors, components, config), but cannot reliably add API integrations. Current failure modes:

- Gemini writes full plugin code (~100 lines TypeScript) → hallucinations, wrong endpoints, missing error handling
- No standard pattern for widget ↔ server communication for integrations
- 9 of 10 marketplace plugins are stubs (only HubSpot implemented)
- No reusable UI components for integration UIs (buttons, forms, lists)

## Solution: "Gemini fills JSON, generator writes code"

Same philosophy as the widget builder: push complexity into deterministic scripts. Gemini makes decisions and fills configs. Generators produce validated, working code.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  User in builder: "Connect Calendly"            │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│  Gemini (orchestrator)                          │
│  1. web_search → reads API docs                 │
│  2. generate_integration → fills JSON config    │
│  3. generator → index.ts + manifest.json        │
│  4. modify_structure → ActionButton/DataForm    │
│  5. build_deploy → widget updated               │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│  Widget (Preact, Shadow DOM)                    │
│  ActionButton/DataForm/DataList/StatusCard       │
│  → ctx.executeIntegration(provider, action, p)  │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│  POST /api/integrations/execute                  │
│  → WidgetIntegration lookup → decrypt()          │
│  → plugin.execute(action, params, credentials)   │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│  External API (Calendly, Stripe, any REST)      │
└─────────────────────────────────────────────────┘
```

---

## Component 1: Integration Config Schema

### What Gemini fills:

File: `.claude/widget-builder/clients/<clientId>/integrations/<provider>/integration.config.json`

```json
{
  "provider": "calendly",
  "name": "Calendly",
  "category": "calendar",
  "color": "#006BFF",
  "baseUrl": "https://api.calendly.com",
  "auth": {
    "type": "bearer",
    "header": "Authorization",
    "prefix": "Bearer",
    "fields": [
      {
        "key": "apiKey",
        "label": "Personal Access Token",
        "type": "password",
        "required": true,
        "placeholder": "eyJhbG..."
      }
    ]
  },
  "actions": [
    {
      "id": "getEventTypes",
      "name": "Get Event Types",
      "description": "List available appointment types",
      "method": "GET",
      "path": "/event_types",
      "headers": {},
      "queryParams": { "user": "{{auth.userUri}}" },
      "responseMapping": {
        "root": "collection",
        "fields": { "id": "uri", "name": "name", "duration": "duration", "url": "scheduling_url" }
      }
    },
    {
      "id": "createBooking",
      "name": "Book Appointment",
      "description": "Schedule an appointment for a customer",
      "method": "POST",
      "path": "/scheduled_events",
      "body": {
        "event_type": "{{params.eventTypeId}}",
        "invitee": { "email": "{{params.email}}", "name": "{{params.name}}" }
      },
      "responseMapping": {
        "root": "resource",
        "fields": { "id": "uri", "status": "status", "startTime": "start_time" }
      }
    }
  ],
  "healthCheck": {
    "method": "GET",
    "path": "/users/me",
    "successField": "resource.uri"
  }
}
```

### Schema rules:

- `provider`: lowercase slug, no spaces
- `auth.type`: "bearer" | "api-key-header" | "api-key-query" | "basic" | "custom"
- `actions[].method`: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
- `{{params.X}}` — substituted from action call params at runtime
- `{{auth.X}}` — substituted from stored credentials metadata
- `responseMapping.root` — JSON path to the data array/object in response
- `responseMapping.fields` — maps our field names to API response field paths

---

## Component 2: Deterministic Generator

### Script: `scripts/generate-integration.js`

**Input:** `integration.config.json`

**Output (2 files):**

#### 1. `src/lib/integrations/plugins/<provider>/manifest.json`

Generated from config. Format matches existing marketplace manifests (slug, name, category, color, authFields, actions with inputSchema, healthEndpoint, status: "active").

#### 2. `src/lib/integrations/plugins/<provider>/index.ts`

Template-generated plugin implementing `IntegrationPlugin` interface:

```typescript
import { IntegrationPlugin, ConnectionResult, HealthResult, ExecutionResult } from '../../core/types';
import config from './integration.config.json';

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+\.\w+)\}\}/g, (_, path) => {
    const [scope, key] = path.split('.');
    return context[scope]?.[key] ?? '';
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function buildHeaders(credentials: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.auth.type === 'bearer') {
    headers[config.auth.header] = `${config.auth.prefix} ${credentials[config.auth.fields[0].key]}`;
  }
  return headers;
}

const plugin: IntegrationPlugin = {
  manifest: require('./manifest.json'),

  // Required by IntegrationPlugin interface: connect, disconnect, testConnection, healthCheck, execute, describeCapabilities

  async connect(credentials: Record<string, string>): Promise<ConnectionResult> {
    const health = await this.healthCheck(credentials);
    return { success: health.healthy, error: health.error, metadata: {} };
  },

  async disconnect(): Promise<void> {
    // Stateless REST — nothing to disconnect
  },

  async testConnection(credentials: Record<string, string>): Promise<HealthResult> {
    return this.healthCheck(credentials);
  },

  async healthCheck(credentials: Record<string, string>): Promise<HealthResult> {
    const hc = config.healthCheck;
    const url = config.baseUrl + hc.path;
    const headers = buildHeaders(credentials);
    const res = await fetch(url, { method: hc.method, headers });
    if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { healthy: !!getNestedValue(data, hc.successField) };
  },

  // Signature: execute(action, params, credentials) — matches IntegrationPlugin interface
  async execute(
    actionId: string,
    params: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<ExecutionResult> {
    const action = config.actions.find((a) => a.id === actionId);
    if (!action) return { success: false, error: `Unknown action: ${actionId}` };

    const context = { params, auth: credentials };
    let url = config.baseUrl + resolveTemplate(action.path, context);
    const headers = buildHeaders(credentials);
    const fetchOpts: RequestInit = { method: action.method, headers };

    if (action.body && (action.method === 'POST' || action.method === 'PUT' || action.method === 'PATCH')) {
      fetchOpts.body = JSON.stringify(JSON.parse(resolveTemplate(JSON.stringify(action.body), context)));
    }
    if (action.queryParams) {
      const qp = new URLSearchParams();
      for (const [k, v] of Object.entries(action.queryParams)) {
        qp.set(k, resolveTemplate(v as string, context));
      }
      url += '?' + qp.toString();
    }

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `${actionId} failed: HTTP ${res.status} — ${errText.slice(0, 200)}`,
        retryable: res.status >= 500,
      };
    }

    const data = await res.json();
    const root = action.responseMapping?.root ? getNestedValue(data, action.responseMapping.root) : data;

    if (action.responseMapping?.fields && root) {
      const mapItem = (item: any) => {
        const mapped: Record<string, any> = {};
        for (const [ourKey, apiKey] of Object.entries(action.responseMapping!.fields)) {
          mapped[ourKey] = getNestedValue(item, apiKey as string);
        }
        return mapped;
      };
      return { success: true, data: Array.isArray(root) ? root.map(mapItem) : mapItem(root) };
    }
    return { success: true, data: root || data };
  },

  describeCapabilities(): string {
    return config.actions.map((a) => `${a.id}: ${a.description || a.name}`).join('; ');
  },
};

export default plugin;
```

Same template for ALL REST APIs. Only the config differs. Implements all 6 methods of `IntegrationPlugin` interface.

#### 3. No new API routes needed — reuse existing `/api/integrations/execute`

The existing route at `src/app/api/integrations/execute/route.ts` (already in codebase, not generated) handles the full flow:

1. Accepts `{ widgetId, provider, action, params }` in POST body
2. Looks up `WidgetIntegration` binding (widgetId + provider)
3. Finds the `Integration` document (userId + provider)
4. Decrypts `connection.accessToken` via `decrypt()`
5. Calls `registry.executeAction(provider, action, credentials, params)`

The generated plugin is automatically available through this route once registered in `PluginRegistry` via `registerAllPlugins()`.

**No per-provider route generation.** This eliminates route path conflicts and keeps all integration traffic through a single, tested endpoint. The `useIntegration` hook (Component 4) calls this existing endpoint.

### Overwrite policy for existing plugins:

The generator MUST check whether a plugin already exists before writing:

1. **Stub plugins** (uses `createStubPlugin()` pattern): Safe to overwrite. The generator replaces the stub with a full implementation. Detection: check if `index.ts` imports `_stub` or calls `createStubPlugin`.
2. **Fully implemented plugins** (e.g., HubSpot): NEVER overwrite. The generator aborts with error `"Plugin '<provider>' already has a full implementation. Use modify_component to edit it."`.
3. **Previously generated plugins** (has `integration.config.json` sibling): Overwrite allowed — user is regenerating from updated config.

After generating a new plugin, the generator MUST update the barrel file `src/lib/integrations/plugins/index.ts`:

- Add import for the new plugin
- Add it to the `registerAllPlugins()` array
- This is deterministic string manipulation (find array, append entry), not AI

### For non-standard APIs (OAuth2, GraphQL, WebSocket):

Generator produces a skeleton `index.ts` with TODO comments. Gemini fills in the custom logic using `modify_component`-style AI editing (sees only the 50-80 line skeleton, not the whole codebase). Validator checks: exports IntegrationPlugin, has healthCheck, has execute.

---

## Component 3: Widget UI Component Templates

5 pre-built Preact components in `.claude/widget-builder/src/components/templates/`:

### ActionButton.jsx

- Renders a styled button with icon
- On click: `ctx.executeIntegration(props.provider, props.action, props.params)`
- Shows loading spinner during API call
- Shows success/error feedback
- Props: `label`, `icon`, `provider`, `action`, `params`, `style` ("primary" | "secondary" | "outline")

### DataForm.jsx

- Renders dynamic form from `props.fields[]` definition
- Field types: text, email, tel, date, time, select, textarea, number
- Validation: required, email format, min/max
- On submit: `ctx.executeIntegration(props.submitAction.provider, props.submitAction.action, formData)`
- Shows `props.successMessage` on success
- Props: `fields[]`, `submitAction`, `successMessage`, `submitLabel`

### DataList.jsx

- On mount: fetches data via `ctx.executeIntegration(props.provider, props.action, props.params)`
- Renders scrollable list of items
- Each item shows `props.displayFields[]`
- Optional: `props.onSelectAction` — clicking item triggers another integration action or sends chat message
- Props: `provider`, `action`, `params`, `displayFields[]`, `onSelectAction`, `emptyMessage`

### StatusCard.jsx

- Fetches and displays single data point (order status, balance, etc.)
- Optional auto-refresh via `props.refreshInterval`
- Props: `provider`, `action`, `params`, `displayFields[]`, `refreshInterval`, `title`

### ExternalLink.jsx

- Simple styled link/button that opens external URL
- Props: `url`, `label`, `icon`, `openIn` ("popup" | "tab" | "iframe")

### Integration into WidgetShell:

These are registered in `COMPONENT_MAP` alongside existing components. Template components are keyed by their **template name** (lowercase), not by instance ID:

```javascript
const COMPONENT_MAP = {
  // Existing (keyed by comp.id)
  header: Header, messageList: MessageList, inputArea: InputArea, ...
  // Integration templates (keyed by comp.template)
  actionButton: ActionButton,
  dataForm: DataForm,
  dataList: DataList,
  statusCard: StatusCard,
  externalLink: ExternalLink,
};
```

**Component lookup strategy** in `renderSlot()`:

1. First try `COMPONENT_MAP[comp.id]` — works for built-in components (header, inputArea, etc.)
2. If not found, try `COMPONENT_MAP[comp.template]` — works for template instances (multiple ActionButtons with different IDs)
3. If neither found, skip the component silently

```javascript
// Updated renderSlot logic:
const Comp = COMPONENT_MAP[comp.id] || COMPONENT_MAP[comp.template];
if (!Comp) return null;
return <Comp key={comp.id} ctx={{ ...ctx, ...comp.props }} />;
```

This allows multiple instances of the same template (e.g., "calendlyBooking" and "stripeCheckout" both using ActionButton template) without COMPONENT_MAP conflicts. Each instance has a unique `comp.id` but shares the same `comp.template`.

Gemini adds them via `modify_structure`:

```json
{
  "op": "add_widget_component",
  "componentId": "stripeCheckout",
  "template": "actionButton",
  "slot": "panel-footer",
  "props": { "label": "Pay Now", "provider": "stripe", "action": "createCheckout" }
}
```

---

## Component 4: useIntegration Hook

New shared hook: `.claude/widget-builder/src/hooks/useIntegration.js`

Lives alongside existing hooks (`useChat.js`, `useVoice.js`, `useDrag.js`, etc.) in the shared hooks directory. Never placed in per-client directories (per CLAUDE.md rule: shared hooks are never overwritten by per-client builds).

```javascript
import { useCallback } from 'preact/hooks';

export default function useIntegration(config) {
  const apiBase = (typeof window !== 'undefined' && window.__WIDGET_API_BASE__) || '';
  const widgetId = config?.clientId;

  const execute = useCallback(
    async (provider, action, params = {}) => {
      if (!widgetId || !provider || !action) {
        throw new Error('Missing integration params');
      }
      // Calls EXISTING /api/integrations/execute endpoint
      // which handles: WidgetIntegration lookup → Integration.findOne → decrypt(accessToken) → plugin.execute()
      // Note: route expects `slug` field (not `provider`) to match PluginRegistry convention
      const res = await fetch(`${apiBase}/api/integrations/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ widgetId, slug: provider, action, params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Integration error: ${res.status}`);
      return data.data;
    },
    [apiBase, widgetId]
  );

  return { execute };
}
```

**Auth strategy for widget → API calls:**

The existing `/api/integrations/execute` route calls `verifyUser(request)` which requires an authenticated session. Widget-side fetch uses `credentials: 'include'` to send same-origin cookies. For cross-origin widget embeds (third-party sites), the execute route needs a secondary auth path:

- Accept a `widgetToken` header — a short-lived token generated during widget init via `POST /api/widget-auth` using `clientId` + domain validation
- If `verifyUser()` fails (no session cookie), fall back to `widgetToken` verification
- This allows the execute route to serve both the admin dashboard (cookie auth) and embedded widgets (token auth)

Added to WidgetShell ctx:

```javascript
const { execute: executeIntegration } = useIntegration(config);
// Added to ctx object:
const ctx = { ...existingCtx, executeIntegration };
```

---

## Component 5: Gemini Integration Guide

New file: `src/lib/builder/geminiIntegrationGuide.ts`

~200 lines containing:

1. **Decision tree** — which tool to call based on user request
2. **Plugin catalog** — auto-generated from existing manifests (provider, status, actions)
3. **integration.config.json schema** — full JSON schema with descriptions and examples
4. **UI component catalog** — 5 templates with props reference and usage examples
5. **3 end-to-end examples:**
   - Known plugin (HubSpot — already active, just attach + add UI)
   - Stub plugin (Calendly — fill config, generate, attach + add UI)
   - Unknown API (LiqPay — web_search, fill config, generate, attach + add UI)
6. **Rules:**
   - NEVER write index.ts manually for standard REST APIs
   - ALWAYS web_search before working with unknown APIs
   - ALWAYS show progress via ctx.write
   - ALWAYS test integration after creation
   - For UI — always check if template component fits before using add_component

Injected into system prompt ONLY when Gemini is working with integrations (not during normal chat).

---

## Component 6: New Gemini Tool — `generate_integration`

Added to `integrationTools.ts`:

```
name: 'generate_integration'
description: 'Generate a complete integration plugin from a config JSON. Creates manifest and plugin code. For standard REST APIs — fill the config, DO NOT write code manually.'
parameters:
  - clientId: string
  - config: string (JSON of integration.config.json)
```

Execution flow:

1. Validate config JSON against schema
2. Save to `.claude/widget-builder/clients/<clientId>/integrations/<provider>/integration.config.json`
3. Run `node scripts/generate-integration.js <provider>`
4. Register plugin in PluginRegistry
5. Run healthCheck if credentials exist
6. ctx.write progress at each step
7. Return { success, provider, actions[], manifestPath }

---

## Component 7: Updated modify_structure — `add_widget_component` operation

New operation type in modify_structure tool:

```json
{
  "op": "add_widget_component",
  "componentId": "calendlyBooking",
  "template": "ActionButton",
  "slot": "panel-footer",
  "props": {
    "label": "Book Appointment",
    "icon": "Calendar",
    "provider": "calendly",
    "action": "createBooking",
    "style": "primary"
  }
}
```

This adds to widget.structure.json `components[]`:

```json
{
  "id": "calendlyBooking",
  "template": "actionButton",
  "file": "ActionButton.jsx",
  "slot": "panel-footer",
  "enabled": true,
  "props": {
    "label": "Book Appointment",
    "icon": "Calendar",
    "provider": "calendly",
    "action": "createBooking",
    "style": "primary"
  }
}
```

Then triggers build + deploy automatically.

---

## Integration Templates Library

For popular APIs, pre-filled `integration.config.json` templates stored in `.claude/widget-builder/integration-templates/`:

```
integration-templates/
├── calendly.json
├── stripe.json
├── liqpay.json
├── hubspot.json    (reference — already fully implemented)
├── google-sheets.json
├── telegram-bot.json
├── sendgrid.json
├── monobank.json
└── bitrix24.json
```

Gemini can use these directly: copy template → adjust for client → `generate_integration`. No web_search needed for templated providers.

For unknown APIs: Gemini does web_search → web_fetch → fills config from scratch.

---

## Error Budget

| Scenario                             | Gemini writes                       | Error rate |
| ------------------------------------ | ----------------------------------- | ---------- |
| Toggle integration UI on/off         | JSON only (modify_structure)        | ~0%        |
| Add template UI component            | JSON only (modify_structure)        | ~0%        |
| Generate plugin from template        | JSON only (integration.config.json) | ~2%        |
| Generate plugin from unknown API     | JSON config after web_search        | ~5-10%     |
| Custom UI component (add_component)  | JSX (50-80 lines)                   | ~10-15%    |
| Custom plugin logic (OAuth2/GraphQL) | TypeScript (50-80 lines)            | ~10-15%    |

**80% of integrations require zero AI-generated code.**

---

## Files to Create

| File                                                 | Type        | Purpose                                                                                                                                               |
| ---------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/generate-integration.js`                    | Script      | Deterministic generator (config → plugin + manifest)                                                                                                  |
| `.claude/widget-builder/src/hooks/useIntegration.js` | Hook        | Widget ↔ server bridge (calls existing `/api/integrations/execute`)                                                                                   |
| `src/components/templates/ActionButton.jsx`          | Component   | Button that triggers integration action                                                                                                               |
| `src/components/templates/DataForm.jsx`              | Component   | Dynamic form that submits to integration                                                                                                              |
| `src/components/templates/DataList.jsx`              | Component   | List that fetches from integration                                                                                                                    |
| `src/components/templates/StatusCard.jsx`            | Component   | Status display from integration                                                                                                                       |
| `src/components/templates/ExternalLink.jsx`          | Component   | Link to external service                                                                                                                              |
| `src/lib/builder/geminiIntegrationGuide.ts`          | Guide       | Gemini reference for integration work                                                                                                                 |
| ~~`src/lib/integrations/credentials.ts`~~            | ~~Utility~~ | **Not needed** — existing `/api/integrations/execute` route handles credential lookup via `Integration.findOne()` + `decrypt(connection.accessToken)` |
| `integration-templates/*.json`                       | Templates   | Pre-filled configs for popular APIs                                                                                                                   |

## Files to Modify

| File                                                      | Change                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/builder/tools/integrationTools.ts`               | Add `generate_integration` tool                                |
| `src/lib/builder/tools/coreTools.ts`                      | Add `add_widget_component` op to modify_structure              |
| `src/lib/builder/systemPrompt.ts`                         | Update tool routing for integrations                           |
| `src/lib/builder/codegenPrompt.ts`                        | Inject integration guide when relevant                         |
| `.claude/widget-builder/src/components/WidgetShell.jsx`   | Add useIntegration hook + template components to COMPONENT_MAP |
| `.claude/widget-builder/scripts/generate-single-theme.js` | Add template components to generated WidgetShell               |
| `.claude/widget-builder/vite.config.js`                   | No changes needed (templates bundled normally)                 |

---

## Verification Plan

1. **Generator test:** Create integration.config.json for Calendly → run generate-integration.js → verify manifest.json and index.ts are valid
2. **Template component test:** Add ActionButton via modify_structure → build → verify button renders in widget
3. **End-to-end test:** "Connect HubSpot" flow → attach → add DataForm → submit form → verify contact created
4. **Unknown API test:** Use web_search for a random API → generate_integration → verify plugin works
5. **Regression:** All existing widgets still build and work (no breaking changes to WidgetShell, hooks, or build pipeline)
