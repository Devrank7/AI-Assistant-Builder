# Dynamic Integration System Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current broken integration flow (builder LLM hallucinating connections without writing real code) with a config-driven system where the builder creates validated JSON configs and a deterministic engine executes HTTP calls at runtime.

**Architecture:** Builder LLM produces structured IntegrationConfig JSON (endpoints, auth, body templates). A universal Integration Engine resolves templates and executes HTTP requests. The existing `loadWidgetTools()` pipeline is extended to generate Gemini function declarations from configs — no code generation, no hallucination surface.

**Tech Stack:** Next.js API routes, MongoDB (Mongoose), @google/genai SDK, existing encrypt/decrypt utilities, Brave Search API (for doc research)

---

## 1. Problem Statement

When a user tells the builder "connect Telegram" or "connect my CRM":

1. The builder LLM **says** it connected but creates no Integration record in MongoDB
2. No real API calls are tested — the LLM hallucinates "success"
3. The widget AI never receives callable tools for the integration
4. The existing 10 pre-built plugins only work through the marketplace UI, not through builder chat

The current `integrationTools.ts` has 12 tools including `write_integration` (code generation) and `connect_integration` (credential storage), but the builder LLM rarely executes them correctly. When it does call `write_integration`, it generates arbitrary TypeScript code that may not work.

**Root cause:** The builder LLM is asked to generate code. LLMs are unreliable at writing correct, working integration code. The solution: make the LLM produce **structured JSON config** instead, and execute HTTP calls deterministically.

---

## 2. Architecture Overview

### Three Layers

| Layer                                        | What                                                         | AI Needed?                               | Failure Mode                                             |
| -------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| **IntegrationConfig** (new MongoDB model)    | JSON defining endpoints, auth, actions, templates            | Yes — builder fills config from API docs | Config has wrong URL/params → caught by test_integration |
| **Integration Engine** (new runtime)         | Universal HTTP executor — resolves templates, makes requests | **No** — deterministic                   | HTTP error → clear error message returned                |
| **Widget Tools Loader** (existing, extended) | Generates Gemini function declarations from config           | **No** — deterministic                   | Missing config field → validation error at creation time |

### Data Flow

```
Builder Chat                        MongoDB                     Widget Runtime
────────────                        ───────                     ──────────────
research_api(docs)
       ↓
create_integration(JSON config) ──→ IntegrationConfig.create()
       ↓                               status: "draft"
test_integration(dry run)       ──→ Engine.executeAction() ──→ real HTTP call
       ↓                               status: "tested"
activate_integration()          ──→ status: "active"
                                    AISettings updated
                                         ↓
                                loadWidgetTools(clientId) ──→ Gemini function declarations
                                         ↓                    + Engine-based executors
                                Widget AI calls
                                "telegram_send_message(msg)"
                                         ↓
                                Engine.executeAction(config, "send_message", {message: msg})
                                         ↓
                                HTTP POST to Telegram API
```

---

## 3. New MongoDB Model: IntegrationConfig

**File:** `src/models/IntegrationConfig.ts`

