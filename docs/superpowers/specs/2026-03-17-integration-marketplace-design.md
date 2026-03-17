# Integration Marketplace — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Phase:** 1 of 3 (Marketplace → AI Builder Integration → Workflow Engine)

---

## 1. Overview

An enterprise-grade integration marketplace for WinBix AI that allows users to connect third-party services (CRM, calendars, payments, notifications, data tools) to their AI chat widgets. Integrations are connected at the account level and activated per-widget through the AI Builder.

### Key Principles

- **Account-level connections** — connect once, use across all widgets
- **AI-first integration** — AI Builder is aware of all connections and proactively suggests, attaches, diagnoses, and even connects new integrations in-chat
- **Plugin architecture** — each integration is a self-contained plugin with a standard interface
- **API Key auth only** (MVP) — OAuth 2.0 deferred to Phase 2

---

## 2. Data Model

### 2.1 `integrations` Collection (Static Registry)

Stores the catalog of all available integrations. Populated from plugin manifests.

```typescript
{
  _id: ObjectId,
  slug: string,                // unique ID, e.g. "hubspot"
  name: string,                // "HubSpot"
  category: "crm" | "calendar" | "payment" | "notification" | "data",
  description: string,
  icon: string,                // path to SVG icon
  authType: "api_key",
  authFields: [
    { key: string, label: string, type: "password" | "text", required: boolean }
  ],
  actions: [
    {
      id: string,              // "createContact"
      name: string,            // "Create Contact"
      description: string,
      inputSchema: Record<string, string>  // { name: "string", email: "string", phone: "string?" }
    }
  ],
  healthEndpoint: string,      // for health checks
  docsUrl: string,
  status: "active" | "coming_soon" | "deprecated"
}
```

### 2.2 `connections` Collection (User Connections)

Stores each user's connected integrations with encrypted credentials.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  integrationSlug: string,
  credentials: Record<string, string>,  // AES-256-GCM encrypted
  status: "connected" | "error" | "disconnected",
  lastHealthCheck: Date,
  lastError: string | null,
  aiDiagnostic: string | null,          // suggestion for AI Builder
  connectedAt: Date
}
```

### 2.3 `widgetIntegrations` Collection (Widget Bindings)

Maps which integrations are active for which widgets, with per-widget configuration.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,            // required for ownership checks on all queries
  widgetId: string,            // clientId
  connectionId: ObjectId,
  integrationSlug: string,
  enabled: boolean,
  enabledActions: string[],    // ["createContact", "createDeal"]
  config: {
    fieldMapping: Record<string, string>,
    aiInstruction: string      // natural language instruction for AI
  }
}
```

### 2.4 Data Flow

1. AI Builder queries `connections` for user → knows what's connected
2. Reads `actions` from `integrations` → knows what's possible
3. Creates `widgetIntegrations` record → binds integration to widget
4. At runtime, widget AI calls `plugin.execute(action, params)` → plugin makes API call

---

## 3. Plugin Architecture

### 3.1 Plugin Interface

```typescript
// src/integrations/core/PluginInterface.ts

export interface IntegrationPlugin {
  manifest: PluginManifest;

  connect(credentials: Record<string, string>): Promise<ConnectionResult>;
  disconnect(connectionId: string): Promise<void>;
  testConnection(credentials: Record<string, string>): Promise<HealthResult>;
  healthCheck(credentials: Record<string, string>): Promise<HealthResult>;

  execute(action: string, params: Record<string, any>, credentials: Record<string, string>): Promise<ExecutionResult>;

  describeCapabilities(): string;
}

export interface PluginManifest {
  slug: string;
  name: string;
  category: 'crm' | 'calendar' | 'payment' | 'notification' | 'data';
  description: string;
  icon: string;
  authFields: AuthField[];
  actions: ActionDefinition[];
  healthEndpoint?: string;
  docsUrl?: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  retryable?: boolean;
  suggestion?: string; // AI-readable diagnostic
}
```

### 3.2 Plugin File Structure

```
src/integrations/
  core/
    PluginInterface.ts     # Contract definition
    PluginRegistry.ts      # Auto-discovery and registration
    HealthMonitor.ts       # Cron-based health checks
    encryption.ts          # AES-256-GCM credential encryption
  plugins/
    hubspot/
      manifest.json        # Metadata, icon, category, actions
      index.ts             # implements IntegrationPlugin
      actions/
        createContact.ts
        createDeal.ts
        searchContacts.ts
      utils.ts
    salesforce/
      ...
    google-calendar/
      ...
```

### 3.3 Plugin Registry

```typescript
// src/integrations/core/PluginRegistry.ts

class PluginRegistry {
  private plugins: Map<string, IntegrationPlugin>;

  async loadAll(): Promise<void>; // scan plugins/ directory
  get(slug: string): IntegrationPlugin; // get by slug
  getAllManifests(): PluginManifest[]; // for marketplace UI
  getConnectedManifests(userId: string): Promise<PluginManifest[]>; // for AI Builder
  async executeAction(
    slug: string,
    action: string,
    params: any,
    userId: string,
    widgetId: string
  ): Promise<ExecutionResult>;
  // Validates (widgetId, slug, action) triple in widgetIntegrations.enabledActions before execution
}

export const pluginRegistry = new PluginRegistry();
```

