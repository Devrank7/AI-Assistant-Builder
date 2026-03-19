# Inbox, Contacts & Flows — Design Spec

**Goal:** Add three enterprise features to WinBix AI — a unified operator inbox with AI copilot, an auto-populated CRM with lead scoring, and a linear automation builder with templates.

**Architecture:** Event-driven. A lightweight internal event bus (`lib/events.ts`) decouples all three features. Webhooks and chat API emit events; Inbox, Contacts, and Flows consume them independently. Real-time delivery via SSE. MongoDB for persistence. Zero changes to existing collections or pages.

**Tech Stack:** Next.js 15 API routes, MongoDB/Mongoose, Server-Sent Events, Google Gemini (for AI suggested replies), existing `verifyUser()` auth.

---

## 1. Data Model

### 1.1 conversations collection

Wraps existing chatlog sessions. One document per chat thread.

```typescript
{
  conversationId: string;        // unique ID (nanoid)
  clientId: string;              // which widget
  contactId: string;             // → contacts collection
  sessionId: string;             // → existing chatlogs (links message history)
  channel: "web" | "telegram" | "whatsapp" | "instagram";
  status: "bot" | "handoff" | "assigned" | "resolved" | "closed";
  assignedTo: string | null;     // userId of operator
  handoffReason: string | null;  // "low_confidence" | "negative_sentiment" | "user_request" | "high_value"
  lastMessage: {
    text: string;
    sender: "visitor" | "bot" | "operator";
    timestamp: Date;
  };
  unreadCount: number;
  aiSuggestedReply: string | null;
  metadata: {
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ clientId: 1, status: 1 }`, `{ contactId: 1 }`, `{ assignedTo: 1, status: 1 }`

### 1.2 contacts collection

Auto-created on first message. One document per unique visitor per widget.

```typescript
{
  contactId: string;             // unique ID (nanoid)
  clientId: string;              // belongs to which widget/business
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;               // primary channel
  channelIds: {
    telegram?: string;           // telegram user ID
    whatsapp?: string;           // whatsapp phone
    instagram?: string;          // instagram user ID
    web?: string;                // visitor cookie ID
  };
  tags: string[];
  leadScore: number;             // 0-100
  leadTemp: "cold" | "warm" | "hot";
  scoreBreakdown: Array<{ reason: string; points: number }>;
  totalConversations: number;
  totalMessages: number;
  lastSeenAt: Date;
  firstSeenAt: Date;
  customFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ clientId: 1, leadScore: -1 }`, `{ clientId: 1, "channelIds.telegram": 1 }`, `{ clientId: 1, "channelIds.whatsapp": 1 }`, `{ clientId: 1, tags: 1 }`

**Lead temperature thresholds:** 0-30 = cold, 31-65 = warm, 66-100 = hot.

### 1.3 flows collection

Automation definition. Linear chain: trigger → conditions → actions.

```typescript
{
  flowId: string;
  clientId: string;
  userId: string; // creator
  name: string;
  status: 'active' | 'paused' | 'draft';
  trigger: {
    type: string; // event type from event bus
    conditions: Array<{
      field: string; // "leadScore", "channel", "tag", "messageText", "conversationsCount", "hasEmail"
      operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
      value: string | number;
    }>;
  }
  steps: Array<{
    type: 'action' | 'delay';
    action?: string; // "send_message" | "send_notification" | "add_tag" | "remove_tag" | "change_score" | "assign_operator"
    config: Record<string, any>; // action-specific config (message template, tag name, score delta, etc.)
    delayMinutes?: number; // for delay steps
  }>;
  templateId: string | null;
  stats: {
    timesTriggered: number;
    lastTriggeredAt: Date | null;
  }
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ clientId: 1, status: 1 }`, `{ "trigger.type": 1, status: 1 }`

### 1.4 flow_executions collection

Log of each flow run.

```typescript
{
  executionId: string;
  flowId: string;
  contactId: string;
  conversationId: string | null;
  trigger: {
    type: string;
    data: Record<string, any>;
  }
  stepsExecuted: Array<{
    stepIndex: number;
    status: 'completed' | 'failed' | 'skipped';
    result?: string;
    timestamp: Date;
  }>;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  scheduledAt: Date | null; // for delay steps — when to resume execution
  remainingSteps: Array<{
    // steps not yet executed (stored when pausing for delay)
    type: 'action' | 'delay';
    action?: string;
    config: Record<string, any>;
    delayMinutes?: number;
  }>;
  createdAt: Date;
}
```

