# Event Bus + Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation layer (event bus, 5 MongoDB models) and the Contacts feature (auto-creation, lead scoring, API, UI page) that Inbox and Flows depend on.

**Architecture:** Event-driven internal bus (`lib/events.ts`) using MongoDB persistence + in-process EventEmitter for SSE. Contacts are auto-created from chat events, scored by rule-based engine. New dashboard page at `/dashboard/contacts`.

**Tech Stack:** Next.js 15 API routes, MongoDB/Mongoose, TypeScript, Tailwind CSS v4, Vitest, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-03-20-inbox-contacts-flows-design.md`

---

## File Structure

### New files

| File                                  | Responsibility                                |
| ------------------------------------- | --------------------------------------------- |
| `src/models/Conversation.ts`          | Mongoose model for conversations collection   |
| `src/models/Contact.ts`               | Mongoose model for contacts collection        |
| `src/models/Flow.ts`                  | Mongoose model for flows collection           |
| `src/models/FlowExecution.ts`         | Mongoose model for flow_executions collection |
| `src/models/Event.ts`                 | Mongoose model for events collection (TTL 7d) |
| `src/lib/events.ts`                   | Event bus: emitEvent(), onEvent(), offEvent() |
| `src/lib/contacts/scoring.ts`         | Lead scoring rules engine                     |
| `src/lib/contacts/autoCreate.ts`      | Contact auto-creation + update on message     |
| `src/app/api/contacts/route.ts`       | GET list contacts                             |
| `src/app/api/contacts/[id]/route.ts`  | GET detail, PATCH update                      |
| `src/app/api/contacts/stats/route.ts` | GET aggregate stats                           |
| `src/app/dashboard/contacts/page.tsx` | Contacts UI page                              |
| `src/test/events.test.ts`             | Event bus unit tests                          |
| `src/test/contacts-scoring.test.ts`   | Lead scoring unit tests                       |

### Modified files

| File                           | Change                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| `src/app/dashboard/layout.tsx` | Add Inbox, Contacts, Flows to sidebar nav                             |
| `src/middleware.ts`            | Add `/api/contacts`, `/api/inbox`, `/api/flows` to auth-checked paths |

---

## Task 1: MongoDB Models (all 5 collections)

**Files:**

- Create: `src/models/Event.ts`
- Create: `src/models/Contact.ts`
- Create: `src/models/Conversation.ts`
- Create: `src/models/Flow.ts`
- Create: `src/models/FlowExecution.ts`

- [ ] **Step 1: Create Event model**

```typescript
// src/models/Event.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  eventType: string;
  clientId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventType: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EventSchema.index({ clientId: 1, eventType: 1, createdAt: -1 });
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL 7 days

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
```

- [ ] **Step 2: Create Contact model**

```typescript
// src/models/Contact.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface IContact extends Document {
  contactId: string;
  clientId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  channelIds: {
    telegram?: string;
    whatsapp?: string;
    instagram?: string;
    web?: string;
  };
  tags: string[];
  leadScore: number;
  leadTemp: LeadTemperature;
  scoreBreakdown: Array<{ reason: string; points: number }>;
  totalConversations: number;
  totalMessages: number;
  lastSeenAt: Date;
  firstSeenAt: Date;
  customFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    contactId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    channel: { type: String, required: true },
    channelIds: {
      telegram: { type: String },
      whatsapp: { type: String },
      instagram: { type: String },
      web: { type: String },
    },
    tags: { type: [String], default: [] },
    leadScore: { type: Number, default: 0 },
    leadTemp: { type: String, enum: ['cold', 'warm', 'hot'], default: 'cold' },
    scoreBreakdown: { type: [{ reason: String, points: Number }], default: [] },
    totalConversations: { type: Number, default: 1 },
    totalMessages: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    firstSeenAt: { type: Date, default: Date.now },
    customFields: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

