# Integration Codegen Framework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Gemini to add any REST API integration to any widget with near-zero errors by filling JSON configs that feed deterministic code generators.

**Architecture:** Gemini fills `integration.config.json` → `generate-integration.js` produces `manifest.json` + `index.ts` plugin → existing `/api/integrations/execute` route handles runtime calls → widget uses `useIntegration` hook + 5 template UI components.

**Tech Stack:** Node.js (generator script), TypeScript (plugins), Preact/JSX (widget components), Mongoose (credentials storage), AES-256-GCM (encryption).

**Spec:** `docs/superpowers/specs/2026-03-19-integration-codegen-framework-design.md`

---

## File Map

### New Files

| File                                                               | Responsibility                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `.claude/widget-builder/scripts/generate-integration.js`           | Deterministic generator: config JSON → manifest.json + index.ts |
| `.claude/widget-builder/scripts/integration-config-schema.js`      | JSON schema validator for integration.config.json               |
| `.claude/widget-builder/src/hooks/useIntegration.js`               | Widget hook: calls `/api/integrations/execute`                  |
| `.claude/widget-builder/src/components/templates/ActionButton.jsx` | Button that triggers integration action                         |
| `.claude/widget-builder/src/components/templates/DataForm.jsx`     | Dynamic form → integration submit                               |
| `.claude/widget-builder/src/components/templates/DataList.jsx`     | List fetched from integration                                   |
| `.claude/widget-builder/src/components/templates/StatusCard.jsx`   | Single data point display                                       |
| `.claude/widget-builder/src/components/templates/ExternalLink.jsx` | Styled external link                                            |
| `src/lib/builder/geminiIntegrationGuide.ts`                        | Gemini reference doc for integration work                       |
| `.claude/widget-builder/integration-templates/calendly.json`       | Pre-filled config for Calendly                                  |
| `.claude/widget-builder/integration-templates/google-sheets.json`  | Pre-filled config for Google Sheets                             |
| `.claude/widget-builder/integration-templates/telegram-bot.json`   | Pre-filled config for Telegram Bot                              |

### Modified Files

| File                                                                  | Change                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/builder/tools/coreTools.ts:924-1038`                         | Add `add_widget_component` op to modify_structure                        |
| `src/lib/builder/tools/integrationTools.ts`                           | Add `generate_integration` tool                                          |
| `src/lib/builder/systemPrompt.ts`                                     | Update tool routing for integrations                                     |
| `src/lib/builder/codegenPrompt.ts`                                    | Inject integration guide when relevant                                   |
| `.claude/widget-builder/src/components/WidgetShell.jsx:41-51,340-345` | Add template imports, useIntegration, update renderSlot                  |
| `.claude/widget-builder/scripts/generate-single-theme.js`             | Add template component imports + useIntegration to generated WidgetShell |
| `src/lib/integrations/plugins/index.ts`                               | (Updated by generator at runtime — no manual change)                     |

---

## Task 1: Integration Config Schema Validator

**Files:**

- Create: `.claude/widget-builder/scripts/integration-config-schema.js`

This validator is used by both the generator script and the `generate_integration` Gemini tool to reject bad configs before any code is produced.

- [ ] **Step 1: Create schema validator**

```javascript
// .claude/widget-builder/scripts/integration-config-schema.js
'use strict';

const VALID_AUTH_TYPES = ['bearer', 'api-key-header', 'api-key-query', 'basic', 'custom'];
const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function validateIntegrationConfig(config) {
  const errors = [];

  // Required top-level fields
  if (!config.provider || typeof config.provider !== 'string')
    errors.push('provider: required string (lowercase slug)');
  if (config.provider && !/^[a-z][a-z0-9-]*$/.test(config.provider))
    errors.push('provider: must be lowercase slug (a-z, 0-9, hyphens)');
  if (!config.name || typeof config.name !== 'string') errors.push('name: required string');
  if (!config.baseUrl || typeof config.baseUrl !== 'string') errors.push('baseUrl: required string');
  if (config.baseUrl && !config.baseUrl.startsWith('https://')) errors.push('baseUrl: must start with https://');

  // Auth
  if (!config.auth || typeof config.auth !== 'object') {
    errors.push('auth: required object');
  } else {
    if (!VALID_AUTH_TYPES.includes(config.auth.type))
      errors.push(`auth.type: must be one of ${VALID_AUTH_TYPES.join(', ')}`);
    if (!Array.isArray(config.auth.fields) || config.auth.fields.length === 0)
      errors.push('auth.fields: required non-empty array');
    if (config.auth.fields) {
      config.auth.fields.forEach((f, i) => {
        if (!f.key) errors.push(`auth.fields[${i}].key: required`);
        if (!f.label) errors.push(`auth.fields[${i}].label: required`);
      });
    }
  }

  // Actions
  if (!Array.isArray(config.actions) || config.actions.length === 0) {
    errors.push('actions: required non-empty array');
  } else {
    config.actions.forEach((a, i) => {
      if (!a.id || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(a.id)) errors.push(`actions[${i}].id: required camelCase string`);
      if (!a.name) errors.push(`actions[${i}].name: required string`);
      if (!VALID_METHODS.includes(a.method))
        errors.push(`actions[${i}].method: must be one of ${VALID_METHODS.join(', ')}`);
      if (!a.path || !a.path.startsWith('/')) errors.push(`actions[${i}].path: must start with /`);
    });
  }

  // HealthCheck
  if (!config.healthCheck || typeof config.healthCheck !== 'object') {
    errors.push('healthCheck: required object');
  } else {
    if (!VALID_METHODS.includes(config.healthCheck.method))
      errors.push('healthCheck.method: required valid HTTP method');
    if (!config.healthCheck.path) errors.push('healthCheck.path: required');
    if (!config.healthCheck.successField) errors.push('healthCheck.successField: required');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateIntegrationConfig };
```

- [ ] **Step 2: Verify validator works**

Run: `node -e "const {validateIntegrationConfig} = require('./.claude/widget-builder/scripts/integration-config-schema.js'); console.log(JSON.stringify(validateIntegrationConfig({}), null, 2));"`

Expected: `{ "valid": false, "errors": ["provider: required string...", ...] }`

- [ ] **Step 3: Verify with valid config**

Run: `node -e "const {validateIntegrationConfig} = require('./.claude/widget-builder/scripts/integration-config-schema.js'); const c = {provider:'test',name:'Test',baseUrl:'https://api.test.com',category:'crm',auth:{type:'bearer',header:'Authorization',prefix:'Bearer',fields:[{key:'apiKey',label:'API Key',type:'password',required:true}]},actions:[{id:'getItems',name:'Get Items',method:'GET',path:'/items'}],healthCheck:{method:'GET',path:'/me',successField:'id'}}; console.log(JSON.stringify(validateIntegrationConfig(c), null, 2));"`

Expected: `{ "valid": true, "errors": [] }`

- [ ] **Step 4: Commit**

```bash
git add .claude/widget-builder/scripts/integration-config-schema.js
git commit -m "feat: add integration config JSON schema validator"
```

---

## Task 2: Deterministic Generator Script

**Files:**

- Create: `.claude/widget-builder/scripts/generate-integration.js`
- Read: `src/lib/integrations/plugins/_stub.ts` (stub detection pattern)
- Read: `src/lib/integrations/plugins/index.ts` (barrel file pattern)
- Read: `src/lib/integrations/plugins/hubspot/manifest.json` (manifest format)

- [ ] **Step 1: Create generator script**

```javascript
// .claude/widget-builder/scripts/generate-integration.js
'use strict';

const fs = require('fs');
const path = require('path');
const { validateIntegrationConfig } = require('./integration-config-schema');

const PLUGINS_DIR = path.resolve(__dirname, '../../../src/lib/integrations/plugins');
const BARREL_FILE = path.join(PLUGINS_DIR, 'index.ts');

function generateManifest(config) {
  return {
    slug: config.provider,
    name: config.name,
    category: config.category || 'data',
    description: config.description || `${config.name} integration`,
    icon: `/integrations/${config.provider}.svg`,
    color: config.color || '#6366f1',
    authFields: config.auth.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type || 'password',
      required: f.required !== false,
      placeholder: f.placeholder || '',
    })),
    actions: config.actions.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description || a.name,
      inputSchema: a.body
        ? Object.fromEntries(
            JSON.stringify(a.body)
              .match(/\{\{params\.(\w+)\}\}/g)
              ?.map((m) => {
                const key = m.match(/params\.(\w+)/)[1];
                return [key, 'string'];
              }) || []
          )
        : {},
    })),
    healthEndpoint: config.healthCheck.path,
    docsUrl: config.docsUrl || '',
    status: 'active',
  };
}