### 3.4 Health Monitor

```typescript
// src/integrations/core/HealthMonitor.ts

class HealthMonitor {
  private static CONCURRENCY_LIMIT = 20; // max parallel health checks
  private static running = false;

  // Runs every 30 minutes via cron
  async checkAll(): Promise<void> {
    if (HealthMonitor.running) return; // skip if previous run still active
    HealthMonitor.running = true;

    try {
      const connections = await Connection.find({ status: 'connected' });
      // Process in parallel with concurrency limit (p-limit)
      const limit = pLimit(HealthMonitor.CONCURRENCY_LIMIT);
      await Promise.all(
        connections.map((conn) =>
          limit(async () => {
            const plugin = pluginRegistry.get(conn.integrationSlug);
            const result = await plugin.healthCheck(decrypt(conn.credentials));

            if (!result.healthy) {
              conn.status = 'error';
              conn.lastError = result.error;
              conn.aiDiagnostic = result.suggestion;
            }
            conn.lastHealthCheck = new Date();
            await conn.save();
          })
        )
      );
    } finally {
      HealthMonitor.running = false;
    }
  }
}
```

### 3.5 Credential Encryption

```typescript
// src/integrations/core/encryption.ts
// AES-256-GCM via Node.js crypto
// Key from .env.local: INTEGRATION_ENCRYPTION_KEY

encrypt(plaintext: string): string   // → "v1:iv:ciphertext:tag"
decrypt(encrypted: string): string   // → plaintext
// Version prefix (v1) enables future key rotation:
// - New encryptions use current key version
// - Decryption reads version prefix to select correct key
// - Rotation: bump version, re-encrypt active connections in background
```

All API Keys are stored encrypted in MongoDB. Decryption only at execution time. The version prefix ensures forward-compatible key rotation without data loss.

---

## 4. UI Design

### 4.1 New Page: `/dashboard/integrations`

**Navigation:** New sidebar item "Integrations" with `Plug` icon (lucide), between "My Chats" and "Billing".

**Page Layout:**

```
┌──────────────────────────────────────────────────┐
│  Integrations Marketplace                        │
│  "Connect your favorite tools"       [Search...] │
├──────────────────────────────────────────────────┤
│  [Connected: 4]   [Available: 23]   [Errors: 1] │
├──────────────────────────────────────────────────┤
│  [All] [CRM] [Calendar] [Payments]               │
│  [Notifications] [Data]                          │
├──────────────────────────────────────────────────┤
│  Card grid (3 columns, responsive)               │
│  Each card: icon, name, category badge,          │
│  description, action button                      │
└──────────────────────────────────────────────────┘
```

### 4.2 Integration Card States

**Available (not connected):**

- Provider icon, name, category badge
- Short description
- "Connect" button (primary)

**Connected:**

- Green "Connected" badge with pulsing dot
- "Connected 3 days ago"
- "Used by 2 widgets"
- "Settings" / "Disconnect" buttons

**Error:**

- Red "Error" badge with warning icon
- Error text: "API Key expired"
- "Fix" button (amber) → opens modal with AI suggestion

**Coming Soon:**

- Greyed out card, muted icon
- "Coming Soon" badge
- "Notify Me" button (outline)

### 4.3 Connection Wizard (Modal)

4-step wizard with progress bar and Framer Motion animations:

**Step 1 — Credentials:**

- Provider icon + description
- Input fields from `authFields` manifest
- API Key field with visibility toggle
- [Cancel] [Test Connection →]

**Step 2 — Testing:**

- Animated spinner
- Sequential status checks with checkmarks
- Success: "Authentication successful", "Found 1,247 contacts"
- Failure: "Invalid API Key" + [Retry]
- [← Back] [Continue →]

**Step 3 — Available Actions:**

- Checkboxes for each action from manifest
- Description for each action
- [← Back] [Complete Setup →]

**Step 4 — Success:**

- Success animation (checkmark)
- "HubSpot is now connected"
- "Go to AI Builder to add it to your widgets"
- [Open AI Builder] [Done]

### 4.4 Design System Consistency

- **Syne** font for headings
- **Framer Motion** staggerContainer/staggerItem for card grid
- **Gradient accent lines** per category: CRM=blue, Calendar=violet, Payment=green, Notification=amber, Data=cyan
- **StatCards** matching Overview/Chats/Widgets pattern
- **Category pills** matching Chats/Widgets filter pattern
- **Modal** with spring animation and backdrop blur

---

## 5. AI Builder Integration

### 5.1 Context Injection

When user opens AI Builder, the system loads their connections and injects into the AI system prompt:

```
User's connected integrations:

1. HubSpot (CRM) — status: connected
   Available actions: createContact, createDeal, searchContacts

2. Google Calendar — status: connected
   Available actions: getSlots, createEvent, cancelEvent

3. Stripe — status: error
   Error: "API Key expired"
   Recommendation: "Ask user to update key in integration settings"
```