```typescript
interface IIntegrationConfig {
  userId: string;
  clientId: string;
  provider: string; // "telegram", "hubspot", "custom_crm", etc.
  displayName: string; // "Telegram Notifications"

  auth: {
    type: 'api_key' | 'bearer' | 'basic' | 'none';
    credentials: string; // encrypted JSON: { token, apiKey, username, password }
    headerName?: string; // "Authorization", "X-API-Key"
    headerPrefix?: string; // "Bearer ", "Bot ", ""
  };

  baseUrl: string; // "https://api.telegram.org/bot{{auth.token}}"

  actions: Array<{
    id: string; // "send_message"
    name: string; // "Send Message"
    description: string; // "Send notification to business owner via Telegram"
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string; // "/sendMessage"
    headers?: Record<string, string>;
    bodyTemplate?: unknown; // JSON with {{input.x}} / {{config.x}} / {{auth.x}} placeholders
    queryTemplate?: Record<string, string>; // for GET requests
    inputSchema: {
      type: 'object';
      properties: Record<
        string,
        {
          type: string; // "string", "number", "boolean"
          description: string;
        }
      >;
      required: string[];
    };
    responseMapping?: {
      successField?: string; // "ok", "success"
      dataField?: string; // "result", "data"
      errorField?: string; // "error", "message"
    };
  }>;

  config: Record<string, unknown>; // static values: { chat_id: "123456" }
  systemPromptAddition?: string; // extra context for widget AI

  status: 'draft' | 'tested' | 'active' | 'error';
  lastTestResult?: {
    success: boolean;
    response?: unknown;
    error?: string;
    timestamp: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

- Unique compound: `(userId, clientId, provider)` — one config per provider per widget per user
- Index: `(clientId, status)` — fast lookup for loadWidgetTools

**Relationship to existing models:**

- Does NOT replace Integration model — that stays for marketplace plugin connections
- Does NOT replace WidgetIntegration — that stays for plugin-based bindings
- IntegrationConfig is a parallel, independent system for builder-created integrations

---

## 4. Integration Engine

**File:** `src/lib/integrations/engine.ts`

### 4.1 Template Resolution

Templates use `{{path.to.value}}` syntax. Three namespaces:

| Namespace | Source                                                        | Example              |
| --------- | ------------------------------------------------------------- | -------------------- |
| `auth`    | Decrypted credentials from IntegrationConfig.auth.credentials | `{{auth.token}}`     |
| `config`  | Static values from IntegrationConfig.config                   | `{{config.chat_id}}` |
| `input`   | Runtime args from Gemini function call                        | `{{input.message}}`  |

**Resolution rules:**

- Only string interpolation — no expressions, no conditionals, no nested templates
- Missing variable → throw validation error (caught at create_integration time)
- `{{auth.X}}` values are never logged or returned in responses

### 4.2 executeAction(config, actionId, inputs)

```
1. Find action by actionId in config.actions
2. Decrypt config.auth.credentials
3. Build context: { auth: decrypted, config: config.config, input: inputs }
4. Resolve baseUrl template → full base URL
5. Resolve path template → append to base URL
6. Build headers:
   - Add auth header if type != "none": headerName: headerPrefix + auth value
   - Add action-specific headers
   - Resolve templates in header values
7. Build body (POST/PUT/PATCH):
   - Deep-clone bodyTemplate
   - Resolve all {{x.y}} templates in string values recursively
   - JSON.stringify
8. Build query params (GET):
   - Resolve templates in queryTemplate values
   - Append to URL
9. Execute fetch() with:
   - method, url, headers, body
   - timeout: 10 seconds
   - signal: AbortController
10. Parse response:
    - If responseMapping.successField → check response[successField]
    - If responseMapping.dataField → extract response[dataField]
    - If responseMapping.errorField → extract error message on failure
    - Default: return { success: status < 400, data: responseBody }
11. Return { success, data, error? }
```

### 4.3 Security Constraints

| Constraint        | Implementation                                              |
| ----------------- | ----------------------------------------------------------- |
| No code execution | Engine only does template interpolation + HTTP fetch        |
| HTTPS only        | URL validation rejects http:// (except localhost for dev)   |
| No SSRF           | Block private IPs: 10.x, 172.16-31.x, 192.168.x, 127.x, ::1 |
| Response size     | 50KB max response body                                      |
| Timeout           | 10 seconds per request                                      |
| Rate limit        | 100 calls/minute per widget per integration                 |
| Credential safety | Auth values never in logs or error messages                 |
| Template safety   | Only `{{path.to.value}}` — no eval, no expressions          |

---

## 5. Extended loadWidgetTools()

**File:** `src/lib/widgetTools.ts` (modify existing)

After the existing plugin-based loading (steps 1-4), add step 5:

```
5. Load config-driven integrations:
   - Query: IntegrationConfig.find({ clientId, status: "active" })
   - For each config, for each action:
     - Tool name: `${config.provider}_${action.id}`
     - Declaration: from action.inputSchema + action.description
     - Executor: IntegrationEngine.executeAction(config, action.id, args)
   - Add to declarations[] and executors Map
   - Set hasIntegrations = true if any found
