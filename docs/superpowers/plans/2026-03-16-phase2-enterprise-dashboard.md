# Phase 2: Enterprise Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advanced analytics dashboard, A/B testing system, team management page, multi-agent activity feed in builder, and user notification system.

**Architecture:** Five independent subsystems sharing existing auth (`verifyUser`) and response patterns (`successResponse`/`Errors`). Analytics extends `lib/analytics.ts`. A/B testing adds `ABTest`/`ABVariant` models + variant delivery API. Team management adds `/dashboard/team` page leveraging existing `Organization`/`OrgMember` models. Multi-agent adds `agent_switch` SSE event + `AgentActivityFeed` component. Notifications extend existing `Notification` model with userId scoping + bell UI.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB/Mongoose, Vitest

**Spec Reference:** `docs/superpowers/specs/2026-03-16-enterprise-winbix-design.md` — Sections 4A, 4B, 4C, 1, 8C

---

## File Structure

### New Files

| File                                           | Responsibility                           |
| ---------------------------------------------- | ---------------------------------------- |
| `src/app/dashboard/analytics/page.tsx`         | Advanced analytics dashboard page        |
| `src/app/api/analytics/advanced/route.ts`      | User-facing analytics API (multi-widget) |
| `src/app/api/analytics/advanced/route.test.ts` | Tests for advanced analytics API         |
| `src/models/ABTest.ts`                         | A/B test configuration model             |
| `src/models/ABTest.test.ts`                    | ABTest model tests                       |
| `src/app/api/ab-tests/route.ts`                | CRUD for A/B tests                       |
| `src/app/api/ab-tests/route.test.ts`           | Tests for A/B tests API                  |
| `src/app/api/widgets/[id]/variant/route.ts`    | Variant delivery for widget runtime      |
| `src/app/dashboard/ab-tests/page.tsx`          | A/B test management page                 |
| `src/app/dashboard/team/page.tsx`              | Team management page                     |
| `src/app/api/org/invite/route.ts`              | Invite user to organization              |
| `src/app/api/org/invite/route.test.ts`         | Tests for invite API                     |
| `src/app/api/org/members/route.ts`             | List/update/remove org members           |
| `src/components/builder/AgentActivityFeed.tsx` | Real-time agent work visualization       |
| `src/app/api/notifications/route.ts`           | User notifications CRUD                  |
| `src/app/api/notifications/route.test.ts`      | Tests for notifications API              |
| `src/components/NotificationBell.tsx`          | Dashboard header notification bell       |

### Modified Files

| File                                          | Change                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| `src/models/ChatLog.ts`                       | Add `variantId` field                                       |
| `src/models/Notification.ts`                  | Add `userId` field for user-scoped notifications            |
| `src/app/dashboard/layout.tsx`                | Add Analytics, A/B Tests, Team nav items + NotificationBell |
| `src/components/builder/useBuilderStream.ts`  | Handle `agent_switch` SSE event, expose `activeAgent`       |
| `src/components/builder/ProgressPipeline.tsx` | Show active agent name                                      |
| `src/components/builder/BuilderChat.tsx`      | Render AgentActivityFeed                                    |
| `src/lib/builder/types.ts`                    | Add `AgentType` and `agent_switch` SSE event                |

---

## Chunk 1: Advanced Analytics (Section 4A)

### Task 1: Create user-facing analytics API

**Files:**