function generatePluginTS(config) {
  const providerCamel = config.provider.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return `import { IntegrationPlugin, ConnectionResult, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

// Auto-generated from integration.config.json — DO NOT EDIT MANUALLY
// To update: modify integration.config.json and re-run generate-integration.js

const config = ${JSON.stringify(config, null, 2)} as const;

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\\{\\{(\\w+\\.\\w+)\\}\\}/g, (_, p) => {
    const [scope, key] = p.split('.');
    return context[scope]?.[key] ?? '';
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function buildHeaders(credentials: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authType = config.auth.type;
  const credKey = config.auth.fields[0].key;

  if (authType === 'bearer') {
    headers[config.auth.header || 'Authorization'] = \`\${config.auth.prefix || 'Bearer'} \${credentials[credKey]}\`;
  } else if (authType === 'api-key-header') {
    headers[config.auth.header || 'X-API-Key'] = credentials[credKey];
  } else if (authType === 'basic') {
    const user = credentials.username || '';
    const pass = credentials.password || credentials[credKey] || '';
    headers['Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
  }
  return headers;
}

// Named export — matches existing convention (calendlyPlugin, hubspotPlugin, etc.)
// providerCamel is computed from config.provider: "calendly" → "calendly", "telegram-bot" → "telegramBot"
export const \${providerCamel}Plugin: IntegrationPlugin = {
  manifest,

  async connect(credentials: Record<string, string>): Promise<ConnectionResult> {
    const health = await this.healthCheck(credentials);
    return { success: health.healthy, error: health.error, metadata: {} };
  },

  async disconnect(): Promise<void> {},

  async testConnection(credentials: Record<string, string>): Promise<HealthResult> {
    return this.healthCheck(credentials);
  },

  async healthCheck(credentials: Record<string, string>): Promise<HealthResult> {
    try {
      // Apply template resolution to healthCheck path (e.g., Telegram: /bot{{auth.botToken}}/getMe)
      const hcPath = resolveTemplate(config.healthCheck.path, { auth: credentials, params: {} });
      const url = config.baseUrl + hcPath;
      const headers = buildHeaders(credentials);
      const res = await fetch(url, { method: config.healthCheck.method, headers });
      if (!res.ok) return { healthy: false, error: \`HTTP \${res.status}\` };
      const data = await res.json();
      return { healthy: !!getNestedValue(data, config.healthCheck.successField) };
    } catch (err) {
      return { healthy: false, error: (err as Error).message };
    }
  },

  async execute(action: string, params: Record<string, unknown>, credentials: Record<string, string>): Promise<ExecutionResult> {
    const actionDef = config.actions.find(a => a.id === action);
    if (!actionDef) return { success: false, error: \`Unknown action: \${action}\` };

    try {
      const context = { params, auth: credentials };
      let url = config.baseUrl + resolveTemplate(actionDef.path, context);
      const headers = buildHeaders(credentials);
      const fetchOpts: RequestInit = { method: actionDef.method, headers };

      if ((actionDef as any).body && ['POST', 'PUT', 'PATCH'].includes(actionDef.method)) {
        fetchOpts.body = JSON.stringify(
          JSON.parse(resolveTemplate(JSON.stringify((actionDef as any).body), context))
        );
      }
      if ((actionDef as any).queryParams) {
        const qp = new URLSearchParams();
        for (const [k, v] of Object.entries((actionDef as any).queryParams)) {
          qp.set(k, resolveTemplate(v as string, context));
        }
        url += '?' + qp.toString();
      }

      const res = await fetch(url, fetchOpts);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, error: \`\${action} failed: HTTP \${res.status} — \${errText.slice(0, 200)}\`, retryable: res.status >= 500 };
      }

      const data = await res.json();
      const mapping = (actionDef as any).responseMapping;
      const root = mapping?.root ? getNestedValue(data, mapping.root) : data;

      if (mapping?.fields && root) {
        const mapItem = (item: any) => {
          const mapped: Record<string, any> = {};
          for (const [ourKey, apiKey] of Object.entries(mapping.fields)) {
            mapped[ourKey] = getNestedValue(item, apiKey as string);
          }
          return mapped;
        };
        return { success: true, data: Array.isArray(root) ? root.map(mapItem) : mapItem(root) };
      }
      return { success: true, data: root || data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  describeCapabilities(): string {
    return config.actions.map(a => \`\${a.id}: \${a.description || a.name}\`).join('; ');
  },
};

// No default export — barrel file uses named import: import { ${providerCamel}Plugin } from './${provider}';
`;
}

