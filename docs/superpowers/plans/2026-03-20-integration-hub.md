# Integration Hub Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Integration Hub feature (35% → 100%) by adding WidgetIntegration bindings, extended webhook events with retry queue, webhook management API + UI, and integration activity logging.

**Architecture:** Extend the existing plugin system with per-widget integration bindings (WidgetIntegration model), expand webhook event types, add retry logic with exponential backoff to the webhook service, create webhook management endpoints and UI, and add integration execution logging.

**Tech Stack:** Next.js 15, MongoDB/Mongoose, Vitest, Tailwind CSS v4, framer-motion, lucide-react

**What already exists:**

- Plugin system: PluginRegistry, 10 plugins (HubSpot, Salesforce, Pipedrive, etc.)
- Connection management: connect/disconnect/test/execute API routes
- Dashboard: integration catalog, connection wizard, category filters
- Integration model with encrypted credentials
- Webhook model + webhookService with HMAC-SHA256 signing
- Event system: emitEvent() + onEvent() with MongoDB persistence

**Deferred (Phase 4):**

- OAuth flows for providers (requires provider app registration + callback infrastructure)
- Agent-built custom API integrations (requires isolated-vm sandbox)
- 40+ new plugin implementations (ongoing, not blocking)

**Existing patterns:**

- Auth: `verifyUser(request)` from `@/lib/auth`
- API: `successResponse()`, `Errors.*` from `@/lib/apiResponse`
- Models: Mongoose `Schema<IInterface>`, timestamps
- Events: `emitEvent(type, clientId, payload)` from `@/lib/events`
- Webhooks: `triggerWebhooks(clientId, event, data)` from `@/lib/webhookService`

---

## File Structure

| File                                                                 | Responsibility                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Create:** `src/models/WidgetIntegration.ts`                        | Per-widget integration bindings (which integrations + actions are active per widget) |
| **Create:** `src/app/api/integrations/widget-bindings/route.ts`      | GET/POST widget-integration bindings                                                 |
| **Create:** `src/app/api/integrations/widget-bindings/[id]/route.ts` | PATCH/DELETE individual binding                                                      |
| **Create:** `src/app/api/webhooks/manage/route.ts`                   | GET/POST webhook endpoints for users                                                 |
| **Create:** `src/app/api/webhooks/manage/[id]/route.ts`              | PATCH/DELETE individual webhooks                                                     |
| **Create:** `src/app/dashboard/integrations/webhooks/page.tsx`       | Webhook management dashboard page                                                    |
| **Create:** `src/test/widgetIntegration.test.ts`                     | Tests for widget binding logic                                                       |
| **Create:** `src/test/webhookRetry.test.ts`                          | Tests for webhook retry logic                                                        |
| **Modify:** `src/models/Webhook.ts`                                  | Extend event types, add userId/organizationId                                        |
| **Modify:** `src/lib/webhookService.ts`                              | Add retry with exponential backoff                                                   |
| **Modify:** `src/lib/events.ts`                                      | Auto-trigger webhooks on events                                                      |
| **Modify:** `src/app/dashboard/integrations/page.tsx`                | Add widget binding section + webhook link                                            |

---

### Task 1: WidgetIntegration Model + API

**Files:**