- Create: `src/app/api/analytics/advanced/route.ts`
- Test: `src/app/api/analytics/advanced/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/analytics/advanced/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockGetAnalytics, mockGetQuickStats, mockClientFind } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockGetAnalytics: vi.fn(),
  mockGetQuickStats: vi.fn(),
  mockClientFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/lib/analytics', () => ({
  getAnalytics: mockGetAnalytics,
  getQuickStats: mockGetQuickStats,
}));
vi.mock('@/models/Client', () => ({
  default: { find: mockClientFind },
}));

import { GET } from './route';

describe('GET /api/analytics/advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    });
    const req = new NextRequest('http://localhost/api/analytics/advanced');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns aggregated analytics for all user widgets', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });

    mockClientFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'w1' }, { clientId: 'w2' }]),
    });

    mockGetQuickStats.mockResolvedValue({ today: 5, week: 30, month: 100 });
    mockGetAnalytics.mockResolvedValue({
      totalChats: 50,
      totalMessages: 200,
      avgMessagesPerChat: 4,
      avgResponseTimeMs: 1200,
      satisfactionPercent: 85,
      feedbackCount: 20,
      dailyStats: [],
      hourlyDistribution: [],
      topQuestions: [],
      channelStats: [],
    });

    const req = new NextRequest('http://localhost/api/analytics/advanced?days=30');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.widgets).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/analytics/advanced/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the advanced analytics API**

```typescript
// src/app/api/analytics/advanced/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { getAnalytics, getQuickStats } from '@/lib/analytics';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const channel = request.nextUrl.searchParams.get('channel') || undefined;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const clients = await Client.find(query).select('clientId username widgetType');

    const widgets = await Promise.all(
      clients.map(async (c) => {
        const [analytics, quickStats] = await Promise.all([
          getAnalytics(c.clientId, days, channel),
          getQuickStats(c.clientId),
        ]);
        return {
          clientId: c.clientId,
          name: c.username,
          widgetType: c.widgetType || 'ai_chat',
          analytics,
          quickStats,
        };
      })
    );

    // Aggregate totals
    const totals = {
      totalChats: widgets.reduce((s, w) => s + w.analytics.totalChats, 0),
      totalMessages: widgets.reduce((s, w) => s + w.analytics.totalMessages, 0),
      avgSatisfaction:
        widgets.length > 0
          ? Math.round(widgets.reduce((s, w) => s + w.analytics.satisfactionPercent, 0) / widgets.length)
          : 0,
      todayChats: widgets.reduce((s, w) => s + w.quickStats.today, 0),
      weekChats: widgets.reduce((s, w) => s + w.quickStats.week, 0),
      monthChats: widgets.reduce((s, w) => s + w.quickStats.month, 0),
    };

    return successResponse({ totals, widgets });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    return Errors.internal('Failed to fetch analytics');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/analytics/advanced/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/analytics/advanced/route.ts src/app/api/analytics/advanced/route.test.ts && git commit -m "feat: add user-facing advanced analytics API"
```

---

### Task 2: Create analytics dashboard page

**Files:**

- Create: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create the analytics page**

The page fetches from `/api/analytics/advanced` and renders:

- Summary cards (total chats, messages, satisfaction, today/week/month)
- Per-widget breakdown cards with mini-charts
- Top questions list
- Channel distribution
- Hourly heatmap

```tsx
// src/app/dashboard/analytics/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface WidgetAnalytics {
  clientId: string;
  name: string;
  widgetType: string;
  analytics: {
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
    avgResponseTimeMs: number;
    satisfactionPercent: number;
    feedbackCount: number;
    dailyStats: { date: string; totalChats: number; totalMessages: number }[];
    hourlyDistribution: { hour: number; count: number }[];
    topQuestions: { text: string; count: number }[];
    channelStats: { channel: string; count: number; percentage: number }[];
  };
  quickStats: { today: number; week: number; month: number };
}