function isStubPlugin(pluginDir) {
  const indexPath = path.join(pluginDir, 'index.ts');
  if (!fs.existsSync(indexPath)) return true;
  const content = fs.readFileSync(indexPath, 'utf-8');
  return content.includes('createStubPlugin') || content.includes('_stub');
}

function hasConfigSibling(pluginDir) {
  return fs.existsSync(path.join(pluginDir, 'integration.config.json'));
}

function updateBarrelFile(provider) {
  let barrel = fs.readFileSync(BARREL_FILE, 'utf-8');

  // Check if already imported
  const importName = provider.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Plugin';
  if (barrel.includes(importName)) {
    console.log(`  ✓ ${importName} already in barrel file`);
    return;
  }

  // Add named import after last import line (matches existing convention)
  const importLines = barrel.split('\n').filter((l) => l.startsWith('import'));
  const lastImport = importLines[importLines.length - 1];
  const newImport = `import { ${importName} } from './${provider}';`;
  barrel = barrel.replace(lastImport, lastImport + '\n' + newImport);

  // Add to register array — find the array inside registerAllPlugins
  // Pattern: existing plugins are in an array that gets .forEach
  const arrayMatch = barrel.match(/\[([^\]]+)\]/s);
  if (arrayMatch) {
    const existingArray = arrayMatch[1].trim();
    const newArray = existingArray + `,\n     ${importName}`;
    barrel = barrel.replace(arrayMatch[1], newArray);
  }

  fs.writeFileSync(BARREL_FILE, barrel);
  console.log(`  ✓ Added ${importName} to barrel file`);
}