**Indexes:** `{ flowId: 1, createdAt: -1 }`, `{ createdAt: 1 }` (TTL: 30 days)

### 1.5 events collection

Internal event bus persistence. Drives Flows, SSE, and analytics.

```typescript
{
  eventType: string; // "message:received", "conversation:handoff", etc.
  clientId: string;
  payload: Record<string, any>;
  createdAt: Date; // TTL index: auto-delete after 7 days
}
```

**Indexes:** `{ clientId: 1, eventType: 1, createdAt: -1 }`, `{ createdAt: 1 }` (TTL: 7 days)

### 1.6 Relationship to existing collections

- **chatlogs** — untouched. `conversations.sessionId` references chatlog session for message history.
- **clients** — untouched. `conversations.clientId` and `contacts.clientId` reference client widgets.
- **aisettings** — read by AI suggest-reply to get widget's knowledge base config.
- **knowledgechunks** — read by AI suggest-reply for RAG context.
- **users** — `conversations.assignedTo` references user IDs from existing auth.

---

## 2. Event Bus Architecture

### 2.1 Module: `src/lib/events.ts`

Central event bus. Two mechanisms:

1. **MongoDB persistence** — every event written to `events` collection (for Flows matching, audit trail)
2. **In-process EventEmitter** — for same-process SSE listeners (real-time delivery without polling)

```typescript
// Public API
emitEvent(type: string, clientId: string, payload: object): Promise<void>
onEvent(type: string, handler: (event) => void): void
offEvent(type: string, handler): void
```

`emitEvent` does three things:

1. Writes to `events` collection
2. Emits on in-process EventEmitter (for SSE)
3. Calls `processFlowTriggers(event)` to check active flows

### 2.2 Event types

| Event                   | Emitted by                       | Payload                                                |
| ----------------------- | -------------------------------- | ------------------------------------------------------ |
| `message:received`      | Webhook handlers, chat API       | `{ conversationId, contactId, channel, text, sender }` |
| `message:sent`          | Chat stream API, inbox reply API | `{ conversationId, contactId, channel, text, sender }` |
| `conversation:handoff`  | Handoff detection logic          | `{ conversationId, contactId, reason }`                |
| `conversation:resolved` | Inbox PATCH API                  | `{ conversationId, contactId, resolvedBy }`            |
| `contact:created`       | Contact auto-creation logic      | `{ contactId, channel, name }`                         |
| `contact:score_changed` | Lead scoring logic               | `{ contactId, oldScore, newScore, reason }`            |

### 2.3 Integration points (existing code changes)

Minimal additions to existing files — one `emitEvent()` call each:

- `src/app/api/webhooks/telegram/route.ts` — after processing incoming message, emit `message:received`
- `src/app/api/webhooks/whatsapp/route.ts` — same
- `src/app/api/webhooks/instagram/route.ts` — same
- `src/app/api/chat/stream/route.ts` — after bot response, emit `message:sent`
- `src/app/api/chat/route.ts` — after web chat message, emit `message:received`

Each change is a single line addition. No existing logic modified.

---

## 3. Inbox

### 3.1 Handoff detection

Module: `src/lib/inbox/handoff.ts`

Analyzes each incoming message and decides if handoff is needed. Four triggers:

| Trigger            | Detection method                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User request       | Keywords: "human", "operator", "person", "agent", "real person", "живой", "оператор" (multi-language)                                                                                     |
| Low confidence     | Bot fails to use any knowledge chunk (RAG returns zero relevant results) for 2+ consecutive messages. Detected by checking if the bot's response was generated without grounding context. |
| Negative sentiment | Simple keyword + pattern matching: negative words, ALL CAPS, excessive punctuation (!!!, ???)                                                                                             |
| High value lead    | Contact lead score > 80 AND conversation mentions pricing/enterprise/demo keywords                                                                                                        |

When triggered:

1. Update conversation status to "handoff"
2. Set `handoffReason`
3. Emit `conversation:handoff` event
4. Bot sends a transitional message: "Let me connect you with a team member..."

### 3.2 AI Suggested Reply

Module: `src/lib/inbox/suggestReply.ts`

When operator opens a handoff conversation:

1. Fetch last 10 messages from chatlog
2. Fetch top 5 relevant knowledge chunks (same RAG as bot uses)
3. Call Gemini with prompt: "You are an operator assistant. Based on the conversation and knowledge base, suggest a helpful reply."
4. Store suggestion in `conversations.aiSuggestedReply`
5. Return to frontend

Triggered on-demand via `POST /api/inbox/suggest-reply` (not automatic — saves API credits).

### 3.3 Operator reply routing

When operator sends a reply via `POST /api/inbox/conversations/[id]/reply`:

1. Determine conversation channel
2. Route to appropriate sender:
   - **Web:** Push message to chatlog, SSE delivers to widget
   - **Telegram:** Call Telegram Bot API `sendMessage`
   - **WhatsApp:** Call WHAPI `sendMessage`
   - **Instagram:** Call Instagram API `sendMessage`
3. Emit `message:sent` event
4. Update `conversations.lastMessage`

### 3.4 UI: Three-panel layout

Route: `/dashboard/inbox`

- **Left panel (320px):** Conversation list with filter tabs (All / Unassigned / Mine / Resolved), search, channel filter. Each item shows: contact name, last message preview, status badge, lead temperature, channel icon, timestamp, unread dot.
- **Center panel (flex):** Chat thread. Messages with sender labels and timestamps. Handoff banner. Action buttons: "Assign to me", "Resolve". AI suggested reply block between chat and input.
- **AI Suggested Reply block:** Shown when available. Three actions: "Use this reply" (send as-is), "Edit & send" (insert into input), "Dismiss".

### 3.5 Real-time: SSE stream

`GET /api/inbox/stream?clientId=xxx`

Uses Server-Sent Events (same pattern as existing `/api/admin/notifications/stream`). Events streamed:

- `new_message` — new message in any conversation
- `handoff` — bot transferred a conversation
- `conversation_updated` — status/assignment change

Frontend uses `EventSource` API with auto-reconnect.

---

## 4. Contacts

### 4.1 Auto-creation

When `message:received` event fires, contact updater checks:

1. Does a contact exist for this `channelId` + `clientId`?
2. If no → create new contact, emit `contact:created`
3. If yes → update `lastSeenAt`, increment `totalMessages`

Contact identity is per-channel-per-widget. A Telegram user talking to Widget A and Widget B creates two separate contacts.

### 4.2 Lead scoring

Module: `src/lib/contacts/scoring.ts`

Rule-based scoring. Recalculated on each `message:received`:

| Signal              | Points | Detection                                                             |
| ------------------- | ------ | --------------------------------------------------------------------- |
| Asked about pricing | +25    | Keywords: "price", "cost", "pricing", "how much", "цена", "стоимость" |
| Left email          | +15    | Email regex detected in any message                                   |
| Left phone          | +10    | Phone regex detected in any message                                   |
| Returning visitor   | +20    | `totalConversations >= 2`                                             |
| 5+ messages         | +12    | `totalMessages >= 5`                                                  |
| Requested human     | +15    | Handoff with reason "user_request"                                    |
| From paid ads       | +10    | `metadata.referrer` contains utm_source                               |

Score is capped at 100. Temperature thresholds: cold (0-30), warm (31-65), hot (66-100).

When score crosses a threshold boundary, emit `contact:score_changed`.

### 4.3 UI: Two-panel layout

Route: `/dashboard/contacts`

- **Left panel (380px):** Stats bar (Total / Hot / Warm / New today). Search, filters (score, tags, channel). Contact list with avatar (gradient initials), name, email, lead score badge, tags.
- **Right panel (flex):** Contact profile. Avatar, name, contact info. Lead score with breakdown (which rules contributed points). Tags (view/add/remove). Activity timeline: vertical line with event dots (conversation started, score changed, handoff, tag added, etc.).

Clicking a conversation in the timeline opens it in Inbox.

---

## 5. Flows

### 5.1 Flow engine