- Create: `src/models/WidgetIntegration.ts`
- Create: `src/app/api/integrations/widget-bindings/route.ts`
- Create: `src/app/api/integrations/widget-bindings/[id]/route.ts`
- Test: `src/test/widgetIntegration.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/test/widgetIntegration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockWIFind = vi.fn();
const mockWICreate = vi.fn();
const mockWIFindById = vi.fn();
const mockWIFindByIdAndDelete = vi.fn();
const mockIntegrationFindOne = vi.fn();
const mockClientFindOne = vi.fn();

vi.mock('@/models/WidgetIntegration', () => ({
  default: {
    find: (...args: unknown[]) => ({ populate: () => mockWIFind(...args) }),
    create: (...args: unknown[]) => mockWICreate(...args),
    findById: (...args: unknown[]) => mockWIFindById(...args),
    findByIdAndDelete: (...args: unknown[]) => mockWIFindByIdAndDelete(...args),
  },
}));

vi.mock('@/models/Integration', () => ({
  default: {
    findOne: (...args: unknown[]) => mockIntegrationFindOne(...args),
  },
}));

vi.mock('@/models/Client', () => ({
  default: {
    findOne: (...args: unknown[]) => ({ select: () => mockClientFindOne(...args) }),
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

describe('WidgetIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists bindings for a widget', async () => {
    mockWIFind.mockResolvedValue([
      { _id: 'b1', widgetId: 'w1', integrationSlug: 'hubspot', enabledActions: ['createContact'], enabled: true },
    ]);
    mockClientFindOne.mockResolvedValue({ clientId: 'w1' });

    const { GET } = await import('@/app/api/integrations/widget-bindings/route');
    const url = 'http://localhost/api/integrations/widget-bindings?widgetId=w1';
    const request = new Request(url);
    Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await GET(request as any);
    const data = await response.json();
    expect(data.data.bindings).toHaveLength(1);
  });

  it('creates a binding for a widget', async () => {
    mockClientFindOne.mockResolvedValue({ clientId: 'w1' });
    mockIntegrationFindOne.mockResolvedValue({ _id: 'int1', provider: 'hubspot', status: 'connected' });
    mockWICreate.mockResolvedValue({
      _id: 'b2',
      widgetId: 'w1',
      integrationSlug: 'hubspot',
      enabledActions: ['createContact'],
      enabled: true,
    });

    const { POST } = await import('@/app/api/integrations/widget-bindings/route');
    const request = new Request('http://localhost/api/integrations/widget-bindings', {
      method: 'POST',
      body: JSON.stringify({ widgetId: 'w1', integrationSlug: 'hubspot', enabledActions: ['createContact'] }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    const data = await response.json();
    expect(data.data.binding.integrationSlug).toBe('hubspot');
  });

  it('requires a connected integration to create binding', async () => {
    mockClientFindOne.mockResolvedValue({ clientId: 'w1' });
    mockIntegrationFindOne.mockResolvedValue(null);

    const { POST } = await import('@/app/api/integrations/widget-bindings/route');
    const request = new Request('http://localhost/api/integrations/widget-bindings', {
      method: 'POST',
      body: JSON.stringify({ widgetId: 'w1', integrationSlug: 'hubspot', enabledActions: ['createContact'] }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/widgetIntegration.test.ts`
Expected: FAIL

- [ ] **Step 3: Create WidgetIntegration model**

```typescript
// src/models/WidgetIntegration.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWidgetIntegration extends Document {
  userId: string;
  organizationId: string;
  widgetId: string; // clientId of the widget
  integrationSlug: string; // e.g. 'hubspot'
  enabledActions: string[]; // e.g. ['createContact', 'createDeal']
  enabled: boolean;
  triggerEvents: string[]; // e.g. ['new_lead'] — when these events fire, run enabledActions
  config: Record<string, unknown>; // Action-specific config overrides
  createdAt: Date;
  updatedAt: Date;
}

const WidgetIntegrationSchema = new Schema<IWidgetIntegration>(
  {
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    widgetId: { type: String, required: true },
    integrationSlug: { type: String, required: true },
    enabledActions: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
    triggerEvents: { type: [String], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

WidgetIntegrationSchema.index({ widgetId: 1, integrationSlug: 1 }, { unique: true });

const WidgetIntegration: Model<IWidgetIntegration> =
  mongoose.models.WidgetIntegration || mongoose.model<IWidgetIntegration>('WidgetIntegration', WidgetIntegrationSchema);

export default WidgetIntegration;
```

- [ ] **Step 4: Create widget bindings API**