ContactSchema.index({ clientId: 1, leadScore: -1 });
ContactSchema.index({ clientId: 1, 'channelIds.telegram': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.whatsapp': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.instagram': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.web': 1 });
ContactSchema.index({ clientId: 1, tags: 1 });

const Contact: Model<IContact> = mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
export default Contact;
```

- [ ] **Step 3: Create Conversation model**

```typescript
// src/models/Conversation.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConversationStatus = 'bot' | 'handoff' | 'assigned' | 'resolved' | 'closed';
export type HandoffReason = 'low_confidence' | 'negative_sentiment' | 'user_request' | 'high_value';
export type MessageSender = 'visitor' | 'bot' | 'operator';

export interface IConversation extends Document {
  conversationId: string;
  clientId: string;
  contactId: string;
  sessionId: string;
  channel: string;
  status: ConversationStatus;
  assignedTo: string | null;
  handoffReason: HandoffReason | null;
  lastMessage: {
    text: string;
    sender: MessageSender;
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

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    contactId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    channel: { type: String, required: true, enum: ['web', 'telegram', 'whatsapp', 'instagram'] },
    status: {
      type: String,
      required: true,
      enum: ['bot', 'handoff', 'assigned', 'resolved', 'closed'],
      default: 'bot',
    },
    assignedTo: { type: String, default: null },
    handoffReason: {
      type: String,
      enum: ['low_confidence', 'negative_sentiment', 'user_request', 'high_value', null],
      default: null,
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: String, enum: ['visitor', 'bot', 'operator'], default: 'visitor' },
      timestamp: { type: Date, default: Date.now },
    },
    unreadCount: { type: Number, default: 0 },
    aiSuggestedReply: { type: String, default: null },
    metadata: {
      pageUrl: String,
      userAgent: String,
      ip: String,
      referrer: String,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ clientId: 1, status: 1 });
ConversationSchema.index({ assignedTo: 1, status: 1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export default Conversation;
```

- [ ] **Step 4: Create Flow model**

```typescript
// src/models/Flow.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type FlowStatus = 'active' | 'paused' | 'draft';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
export type FlowActionType =
  | 'send_message'
  | 'send_notification'
  | 'add_tag'
  | 'remove_tag'
  | 'change_score'
  | 'assign_operator';

export interface IFlowCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

export interface IFlowStep {
  type: 'action' | 'delay';
  action?: FlowActionType;
  config: Record<string, unknown>;
  delayMinutes?: number;
}

export interface IFlow extends Document {
  flowId: string;
  clientId: string;
  userId: string;
  name: string;
  status: FlowStatus;
  trigger: {
    type: string;
    conditions: IFlowCondition[];
  };
  steps: IFlowStep[];
  templateId: string | null;
  stats: {
    timesTriggered: number;
    lastTriggeredAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FlowSchema = new Schema<IFlow>(
  {
    flowId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'draft'], default: 'draft' },
    trigger: {
      type: { type: String, required: true },
      conditions: [
        {
          field: { type: String, required: true },
          operator: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'contains'], required: true },
          value: { type: Schema.Types.Mixed, required: true },
        },
      ],
    },
    steps: [
      {
        type: { type: String, enum: ['action', 'delay'], required: true },
        action: {
          type: String,
          enum: ['send_message', 'send_notification', 'add_tag', 'remove_tag', 'change_score', 'assign_operator'],
        },
        config: { type: Schema.Types.Mixed, default: {} },
        delayMinutes: { type: Number },
      },
    ],
    templateId: { type: String, default: null },
    stats: {
      timesTriggered: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

FlowSchema.index({ clientId: 1, status: 1 });
FlowSchema.index({ 'trigger.type': 1, status: 1 });

const Flow: Model<IFlow> = mongoose.models.Flow || mongoose.model<IFlow>('Flow', FlowSchema);
export default Flow;
```

- [ ] **Step 5: Create FlowExecution model**

```typescript
// src/models/FlowExecution.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IFlowStep } from './Flow';

export type ExecutionStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export interface IFlowExecution extends Document {
  executionId: string;
  flowId: string;
  contactId: string;
  conversationId: string | null;
  trigger: { type: string; data: Record<string, unknown> };
  stepsExecuted: Array<{
    stepIndex: number;
    status: 'completed' | 'failed' | 'skipped';
    result?: string;
    timestamp: Date;
  }>;
  status: ExecutionStatus;
  scheduledAt: Date | null;
  remainingSteps: IFlowStep[];
  createdAt: Date;
}

const FlowExecutionSchema = new Schema<IFlowExecution>(
  {
    executionId: { type: String, required: true, unique: true },
    flowId: { type: String, required: true, index: true },
    contactId: { type: String, required: true },
    conversationId: { type: String, default: null },
    trigger: {
      type: { type: String, required: true },
      data: { type: Schema.Types.Mixed, default: {} },
    },
    stepsExecuted: [
      {
        stepIndex: { type: Number, required: true },
        status: { type: String, enum: ['completed', 'failed', 'skipped'], required: true },
        result: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ['pending', 'completed', 'failed', 'skipped'], default: 'pending' },
    scheduledAt: { type: Date, default: null },
    remainingSteps: [
      {
        type: { type: String, enum: ['action', 'delay'], required: true },
        action: String,
        config: { type: Schema.Types.Mixed, default: {} },
        delayMinutes: Number,
      },
    ],
  },
  { timestamps: true }
);

FlowExecutionSchema.index({ flowId: 1, createdAt: -1 });
FlowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL 30 days
FlowExecutionSchema.index({ status: 1, scheduledAt: 1 }); // For cron scheduler

const FlowExecution: Model<IFlowExecution> =
  mongoose.models.FlowExecution || mongoose.model<IFlowExecution>('FlowExecution', FlowExecutionSchema);
export default FlowExecution;
```

- [ ] **Step 6: Verify models compile**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/models/Event.ts src/models/Contact.ts src/models/Conversation.ts src/models/Flow.ts src/models/FlowExecution.ts 2>&1 | head -20`
Expected: No errors (or only unrelated errors from other files)

- [ ] **Step 7: Commit**

```bash
git add src/models/Event.ts src/models/Contact.ts src/models/Conversation.ts src/models/Flow.ts src/models/FlowExecution.ts
git commit -m "feat: add 5 MongoDB models for Inbox, Contacts, Flows"
```

---

## Task 2: Event Bus

**Files:**

- Create: `src/lib/events.ts`
- Create: `src/test/events.test.ts`

- [ ] **Step 1: Write event bus tests**

```typescript
// src/test/events.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose to avoid real DB in unit tests
vi.mock('@/models/Event', () => ({
  default: { create: vi.fn().mockResolvedValue({}) },
}));

describe('Event Bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit event and call listeners', async () => {
    const { emitEvent, onEvent, offEvent } = await import('@/lib/events');
    const handler = vi.fn();

    onEvent('test:event', handler);
    await emitEvent('test:event', 'client-1', { foo: 'bar' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'test:event',
        clientId: 'client-1',
        payload: { foo: 'bar' },
      })
    );

    offEvent('test:event', handler);
  });

  it('should not call removed listeners', async () => {
    const { emitEvent, onEvent, offEvent } = await import('@/lib/events');
    const handler = vi.fn();

    onEvent('test:remove', handler);
    offEvent('test:remove', handler);
    await emitEvent('test:remove', 'client-1', {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('should persist event to MongoDB', async () => {
    const EventModel = (await import('@/models/Event')).default;
    const { emitEvent } = await import('@/lib/events');

    await emitEvent('message:received', 'client-1', { text: 'hello' });

    expect(EventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message:received',
        clientId: 'client-1',
        payload: { text: 'hello' },
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/test/events.test.ts 2>&1 | tail -10`
Expected: FAIL — module `@/lib/events` not found

- [ ] **Step 3: Implement event bus**

```typescript
// src/lib/events.ts
import { EventEmitter } from 'events';
import Event from '@/models/Event';

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export interface EventPayload {
  eventType: string;
  clientId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Emit an event: persists to MongoDB and notifies in-process listeners.
 */
export async function emitEvent(type: string, clientId: string, payload: Record<string, unknown>): Promise<void> {
  const event: EventPayload = {
    eventType: type,
    clientId,
    payload,
    createdAt: new Date(),
  };

  // 1. Persist to MongoDB (fire-and-forget for performance, log errors)
  Event.create({
    eventType: type,
    clientId,
    payload,
  }).catch((err) => console.error('Failed to persist event:', err));

  // 2. Emit to in-process listeners (for SSE, contact updater, flow engine)
  emitter.emit(type, event);
  emitter.emit('*', event); // wildcard for listeners that want all events
}

/**
 * Subscribe to events by type. Use '*' to listen to all events.
 */
export function onEvent(type: string, handler: (event: EventPayload) => void): void {
  emitter.on(type, handler);
}

/**
 * Unsubscribe from events.
 */
export function offEvent(type: string, handler: (event: EventPayload) => void): void {
  emitter.off(type, handler);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/test/events.test.ts 2>&1 | tail -10`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/events.ts src/test/events.test.ts
git commit -m "feat: add internal event bus with MongoDB persistence"
```

---

## Task 3: Lead Scoring Engine

**Files:**

- Create: `src/lib/contacts/scoring.ts`
- Create: `src/test/contacts-scoring.test.ts`

- [ ] **Step 1: Write scoring tests**

```typescript
// src/test/contacts-scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/lib/contacts/scoring';

describe('Lead Scoring', () => {
  it('should return 0 for empty input', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 0,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.temp).toBe('cold');
    expect(result.breakdown).toEqual([]);
  });

  it('should detect pricing keywords (+25)', () => {
    const result = calculateScore({
      messages: ['How much does the enterprise plan cost?'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(25);
    expect(result.breakdown).toContainEqual({ reason: 'Asked about pricing', points: 25 });
  });

  it('should detect email (+15)', () => {
    const result = calculateScore({
      messages: ['My email is john@example.com'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(15);
    expect(result.breakdown).toContainEqual({ reason: 'Left email', points: 15 });
  });

  it('should detect phone (+10)', () => {
    const result = calculateScore({
      messages: ['Call me at +380671234567'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(10);
    expect(result.breakdown).toContainEqual({ reason: 'Left phone number', points: 10 });
  });

  it('should score returning visitors (+20)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 3,
      totalMessages: 2,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(20);
    expect(result.temp).toBe('cold'); // 20 is still cold
  });

  it('should score 5+ messages (+12)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 7,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(12);
  });

  it('should score handoff request (+15)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: true,
      metadata: {},
    });
    expect(result.score).toBe(15);
  });

  it('should score paid traffic (+10)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: { referrer: 'https://example.com?utm_source=google_ads' },
    });
    expect(result.score).toBe(10);
  });

  it('should combine multiple signals and cap at 100', () => {
    const result = calculateScore({
      messages: ['How much does it cost?', 'My email is a@b.com', 'Call me at +1234567890'],
      totalConversations: 3,
      totalMessages: 10,
      hasHandoff: true,
      metadata: { referrer: 'https://x.com?utm_source=fb' },
    });
    // 25 + 15 + 10 + 20 + 12 + 15 + 10 = 107 → capped at 100
    expect(result.score).toBe(100);
    expect(result.temp).toBe('hot');
  });

  it('should classify warm (31-65)', () => {
    const result = calculateScore({
      messages: ['What is the pricing?'],
      totalConversations: 2,
      totalMessages: 3,
      hasHandoff: false,
      metadata: {},
    });
    // 25 + 20 = 45
    expect(result.score).toBe(45);
    expect(result.temp).toBe('warm');
  });

  it('should detect Ukrainian/Russian pricing keywords', () => {
    const result = calculateScore({
      messages: ['Скільки коштує?'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(25);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/test/contacts-scoring.test.ts 2>&1 | tail -10`
Expected: FAIL — module not found

- [ ] **Step 3: Implement scoring engine**

```typescript
// src/lib/contacts/scoring.ts
import type { LeadTemperature } from '@/models/Contact';

interface ScoringInput {
  messages: string[];
  totalConversations: number;
  totalMessages: number;
  hasHandoff: boolean;
  metadata: Record<string, string | undefined>;
}

interface ScoringResult {
  score: number;
  temp: LeadTemperature;
  breakdown: Array<{ reason: string; points: number }>;
}

const PRICING_KEYWORDS = [
  'price',
  'pricing',
  'cost',
  'how much',
  'quote',
  'rates',
  'цена',
  'стоимость',
  'сколько стоит',
  'прайс',
  'ціна',
  'вартість',
  'скільки коштує',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /\+?\d[\d\s\-()]{7,}\d/;

export function calculateScore(input: ScoringInput): ScoringResult {
  const breakdown: Array<{ reason: string; points: number }> = [];
  const allText = input.messages.join(' ').toLowerCase();

  // 1. Pricing keywords (+25)
  if (PRICING_KEYWORDS.some((kw) => allText.includes(kw))) {
    breakdown.push({ reason: 'Asked about pricing', points: 25 });
  }

  // 2. Left email (+15)
  if (EMAIL_REGEX.test(allText)) {
    breakdown.push({ reason: 'Left email', points: 15 });
  }

  // 3. Left phone (+10)
  if (PHONE_REGEX.test(allText)) {
    breakdown.push({ reason: 'Left phone number', points: 10 });
  }

  // 4. Returning visitor (+20)
  if (input.totalConversations >= 2) {
    breakdown.push({ reason: 'Returning visitor', points: 20 });
  }

  // 5. Engaged — 5+ messages (+12)
  if (input.totalMessages >= 5) {
    breakdown.push({ reason: '5+ messages', points: 12 });
  }

  // 6. Requested human (+15)
  if (input.hasHandoff) {
    breakdown.push({ reason: 'Requested human agent', points: 15 });
  }

  // 7. Paid traffic (+10)
  if (input.metadata.referrer && input.metadata.referrer.includes('utm_source')) {
    breakdown.push({ reason: 'From paid ads', points: 10 });
  }

  const rawScore = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = Math.min(rawScore, 100);

  let temp: LeadTemperature = 'cold';
  if (score >= 66) temp = 'hot';
  else if (score >= 31) temp = 'warm';

  return { score, temp, breakdown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/test/contacts-scoring.test.ts 2>&1 | tail -15`
Expected: 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/contacts/scoring.ts src/test/contacts-scoring.test.ts
git commit -m "feat: add rule-based lead scoring engine with 7 signals"
```

---

## Task 4: Contact Auto-Creation

**Files:**

- Create: `src/lib/contacts/autoCreate.ts`

- [ ] **Step 1: Implement contact auto-creation**

```typescript
// src/lib/contacts/autoCreate.ts
import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { calculateScore } from './scoring';
import { emitEvent } from '@/lib/events';

interface MessageContext {
  clientId: string;
  channel: 'web' | 'telegram' | 'whatsapp' | 'instagram';
  channelUserId: string; // telegram userId, whatsapp phone, web visitorId, etc.
  text: string;
  senderName?: string;
  metadata?: Record<string, string | undefined>;
}

/**
 * Called on every incoming message. Creates contact if new, updates if existing.
 * Returns contactId.
 */
export async function handleContactForMessage(ctx: MessageContext): Promise<string> {
  await connectDB();

  const channelField = `channelIds.${ctx.channel}` as const;
  let contact = await Contact.findOne({
    clientId: ctx.clientId,
    [channelField]: ctx.channelUserId,
  });

  const isNew = !contact;

  if (!contact) {
    contact = await Contact.create({
      contactId: nanoid(12),
      clientId: ctx.clientId,
      name: ctx.senderName || null,
      channel: ctx.channel,
      channelIds: { [ctx.channel]: ctx.channelUserId },
      lastSeenAt: new Date(),
      firstSeenAt: new Date(),
      totalConversations: 1,
      totalMessages: 1,
    });

    await emitEvent('contact:created', ctx.clientId, {
      contactId: contact.contactId,
      channel: ctx.channel,
      name: ctx.senderName || null,
    });
  } else {
    contact.totalMessages += 1;
    contact.lastSeenAt = new Date();
    if (ctx.senderName && !contact.name) {
      contact.name = ctx.senderName;
    }
    await contact.save();
  }

  // Recalculate score
  const allMessages = [ctx.text]; // Current message for keyword analysis
  const oldScore = contact.leadScore;
  const scoring = calculateScore({
    messages: allMessages,
    totalConversations: contact.totalConversations,
    totalMessages: contact.totalMessages,
    hasHandoff: false, // Will be set separately by handoff logic
    metadata: ctx.metadata || {},
  });

  // Merge new breakdown with existing (avoid duplicates by reason)
  const existingReasons = new Set(contact.scoreBreakdown.map((b) => b.reason));
  const newBreakdown = scoring.breakdown.filter((b) => !existingReasons.has(b.reason));
  if (newBreakdown.length > 0) {
    contact.scoreBreakdown.push(...newBreakdown);
    const totalScore = Math.min(
      contact.scoreBreakdown.reduce((s, b) => s + b.points, 0),
      100
    );
    contact.leadScore = totalScore;
    contact.leadTemp = totalScore >= 66 ? 'hot' : totalScore >= 31 ? 'warm' : 'cold';
    await contact.save();

    // Emit score change if threshold crossed
    const oldTemp = oldScore >= 66 ? 'hot' : oldScore >= 31 ? 'warm' : 'cold';
    if (contact.leadTemp !== oldTemp) {
      await emitEvent('contact:score_changed', ctx.clientId, {
        contactId: contact.contactId,
        oldScore,
        newScore: contact.leadScore,
        reason: newBreakdown.map((b) => b.reason).join(', '),
      });
    }
  }

  return contact.contactId;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/contacts/autoCreate.ts
git commit -m "feat: add contact auto-creation and score update on message"
```

---

## Task 5: Contacts API Endpoints

**Files:**

- Create: `src/app/api/contacts/route.ts`
- Create: `src/app/api/contacts/[id]/route.ts`
- Create: `src/app/api/contacts/stats/route.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add /api/contacts to middleware auth**

In `src/middleware.ts`, add `/api/contacts`, `/api/inbox`, `/api/flows` to the `adminApiPaths` array (which now also accepts `accessToken`):

```typescript
// Add these to the adminApiPaths array (around line 41):
'/api/contacts',
'/api/inbox',
'/api/flows',
```

- [ ] **Step 2: Create GET /api/contacts**

```typescript
// src/app/api/contacts/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const tags = searchParams.get('tags');
    const channel = searchParams.get('channel');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get user's client IDs for ownership check
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    if (allowedClientIds.length === 0) {
      return successResponse({ contacts: [], total: 0, page, pages: 0 });
    }

    // Build query
    const query: Record<string, unknown> = {
      clientId: clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds },
    };

    if (minScore) query.leadScore = { ...((query.leadScore as object) || {}), $gte: parseInt(minScore, 10) };
    if (maxScore) query.leadScore = { ...((query.leadScore as object) || {}), $lte: parseInt(maxScore, 10) };
    if (tags) query.tags = { $all: tags.split(',') };
    if (channel) query.channel = channel;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { contactId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ leadScore: -1, lastSeenAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return Errors.internal('Failed to fetch contacts');
  }
}
```

- [ ] **Step 3: Create GET/PATCH /api/contacts/[id]**

```typescript
// src/app/api/contacts/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Conversation from '@/models/Conversation';
import Event from '@/models/Event';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const contact = await Contact.findOne({ contactId: id });
    if (!contact) return Errors.notFound('Contact not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: contact.clientId, organizationId: auth.organizationId }
      : { clientId: contact.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Contact not found');

    // Get activity timeline from events
    const timeline = await Event.find({
      clientId: contact.clientId,
      'payload.contactId': contact.contactId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // Get conversations
    const conversations = await Conversation.find({ contactId: contact.contactId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('conversationId channel status lastMessage createdAt');

    return successResponse({ contact, timeline, conversations });
  } catch (error) {
    console.error('Get contact detail error:', error);
    return Errors.internal('Failed to fetch contact');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const contact = await Contact.findOne({ contactId: id });
    if (!contact) return Errors.notFound('Contact not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: contact.clientId, organizationId: auth.organizationId }
      : { clientId: contact.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Contact not found');

    // Only allow updating specific fields
    const allowedFields = ['tags', 'customFields', 'name', 'email', 'phone'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (contact as Record<string, unknown>)[field] = body[field];
      }
    }

    await contact.save();
    return successResponse(contact, 'Contact updated');
  } catch (error) {
    console.error('Update contact error:', error);
    return Errors.internal('Failed to update contact');
  }
}
```

- [ ] **Step 4: Create GET /api/contacts/stats**

```typescript
// src/app/api/contacts/stats/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Get user's client IDs
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    const matchClientId = clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, hot, warm, cold, newToday] = await Promise.all([
      Contact.countDocuments({ clientId: matchClientId }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'hot' }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'warm' }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'cold' }),
      Contact.countDocuments({ clientId: matchClientId, createdAt: { $gte: today } }),
    ]);

    return successResponse({ total, hot, warm, cold, newToday });
  } catch (error) {
    console.error('Get contact stats error:', error);
    return Errors.internal('Failed to fetch contact stats');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/app/api/contacts/route.ts src/app/api/contacts/\[id\]/route.ts src/app/api/contacts/stats/route.ts
git commit -m "feat: add Contacts API endpoints (list, detail, update, stats)"
```

---

## Task 6: Sidebar Navigation Update

**Files:**

- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add 3 new nav items to sidebar**

In `src/app/dashboard/layout.tsx`, find the `navGroups` array and add:

1. In `MAIN` group, after `Overview` and before `My Widgets`, add:

   ```typescript
   { label: 'Inbox', href: '/dashboard/inbox', icon: Mail },
   { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
   ```

2. In `BUILD` group, after `AI Builder` and before `Integrations`, add:

   ```typescript
   { label: 'Flows', href: '/dashboard/flows', icon: Workflow },
   ```

3. Add imports at top:
   ```typescript
   import { Mail, Workflow } from 'lucide-react';
   ```
   (Note: `Users` is likely already imported. Check before adding.)

- [ ] **Step 2: Verify page loads without errors**

Open `http://localhost:3000/dashboard` in browser. Verify sidebar shows new items. Clicking them will 404 (pages not built yet for Inbox/Flows) — that's expected. Contacts page is built in next task.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: add Inbox, Contacts, Flows to dashboard sidebar"
```

---

## Task 7: Contacts UI Page

**Files:**

- Create: `src/app/dashboard/contacts/page.tsx`

- [ ] **Step 1: Create Contacts page**

Create the full Contacts page at `src/app/dashboard/contacts/page.tsx`. This is the largest single file in this plan. Key requirements:

1. **'use client'** directive
2. **Two-panel layout**: contact list (left, 380px) + detail panel (right, flex)
3. **Stats bar** at top: Total / Hot / Warm / New today — fetch from `/api/contacts/stats`
4. **Search + filters**: search input, dropdowns for Score (All/Hot/Warm/Cold), Channel (All/Web/Telegram/WhatsApp/Instagram)
5. **Contact list**: fetch from `/api/contacts` with pagination. Each item shows: gradient avatar (initials), name, email, lead score badge (colored by temp), channel, tags
6. **Detail panel**: when contact selected, fetch from `/api/contacts/[id]`. Show: large avatar, name, email, phone, score breakdown, tags (with add/remove), activity timeline
7. **Tag management**: add tag via input, remove via X button, PATCH to `/api/contacts/[id]`
8. **Loading states**: skeleton placeholders while fetching
9. **Empty state**: "No contacts yet" with description when list is empty
10. **Dark/light theme**: use CSS variable classes (`bg-bg-primary`, `text-text-primary`, `border-border`, etc.) from existing design system. Use `useTheme()` hook for any inline styles.
11. **Apple Enterprise quality**: clean typography, smooth transitions, subtle shadows, micro-animations on hover/select, glassmorphism card effects

**Data fetching pattern** (follow analytics page pattern):

```typescript
const fetchContacts = useCallback(async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (scoreFilter !== 'all')
      params.set('minScore', scoreFilter === 'hot' ? '66' : scoreFilter === 'warm' ? '31' : '0');
    // ... other filters
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    if (data.success) setContacts(data.data.contacts);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}, [search, scoreFilter, channelFilter]);
```

**Import icons** from `lucide-react`: `Search, Filter, Tag, Phone, Mail, Globe, MessageSquare, TrendingUp, Clock, User, Plus, X`

- [ ] **Step 2: Verify page renders**

Open `http://localhost:3000/dashboard/contacts`. Should show empty state (no contacts in DB yet). Verify no console errors. Verify light/dark theme works.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/contacts/page.tsx
git commit -m "feat: add Contacts dashboard page with list, detail, scoring, timeline"
```

---

## Task 8: Integration Test — End to End

- [ ] **Step 1: Verify full flow manually**

1. Open `http://localhost:3000/dashboard/contacts` — should show empty state
2. Use an existing widget to send a test chat message (via the demo page or Telegram)
3. Check MongoDB: `contacts` collection should have a new document (once webhook integration is added in Plan 2, this will be automatic — for now verify the models and APIs work)

- [ ] **Step 2: Run all existing tests to verify nothing is broken**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run 2>&1 | tail -20`
Expected: All existing tests still pass. New tests (events, scoring) also pass.

- [ ] **Step 3: Final commit and push**

```bash
git push origin main
```

---

## Summary

| Task   | What it produces                                                     |
| ------ | -------------------------------------------------------------------- |
| Task 1 | 5 MongoDB models (Event, Contact, Conversation, Flow, FlowExecution) |
| Task 2 | Event bus (emitEvent, onEvent, offEvent) with tests                  |
| Task 3 | Lead scoring engine with 7 rules and 11 tests                        |
| Task 4 | Contact auto-creation + score update module                          |
| Task 5 | 3 API endpoints (list, detail+update, stats) + middleware update     |
| Task 6 | Sidebar with Inbox, Contacts, Flows nav items                        |
| Task 7 | Contacts UI page (two-panel, search, filters, detail, timeline)      |
| Task 8 | Integration verification + push                                      |

**Next:** Plan 2 (Inbox) and Plan 3 (Flows) build on this foundation.