```

**Result:** Widget AI receives Gemini function declarations like:

- `telegram_send_message(message: string)` — "Send notification to business owner via Telegram"
- `hubspot_create_contact(name: string, email: string)` — "Create a contact in HubSpot CRM"

These are indistinguishable from plugin-based tools to the widget AI.

---

## 6. New Builder Tools

Replace integration-specific tools with 6 focused tools. Keep `web_search`, `web_fetch`, and `guide_user` as general-purpose tools (moved to shared file).

**File:** `src/lib/builder/tools/dynamicIntegrationTools.ts`

### 6.0 Tools Migration Plan

**Atomic swap in a single commit:**

| Old Tool                               | Disposition                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `web_search`                           | **KEEP** — move to `coreTools.ts` (used for site analysis, knowledge, etc.)    |
| `web_fetch`                            | **KEEP** — move to `coreTools.ts`                                              |
| `guide_user`                           | **KEEP** — move to `coreTools.ts` (UI instruction cards)                       |
| `open_connection_wizard`               | **KEEP** — move to `coreTools.ts` (marketplace UI flow)                        |
| `search_api_docs`                      | **REMOVE** — replaced by `research_api`                                        |
| `write_integration`                    | **REMOVE** — replaced by `create_integration`                                  |
| `test_integration` (old)               | **REMOVE** — replaced by `test_integration_config` (new name avoids collision) |
| `connect_integration`                  | **REMOVE** — replaced by `create_integration`                                  |
| `generate_integration`                 | **REMOVE** — replaced by `create_integration`                                  |
| `connect_any_api` / `universalApiTool` | **REMOVE** — replaced by `create_integration`                                  |
| `list_user_integrations`               | **REMOVE** — replaced by `list_integrations`                                   |
| `attach_integration_to_widget`         | **REMOVE** — handled by `activate_integration`                                 |
| `execute_integration_action`           | **REMOVE** — handled by widget runtime engine                                  |
| `check_integration_health`             | **REMOVE** — replaced by `test_integration_config`                             |
| `enable_ai_actions`                    | **REMOVE** — handled by `activate_integration`                                 |

**AgentToolName update:** Remove all old names, add: `research_api`, `create_integration`, `test_integration_config`, `activate_integration`, `deactivate_integration`, `list_integrations`. Must grep entire codebase for references to deprecated names and update (SSE handlers, frontend components, system prompt).

### 6.1 research_api

**Purpose:** Search API documentation and extract endpoint details.

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| Name       | `research_api`                        |
| Category   | `integration`                         |
| Parameters | `provider` (string), `topic` (string) |

**Executor:**

1. Brave Search: `"${provider} API documentation ${topic}"`
2. Fetch top 2-3 results (web_fetch-style markdown extraction, 30KB limit)
3. Return raw markdown content (not structured extraction)
4. The builder LLM reads the raw docs and decides what config to create

**Fallback:** If Brave Search returns no results, return `{ success: false, error: "No documentation found. Ask the user for the API base URL and endpoint details." }`

**This is the only tool where AI reasoning is needed** — the builder LLM reads the docs and decides what config to create. Returns raw markdown like the current `search_api_docs`.

### 6.2 create_integration

**Purpose:** Create and validate an IntegrationConfig.

| Field      | Value                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name       | `create_integration`                                                                                                                                         |
| Category   | `integration`                                                                                                                                                |
| Parameters | `provider`, `displayName`, `authType`, `credentials` (JSON), `authValueField` (string), `baseUrl`, `actions` (JSON), `config` (JSON), `systemPromptAddition` |

**Auth value resolution** — the `authValueField` parameter tells the engine which credential field to use for the auth header:

| authType  | authValueField | Header constructed                                                       |
| --------- | -------------- | ------------------------------------------------------------------------ |
| `bearer`  | `"token"`      | `Authorization: Bearer <credentials.token>`                              |
| `api_key` | `"apiKey"`     | `X-API-Key: <credentials.apiKey>` (headerName configurable)              |
| `basic`   | n/a            | `Authorization: Basic base64(credentials.username:credentials.password)` |
| `none`    | n/a            | No auth header (auth may be in URL via `{{auth.token}}`)                 |

**Executor (deterministic):**

1. Parse and validate all JSON parameters
2. Validate auth type is one of: api_key, bearer, basic, none
3. Validate authValueField exists in credentials (for bearer/api_key)
4. Validate baseUrl is HTTPS (or localhost)
5. Validate template syntax:
   - Every `{{input.X}}` in bodyTemplate where X is in `required` → must exist in inputSchema.properties
   - Every `{{input.X}}` where X is NOT required → allowed, resolves to empty string at runtime if missing
   - Every `{{config.X}}` → must exist in config object
   - Every `{{auth.X}}` → must exist in credentials
6. Validate action IDs are unique
7. Encrypt credentials via existing `encrypt()`
8. Save IntegrationConfig with status: "draft"
9. Return `{ success: true, configId: doc._id, actionsCreated: [...] }`

**Validation errors are returned to the builder LLM** so it can fix the config and retry.

### 6.3 test_integration_config

**Purpose:** Execute a real API call to verify the config works.

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| Name       | `test_integration_config`                   |
| Category   | `integration`                               |
| Parameters | `configId`, `actionId`, `testInputs` (JSON) |

**Note:** Named `test_integration_config` (not `test_integration`) to avoid collision with the existing tool during migration. The old `test_integration` has a different signature (`provider`, `apiKey`, `testUrl`).

**Executor:**

1. Load IntegrationConfig by ID (verify userId matches)
2. Call `engine.executeAction(config, actionId, parsedInputs)`
3. If success:
   - Update status → "tested"
   - Save lastTestResult with timestamp
   - Return `{ success: true, response: <truncated response> }`
4. If failure:
   - Keep status "draft"
   - Save lastTestResult with error
   - Return `{ success: false, error: <details> }`

**The builder LLM sees the real API response** and can fix the config if needed.

### 6.4 activate_integration

**Purpose:** Make a tested integration live on the widget.

| Field      | Value                  |
| ---------- | ---------------------- |
| Name       | `activate_integration` |
| Category   | `integration`          |
| Parameters | `configId`             |

**Executor:**

1. Load IntegrationConfig (verify userId)
2. Verify status is "tested" — reject if "draft" (must test first)
3. Set status → "active"
4. Build unified actionsSystemPrompt by merging:
   - Existing plugin-based action descriptions (from WidgetIntegration bindings)
   - New config-based action descriptions (from all active IntegrationConfigs for this widget)
   - This ensures both systems coexist without overwriting each other
5. Update AISettings: `actionsEnabled: true`, set merged `actionsSystemPrompt`
6. Verify tools load: call `loadWidgetTools(clientId)` and check the new tools appear
7. Return `{ success: true, activeActions: [...], widgetToolsVerified: true }`

### 6.5 deactivate_integration

**Purpose:** Disconnect an integration from the widget.

| Field      | Value                    |
| ---------- | ------------------------ |
| Name       | `deactivate_integration` |
| Category   | `integration`            |
| Parameters | `configId`               |

**Executor:**

1. Load IntegrationConfig (verify userId)
2. Set status → "inactive"
3. Rebuild actionsSystemPrompt (same merge logic as activate, now excluding this config)
4. If no active integrations remain, set `actionsEnabled: false`
5. Return `{ success: true }`

### 6.6 list_integrations

**Purpose:** List all integrations for the current widget (both plugin-based and config-driven).

| Field      | Value                              |
| ---------- | ---------------------------------- |
| Name       | `list_integrations`                |
| Category   | `integration`                      |
| Parameters | (none — uses toolContext.clientId) |

**Executor:**

1. Load WidgetIntegration bindings (plugin-based) for clientId
2. Load IntegrationConfig records for clientId
3. Return unified list with provider, displayName, status, type ("plugin" or "config")

---

## 7. Builder System Prompt Updates

**File:** `src/lib/builder/systemPrompt.ts`

Replace the current integration instructions (lines ~215-379) with:

```
## INTEGRATION FLOW (MANDATORY)