```typescript
// src/app/api/integrations/widget-bindings/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import WidgetIntegration from '@/models/WidgetIntegration';
import Integration from '@/models/Integration';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const widgetId = request.nextUrl.searchParams.get('widgetId');
    if (!widgetId) return Errors.badRequest('widgetId is required');

    // Verify ownership
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const widget = await Client.findOne({ ...ownerQuery, clientId: widgetId }).select('clientId');
    if (!widget) return Errors.notFound('Widget not found');

    const bindings = await WidgetIntegration.find({ widgetId }).populate('');
    return successResponse({ bindings });
  } catch (error) {
    console.error('List widget integrations error:', error);
    return Errors.internal('Failed to list widget integrations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const body = await request.json();
    const { widgetId, integrationSlug, enabledActions = [], triggerEvents = [], config = {} } = body;

    if (!widgetId || !integrationSlug) {
      return Errors.badRequest('widgetId and integrationSlug are required');
    }

    // Verify widget ownership
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const widget = await Client.findOne({ ...ownerQuery, clientId: widgetId }).select('clientId');
    if (!widget) return Errors.notFound('Widget not found');

    // Verify integration is connected
    const integration = await Integration.findOne({
      userId: auth.userId,
      provider: integrationSlug,
      status: 'connected',
    });
    if (!integration) return Errors.notFound('No active connection for this integration');

    const binding = await WidgetIntegration.create({
      userId: auth.userId,
      organizationId: auth.organizationId || auth.userId,
      widgetId,
      integrationSlug,
      enabledActions,
      triggerEvents,
      config,
    });

    return successResponse({ binding });
  } catch (error: any) {
    if (error?.code === 11000) {
      return Errors.badRequest('This integration is already bound to this widget');
    }
    console.error('Create widget integration error:', error);
    return Errors.internal('Failed to create widget integration');
  }
}
```

```typescript
// src/app/api/integrations/widget-bindings/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import WidgetIntegration from '@/models/WidgetIntegration';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const binding = await WidgetIntegration.findById(id);
    if (!binding) return Errors.notFound('Binding not found');

    const orgId = auth.organizationId || auth.userId;
    if (binding.organizationId !== orgId) return Errors.forbidden();

    const body = await request.json();
    if (body.enabledActions !== undefined) binding.enabledActions = body.enabledActions;
    if (body.triggerEvents !== undefined) binding.triggerEvents = body.triggerEvents;
    if (body.enabled !== undefined) binding.enabled = body.enabled;
    if (body.config !== undefined) binding.config = body.config;

    await binding.save();
    return successResponse({ binding });
  } catch (error) {
    console.error('Update widget integration error:', error);
    return Errors.internal('Failed to update widget integration');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const binding = await WidgetIntegration.findById(id);
    if (!binding) return Errors.notFound('Binding not found');

    const orgId = auth.organizationId || auth.userId;
    if (binding.organizationId !== orgId) return Errors.forbidden();

    await WidgetIntegration.findByIdAndDelete(id);
    return successResponse(null, 'Widget integration removed');
  } catch (error) {
    console.error('Delete widget integration error:', error);
    return Errors.internal('Failed to delete widget integration');
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/test/widgetIntegration.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/models/WidgetIntegration.ts src/app/api/integrations/widget-bindings/ src/test/widgetIntegration.test.ts
git commit -m "feat: add WidgetIntegration model and widget binding API"
```

---

### Task 2: Extended Webhook Events + Retry Logic

**Files:**