### 5.2 Three Scenarios

**Scenario 1: AI suggests existing integration**

- User builds a widget, AI detects relevant connected integration
- AI proactively asks: "You have Google Calendar connected. Want the bot to book appointments?"
- On confirmation → creates `widgetIntegration` record

**Scenario 2: AI offers to connect new integration**

- User needs functionality requiring an unconnected service
- AI explains options, asks which provider
- AI triggers the Connection Wizard modal (via `open_connection_wizard` tool) — user enters credentials securely in the modal, never in the chat
- Credentials are submitted directly from modal to `/api/integrations/connect`, bypassing the AI conversation entirely
- On success, AI receives confirmation and creates `widgetIntegration` binding

**Scenario 3: Multiple similar integrations**

- User has 2+ CRMs connected
- AI asks: "You have HubSpot and Salesforce. Which one for this widget?"

### 5.3 AI Diagnostics

- AI Builder checks connection statuses on chat open
- If `status: "error"`, AI proactively notifies user with diagnostic and fix options
- Uses `aiDiagnostic` field from health monitor

### 5.4 New AI Builder Tools

```typescript
// src/lib/builder/tools/integrationTools.ts

tools: [
  { name: 'list_user_integrations' },
  { name: 'open_connection_wizard', params: { slug } },
  // Opens the Connection Wizard modal in the UI. Credentials are entered
  // securely in the modal and never pass through the AI conversation.
  { name: 'attach_integration_to_widget', params: { connectionId, actions, config } },
  { name: 'execute_integration_action', params: { widgetId, slug, action, params } },
  // execute_integration_action MUST validate that (widgetId, slug, action)
  // exists in widgetIntegrations.enabledActions before execution.
  { name: 'check_integration_health', params: { connectionId } },
];
```

---

## 6. MVP Integration Catalog

### 6.1 Phase 1 — P0 (10 integrations)

**CRM:**

- HubSpot — createContact, createDeal, searchContacts
- Salesforce — createLead, createOpportunity, searchAccounts
- Pipedrive — createPerson, createDeal, searchPersons

**Calendar:**

- Google Calendar — getSlots, createEvent, cancelEvent
- Calendly — getEventTypes, getAvailability, createInvitee

**Payment:**

- Stripe — createPaymentLink, checkPayment, listProducts

**Notification:**

- Telegram — sendMessage, sendPhoto
- WhatsApp (WHAPI) — sendMessage, sendTemplate
- Email (SMTP) — sendEmail

**Data:**

- Google Sheets — appendRow, readRange, searchRows

### 6.2 Phase 2 — P1 (8 integrations)

Zoho CRM, Bitrix24, Monday CRM, Cal.com, Microsoft Outlook, PayPal, Slack, Notion

### 6.3 Phase 3 — P2 (5 integrations)

Freshsales, Close, Copper, Insightly, Payoneer

---

## 7. API Endpoints

```
GET    /api/integrations               — catalog (from manifests)
GET    /api/integrations/connections    — user's connections
POST   /api/integrations/connect       — connect { slug, credentials }
POST   /api/integrations/test          — test connection { slug, credentials }
POST   /api/integrations/execute       — execute action { widgetId, slug, action, params }
DELETE /api/integrations/disconnect     — disconnect { connectionId }
GET    /api/integrations/health        — health status for all user connections
POST   /api/integrations/widget-attach — bind to widget { widgetId, connectionId, actions, config }
GET    /api/integrations/widget/:id    — integrations for specific widget
```

---

## 8. Security

- All credentials encrypted at rest with AES-256-GCM with versioned key prefix (`v1:iv:ciphertext:tag`)
- Encryption key in `.env.local` (`INTEGRATION_ENCRYPTION_KEY`), version prefix enables rotation
- Decryption only at execution time, never exposed to frontend
- **Credentials never pass through AI conversation** — Scenario 2 uses modal → direct API submission
- API endpoints require authenticated session (`userId` from session)
- **All write/read operations on `connections` and `widgetIntegrations` must filter by `userId` from session** — never trust client-supplied IDs alone
- `execute_integration_action` validates `(widgetId, slug, action)` triple exists in `widgetIntegrations.enabledActions` before execution
- Rate limiting on `/connect` (10/min/user) and `/execute` (60/min/user) endpoints, 429 response with Retry-After header
- Health check results cached (30-min TTL) to prevent excessive API calls
- Health monitor uses skip-if-running guard and concurrency limit (20 parallel) to prevent overlap and overload

---

## 9. Future Considerations (Post-MVP)

- **OAuth 2.0** support for major providers (HubSpot, Salesforce, Google)
- **Workflow Engine** — visual builder for multi-step automation chains
- **Custom API integrations** — AI writes integration code for non-standard APIs
- **Webhook receiver** — incoming webhooks from external services trigger widget actions
- **Integration marketplace for community** — users publish custom plugins