When the user asks to connect ANY API or service:

1. RESEARCH: Call research_api to understand the API's endpoints, auth, and parameters
2. ASK CREDENTIALS: Ask the user for their API key/token. NEVER guess or hallucinate credentials.
3. CREATE CONFIG: Call create_integration with the validated JSON config
4. TEST: Call test_integration_config with real test data. If it fails, fix the config and retry.
5. ACTIVATE: Call activate_integration to make it live on the widget

RULES:
- NEVER skip test_integration_config. An untested integration is not connected.
- NEVER tell the user "connected" until activate_integration returns success.
- If test_integration_config fails, explain the error and try to fix the config.
- If you don't know the API structure, call research_api first.
- For Telegram: after getting the bot token, use research_api to find how to get chat_id via getUpdates.
```

---

## 8. Example Flows

### 8.1 Telegram Notifications

```
User: "Connect Telegram notifications"

1. research_api(provider: "telegram", topic: "bot API sendMessage")
   → Learns: POST /sendMessage, params: chat_id + text, auth: bot token in URL

2. Builder asks: "Please provide your Telegram Bot Token (get it from @BotFather)"
   User: "7234567890:AAH_example_token"

3. research_api(provider: "telegram", topic: "bot API getUpdates chat_id")
   → Learns: GET /getUpdates returns chat_id from recent messages