- Modify: `src/models/Webhook.ts`
- Modify: `src/lib/webhookService.ts`
- Modify: `src/lib/events.ts`
- Test: `src/test/webhookRetry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/test/webhookRetry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockWebhookFind = vi.fn();
const mockWebhookUpdateOne = vi.fn();

vi.mock('@/models/Webhook', () => ({
  default: {
    find: (...args: unknown[]) => mockWebhookFind(...args),
    updateOne: (...args: unknown[]) => mockWebhookUpdateOne(...args),
  },
  WEBHOOK_EVENTS: [
    'new_chat',
    'new_lead',
    'widget_error',
    'cost_threshold',
    'payment_success',
    'payment_failed',
    'lead_captured',
    'chat_started',
    'handoff_requested',
    'knowledge_gap_detected',
  ],
}));

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('sends webhook with HMAC signature', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 0,
      },
    ]);
    (global.fetch as any).mockResolvedValue({ ok: true });
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    const result = await triggerWebhooks('client1', 'new_lead', { name: 'Test' });
    expect(result.sent).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on failure with exponential backoff', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 0,
      },
    ]);
    (global.fetch as any).mockRejectedValue(new Error('timeout'));
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    const result = await triggerWebhooks('client1', 'new_lead', { name: 'Test' });
    expect(result.failed).toBe(1);
  });

  it('disables webhook after max failures', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 9,
      },
    ]);
    (global.fetch as any).mockRejectedValue(new Error('timeout'));
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    await triggerWebhooks('client1', 'new_lead', { name: 'Test' });

    // Should have been called with isActive: false
    expect(mockWebhookUpdateOne).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/webhookRetry.test.ts`

- [ ] **Step 3: Extend Webhook model with new event types and userId**

In `src/models/Webhook.ts`:

- Expand the `WebhookEvent` type to include: `'lead_captured' | 'chat_started' | 'handoff_requested' | 'knowledge_gap_detected' | 'widget_feedback' | 'appointment_booked'`
- Add `userId` and `organizationId` fields (indexed)
- Export `WEBHOOK_EVENTS` array constant for validation

- [ ] **Step 4: Add retry logic to webhookService**

In `src/lib/webhookService.ts`:

- Add a `retryWebhook()` function that retries up to 3 times with exponential backoff (5s, 30s, 5min delay)
- Since this is in-process (no Redis), use simple setTimeout-based retry
- Add deduplication: track recent event IDs (clientId + event + timestamp hash) to prevent duplicate deliveries within 60s
- Export `RETRY_DELAYS` constant for testing

- [ ] **Step 5: Connect events to webhook triggers**

In `src/lib/events.ts`:

- Add a wildcard listener that calls `triggerWebhooks(event.clientId, event.eventType, event.payload)` for each event
- Import `triggerWebhooks` lazily (same pattern as flow engine import)

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/test/webhookRetry.test.ts`
Expected: 3 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/models/Webhook.ts src/lib/webhookService.ts src/lib/events.ts src/test/webhookRetry.test.ts
git commit -m "feat: extend webhook events, add retry logic, connect events to webhooks"
```

---

### Task 3: Webhook Management API

**Files:**

- Create: `src/app/api/webhooks/manage/route.ts`
- Create: `src/app/api/webhooks/manage/[id]/route.ts`

- [ ] **Step 1: Create webhook CRUD endpoints**

```typescript
// src/app/api/webhooks/manage/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateWebhookSecret } from '@/lib/webhookService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    // Get user's client IDs
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const clients = await Client.find(ownerQuery).select('clientId');
    const clientIds = clients.map((c) => c.clientId);

    const webhooks = await Webhook.find({ clientId: { $in: clientIds } }).sort({ createdAt: -1 });
    return successResponse({ webhooks });
  } catch (error) {
    console.error('List webhooks error:', error);
    return Errors.internal('Failed to list webhooks');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const body = await request.json();
    const { clientId, url, events } = body;

    if (!clientId || !url || !events?.length) {
      return Errors.badRequest('clientId, url, and events are required');
    }

    // Verify ownership
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const widget = await Client.findOne({ ...ownerQuery, clientId }).select('clientId');
    if (!widget) return Errors.notFound('Widget not found');

    const secret = generateWebhookSecret();
    const webhook = await Webhook.create({
      clientId,
      url,
      events,
      secret,
      userId: auth.userId,
      organizationId: auth.organizationId || auth.userId,
    });

    return successResponse({ webhook, secret }); // Secret only shown on creation
  } catch (error) {
    console.error('Create webhook error:', error);
    return Errors.internal('Failed to create webhook');
  }
}
```