Module: `src/lib/flows/engine.ts`

Called by `emitEvent()` after every event:

1. Query active flows where `trigger.type` matches `event.eventType` and `clientId` matches
2. For each matching flow, evaluate `trigger.conditions` against event payload + contact data
3. If all conditions pass, execute `steps` sequentially:
   - **action steps:** execute immediately (send message, add tag, etc.)
   - **delay steps:** store pending execution in `flow_executions` with `scheduledAt` and `remainingSteps`, cron polls every minute (see Section 5.5)
4. Write execution log to `flow_executions`
5. Update `flow.stats`

### 5.2 Available actions

| Action              | Config                                     | Effect                                                                                   |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `send_message`      | `{ message: string }`                      | Send to contact via their primary channel (`contact.channel`). Supports `{{variables}}`. |
| `send_notification` | `{ message: string, channel: "telegram" }` | Notify operator via Telegram (uses existing `/api/telegram/notify`).                     |
| `add_tag`           | `{ tag: string }`                          | Add tag to contact.                                                                      |
| `remove_tag`        | `{ tag: string }`                          | Remove tag from contact.                                                                 |
| `change_score`      | `{ delta: number }`                        | Add/subtract from lead score. Emit `contact:score_changed` if threshold crossed.         |
| `assign_operator`   | `{ userId: string }`                       | Assign conversation to specific operator.                                                |

### 5.3 Template variables

Templates use `{{double_braces}}` syntax, resolved at execution time:

- `{{contact.name}}`, `{{contact.email}}`, `{{contact.phone}}`
- `{{contact.leadScore}}`, `{{contact.leadTemp}}`
- `{{contact.channel}}`
- `{{conversation.lastMessage}}`
- `{{trigger.reason}}`
- `{{widget.name}}`

### 5.4 Built-in templates

4 templates shipped by default:

1. **Hot Lead Alert** — trigger: `contact:score_changed`, condition: score > 80, action: send Telegram notification
2. **Follow-up After Silence** — trigger: `conversation:resolved`, delay: 24h, re-evaluate condition: `contact.lastSeenAt` still older than 24h (no new message), action: send follow-up message. If contact messaged during the delay, execution is skipped.
3. **Welcome Sequence** — trigger: `contact:created`, action: add "new" tag, delay: 1h, action: send welcome message
4. **Auto-Tag by Topic** — trigger: `message:received`, condition: message contains "pricing", action: add "pricing-asked" tag

Note: Time-based/cron triggers (e.g., "Daily Digest") are out of scope for v1. All triggers are event-driven.

### 5.5 Delay execution and post-delay re-evaluation

For delay steps, the flow engine uses a cron-based approach (not `setTimeout`, which does not survive serverless function lifecycle):

1. When a delay step is reached, the engine writes a `flow_executions` document with `status: "pending"`, `scheduledAt` timestamp, and `remainingSteps` (all steps after the delay)
2. A cron endpoint `POST /api/cron/flow-scheduler` (called every minute by external cron or Vercel cron) queries pending executions where `scheduledAt <= now`
3. Before executing remaining steps, the scheduler **re-evaluates the flow's trigger conditions** against the current contact/conversation state. This handles the "Follow-up After Silence" pattern: if the contact messaged during the delay, the condition `contact.lastSeenAt > scheduledAt` fails and the execution is skipped.
4. If conditions still pass, executes remaining steps and updates execution status to "completed". If conditions fail, marks as "skipped".

### 5.6 UI: List + Editor

**List page** (`/dashboard/flows`):

- Header with active/paused/execution counts
- Template banner: horizontal scroll of 5 template cards
- Flow cards: status dot, name, human-readable step description, execution count, kebab menu (edit, pause/activate, delete)

**Editor page** (`/dashboard/flows/[id]` or `/dashboard/flows/new`):

- Flow name input
- Vertical step chain with connector lines
- Step 1 (blue): Trigger — dropdown of event types
- Step 2 (orange): Condition — field + operator + value dropdowns, "+ Add condition (AND)"
- Step 3+ (green): Action — action type dropdown + config panel (message template, tag name, etc.)
- "+" button to add more steps
- "Save & Activate" / "Save as Draft" / "Cancel"

---