// --- Main ---
function generate(configPath) {
  console.log(`\nGenerating integration from: ${configPath}`);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Validate
  const validation = validateIntegrationConfig(config);
  if (!validation.valid) {
    console.error('❌ Invalid config:');
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const provider = config.provider;
  const pluginDir = path.join(PLUGINS_DIR, provider);

  // Overwrite policy
  if (fs.existsSync(pluginDir)) {
    if (!isStubPlugin(pluginDir) && !hasConfigSibling(pluginDir)) {
      console.error(`❌ Plugin "${provider}" already has a full implementation. Use modify_component to edit it.`);
      process.exit(1);
    }
    console.log(`  ⚠️ Overwriting ${isStubPlugin(pluginDir) ? 'stub' : 'generated'} plugin for "${provider}"`);
  }

  // Create plugin directory
  fs.mkdirSync(pluginDir, { recursive: true });

  // 1. Write manifest.json
  const manifest = generateManifest(config);
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Generated manifest.json`);

  // 2. Write index.ts
  const pluginCode = generatePluginTS(config);
  fs.writeFileSync(path.join(pluginDir, 'index.ts'), pluginCode);
  console.log(`  ✓ Generated index.ts (${pluginCode.split('\n').length} lines)`);

  // 3. Copy config for reference
  fs.writeFileSync(path.join(pluginDir, 'integration.config.json'), JSON.stringify(config, null, 2));
  console.log(`  ✓ Saved integration.config.json`);

  // 4. Update barrel file
  updateBarrelFile(provider);

  console.log(`\n✅ Integration "${provider}" generated successfully!`);
  console.log(`   Plugin: ${pluginDir}/index.ts`);
  console.log(`   Manifest: ${pluginDir}/manifest.json`);
  return { provider, pluginDir, manifest };
}

// CLI usage: node generate-integration.js <configPath>
if (require.main === module) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: node generate-integration.js <path-to-integration.config.json>');
    process.exit(1);
  }
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  generate(resolved);
}

module.exports = { generate, generateManifest, generatePluginTS, isStubPlugin };
```

- [ ] **Step 2: Create a test config for Calendly**

Create `.claude/widget-builder/integration-templates/calendly.json` with the Calendly API config from the spec. This doubles as both the first template and the test fixture.

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

- [ ] **Step 3: Run generator on Calendly config**

Run: `node .claude/widget-builder/scripts/generate-integration.js .claude/widget-builder/integration-templates/calendly.json`

Expected output:

```
Generating integration from: ...calendly.json
  ⚠️ Overwriting stub plugin for "calendly"
  ✓ Generated manifest.json
  ✓ Generated index.ts (XX lines)
  ✓ Saved integration.config.json
  ✓ calendlyPlugin already in barrel file

✅ Integration "calendly" generated successfully!
```

- [ ] **Step 4: Verify generated files are valid TypeScript**

Run: `npx tsc --noEmit src/lib/integrations/plugins/calendly/index.ts 2>&1 | head -20`

If there are type errors, fix the `generatePluginTS` template. Common issues: missing type assertions for `config` const, `responseMapping` optional chaining.

- [ ] **Step 5: Verify manifest matches existing format**

Run: `node -e "const m = require('./src/lib/integrations/plugins/calendly/manifest.json'); const h = require('./src/lib/integrations/plugins/hubspot/manifest.json'); console.log('Generated keys:', Object.keys(m).sort().join(',')); console.log('HubSpot keys:', Object.keys(h).sort().join(','));"`

Expected: both have same keys (actions, authFields, category, color, description, docsUrl, healthEndpoint, icon, name, slug, status)

- [ ] **Step 6: Commit**

```bash
git add .claude/widget-builder/scripts/generate-integration.js .claude/widget-builder/integration-templates/calendly.json
git commit -m "feat: add deterministic integration generator script"
```

---

## Task 3: useIntegration Hook

**Files:**

- Create: `.claude/widget-builder/src/hooks/useIntegration.js`

- [ ] **Step 1: Create the hook**

```javascript
// .claude/widget-builder/src/hooks/useIntegration.js
// Note: use 'react' (not 'preact/hooks') — matches useChat, useDrag, useVoice convention
// Build aliases 'react' → 'preact/compat'
import { useCallback } from 'react';

export default function useIntegration(config) {
  const apiBase = (typeof window !== 'undefined' && window.__WIDGET_API_BASE__) || '';
  const widgetId = config?.clientId;

  const execute = useCallback(
    async (provider, action, params = {}) => {
      if (!widgetId || !provider || !action) {
        throw new Error('Missing integration params: widgetId, provider, and action are required');
      }

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

- [ ] **Step 2: Verify import works in Preact context**

Run: `node -e "const fs = require('fs'); const code = fs.readFileSync('.claude/widget-builder/src/hooks/useIntegration.js', 'utf-8'); console.log('Lines:', code.split('\\n').length); console.log('Has useCallback:', code.includes('useCallback')); console.log('Has slug:', code.includes('slug: provider'));"`

Expected: Lines: ~22, Has useCallback: true, Has slug: true

- [ ] **Step 3: Commit**

```bash
git add .claude/widget-builder/src/hooks/useIntegration.js
git commit -m "feat: add useIntegration widget hook"
```

---

## Task 4: Template UI Components

**Files:**

- Create: `.claude/widget-builder/src/components/templates/ActionButton.jsx`
- Create: `.claude/widget-builder/src/components/templates/DataForm.jsx`
- Create: `.claude/widget-builder/src/components/templates/DataList.jsx`
- Create: `.claude/widget-builder/src/components/templates/StatusCard.jsx`
- Create: `.claude/widget-builder/src/components/templates/ExternalLink.jsx`

All components receive `{ ctx }` prop (same pattern as InputArea, Header, etc.) and use CSS variable classes (`bg-aw-*`, `text-aw-*`) for consistent theming.

- [ ] **Step 1: Create ActionButton.jsx**

```jsx
// .claude/widget-builder/src/components/templates/ActionButton.jsx
import { useState } from 'react';

export default function ActionButton({ ctx }) {
  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const { label, icon, provider, action, params, style } = ctx;

  const handleClick = async () => {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg('');
    try {
      await ctx.executeIntegration(provider, action, params || {});
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const baseClass =
    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95';
  const styleClass =
    style === 'outline'
      ? 'border border-aw-surface-border text-aw-text-primary hover:bg-aw-surface-card'
      : style === 'secondary'
        ? 'bg-aw-surface-card text-aw-text-primary hover:opacity-90'
        : 'bg-aw-send text-white hover:bg-aw-send-hover shadow-md';

  return (
    <div className="px-4 py-1.5">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className={`${baseClass} ${styleClass} w-full disabled:opacity-50`}
      >
        {state === 'loading' && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {state === 'success' && <span>✓</span>}
        {state === 'error' && <span>✗</span>}
        {state === 'idle' && icon && <span>{icon}</span>}
        <span>{state === 'success' ? 'Done!' : state === 'error' ? 'Failed' : label || 'Action'}</span>
      </button>
      {errorMsg && <p className="mt-1 text-center text-xs text-red-400">{errorMsg}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create DataForm.jsx**

```jsx
// .claude/widget-builder/src/components/templates/DataForm.jsx
import { useState } from 'react';

export default function DataForm({ ctx }) {
  const { fields = [], submitAction, successMessage, submitLabel } = ctx;
  const [formData, setFormData] = useState({});
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submitAction) return;

    // Basic required validation
    for (const field of fields) {
      if (field.required && !formData[field.key]?.trim()) {
        setErrorMsg(`${field.label} is required`);
        return;
      }
    }

    setState('loading');
    setErrorMsg('');
    try {
      await ctx.executeIntegration(submitAction.provider, submitAction.action, formData);
      setState('success');
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="px-4 py-3 text-center">
        <p className="text-aw-text-primary text-sm">{successMessage || 'Submitted successfully!'}</p>
        <button
          onClick={() => {
            setState('idle');
            setFormData({});
          }}
          className="text-aw-link mt-2 text-xs underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 px-4 py-2">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-aw-text-secondary mb-1 block text-xs">
            {field.label}
            {field.required && ' *'}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={3}
              className="bg-aw-surface-input text-aw-text-primary border-aw-surface-border focus:border-aw-focus-border w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none"
            />
          ) : field.type === 'select' ? (
            <select
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="bg-aw-surface-input text-aw-text-primary border-aw-surface-border focus:border-aw-focus-border w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              value={formData[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              className="bg-aw-surface-input text-aw-text-primary border-aw-surface-border focus:border-aw-focus-border w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            />
          )}
        </div>
      ))}
      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      <button
        type="submit"
        disabled={state === 'loading'}
        className="bg-aw-send hover:bg-aw-send-hover w-full rounded-xl py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
      >
        {state === 'loading' ? 'Submitting...' : submitLabel || 'Submit'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create DataList.jsx**

```jsx
// .claude/widget-builder/src/components/templates/DataList.jsx
import { useState, useEffect } from 'react';

export default function DataList({ ctx }) {
  const { provider, action, params, displayFields = [], emptyMessage, onSelectAction } = ctx;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!provider || !action) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ctx.executeIntegration(provider, action, params || {});
        if (!cancelled) setItems(Array.isArray(data) ? data : [data]);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, action]);

  const handleSelect = (item) => {
    if (!onSelectAction) return;
    if (onSelectAction.type === 'message') {
      ctx.sendMessage?.(
        onSelectAction.template?.replace(/\{\{(\w+)\}\}/g, (_, k) => item[k] || '') || item[displayFields[0]?.key]
      );
    } else if (onSelectAction.provider) {
      ctx.executeIntegration(onSelectAction.provider, onSelectAction.action, item);
    }
  };

  if (error) return <div className="px-4 py-2 text-xs text-red-400">{error}</div>;
  if (items === null) return <div className="text-aw-text-secondary px-4 py-3 text-center text-xs">Loading...</div>;
  if (items.length === 0)
    return (
      <div className="text-aw-text-secondary px-4 py-3 text-center text-xs">{emptyMessage || 'No items found'}</div>
    );

  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto px-4 py-2">
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => handleSelect(item)}
          className={`bg-aw-surface-card border-aw-surface-border rounded-lg border p-2.5 ${onSelectAction ? 'hover:border-aw-focus-border cursor-pointer transition-colors' : ''}`}
        >
          {displayFields.map((f) => (
            <div key={f.key} className="flex justify-between text-xs">
              <span className="text-aw-text-secondary">{f.label}</span>
              <span className="text-aw-text-primary font-medium">{item[f.key] ?? '—'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create StatusCard.jsx**

```jsx
// .claude/widget-builder/src/components/templates/StatusCard.jsx
import { useState, useEffect, useRef } from 'react';

export default function StatusCard({ ctx }) {
  const { provider, action, params, displayFields = [], refreshInterval, title } = ctx;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const result = await ctx.executeIntegration(provider, action, params || {});
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!provider || !action) return;
    fetchData();
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [provider, action, refreshInterval]);

  return (
    <div className="px-4 py-2">
      <div className="bg-aw-surface-card border-aw-surface-border rounded-xl border p-3">
        {title && (
          <h4 className="text-aw-text-secondary mb-2 text-xs font-semibold tracking-wide uppercase">{title}</h4>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!data && !error && <p className="text-aw-text-secondary text-xs">Loading...</p>}
        {data &&
          displayFields.map((f) => (
            <div key={f.key} className="border-aw-surface-border flex justify-between border-b py-1 last:border-0">
              <span className="text-aw-text-secondary text-xs">{f.label}</span>
              <span className="text-aw-text-primary text-sm font-medium">{data[f.key] ?? '—'}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ExternalLink.jsx**

```jsx
// .claude/widget-builder/src/components/templates/ExternalLink.jsx
export default function ExternalLink({ ctx }) {
  const { url, label, icon, openIn } = ctx;

  const handleClick = () => {
    if (openIn === 'popup') {
      window.open(url, '_blank', 'width=600,height=700,scrollbars=yes');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="px-4 py-1.5">
      <button
        onClick={handleClick}
        className="border-aw-surface-border text-aw-text-primary hover:bg-aw-surface-card flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all"
      >
        {icon && <span>{icon}</span>}
        <span>{label || 'Open Link'}</span>
        <span className="text-aw-text-secondary">↗</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Verify all 5 components exist and have correct structure**

Run: `ls -la .claude/widget-builder/src/components/templates/ && for f in .claude/widget-builder/src/components/templates/*.jsx; do echo "--- $f ---"; head -3 "$f"; echo "Lines: $(wc -l < "$f")"; done`

Expected: 5 files, each exports a default function with `{ ctx }` prop.

- [ ] **Step 7: Commit**

```bash
git add .claude/widget-builder/src/components/templates/
git commit -m "feat: add 5 integration template UI components"
```

---

## Task 5: Update WidgetShell

**Files:**

- Modify: `.claude/widget-builder/src/components/WidgetShell.jsx:1-10,41-51,340-345`

Add: template component imports, useIntegration hook, update COMPONENT_MAP, update renderSlot for dual lookup.

- [ ] **Step 1: Read current WidgetShell.jsx**

Read `.claude/widget-builder/src/components/WidgetShell.jsx` fully to understand current imports, COMPONENT_MAP (lines 41-51), and renderSlot (lines 340-345).

- [ ] **Step 2: Add template component imports**

After existing component imports (around line 10), add:

```javascript
import ActionButton from './templates/ActionButton';
import DataForm from './templates/DataForm';
import DataList from './templates/DataList';
import StatusCard from './templates/StatusCard';
import ExternalLink from './templates/ExternalLink';
import useIntegration from '../hooks/useIntegration';
```

- [ ] **Step 3: Update COMPONENT_MAP**

Add template entries to the existing COMPONENT_MAP object:

```javascript
const COMPONENT_MAP = {
  // existing entries...
  header: Header,
  contactBar: ContactBar,
  contextBanner: ContextBanner,
  messageList: MessageList,
  imagePreview: ImagePreview,
  inputArea: InputArea,
  poweredBy: PoweredBy,
  toggleButton: ToggleButton,
  nudgeBubble: NudgeBubble,
  // Integration templates
  actionButton: ActionButton,
  dataForm: DataForm,
  dataList: DataList,
  statusCard: StatusCard,
  externalLink: ExternalLink,
};
```

- [ ] **Step 4: Add useIntegration hook to WidgetShell function body**

After the existing hook calls (useChat, useDrag, useVoice, etc.), add:

```javascript
const { execute: executeIntegration } = useIntegration(config);
```

Then add `executeIntegration` to the `ctx` object that gets passed to all children.

- [ ] **Step 5: Update renderSlot for dual lookup**

Change the renderSlot function from:

```javascript
const Comp = COMPONENT_MAP[comp.id];
```

to:

```javascript
const Comp = COMPONENT_MAP[comp.id] || COMPONENT_MAP[comp.template];
```

This enables template components to be looked up by their `template` field when `comp.id` is a custom instance ID (e.g., "calendlyBooking" → falls through to COMPONENT_MAP["actionButton"]).

- [ ] **Step 6: Verify widget still builds**

Run: `node .claude/widget-builder/scripts/build.js winbix-ai`

Expected: Build succeeds without errors.

- [ ] **Step 7: Commit**

```bash
git add .claude/widget-builder/src/components/WidgetShell.jsx
git commit -m "feat: add integration templates and useIntegration to WidgetShell"
```

---

## Task 6: Update generate-single-theme.js

**Files:**

- Modify: `.claude/widget-builder/scripts/generate-single-theme.js`

The generator must produce WidgetShell.jsx templates that include template component imports, useIntegration hook, extended COMPONENT_MAP, and the dual renderSlot lookup. There are two WidgetShell generators in this file (v1 at genWidget, v2 at genWidgetShell).

- [ ] **Step 1: Read generate-single-theme.js to find WidgetShell generation sections**

Find the `genWidgetShell` or equivalent function that generates the WidgetShell.jsx template for v2 clients. Look for `COMPONENT_MAP` in the template strings.

- [ ] **Step 2: Add template imports to generated WidgetShell**

In the generated WidgetShell template, add imports for the 5 template components and useIntegration hook (same as Task 5 Step 2, but in the template string).

- [ ] **Step 3: Add template entries to generated COMPONENT_MAP**

Same entries as Task 5 Step 3, in the template string.

- [ ] **Step 4: Add useIntegration hook call and ctx entry to generated WidgetShell**

- [ ] **Step 5: Update generated renderSlot to use dual lookup**

Change `COMPONENT_MAP[comp.id]` to `COMPONENT_MAP[comp.id] || COMPONENT_MAP[comp.template]` in the template.

- [ ] **Step 6: Verify generation works**

Run: `node .claude/widget-builder/scripts/generate-single-theme.js winbix-ai --force-regen`
Then: `node .claude/widget-builder/scripts/build.js winbix-ai`

Expected: Both succeed.

- [ ] **Step 7: Commit**

```bash
git add .claude/widget-builder/scripts/generate-single-theme.js
git commit -m "feat: add integration templates to widget generator"
```

---

## Task 7: add_widget_component Operation in modify_structure

**Files:**

- Modify: `src/lib/builder/tools/coreTools.ts:924-1038`

Add new `add_widget_component` operation type to the existing modify_structure tool.

- [ ] **Step 1: Read modify_structure executor (coreTools.ts lines 924-1038)**

Already read. The operation loop is at lines 973-999.

- [ ] **Step 2: Add add_widget_component to the operations description**

Update the `operations` parameter description (line 933-934) to include:

```
or { "op": "add_widget_component", "componentId": "<unique-id>", "template": "<templateName>", "slot": "<slot>", "props": {...} }
```

- [ ] **Step 3: Update the operation type definition**

Update the operations type (lines 956-963) to include the new fields:

```typescript
let operations: Array<{
  op: string;
  componentId: string;
  enabled?: boolean;
  prop?: string;
  value?: unknown;
  position?: string;
  template?: string;
  slot?: string;
  props?: Record<string, unknown>;
}>;
```

- [ ] **Step 4: Restructure the operation loop to handle add_widget_component BEFORE comp lookup**

The current code at line 974 does `find` by componentId and skips if not found. For `add_widget_component`, the component SHOULDN'T exist yet. Replace the entire operation loop (lines 973-999) with:

```typescript
for (const op of operations) {
  // add_widget_component creates a NEW component — must handle BEFORE comp lookup
  if (op.op === 'add_widget_component') {
    const existing = structure.components.find((c: { id: string }) => c.id === op.componentId);
    if (existing) {
      changes.push(`⚠️ Component "${op.componentId}" already exists`);
      continue;
    }
    const validTemplates = ['actionButton', 'dataForm', 'dataList', 'statusCard', 'externalLink'];
    const template = op.template; // camelCase — must match COMPONENT_MAP keys exactly
    if (!template || !validTemplates.includes(template)) {
      changes.push(`⚠️ Unknown template "${op.template}". Valid: ${validTemplates.join(', ')}`);
      continue;
    }
    const slot = op.slot || 'panel-footer';
    structure.components.push({
      id: op.componentId,
      template,
      file: template.charAt(0).toUpperCase() + template.slice(1) + '.jsx',
      slot,
      enabled: true,
      props: op.props || {},
    });
    changes.push(`added ${op.componentId} (${template}) to ${slot}`);
    continue;
  }

  // All other ops require an existing component
  const comp = structure.components.find((c: { id: string }) => c.id === op.componentId);
  if (!comp) {
    changes.push(`⚠️ Component "${op.componentId}" not found`);
    continue;
  }

  if (op.op === 'toggle') {
    comp.enabled = op.enabled ?? !comp.enabled;
    changes.push(`${comp.enabled ? 'enabled' : 'disabled'} ${op.componentId}`);
  } else if (op.op === 'set_prop') {
    if (!comp.props) comp.props = {};
    comp.props[op.prop!] = op.value;
    changes.push(`set ${op.componentId}.${op.prop} = ${JSON.stringify(op.value)}`);
  } else if (op.op === 'reorder') {
    const idx = structure.components.indexOf(comp);
    structure.components.splice(idx, 1);
    const [dir, targetId] = (op.position || '').split(':');
    const targetIdx = structure.components.findIndex((c: { id: string }) => c.id === targetId);
    if (targetIdx === -1) {
      structure.components.push(comp);
      changes.push(`moved ${op.componentId} to end (target "${targetId}" not found)`);
    } else {
      structure.components.splice(dir === 'before' ? targetIdx : targetIdx + 1, 0, comp);
      changes.push(`moved ${op.componentId} ${dir} ${targetId}`);
    }
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/builder/tools/coreTools.ts 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add src/lib/builder/tools/coreTools.ts
git commit -m "feat: add add_widget_component operation to modify_structure"
```

---

## Task 8: generate_integration Gemini Tool

**Files:**

- Modify: `src/lib/builder/tools/integrationTools.ts`

- [ ] **Step 1: Read integrationTools.ts to understand tool definition pattern**

Read the file to see how existing tools (web_search, write_integration, etc.) are defined. Note the ToolDefinition structure: name, description, parameters, category, executor.

- [ ] **Step 2: Add generate_integration tool**

Add a new tool to the integrationTools array:

```typescript
{
  name: 'generate_integration',
  description:
    'Generate a complete integration plugin from a JSON config. Creates manifest and plugin code deterministically — NO AI hallucination. For standard REST APIs, fill the integration.config.json and use this tool. DO NOT write plugin code manually.',
  parameters: {
    type: 'object',
    properties: {
      clientId: { type: 'string', description: 'The widget client ID' },
      config: {
        type: 'string',
        description:
          'JSON string of integration.config.json. Must include: provider, name, baseUrl, auth (type, fields), actions (id, name, method, path), healthCheck (method, path, successField).',
      },
    },
    required: ['clientId', 'config'],
  },
  category: 'integration',
  async executor(args, ctx) {
    const clientId = args.clientId as string;
    let config: any;
    try {
      config = JSON.parse(args.config as string);
    } catch {
      return { error: 'Invalid JSON in config parameter' };
    }

    // 1. Validate
    const { validateIntegrationConfig } = require(
      path.join(process.cwd(), '.claude/widget-builder/scripts/integration-config-schema')
    );
    const validation = validateIntegrationConfig(config);
    if (!validation.valid) {
      return { error: `Invalid config: ${validation.errors.join('; ')}` };
    }
    ctx.write({ type: 'progress', message: `Config validated for "${config.provider}"` });

    // 2. Save config to client directory
    const configDir = path.join(
      process.cwd(),
      '.claude/widget-builder/clients',
      clientId,
      'integrations',
      config.provider
    );
    fs.mkdirSync(configDir, { recursive: true });
    const configPath = path.join(configDir, 'integration.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    ctx.write({ type: 'progress', message: 'Config saved' });

    // 3. Run generator
    try {
      const { generate } = require(
        path.join(process.cwd(), '.claude/widget-builder/scripts/generate-integration')
      );
      const result = generate(configPath);
      ctx.write({ type: 'progress', message: `Plugin generated: ${result.provider}` });
    } catch (err) {
      return { error: `Generator failed: ${(err as Error).message}` };
    }

    // 4. Return success
    return {
      success: true,
      provider: config.provider,
      actions: config.actions.map((a: any) => a.id),
      message: `Integration "${config.name}" generated. Plugin registered. Use attach_integration_to_widget to bind it to the widget, then add_widget_component to add UI.`,
    };
  },
},
```

- [ ] **Step 3: Add required imports at top of file**

Add `import path from 'path'` and `import fs from 'fs'` if not already present in integrationTools.ts.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/builder/tools/integrationTools.ts 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/tools/integrationTools.ts
git commit -m "feat: add generate_integration Gemini tool"
```

---

## Task 9: Gemini Integration Guide

**Files:**

- Create: `src/lib/builder/geminiIntegrationGuide.ts`
- Modify: `src/lib/builder/systemPrompt.ts`

- [ ] **Step 1: Create geminiIntegrationGuide.ts**

This is a reference document injected into Gemini's context when working with integrations. It must be concise (fits in ~2K tokens) to minimize context pollution.

```typescript
// src/lib/builder/geminiIntegrationGuide.ts

export const INTEGRATION_GUIDE = `## Integration Codegen Guide

### Decision Tree
- User says "connect X" / "add X integration" → generate_integration (fills config JSON → deterministic code)
- User says "add booking button" / "add contact form" → modify_structure with add_widget_component (template UI)
- User says "show event list" / "display status" → modify_structure with add_widget_component (DataList/StatusCard)
- Integration already exists (check list_user_integrations) → attach_integration_to_widget + add_widget_component

### Available Template Components
| Template | Use for | Key props |
|----------|---------|-----------|
| actionButton | Trigger action (book, pay, save) | label, provider, action, params, style |
| dataForm | Collect input + submit (contact form, booking form) | fields[], submitAction, successMessage |
| dataList | Display fetched data (events, contacts) | provider, action, displayFields[] |
| statusCard | Show single data point (balance, status) | provider, action, displayFields[], refreshInterval |
| externalLink | Open external URL | url, label, openIn |

### integration.config.json Schema
\`\`\`json
{
  "provider": "lowercase-slug",
  "name": "Display Name",
  "category": "crm|calendar|payment|notification|data",
  "baseUrl": "https://api.example.com",
  "auth": { "type": "bearer|api-key-header|basic", "header": "Authorization", "prefix": "Bearer", "fields": [{ "key": "apiKey", "label": "API Key", "type": "password", "required": true }] },
  "actions": [{ "id": "camelCase", "name": "Display", "method": "GET|POST", "path": "/endpoint", "body": {}, "queryParams": {}, "responseMapping": { "root": "data", "fields": { "ourKey": "apiKey" } } }],
  "healthCheck": { "method": "GET", "path": "/me", "successField": "id" }
}
\`\`\`
Template vars: \`{{params.X}}\` from action call, \`{{auth.X}}\` from credentials.

### Flow Examples
**Known plugin (HubSpot):** list_user_integrations → already active → attach_integration_to_widget → add_widget_component (dataForm for contact creation)
**Stub plugin (Calendly):** web_search Calendly API docs → generate_integration with config → attach → add_widget_component
**Unknown API:** web_search → web_fetch docs → generate_integration → attach → add_widget_component

### Rules
- NEVER write index.ts manually for REST APIs — use generate_integration
- ALWAYS web_search before filling config for unknown APIs
- ALWAYS test_integration after creation
- Prefer template components over add_component — they never fail
- One integration at a time — don't batch multiple providers
`;
```

- [ ] **Step 2: Update systemPrompt.ts to reference integration guide**

Read `src/lib/builder/systemPrompt.ts` and update the Integration Flow section (around line 165-172) to reference the codegen approach:

Replace the manual integration flow with:

```
## Integration Flow (Codegen — preferred)
1. User: "Connect my [provider]"
2. web_search("[provider] API documentation") → understand endpoints
3. generate_integration → fill integration.config.json → deterministic plugin
4. attach_integration_to_widget → bind to current widget
5. modify_structure (add_widget_component) → add ActionButton/DataForm/DataList
6. test_integration → verify API key works
7. build_deploy → widget updated with integration UI

For known providers with templates (Calendly, Stripe, Telegram): skip web_search, use template directly.
For non-REST APIs (OAuth2, GraphQL): generator creates skeleton, then modify_component to fill custom logic.
```

Also update the tool routing section to include:

```
- Connect integration (REST API) → generate_integration (JSON config → deterministic code)
- Add integration UI (button, form, list) → modify_structure add_widget_component (JSON template)
- Custom integration logic → modify_component (AI on skeleton)
```

- [ ] **Step 3: Update codegenPrompt.ts to inject integration guide**

Read `src/lib/builder/codegenPrompt.ts`. This file controls what reference material Gemini sees during code generation. Add conditional injection of the integration guide when the user's request involves integrations.

Find the function or section that assembles the codegen prompt, and add:

```typescript
import { INTEGRATION_GUIDE } from './geminiIntegrationGuide';

// In the prompt assembly function, after existing reference sections:
if (isIntegrationRelated(userMessage)) {
  prompt += '\n\n' + INTEGRATION_GUIDE;
}

// Simple keyword detection:
function isIntegrationRelated(msg: string): boolean {
  const keywords = [
    'integrat',
    'connect',
    'api',
    'webhook',
    'calendly',
    'stripe',
    'hubspot',
    'crm',
    'payment',
    'booking',
  ];
  const lower = msg.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}
```

The exact integration point depends on the file structure — read it first and adapt accordingly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/builder/geminiIntegrationGuide.ts src/lib/builder/systemPrompt.ts src/lib/builder/codegenPrompt.ts
git commit -m "feat: add Gemini integration guide and update system prompt routing"
```

---

## Task 10: Integration Templates Library

**Files:**

- Create: `.claude/widget-builder/integration-templates/stripe.json`
- Create: `.claude/widget-builder/integration-templates/telegram-bot.json`

Calendly template was already created in Task 2. Add 2 more popular templates.

- [ ] **Step 1: Create Google Sheets template**

Note: Stripe was removed from templates because Stripe API requires `application/x-www-form-urlencoded` bodies, not JSON. The generator only produces JSON-based plugins. Stripe integration should use the existing stub plugin with `modify_component` to add custom form-encoding logic.

```json
{
  "provider": "google-sheets",
  "name": "Google Sheets",
  "category": "data",
  "color": "#34A853",
  "baseUrl": "https://sheets.googleapis.com/v4",
  "docsUrl": "https://developers.google.com/sheets/api",
  "auth": {
    "type": "bearer",
    "header": "Authorization",
    "prefix": "Bearer",
    "fields": [
      { "key": "apiKey", "label": "API Key", "type": "password", "required": true, "placeholder": "AIza..." },
      {
        "key": "spreadsheetId",
        "label": "Spreadsheet ID",
        "type": "text",
        "required": true,
        "placeholder": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
      }
    ]
  },
  "actions": [
    {
      "id": "getValues",
      "name": "Read Range",
      "description": "Read values from a spreadsheet range",
      "method": "GET",
      "path": "/spreadsheets/{{auth.spreadsheetId}}/values/{{params.range}}",
      "queryParams": { "key": "{{auth.apiKey}}" },
      "responseMapping": {
        "root": "values",
        "fields": {}
      }
    },
    {
      "id": "appendRow",
      "name": "Append Row",
      "description": "Append a row to the spreadsheet",
      "method": "POST",
      "path": "/spreadsheets/{{auth.spreadsheetId}}/values/{{params.range}}:append",
      "queryParams": { "valueInputOption": "USER_ENTERED", "key": "{{auth.apiKey}}" },
      "body": {
        "values": [["{{params.col1}}", "{{params.col2}}", "{{params.col3}}"]]
      },
      "responseMapping": {
        "root": "updates",
        "fields": { "updatedRows": "updatedRows", "updatedRange": "updatedRange" }
      }
    }
  ],
  "healthCheck": {
    "method": "GET",
    "path": "/spreadsheets/{{auth.spreadsheetId}}",
    "successField": "spreadsheetId"
  }
}
```

- [ ] **Step 2: Create Telegram Bot template**

```json
{
  "provider": "telegram-bot",
  "name": "Telegram Bot",
  "category": "notification",
  "color": "#26A5E4",
  "baseUrl": "https://api.telegram.org",
  "auth": {
    "type": "custom",
    "fields": [
      {
        "key": "botToken",
        "label": "Bot Token",
        "type": "password",
        "required": true,
        "placeholder": "123456:ABC-DEF..."
      },
      { "key": "chatId", "label": "Chat ID", "type": "text", "required": true, "placeholder": "-1001234567890" }
    ]
  },
  "actions": [
    {
      "id": "sendMessage",
      "name": "Send Message",
      "description": "Send a text message to a Telegram chat",
      "method": "POST",
      "path": "/bot{{auth.botToken}}/sendMessage",
      "body": {
        "chat_id": "{{auth.chatId}}",
        "text": "{{params.text}}",
        "parse_mode": "HTML"
      },
      "responseMapping": {
        "root": "result",
        "fields": { "messageId": "message_id", "date": "date" }
      }
    }
  ],
  "healthCheck": {
    "method": "GET",
    "path": "/bot{{auth.botToken}}/getMe",
    "successField": "result.id"
  }
}
```

- [ ] **Step 3: Verify templates are valid**

Run: `node -e "const v = require('./.claude/widget-builder/scripts/integration-config-schema'); ['calendly','google-sheets','telegram-bot'].forEach(t => { const c = require('./.claude/widget-builder/integration-templates/' + t + '.json'); const r = v.validateIntegrationConfig(c); console.log(t + ':', r.valid ? 'VALID' : 'INVALID: ' + r.errors.join(', ')); });"`

Expected: All 3 show VALID.

- [ ] **Step 4: Commit**

```bash
git add .claude/widget-builder/integration-templates/
git commit -m "feat: add integration config templates for Calendly, Google Sheets, Telegram"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Generate Calendly plugin and verify build**

```bash
node .claude/widget-builder/scripts/generate-integration.js .claude/widget-builder/integration-templates/calendly.json
node .claude/widget-builder/scripts/build.js winbix-ai
```

Expected: Both succeed. Calendly plugin replaces stub.

- [ ] **Step 2: Test add_widget_component via structure.json**

Manually add a test component to winbix-ai's `widget.structure.json`:

```json
{
  "id": "testButton",
  "template": "actionButton",
  "file": "ActionButton.jsx",
  "slot": "panel-footer",
  "enabled": true,
  "props": { "label": "Test Integration", "provider": "calendly", "action": "getEventTypes", "style": "primary" }
}
```

Then build: `node .claude/widget-builder/scripts/build.js winbix-ai`

Expected: Build succeeds. The ActionButton component should render in the widget.

- [ ] **Step 3: Remove test component from structure.json**

Remove the `testButton` entry from `widget.structure.json` and rebuild.

- [ ] **Step 4: Verify all existing widgets still build**

```bash
for client in winbix-ai ukraine-gta online-ua-mdash; do
  echo "Building $client..."
  node .claude/widget-builder/scripts/build.js $client 2>&1 | tail -1
done
```

Expected: All 3 build successfully.

- [ ] **Step 5: Verify generated Calendly plugin has all 6 IntegrationPlugin methods**

Run: `node -e "const code = require('fs').readFileSync('src/lib/integrations/plugins/calendly/index.ts', 'utf-8'); ['connect(', 'disconnect()', 'testConnection(', 'healthCheck(', 'execute(', 'describeCapabilities()'].forEach(m => console.log(m, ':', code.includes(m) ? 'FOUND' : 'MISSING'));"`

Expected: All 6 show FOUND.

- [ ] **Step 6: Final commit with all changes**

```bash
git add -A
git status
git commit -m "feat: integration codegen framework — end-to-end verification"
```

---

## Summary

| Task | What                          | Files              | Deps       |
| ---- | ----------------------------- | ------------------ | ---------- |
| 1    | Config schema validator       | 1 new              | —          |
| 2    | Generator script              | 1 new + 1 template | Task 1     |
| 3    | useIntegration hook           | 1 new              | —          |
| 4    | 5 template UI components      | 5 new              | —          |
| 5    | WidgetShell updates           | 1 modified         | Tasks 3, 4 |
| 6    | generate-single-theme updates | 1 modified         | Tasks 3, 4 |
| 7    | add_widget_component op       | 1 modified         | —          |
| 8    | generate_integration tool     | 1 modified         | Tasks 1, 2 |
| 9    | Gemini guide + system prompt  | 2 modified         | —          |
| 10   | Integration templates         | 2 new              | Task 1     |
| 11   | E2E verification              | —                  | All        |

**Parallelizable:** Tasks 1+3+4+7+9 can run in parallel (no dependencies). Tasks 2, 5, 6, 8 depend on earlier tasks. Task 11 runs last.