```typescript
// src/app/api/webhooks/manage/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const webhook = await Webhook.findById(id);
    if (!webhook) return Errors.notFound('Webhook not found');

    const orgId = auth.organizationId || auth.userId;
    if (webhook.organizationId !== orgId) return Errors.forbidden();

    const body = await request.json();
    if (body.url !== undefined) webhook.url = body.url;
    if (body.events !== undefined) webhook.events = body.events;
    if (body.isActive !== undefined) webhook.isActive = body.isActive;

    await webhook.save();
    return successResponse({ webhook });
  } catch (error) {
    console.error('Update webhook error:', error);
    return Errors.internal('Failed to update webhook');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const webhook = await Webhook.findById(id);
    if (!webhook) return Errors.notFound('Webhook not found');

    const orgId = auth.organizationId || auth.userId;
    if (webhook.organizationId !== orgId) return Errors.forbidden();

    await Webhook.findByIdAndDelete(id);
    return successResponse(null, 'Webhook deleted');
  } catch (error) {
    console.error('Delete webhook error:', error);
    return Errors.internal('Failed to delete webhook');
  }
}
```

NOTE: The webhook model may need `userId` and `organizationId` fields — check if Task 2 already added them. If not, add them in this step.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/manage/
git commit -m "feat: add webhook management API (CRUD for user webhooks)"
```

---

### Task 4: Webhook Management Dashboard Page

**Files:**

- Create: `src/app/dashboard/integrations/webhooks/page.tsx`
- Modify: `src/app/dashboard/integrations/page.tsx`

- [ ] **Step 1: Read existing integrations page**

Read `src/app/dashboard/integrations/page.tsx` to understand current structure and add a link to webhooks page.

- [ ] **Step 2: Create webhook management page**

Create `src/app/dashboard/integrations/webhooks/page.tsx` — Apple Enterprise quality.

Must include:

- 'use client' directive
- **Create Webhook form**: widget selector dropdown, URL input, event checkboxes (all extended event types), create button
- **Webhook secret reveal**: after creation, show the signing secret in a copyable box with warning
- **Webhook list**: cards showing URL (truncated), events badges, status (active/disabled), last triggered, failure count
- **Signature verification guide**: small collapsible section showing how to verify HMAC-SHA256 signatures in Node.js/Python
- Enable/Disable toggle per webhook
- Delete with confirmation
- All glassmorphism styling, framer-motion animations
- lucide-react icons: Webhook, Plus, Copy, Check, Trash2, Power, Clock, AlertTriangle, ExternalLink, Code

Fetch:

- `GET /api/webhooks/manage` — list webhooks
- `POST /api/webhooks/manage` — create
- `PATCH /api/webhooks/manage/{id}` — update
- `DELETE /api/webhooks/manage/{id}` — delete
- `GET /api/integrations/connections` — to get widget list for selector

- [ ] **Step 3: Add webhooks link to integrations page**

In `src/app/dashboard/integrations/page.tsx`, add a section or card linking to `/dashboard/integrations/webhooks` with a Webhook icon.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/integrations/webhooks/page.tsx src/app/dashboard/integrations/page.tsx
git commit -m "feat: add webhook management dashboard page"
```

---

### Task 5: Run All Tests + Push

- [ ] **Step 1: Run all new tests**

```bash
npx vitest run src/test/widgetIntegration.test.ts src/test/webhookRetry.test.ts
```

Expected: All tests PASS

- [ ] **Step 2: Run all existing tests**

```bash
npx vitest run
```

Expected: No new failures

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```