interface AnalyticsData {
  totals: {
    totalChats: number;
    totalMessages: number;
    avgSatisfaction: number;
    todayChats: number;
    weekChats: number;
    monthChats: number;
  };
  widgets: WidgetAnalytics[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/advanced?days=${days}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.widgets.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-12 text-center">
          <div className="mb-4 text-4xl">📊</div>
          <h2 className="mb-2 text-lg font-semibold text-white">No data yet</h2>
          <p className="text-gray-500">Create a widget and start getting chats to see analytics here.</p>
        </div>
      </div>
    );
  }

  const t = data.totals;
  const activeWidget = selectedWidget ? data.widgets.find((w) => w.clientId === selectedWidget) : null;

  const statCards = [
    { label: 'Total Chats', value: t.totalChats.toLocaleString(), sub: `${t.todayChats} today` },
    { label: 'Messages', value: t.totalMessages.toLocaleString(), sub: `${days}-day total` },
    { label: 'Satisfaction', value: `${t.avgSatisfaction}%`, sub: 'avg across widgets' },
    { label: 'This Week', value: t.weekChats.toLocaleString(), sub: 'chats' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#12121a] p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-600">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Widget Selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedWidget(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!selectedWidget ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          All Widgets
        </button>
        {data.widgets.map((w) => (
          <button
            key={w.clientId}
            onClick={() => setSelectedWidget(w.clientId)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedWidget === w.clientId ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            {w.name || w.clientId}
          </button>
        ))}
      </div>

      {/* Per-Widget Cards or Aggregate */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Chart (simplified bar representation) */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Daily Chats</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {(activeWidget?.analytics.dailyStats || data.widgets[0]?.analytics.dailyStats || [])
              .slice(-14)
              .map((d, i) => {
                const max = Math.max(
                  ...(activeWidget?.analytics.dailyStats || data.widgets[0]?.analytics.dailyStats || [])
                    .slice(-14)
                    .map((s) => s.totalChats),
                  1
                );
                const h = (d.totalChats / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${d.date}: ${d.totalChats} chats`}
                  />
                );
              })}
          </div>
          <p className="mt-2 text-xs text-gray-600">Last 14 days</p>
        </div>

        {/* Top Questions */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Top Questions</h3>
          <div className="space-y-2">
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || [])
              .slice(0, 5)
              .map((q, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="max-w-[80%] truncate text-sm text-gray-400">{q.text}</p>
                  <span className="text-xs font-medium text-gray-600">{q.count}x</span>
                </div>
              ))}
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || []).length === 0 && (
              <p className="text-sm text-gray-600">No questions yet</p>
            )}
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Peak Hours</h3>
          <div className="grid grid-cols-12 gap-1">
            {(activeWidget?.analytics.hourlyDistribution || data.widgets[0]?.analytics.hourlyDistribution || [])
              .slice(0, 24)
              .map((h) => {
                const max = Math.max(
                  ...(
                    activeWidget?.analytics.hourlyDistribution ||
                    data.widgets[0]?.analytics.hourlyDistribution ||
                    []
                  ).map((x) => x.count),
                  1
                );
                const intensity = h.count / max;
                return (
                  <div
                    key={h.hour}
                    className="aspect-square rounded"
                    style={{
                      background: `rgba(6,182,212,${0.1 + intensity * 0.7})`,
                    }}
                    title={`${h.hour}:00 — ${h.count} chats`}
                  />
                );
              })}
          </div>
          <p className="mt-2 text-xs text-gray-600">0h–23h activity</p>
        </div>

        {/* Channel Distribution */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Channels</h3>
          <div className="space-y-3">
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).map((ch) => (
              <div key={ch.channel}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-400 capitalize">{ch.channel}</span>
                  <span className="text-gray-600">{ch.percentage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5">
                  <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${ch.percentage}%` }} />
                </div>
              </div>
            ))}
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).length === 0 && (
              <p className="text-sm text-gray-600">No channel data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/analytics/page.tsx && git commit -m "feat: add advanced analytics dashboard page"
```

---

## Chunk 2: A/B Testing (Section 4B)

### Task 3: Create ABTest model

**Files:**

- Create: `src/models/ABTest.ts`
- Modify: `src/models/ChatLog.ts`

- [ ] **Step 1: Create ABTest model**

```typescript
// src/models/ABTest.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface IABVariant {
  id: string;
  label: string;
  config: Record<string, unknown>; // greeting, themeOverrides, systemPrompt, etc.
  visitors: number;
  conversions: number;
}

export interface IABTest extends Document {
  clientId: string;
  organizationId: string;
  name: string;
  status: ABTestStatus;
  variants: IABVariant[];
  winnerVariantId: string | null;
  minVisitors: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ABVariantSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    visitors: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { _id: false }
);

const ABTestSchema = new Schema<IABTest>(
  {
    clientId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['draft', 'running', 'paused', 'completed'], default: 'draft' },
    variants: [ABVariantSchema],
    winnerVariantId: { type: String, default: null },
    minVisitors: { type: Number, default: 100 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ABTestSchema.index({ clientId: 1, status: 1 });

const ABTest: Model<IABTest> = mongoose.models.ABTest || mongoose.model<IABTest>('ABTest', ABTestSchema);

export default ABTest;
```

- [ ] **Step 2: Add variantId to ChatLog**

In `src/models/ChatLog.ts`, add to `IChatLog` interface after `metadata`:

```typescript
variantId?: string | null;
```

Add to `ChatLogSchema` after `metadata`:

```typescript
variantId: { type: String, default: null, index: true },
```

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/ABTest.ts src/models/ChatLog.ts && git commit -m "feat: add ABTest model and variantId to ChatLog"
```

---

### Task 4: Create A/B tests API

**Files:**

- Create: `src/app/api/ab-tests/route.ts`
- Test: `src/app/api/ab-tests/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/ab-tests/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockABTestFind, mockABTestCreate } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockABTestFind: vi.fn(),
  mockABTestCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/ABTest', () => ({
  default: { find: mockABTestFind, create: mockABTestCreate },
}));

import { GET, POST } from './route';

describe('A/B Tests API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });
  });

  it('GET returns tests for organization', async () => {
    mockABTestFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{ _id: 't1', name: 'Test 1', status: 'running', clientId: 'w1', variants: [] }]),
    });

    const req = new NextRequest('http://localhost/api/ab-tests');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('POST creates a new test', async () => {
    mockABTestCreate.mockResolvedValue({
      _id: 't1',
      name: 'Greeting Test',
      clientId: 'w1',
      status: 'draft',
      variants: [
        { id: 'a', label: 'Variant A', config: { greeting: 'Hi!' }, visitors: 0, conversions: 0 },
        { id: 'b', label: 'Variant B', config: { greeting: 'Hello!' }, visitors: 0, conversions: 0 },
      ],
    });

    const req = new NextRequest('http://localhost/api/ab-tests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Greeting Test',
        clientId: 'w1',
        variants: [
          { label: 'Variant A', config: { greeting: 'Hi!' } },
          { label: 'Variant B', config: { greeting: 'Hello!' } },
        ],
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockABTestCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/ab-tests/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write A/B tests API**

```typescript
// src/app/api/ab-tests/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { organizationId: auth.userId };
    const tests = await ABTest.find(query).sort({ createdAt: -1 });

    return successResponse(tests);
  } catch (error) {
    console.error('Get AB tests error:', error);
    return Errors.internal('Failed to fetch A/B tests');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { name, clientId, variants } = body;

    if (!name || !clientId || !variants || variants.length < 2) {
      return Errors.badRequest('name, clientId, and at least 2 variants are required');
    }

    await connectDB();

    const test = await ABTest.create({
      clientId,
      organizationId: auth.organizationId || auth.userId,
      name,
      status: 'draft',
      variants: variants.map((v: { label: string; config: Record<string, unknown> }) => ({
        id: randomUUID().slice(0, 8),
        label: v.label,
        config: v.config || {},
        visitors: 0,
        conversions: 0,
      })),
    });

    return successResponse(test, undefined, 201);
  } catch (error) {
    console.error('Create AB test error:', error);
    return Errors.internal('Failed to create A/B test');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/ab-tests/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/ab-tests/route.ts src/app/api/ab-tests/route.test.ts && git commit -m "feat: add A/B tests CRUD API"
```

---

### Task 5: Create variant delivery API

**Files:**

- Create: `src/app/api/widgets/[id]/variant/route.ts`

- [ ] **Step 1: Create variant delivery endpoint**

Widget runtime calls this on load to get assigned variant config.

```typescript
// src/app/api/widgets/[id]/variant/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { successResponse } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const visitorId = request.nextUrl.searchParams.get('vid') || '';

    await connectDB();

    const activeTest = await ABTest.findOne({ clientId, status: 'running' });
    if (!activeTest || activeTest.variants.length === 0) {
      return successResponse({ variantId: null, config: {} });
    }

    // Deterministic assignment based on visitor hash
    const hash = simpleHash(visitorId + activeTest._id.toString());
    const variantIndex = hash % activeTest.variants.length;
    const variant = activeTest.variants[variantIndex];

    // Increment visitor count (fire-and-forget)
    ABTest.updateOne({ _id: activeTest._id, 'variants.id': variant.id }, { $inc: { 'variants.$.visitors': 1 } })
      .exec()
      .catch(() => {});

    return successResponse({
      variantId: variant.id,
      testId: activeTest._id.toString(),
      config: variant.config,
    });
  } catch {
    return successResponse({ variantId: null, config: {} });
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add "src/app/api/widgets/[id]/variant/route.ts" && git commit -m "feat: add variant delivery API for A/B testing"
```

---

### Task 6: Create A/B tests dashboard page

**Files:**

- Create: `src/app/dashboard/ab-tests/page.tsx`

- [ ] **Step 1: Create A/B tests management page**

```tsx
// src/app/dashboard/ab-tests/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ABVariant {
  id: string;
  label: string;
  config: Record<string, unknown>;
  visitors: number;
  conversions: number;
}

interface ABTestItem {
  _id: string;
  name: string;
  clientId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  winnerVariantId: string | null;
  createdAt: string;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch('/api/ab-tests');
      const json = await res.json();
      if (json.success) setTests(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const updateStatus = async (testId: string, status: string) => {
    await fetch(`/api/ab-tests`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, status }),
    });
    fetchTests();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/15 text-gray-400',
      running: 'bg-green-500/15 text-green-400',
      paused: 'bg-yellow-500/15 text-yellow-400',
      completed: 'bg-blue-500/15 text-blue-400',
    };
    return colors[status] || 'bg-gray-500/15 text-gray-400';
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-white">A/B Tests</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">A/B Tests</h1>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-12 text-center">
          <div className="mb-4 text-4xl">🧪</div>
          <h2 className="mb-2 text-lg font-semibold text-white">No A/B tests yet</h2>
          <p className="text-gray-500">
            A/B tests can be created from the widget builder to test different greetings, themes, or prompts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const totalVisitors = test.variants.reduce((s, v) => s + v.visitors, 0);
            return (
              <div key={test._id} className="rounded-xl border border-white/10 bg-[#12121a] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{test.name}</h3>
                    <p className="text-xs text-gray-500">
                      Widget: {test.clientId} &middot; {totalVisitors} visitors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(test.status)}`}
                    >
                      {test.status}
                    </span>
                    {test.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(test._id, 'running')}
                        className="rounded-lg bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 transition hover:bg-green-500/25"
                      >
                        Start
                      </button>
                    )}
                    {test.status === 'running' && (
                      <button
                        onClick={() => updateStatus(test._id, 'paused')}
                        className="rounded-lg bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-400 transition hover:bg-yellow-500/25"
                      >
                        Pause
                      </button>
                    )}
                    {test.status === 'paused' && (
                      <button
                        onClick={() => updateStatus(test._id, 'running')}
                        className="rounded-lg bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 transition hover:bg-green-500/25"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>

                {/* Variant Results */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {test.variants.map((v) => {
                    const rate = v.visitors > 0 ? ((v.conversions / v.visitors) * 100).toFixed(1) : '0.0';
                    const isWinner = test.winnerVariantId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor: isWinner ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
                          background: isWinner ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{v.label}</span>
                          {isWinner && <span className="text-xs font-medium text-green-400">Winner</span>}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{v.visitors} visitors</span>
                          <span>{v.conversions} conversions</span>
                          <span className="font-medium text-gray-300">{rate}% CVR</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/ab-tests/page.tsx && git commit -m "feat: add A/B tests management page"
```

---

## Chunk 3: Team Management (Section 4C)

### Task 7: Create org invite API

**Files:**

- Create: `src/app/api/org/invite/route.ts`
- Test: `src/app/api/org/invite/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/org/invite/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockVerifyUser,
  mockConnectDB,
  mockUserFindOne,
  mockOrgMemberCreate,
  mockOrgMemberFindOne,
  mockUserFindByIdAndUpdate,
} = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFindOne: vi.fn(),
  mockOrgMemberCreate: vi.fn(),
  mockOrgMemberFindOne: vi.fn(),
  mockUserFindByIdAndUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { findOne: mockUserFindOne, findByIdAndUpdate: mockUserFindByIdAndUpdate },
}));
vi.mock('@/models/OrgMember', () => ({
  default: { create: mockOrgMemberCreate, findOne: mockOrgMemberFindOne },
}));

import { POST } from './route';

describe('POST /api/org/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 403 if user is not owner or admin', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'viewer',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });

    const req = new NextRequest('http://localhost/api/org/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', role: 'editor' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('invites existing user to organization', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });
    mockUserFindOne.mockResolvedValue({ _id: 'user2', email: 'new@test.com' });
    mockOrgMemberFindOne.mockResolvedValue(null);
    mockOrgMemberCreate.mockResolvedValue({ organizationId: 'org1', userId: 'user2', role: 'editor' });
    mockUserFindByIdAndUpdate.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/org/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', role: 'editor' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockOrgMemberCreate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/org/invite/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the invite API**

```typescript
// src/app/api/org/invite/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OrgMember from '@/models/OrgMember';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    if (!auth.organizationId) {
      return Errors.badRequest('You must belong to an organization');
    }

    if (auth.orgRole !== 'owner' && auth.orgRole !== 'admin') {
      return Errors.forbidden('Only owners and admins can invite members');
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return Errors.badRequest('email and role are required');
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return Errors.badRequest('role must be admin, editor, or viewer');
    }

    await connectDB();

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) {
      return Errors.notFound('User not found. They must sign up first.');
    }

    const existing = await OrgMember.findOne({
      organizationId: auth.organizationId,
      userId: invitee._id.toString(),
    });
    if (existing) {
      return Errors.badRequest('User is already a member of this organization');
    }

    await OrgMember.create({
      organizationId: auth.organizationId,
      userId: invitee._id.toString(),
      role,
    });

    await User.findByIdAndUpdate(invitee._id, { organizationId: auth.organizationId });

    return successResponse({ email, role }, 'Member invited successfully');
  } catch (error) {
    console.error('Org invite error:', error);
    return Errors.internal('Failed to invite member');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/org/invite/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/org/invite/route.ts src/app/api/org/invite/route.test.ts && git commit -m "feat: add organization invite API"
```

---

### Task 8: Create org members API

**Files:**

- Create: `src/app/api/org/members/route.ts`

- [ ] **Step 1: Create members list/update/remove API**

```typescript
// src/app/api/org/members/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OrgMember from '@/models/OrgMember';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    if (!auth.organizationId) {
      return successResponse([]);
    }

    await connectDB();

    const members = await OrgMember.find({ organizationId: auth.organizationId });
    const userIds = members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('email name');

    const result = members.map((m) => {
      const u = users.find((u) => u._id.toString() === m.userId);
      return {
        memberId: m._id.toString(),
        userId: m.userId,
        email: u?.email || '',
        name: u?.name || '',
        role: m.role,
        joinedAt: m.createdAt,
      };
    });

    return successResponse(result);
  } catch (error) {
    console.error('Get org members error:', error);
    return Errors.internal('Failed to fetch members');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    if (auth.orgRole !== 'owner' && auth.orgRole !== 'admin') {
      return Errors.forbidden('Insufficient permissions');
    }

    const { memberId, role } = await request.json();
    if (!memberId || !role) return Errors.badRequest('memberId and role required');

    await connectDB();

    const member = await OrgMember.findById(memberId);
    if (!member || member.organizationId !== auth.organizationId) {
      return Errors.notFound('Member not found');
    }

    if (member.role === 'owner') {
      return Errors.forbidden('Cannot change owner role');
    }

    member.role = role;
    await member.save();

    return successResponse({ memberId, role }, 'Role updated');
  } catch (error) {
    console.error('Update member error:', error);
    return Errors.internal('Failed to update member');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    if (auth.orgRole !== 'owner' && auth.orgRole !== 'admin') {
      return Errors.forbidden('Insufficient permissions');
    }

    const { memberId } = await request.json();
    if (!memberId) return Errors.badRequest('memberId required');

    await connectDB();

    const member = await OrgMember.findById(memberId);
    if (!member || member.organizationId !== auth.organizationId) {
      return Errors.notFound('Member not found');
    }

    if (member.role === 'owner') {
      return Errors.forbidden('Cannot remove the owner');
    }

    await OrgMember.deleteOne({ _id: memberId });
    await User.findByIdAndUpdate(member.userId, { organizationId: null });

    return successResponse(undefined, 'Member removed');
  } catch (error) {
    console.error('Remove member error:', error);
    return Errors.internal('Failed to remove member');
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/org/members/route.ts && git commit -m "feat: add org members list/update/remove API"
```

---

### Task 9: Create team management page

**Files:**

- Create: `src/app/dashboard/team/page.tsx`

- [ ] **Step 1: Create team page**

```tsx
// src/app/dashboard/team/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Member {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/15 text-purple-400',
  admin: 'bg-blue-500/15 text-blue-400',
  editor: 'bg-cyan-500/15 text-cyan-400',
  viewer: 'bg-gray-500/15 text-gray-400',
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const canManage = user?.orgRole === 'owner' || user?.orgRole === 'admin';

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/org/members');
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteEmail('');
        fetchMembers();
      } else {
        setError(json.error || 'Failed to invite');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    await fetch('/api/org/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    fetchMembers();
  };

  const handleRemove = async (memberId: string) => {
    await fetch('/api/org/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    fetchMembers();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Team</h1>

      {/* Invite Form */}
      {canManage && (
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Invite Member</h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/30 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Members List */}
      <div className="rounded-xl border border-white/10 bg-[#12121a]">
        {loading ? (
          <div className="space-y-3 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No team members yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.memberId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {canManage && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleUpdateRole(m.memberId, e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_COLORS[m.role]}`}>
                      {m.role}
                    </span>
                  )}
                  {canManage && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(m.memberId)}
                      className="text-xs text-red-400/60 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/team/page.tsx && git commit -m "feat: add team management page"
```

---

## Chunk 4: Multi-Agent & Notifications (Sections 1, 8C)

### Task 10: Add agent_switch SSE event and AgentActivityFeed

**Files:**

- Modify: `src/lib/builder/types.ts`
- Create: `src/components/builder/AgentActivityFeed.tsx`
- Modify: `src/components/builder/useBuilderStream.ts`

- [ ] **Step 1: Add AgentType and agent_switch event to types.ts**

In `src/lib/builder/types.ts`, add:

```typescript
export type AgentType = 'orchestrator' | 'design' | 'content' | 'knowledge' | 'integration' | 'qa' | 'deploy';
```

Add to the SSEEvent union type:

```typescript
| { type: 'agent_switch'; agent: AgentType; task: string }
```

- [ ] **Step 2: Create AgentActivityFeed component**

```tsx
// src/components/builder/AgentActivityFeed.tsx
'use client';

import type { AgentType } from '@/lib/builder/types';

const AGENT_CONFIG: Record<AgentType, { label: string; icon: string; color: string }> = {
  orchestrator: { label: 'Orchestrator', icon: '🎯', color: 'text-blue-400' },
  design: { label: 'Design Agent', icon: '🎨', color: 'text-purple-400' },
  content: { label: 'Content Agent', icon: '✍️', color: 'text-cyan-400' },
  knowledge: { label: 'Knowledge Agent', icon: '📚', color: 'text-amber-400' },
  integration: { label: 'Integration Agent', icon: '🔗', color: 'text-green-400' },
  qa: { label: 'QA Agent', icon: '🧪', color: 'text-red-400' },
  deploy: { label: 'Deploy Agent', icon: '🚀', color: 'text-emerald-400' },
};

interface AgentActivity {
  agent: AgentType;
  task: string;
  timestamp: number;
}

interface AgentActivityFeedProps {
  activities: AgentActivity[];
  activeAgent: AgentType | null;
}

export default function AgentActivityFeed({ activities, activeAgent }: AgentActivityFeedProps) {
  if (activities.length === 0) return null;

  return (
    <div className="mx-4 mb-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">Agent Activity</p>
      <div className="space-y-1.5">
        {activities.slice(-5).map((a, i) => {
          const cfg = AGENT_CONFIG[a.agent];
          const isActive = activeAgent === a.agent && i === activities.length - 1;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs">{cfg.icon}</span>
              <span className={`text-xs font-medium ${isActive ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
              <span className="text-xs text-gray-700">{a.task}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update useBuilderStream to handle agent_switch**

In `src/components/builder/useBuilderStream.ts`, add to the state interface:

```typescript
activeAgent: AgentType | null;
agentActivities: {
  agent: AgentType;
  task: string;
  timestamp: number;
}
[];
```

In the initial state, add:

```typescript
activeAgent: null,
agentActivities: [],
```

In the `handleEvent` function, add a case for `agent_switch`:

```typescript
case 'agent_switch':
  return {
    ...state,
    activeAgent: event.agent,
    agentActivities: [
      ...state.agentActivities,
      { agent: event.agent, task: event.task, timestamp: Date.now() },
    ],
  };
```

In the `resetSession` function, reset both fields:

```typescript
activeAgent: null,
agentActivities: [],
```

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/builder/types.ts src/components/builder/AgentActivityFeed.tsx src/components/builder/useBuilderStream.ts && git commit -m "feat: add agent_switch SSE event and AgentActivityFeed"
```

---

### Task 11: Extend Notification model with userId + create notifications API

**Files:**

- Modify: `src/models/Notification.ts`
- Create: `src/app/api/notifications/route.ts`
- Test: `src/app/api/notifications/route.test.ts`

- [ ] **Step 1: Add userId to Notification model**

In `src/models/Notification.ts`, add to `INotification` interface:

```typescript
userId?: string | null;
```

Add to `NotificationSchema`:

```typescript
userId: { type: String, default: null, index: true },
```

Add new notification types to `NotificationType`:

```typescript
| 'ab_test_result'
| 'knowledge_gap'
| 'team_invite'
| 'widget_deployed'
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/app/api/notifications/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockNotifFind, mockNotifUpdateMany } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockNotifFind: vi.fn(),
  mockNotifUpdateMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Notification', () => ({
  default: { find: mockNotifFind, updateMany: mockNotifUpdateMany },
}));

import { GET, PATCH } from './route';

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });
  });

  it('GET returns user notifications', async () => {
    mockNotifFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi
          .fn()
          .mockResolvedValue([
            {
              _id: 'n1',
              type: 'widget_deployed',
              title: 'Widget ready',
              message: 'Your widget is live',
              isRead: false,
            },
          ]),
      }),
    });

    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('PATCH marks notifications as read', async () => {
    mockNotifUpdateMany.mockResolvedValue({ modifiedCount: 3 });

    const req = new NextRequest('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/notifications/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the notifications API**

```typescript
// src/app/api/notifications/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const notifications = await Notification.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(50);

    return successResponse(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return Errors.internal('Failed to fetch notifications');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { action, notificationId } = await request.json();

    await connectDB();

    if (action === 'mark_all_read') {
      await Notification.updateMany({ userId: auth.userId, isRead: false }, { isRead: true });
    } else if (action === 'mark_read' && notificationId) {
      await Notification.updateOne({ _id: notificationId, userId: auth.userId }, { isRead: true });
    }

    return successResponse(undefined, 'Notifications updated');
  } catch (error) {
    console.error('Update notifications error:', error);
    return Errors.internal('Failed to update notifications');
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/notifications/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/Notification.ts src/app/api/notifications/route.ts src/app/api/notifications/route.test.ts && git commit -m "feat: add user notifications API with userId scoping"
```

---

### Task 12: Create NotificationBell component

**Files:**

- Create: `src/components/NotificationBell.tsx`

- [ ] **Step 1: Create the bell component**

```tsx
// src/components/NotificationBell.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      if (json.success) setNotifications(json.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-[#12121a] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-600">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n._id}
                  className={`border-b border-white/5 px-4 py-3 last:border-0 ${!n.isRead ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    {!n.isRead && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-400" />}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{n.message}</p>
                  <p className="mt-1 text-[10px] text-gray-700">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/components/NotificationBell.tsx && git commit -m "feat: add NotificationBell component"
```

---

## Chunk 5: Dashboard Integration & Final

### Task 13: Update dashboard layout with new nav items + NotificationBell

**Files:**

- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add new nav items and NotificationBell**

Add 3 new items to the `navItems` array in `src/app/dashboard/layout.tsx`:

After the "Integrations" item, add:

```typescript
{
  label: 'Analytics',
  href: '/dashboard/analytics',
  icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
},
{
  label: 'A/B Tests',
  href: '/dashboard/ab-tests',
  icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8" />
    </svg>
  ),
},
{
  label: 'Team',
  href: '/dashboard/team',
  icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
},
```

Add `NotificationBell` import and render it in the header next to the email/logout:

```typescript
import NotificationBell from '@/components/NotificationBell';
```

In the header `<div className="flex flex-shrink-0 items-center gap-4">` add before the email span:

```tsx
<NotificationBell />
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/layout.tsx && git commit -m "feat: add Analytics, A/B Tests, Team nav items + NotificationBell"
```

---

### Task 14: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS (or same pre-existing failures only)

- [ ] **Step 2: Run type check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit`
Expected: No new type errors

### Task 15: Push to remote

- [ ] **Step 1: Push**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git push origin main`