4. Builder internally fetches getUpdates to extract chat_id (via test_integration
   with a temporary "get_updates" action, or as part of create_integration logic)

5. create_integration({
     provider: "telegram",
     displayName: "Telegram Notifications",
     authType: "none",  // token is in URL, not header
     credentials: '{"token": "7234567890:AAH_example_token"}',
     baseUrl: "https://api.telegram.org/bot{{auth.token}}",
     actions: '[{
       "id": "send_message",
       "name": "Send Telegram Message",
       "description": "Send a notification message to the business owner via Telegram",
       "method": "POST",
       "path": "/sendMessage",
       "headers": {"Content-Type": "application/json"},
       "bodyTemplate": {
         "chat_id": "{{config.chat_id}}",
         "text": "{{input.message}}",
         "parse_mode": "Markdown"
       },
       "inputSchema": {
         "type": "object",
         "properties": {
           "message": {"type": "string", "description": "Notification message text"}
         },
         "required": ["message"]
       },
       "responseMapping": {"successField": "ok", "dataField": "result"}
     }]',
     config: '{"chat_id": "123456789"}',
     systemPromptAddition: "You can send Telegram messages to notify the business owner about important events, leads, or urgent requests."
   })
   → Returns: { configId: "abc123" }

6. test_integration_config(configId: "abc123", actionId: "send_message",
     testInputs: '{"message": "✅ WinBix AI connected successfully!"}')
   → Telegram message actually arrives on user's phone
   → Returns: { success: true }

7. activate_integration(configId: "abc123")
   → Widget AI now has telegram_send_message tool
   → Returns: { success: true, activeActions: ["send_message"] }

8. Builder: "Telegram connected and tested! I sent a test message. Your widget will
   now notify you via Telegram when visitors need attention."
```

### 8.2 Custom CRM API

```
User: "Connect my CRM at api.mycrm.com"

1. research_api(provider: "mycrm", topic: "create contact API")
   → Fetches api.mycrm.com/docs, extracts: POST /api/contacts, Bearer auth

2. Builder asks: "What's your API key for api.mycrm.com?"
   User: "sk_live_abc123..."