## 6. API Endpoints

### 6.1 Inbox

| Method | Path                                  | Auth | Description                                                                                         |
| ------ | ------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| GET    | `/api/inbox/conversations`            | user | List conversations. Query: `status`, `channel`, `assignedTo`, `clientId`, `search`, `page`, `limit` |
| GET    | `/api/inbox/conversations/[id]`       | user | Get conversation detail with last 50 messages                                                       |
| PATCH  | `/api/inbox/conversations/[id]`       | user | Update: `status`, `assignedTo`                                                                      |
| POST   | `/api/inbox/conversations/[id]/reply` | user | Operator reply. Body: `{ text }`. Routes to correct channel.                                        |
| GET    | `/api/inbox/stream`                   | user | SSE stream. Query: `clientId`                                                                       |
| POST   | `/api/inbox/suggest-reply`            | user | Generate AI reply. Body: `{ conversationId }`                                                       |

### 6.2 Contacts

| Method | Path                  | Auth | Description                                                                                            |
| ------ | --------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/api/contacts`       | user | List contacts. Query: `clientId`, `minScore`, `maxScore`, `tags`, `channel`, `search`, `page`, `limit` |
| GET    | `/api/contacts/[id]`  | user | Get contact profile + activity timeline                                                                |
| PATCH  | `/api/contacts/[id]`  | user | Update: `tags`, `customFields`, `name`, `email`, `phone`                                               |
| GET    | `/api/contacts/stats` | user | Aggregate counts: total, hot, warm, cold, new today. Query: `clientId`                                 |

### 6.3 Flows

| Method | Path                         | Auth   | Description                               |
| ------ | ---------------------------- | ------ | ----------------------------------------- |
| GET    | `/api/flows`                 | user   | List flows. Query: `clientId`, `status`   |
| POST   | `/api/flows`                 | user   | Create flow. Body: full flow object       |
| PATCH  | `/api/flows/[id]`            | user   | Update flow (steps, status, name)         |
| DELETE | `/api/flows/[id]`            | user   | Delete flow and its executions            |
| GET    | `/api/flows/templates`       | public | Get built-in templates                    |
| GET    | `/api/flows/[id]/executions` | user   | Execution history. Query: `page`, `limit` |

### 6.4 Internal

| Method | Path                       | Auth | Description                      |
| ------ | -------------------------- | ---- | -------------------------------- |
| POST   | `/api/cron/flow-scheduler` | cron | Process pending delay executions |

---

## 7. Sidebar Navigation Changes

Three new items added to the dashboard sidebar:

```
MAIN
├── Overview
├── Inbox              ← NEW (icon: Mail, badge: unread handoff count)
├── Contacts           ← NEW (icon: Users)
├── My Widgets
├── My Chats

BUILD
├── AI Builder
├── Flows              ← NEW (icon: Workflow)
├── Integrations
├── Installation
```

Implementation: Add entries to the `navItems` array in `src/app/dashboard/layout.tsx`. No structural changes.

---

## 8. Frontend Quality Requirement

All new pages must meet **Apple Enterprise** level design quality:

- Glassmorphism effects where appropriate
- Micro-animations (transitions, hover states, loading states)
- Perfect typography hierarchy and spacing
- Responsive design (desktop-first, mobile-functional)
- Light and dark theme support using existing CSS variable system
- Consistent with existing dashboard aesthetic but elevated

---

## 9. Non-goals (out of scope)

- Unified contact identity across channels (identity resolution)
- Visual drag-and-drop flow canvas
- External integrations in flows (webhooks, email SMTP, Google Sheets)
- Manual contact creation or CSV import
- AI-based lead scoring (Gemini analysis per message)
- Round-robin or skill-based operator assignment
- Conversation summary / full copilot sidebar
- SSO/SAML authentication

These can be added in future iterations.

---

## 10. Migration & Backwards Compatibility

- **Zero breaking changes.** All existing collections, APIs, and pages remain untouched.
- New collections are additive. No schema changes to existing models.
- Existing webhooks get one additional line (`emitEvent`) — all current behavior preserved.
- Old chatlogs continue to work independently. Conversations collection is a new layer on top.
- Sidebar additions are purely additive — existing nav items unchanged.