3. create_integration({
     provider: "mycrm",
     displayName: "My CRM",
     authType: "bearer",
     credentials: '{"apiKey": "sk_live_abc123"}',
     authValueField: "apiKey",
     baseUrl: "https://api.mycrm.com",
     actions: '[{
       "id": "create_contact",
       "name": "Create Contact",
       "description": "Save a new contact/lead in the CRM",
       "method": "POST",
       "path": "/api/contacts",
       "headers": {"Content-Type": "application/json"},
       "bodyTemplate": {
         "name": "{{input.name}}",
         "email": "{{input.email}}",
         "phone": "{{input.phone}}",
         "source": "widget_chat"
       },
       "inputSchema": {
         "type": "object",
         "properties": {
           "name": {"type": "string", "description": "Contact name"},
           "email": {"type": "string", "description": "Contact email"},
           "phone": {"type": "string", "description": "Contact phone"}
         },
         "required": ["name"]
       }
     }]',
     config: '{}',
     systemPromptAddition: "When a visitor provides their contact info, save it to the CRM using mycrm_create_contact."
   })

4. test_integration_config(configId: "def456", actionId: "create_contact",
     testInputs: '{"name": "Test Contact", "email": "test@example.com"}')
   → Real API call to CRM → contact created
   → Returns: { success: true }

5. activate_integration(configId: "def456")
```

---

## 9. Backward Compatibility

| Current System                         | New System              | Impact                                          |
| -------------------------------------- | ----------------------- | ----------------------------------------------- |
| Integration model (10 providers)       | Kept as-is              | No change — marketplace UI works                |
| WidgetIntegration bindings             | Kept as-is              | No change — plugin-based widgets work           |
| PluginRegistry (10 plugins)            | Kept as-is              | No change                                       |
| loadWidgetTools()                      | Extended with step 5    | Additive — no breaking changes                  |
| `web_search`, `web_fetch`              | Moved to `coreTools.ts` | Same tools, different file — no behavior change |
| `guide_user`, `open_connection_wizard` | Moved to `coreTools.ts` | Marketplace UI flow preserved                   |
| Old integration-specific tools (10)    | Removed from registry   | Replaced by 6 new tools                         |
| New 6 integration tools                | Registered in builder   | Builder uses new flow                           |
| send_notification (widget built-in)    | Kept as-is              | Still works as fallback notification            |

**Migration path:** Existing widgets with marketplace integrations continue using the plugin system. New integrations created via builder chat use IntegrationConfig. Both coexist in loadWidgetTools().

**Status field lifecycle:**

- `draft` → config created, not yet tested
- `tested` → at least one successful test_integration_config call
- `active` → live on widget, tools loaded by loadWidgetTools()
- `inactive` → deactivated by user/builder, tools no longer loaded
- `error` → previously active integration that started failing at runtime (set by engine when 3+ consecutive failures occur)

---

## 10. Security Model

| Threat                         | Mitigation                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arbitrary code execution       | No code generation — config-driven JSON only                                                                                                         |
| Template injection             | Templates only resolve `{{path.to.value}}` — no expressions, no nesting                                                                              |
| SSRF (internal network access) | URL validation: HTTPS only, block private IPs (10.x, 172.16-31.x, 192.168.x, 127.x)                                                                  |
| Credential theft via logs      | Auth values excluded from all logs and error messages                                                                                                |
| Credential theft via response  | Credentials encrypted at rest (existing encrypt/decrypt)                                                                                             |
| Response flooding              | 50KB max response body per request                                                                                                                   |
| Slow API abuse                 | 10-second timeout per request                                                                                                                        |
| Excessive API calls            | Rate limit: 100 calls/minute per widget per integration (MongoDB TTL counter doc per widget+provider, checked before each engine.executeAction call) |
| Invalid config deployed        | Must pass test_integration_config before activate_integration                                                                                        |

---

## 11. Files to Create/Modify

### New Files

| File                                               | Purpose                                                                                                                                          | ~Lines |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `src/models/IntegrationConfig.ts`                  | MongoDB model for config-driven integrations                                                                                                     | ~100   |
| `src/lib/integrations/engine.ts`                   | Template resolver + HTTP executor + rate limiter                                                                                                 | ~250   |
| `src/lib/builder/tools/dynamicIntegrationTools.ts` | 6 new builder tools (research_api, create_integration, test_integration_config, activate_integration, deactivate_integration, list_integrations) | ~500   |

### Modified Files

| File                                 | Change                                                                                                                                                             | Impact              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `src/lib/widgetTools.ts`             | Add IntegrationConfig loading to loadWidgetTools()                                                                                                                 | ~30 lines added     |
| `src/lib/builder/tools/index.ts`     | Register new tools; move web_search, web_fetch, guide_user, open_connection_wizard to coreTools; stop registering old integration-specific tools                   | ~20 lines changed   |
| `src/lib/builder/tools/coreTools.ts` | Receive web_search, web_fetch, guide_user, open_connection_wizard from integrationTools                                                                            | ~200 lines moved in |
| `src/lib/builder/types.ts`           | Remove old integration tool names, add: research_api, create_integration, test_integration_config, activate_integration, deactivate_integration, list_integrations | ~15 lines changed   |
| `src/lib/builder/systemPrompt.ts`    | Replace integration instructions with new 5-step flow                                                                                                              | ~50 lines replaced  |

### Deprecated (keep file, don't register)

| File                                        | Reason                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/builder/tools/integrationTools.ts` | Integration-specific tools replaced by dynamicIntegrationTools.ts. General tools (web_search, web_fetch, guide_user, open_connection_wizard) moved to coreTools.ts |

### Codebase-wide grep required before swap

Search for all references to deprecated tool names across the codebase and update:

- SSE event handlers in frontend (tool_start/tool_result events reference AgentToolName)
- System prompt text (systemPrompt.ts may reference old tool names)
- Builder session stage logic (route.ts checks toolCallsMade for specific names)
- Frontend components that display tool-specific UI

---

## 12. Testing Strategy

### Unit Tests

- **IntegrationEngine.resolveTemplate()** — template resolution with all 3 namespaces (auth, config, input)
- **IntegrationEngine.resolveTemplate()** — optional input fields resolve to empty string, not error
- **IntegrationEngine.executeAction()** — mock HTTP, verify request construction (URL, headers, body)
- **Template validation** — missing required variables, invalid syntax, security violations
- **URL validation** — HTTPS enforcement, private IP blocking (10.x, 172.16-31.x, 192.168.x)
- **Auth header construction** — verify all 4 auth types produce correct headers
- **Rate limiter** — verify 101st call in 1 minute is rejected

### Integration Tests

- **create_integration** — validates config, encrypts credentials, saves to DB
- **create_integration** — rejects invalid template syntax, returns actionable error
- **test_integration_config** — calls engine with real (mocked) HTTP endpoint
- **activate_integration** — updates AISettings with merged prompt (plugin + config sources)
- **deactivate_integration** — removes tools from loadWidgetTools, rebuilds prompt
- **loadWidgetTools** — returns declarations from both plugins AND IntegrationConfig
- **list_integrations** — returns unified list from both systems

### E2E Test

- Full flow: create → test → activate → widget AI calls tool → HTTP request made
- Telegram test: bot token → getUpdates → sendMessage → message arrives
- Existing plugin integration still works after migration (backward compat)

---

## 13. Success Criteria

1. **"Connect Telegram" via builder chat** → real Telegram message arrives within 60 seconds
2. **No hallucination** — builder cannot claim "connected" without activate_integration returning success
3. **Any REST API** — user provides URL + API key → builder creates working integration
4. **Existing widgets unaffected** — marketplace integrations continue working
5. **Test gate** — untested integrations cannot be activated (status must be "tested")
6. **Secure** — no code execution, no SSRF, encrypted credentials
