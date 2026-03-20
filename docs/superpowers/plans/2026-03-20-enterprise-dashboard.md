# Enterprise Dashboard Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Enterprise Dashboard feature (60% → 100%) by adding A/B test PATCH/DELETE + statistical significance, AI quality metrics to analytics, white-label settings, and team audit log.

**Architecture:** Add missing PATCH/DELETE to A/B tests API with chi-squared significance calculator. Extend analytics API with AI quality metrics (resolution rate, knowledge gaps). Add white-label fields to Organization model with settings page. Add audit log viewer from existing AuditLog model.

**Tech Stack:** Next.js 15, MongoDB/Mongoose, Vitest, Tailwind CSS v4, framer-motion, lucide-react, recharts

**Deferred:** Heatmap visualization (hourly distribution already exists as data, UI enhancement only), ROI calculator (requires revenue tracking not yet built), conversion funnels (requires funnel event tracking).

**Existing patterns:**

- Auth: `verifyUser(request)` from `@/lib/auth`
- API: `successResponse()`, `Errors.*` from `@/lib/apiResponse`
- Models: Mongoose `Schema<IInterface>`, timestamps
- Dashboard UI: Tailwind + framer-motion, glassmorphism, lucide-react

---

## File Structure

| File                                                          | Responsibility                                       |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| **Create:** `src/lib/abTestStats.ts`                          | Chi-squared test, p-value, confidence intervals      |
| **Create:** `src/app/api/ab-tests/[id]/route.ts`              | PATCH (update status) + DELETE for A/B tests         |
| **Create:** `src/lib/analytics/aiQuality.ts`                  | AI quality metrics (resolution rate, knowledge gaps) |
| **Create:** `src/app/api/analytics/ai-quality/route.ts`       | API endpoint for AI quality metrics                  |
| **Create:** `src/app/dashboard/settings/white-label/page.tsx` | White-label settings page                            |
| **Create:** `src/app/api/org/white-label/route.ts`            | GET/PUT white-label settings                         |
| **Create:** `src/app/api/org/audit-log/route.ts`              | GET audit log entries                                |
| **Create:** `src/test/abTestStats.test.ts`                    | Statistical significance tests                       |
| **Create:** `src/test/aiQuality.test.ts`                      | AI quality metrics tests                             |
| **Modify:** `src/models/Organization.ts`                      | Add white-label fields                               |
| **Modify:** `src/app/dashboard/analytics/page.tsx`            | Add AI quality metrics section                       |
| **Modify:** `src/app/dashboard/team/page.tsx`                 | Add audit log tab                                    |
| **Modify:** `src/app/dashboard/settings/page.tsx`             | Add White-Label nav link                             |

---

### Task 1: A/B Test PATCH/DELETE Endpoints + Statistical Significance

**Files:**

- Create: `src/lib/abTestStats.ts`
- Create: `src/app/api/ab-tests/[id]/route.ts`
- Test: `src/test/abTestStats.test.ts`

- [ ] **Step 1: Write failing tests for chi-squared calculator**

```typescript
// src/test/abTestStats.test.ts
import { describe, it, expect } from 'vitest';
import { chiSquaredTest, calculateConfidence } from '@/lib/abTestStats';

describe('abTestStats', () => {
  it('returns not significant for small sample', () => {
    const result = chiSquaredTest([
      { visitors: 10, conversions: 1 },
      { visitors: 10, conversions: 2 },
    ]);
    expect(result.significant).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it('returns significant for large difference', () => {
    const result = chiSquaredTest([
      { visitors: 1000, conversions: 50 },
      { visitors: 1000, conversions: 120 },
    ]);
    expect(result.significant).toBe(true);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('returns not significant for equal rates', () => {
    const result = chiSquaredTest([
      { visitors: 500, conversions: 50 },
      { visitors: 500, conversions: 52 },
    ]);
    expect(result.significant).toBe(false);
  });

  it('calculateConfidence returns correct confidence intervals', () => {
    const ci = calculateConfidence(500, 50);
    expect(ci.rate).toBeCloseTo(0.1, 2);
    expect(ci.lower).toBeLessThan(ci.rate);
    expect(ci.upper).toBeGreaterThan(ci.rate);
    expect(ci.lower).toBeGreaterThan(0);
    expect(ci.upper).toBeLessThan(1);
  });

  it('handles zero visitors gracefully', () => {
    const result = chiSquaredTest([
      { visitors: 0, conversions: 0 },
      { visitors: 0, conversions: 0 },
    ]);
    expect(result.significant).toBe(false);
  });

  it('identifies winner index correctly', () => {
    const result = chiSquaredTest([
      { visitors: 1000, conversions: 50 },
      { visitors: 1000, conversions: 150 },
    ]);
    expect(result.winnerIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/abTestStats.test.ts`
Expected: FAIL

- [ ] **Step 3: Create chi-squared calculator**

```typescript
// src/lib/abTestStats.ts

interface VariantData {
  visitors: number;
  conversions: number;
}

interface ChiSquaredResult {
  significant: boolean;
  pValue: number;
  chiSquared: number;
  winnerIndex: number | null;
  confidence: number;
}

interface ConfidenceInterval {
  rate: number;
  lower: number;
  upper: number;
}

/**
 * Chi-squared test for comparing conversion rates across variants.
 * Returns significance at 95% confidence level (p < 0.05).
 */
export function chiSquaredTest(variants: VariantData[]): ChiSquaredResult {
  const totalVisitors = variants.reduce((s, v) => s + v.visitors, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);

  if (totalVisitors === 0) {
    return { significant: false, pValue: 1, chiSquared: 0, winnerIndex: null, confidence: 0 };
  }

  const overallRate = totalConversions / totalVisitors;

  // Calculate chi-squared statistic
  let chiSq = 0;
  for (const v of variants) {
    if (v.visitors === 0) continue;
    const expectedConversions = v.visitors * overallRate;
    const expectedNonConversions = v.visitors * (1 - overallRate);

    if (expectedConversions > 0) {
      chiSq += Math.pow(v.conversions - expectedConversions, 2) / expectedConversions;
    }
    if (expectedNonConversions > 0) {
      const nonConversions = v.visitors - v.conversions;
      chiSq += Math.pow(nonConversions - expectedNonConversions, 2) / expectedNonConversions;
    }
  }

  // Degrees of freedom = (rows - 1) * (cols - 1) = (2 - 1) * (k - 1) = k - 1
  const df = variants.length - 1;

  // Approximate p-value using chi-squared CDF (Wilson-Hilferty approximation)
  const pValue = 1 - chiSquaredCDF(chiSq, df);

  // Find winner (highest conversion rate)
  let winnerIndex: number | null = null;
  let bestRate = -1;
  for (let i = 0; i < variants.length; i++) {
    const rate = variants[i].visitors > 0 ? variants[i].conversions / variants[i].visitors : 0;
    if (rate > bestRate) {
      bestRate = rate;
      winnerIndex = i;
    }
  }

  const significant = pValue < 0.05;

  return {
    significant,
    pValue: Math.max(0, Math.min(1, pValue)),
    chiSquared: chiSq,
    winnerIndex: significant ? winnerIndex : null,
    confidence: Math.round((1 - pValue) * 100),
  };
}

/**
 * Wilson score interval for conversion rate confidence interval.
 */
export function calculateConfidence(visitors: number, conversions: number): ConfidenceInterval {
  if (visitors === 0) return { rate: 0, lower: 0, upper: 0 };

  const rate = conversions / visitors;
  const z = 1.96; // 95% confidence
  const denominator = 1 + (z * z) / visitors;
  const center = (rate + (z * z) / (2 * visitors)) / denominator;
  const margin = (z * Math.sqrt((rate * (1 - rate) + (z * z) / (4 * visitors)) / visitors)) / denominator;

  return {
    rate,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Chi-squared CDF approximation using the regularized incomplete gamma function.
 * Uses the series expansion for small values and continued fraction for large values.
 */
function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerIncompleteGamma(k / 2, x / 2) / gamma(k / 2);
}

function gamma(z: number): number {
  // Lanczos approximation
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function lowerIncompleteGamma(s: number, x: number): number {
  // Series expansion
  let sum = 0;
  let term = 1 / s;
  for (let n = 0; n < 100; n++) {
    sum += term;
    term *= x / (s + n + 1);
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.pow(x, s) * Math.exp(-x) * sum;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/abTestStats.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Create A/B test PATCH/DELETE endpoint**

```typescript
// src/app/api/ab-tests/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { chiSquaredTest, calculateConfidence } from '@/lib/abTestStats';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    // Calculate statistics
    const stats = chiSquaredTest(
      test.variants.map((v) => ({
        visitors: v.visitors,
        conversions: v.conversions,
      }))
    );

    const variantsWithCI = test.variants.map((v) => ({
      ...v.toObject(),
      conversionRate: v.visitors > 0 ? ((v.conversions / v.visitors) * 100).toFixed(2) : '0',
      ci: calculateConfidence(v.visitors, v.conversions),
    }));

    return successResponse({
      ...test.toObject(),
      variants: variantsWithCI,
      stats,
    });
  } catch (error) {
    console.error('Get AB test error:', error);
    return Errors.internal('Failed to fetch A/B test');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    if (status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused', 'completed'],
        paused: ['running', 'completed'],
        completed: [],
      };
      if (!validTransitions[test.status]?.includes(status)) {
        return Errors.badRequest(`Cannot transition from ${test.status} to ${status}`);
      }

      test.status = status;
      if (status === 'running' && !test.startedAt) test.startedAt = new Date();
      if (status === 'completed') {
        test.endedAt = new Date();
        // Auto-detect winner
        const stats = chiSquaredTest(
          test.variants.map((v) => ({
            visitors: v.visitors,
            conversions: v.conversions,
          }))
        );
        if (stats.significant && stats.winnerIndex !== null) {
          test.winnerVariantId = test.variants[stats.winnerIndex].id;
        }
      }
    }

    // Allow updating variant visitors/conversions (for recording)
    if (body.variants) {
      for (const update of body.variants) {
        const variant = test.variants.find((v) => v.id === update.id);
        if (variant) {
          if (update.visitors !== undefined) variant.visitors = update.visitors;
          if (update.conversions !== undefined) variant.conversions = update.conversions;
        }
      }
    }

    await test.save();
    return successResponse(test);
  } catch (error) {
    console.error('Update AB test error:', error);
    return Errors.internal('Failed to update A/B test');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    await ABTest.findByIdAndDelete(id);
    return successResponse(null, 'A/B test deleted');
  } catch (error) {
    console.error('Delete AB test error:', error);
    return Errors.internal('Failed to delete A/B test');
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/abTestStats.ts src/app/api/ab-tests/[id]/route.ts src/test/abTestStats.test.ts
git commit -m "feat: add A/B test statistical significance and PATCH/DELETE endpoints"
```

---

### Task 2: AI Quality Metrics

**Files:**

- Create: `src/lib/analytics/aiQuality.ts`
- Create: `src/app/api/analytics/ai-quality/route.ts`
- Test: `src/test/aiQuality.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/test/aiQuality.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockConversationCountDocuments = vi.fn();
const mockConversationFind = vi.fn();
const mockChatLogAggregate = vi.fn();

vi.mock('@/models/Conversation', () => ({
  default: {
    countDocuments: (...args: unknown[]) => mockConversationCountDocuments(...args),
    find: (...args: unknown[]) => mockConversationFind(...args),
  },
}));

vi.mock('@/models/ChatLog', () => ({
  default: {
    aggregate: (...args: unknown[]) => mockChatLogAggregate(...args),
  },
}));

describe('aiQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates resolution rate correctly', async () => {
    mockConversationCountDocuments
      .mockResolvedValueOnce(100) // total conversations
      .mockResolvedValueOnce(15); // handoff conversations
    const { getResolutionRate } = await import('@/lib/analytics/aiQuality');
    const rate = await getResolutionRate('client1', 30);
    expect(rate).toBe(85);
  });

  it('returns 100% resolution when no conversations', async () => {
    mockConversationCountDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const { getResolutionRate } = await import('@/lib/analytics/aiQuality');
    const rate = await getResolutionRate('client1', 30);
    expect(rate).toBe(100);
  });

  it('getKnowledgeGaps returns unanswered questions', async () => {
    mockChatLogAggregate.mockResolvedValue([
      { _id: 'What are your hours?', count: 5 },
      { _id: 'Do you offer refunds?', count: 3 },
    ]);
    const { getKnowledgeGaps } = await import('@/lib/analytics/aiQuality');
    const gaps = await getKnowledgeGaps('client1', 30);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].question).toBe('What are your hours?');
    expect(gaps[0].count).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/aiQuality.test.ts`
Expected: FAIL

- [ ] **Step 3: Create AI quality metrics module**

```typescript
// src/lib/analytics/aiQuality.ts
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import ChatLog from '@/models/ChatLog';

/**
 * Resolution rate: % of conversations resolved without handoff.
 */
export async function getResolutionRate(clientId: string, days: number): Promise<number> {
  await connectDB();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const total = await Conversation.countDocuments({
    clientId,
    createdAt: { $gte: since },
  });

  if (total === 0) return 100;

  const handoffs = await Conversation.countDocuments({
    clientId,
    createdAt: { $gte: since },
    status: 'handoff',
  });

  return Math.round(((total - handoffs) / total) * 100);
}

/**
 * Knowledge gaps: questions the AI couldn't answer well.
 * Detects messages followed by low-confidence responses or "I don't know" patterns.
 */
export async function getKnowledgeGaps(
  clientId: string,
  days: number,
  limit = 10
): Promise<Array<{ question: string; count: number }>> {
  await connectDB();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Find user messages where the next assistant response contains uncertainty markers
  const gaps = await ChatLog.aggregate([
    {
      $match: {
        clientId,
        createdAt: { $gte: since },
        'messages.role': 'user',
      },
    },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    {
      $group: {
        _id: { $substr: ['$messages.text', 0, 200] },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return gaps.map((g) => ({ question: g._id, count: g.count }));
}

/**
 * Get all AI quality metrics for a client.
 */
export async function getAIQualityMetrics(clientId: string, days: number) {
  const [resolutionRate, knowledgeGaps] = await Promise.all([
    getResolutionRate(clientId, days),
    getKnowledgeGaps(clientId, days),
  ]);

  return { resolutionRate, knowledgeGaps };
}
```

- [ ] **Step 4: Create API endpoint**

```typescript
// src/app/api/analytics/ai-quality/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAIQualityMetrics } from '@/lib/analytics/aiQuality';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const clientId = request.nextUrl.searchParams.get('clientId');

    await connectDB();

    if (clientId) {
      // Single widget
      const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
      const client = await Client.findOne({ ...query, clientId }).select('clientId');
      if (!client) return Errors.notFound('Widget not found');

      const metrics = await getAIQualityMetrics(clientId, days);
      return successResponse(metrics);
    }

    // All widgets aggregated
    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const clients = await Client.find(query).select('clientId username');

    const results = await Promise.all(
      clients.map(async (c) => ({
        clientId: c.clientId,
        name: c.username,
        metrics: await getAIQualityMetrics(c.clientId, days),
      }))
    );

    // Aggregate
    const avgResolution =
      results.length > 0 ? Math.round(results.reduce((s, r) => s + r.metrics.resolutionRate, 0) / results.length) : 100;

    const allGaps = results.flatMap((r) => r.metrics.knowledgeGaps);

    return successResponse({ avgResolutionRate: avgResolution, widgets: results, topGaps: allGaps.slice(0, 10) });
  } catch (error) {
    console.error('AI quality metrics error:', error);
    return Errors.internal('Failed to fetch AI quality metrics');
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/test/aiQuality.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics/aiQuality.ts src/app/api/analytics/ai-quality/route.ts src/test/aiQuality.test.ts
git commit -m "feat: add AI quality metrics (resolution rate, knowledge gaps)"
```

---

### Task 3: White-Label Settings

**Files:**

- Modify: `src/models/Organization.ts`
- Create: `src/app/api/org/white-label/route.ts`
- Create: `src/app/dashboard/settings/white-label/page.tsx`

- [ ] **Step 1: Add white-label fields to Organization model**

In `src/models/Organization.ts`, add to `IOrganization` interface:

```typescript
whiteLabel: {
  enabled: boolean;
  customDomain: string | null;
  hideBranding: boolean;
  brandName: string | null;
  brandColor: string | null;
  logoUrl: string | null;
}
```

Add to schema:

```typescript
    whiteLabel: {
      enabled: { type: Boolean, default: false },
      customDomain: { type: String, default: null },
      hideBranding: { type: Boolean, default: false },
      brandName: { type: String, default: null },
      brandColor: { type: String, default: null },
      logoUrl: { type: String, default: null },
    },
```

- [ ] **Step 2: Create white-label API endpoint**

```typescript
// src/app/api/org/white-label/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;
    if (!auth.organizationId) return Errors.badRequest('No organization');

    await connectDB();
    const org = await Organization.findById(auth.organizationId).select('whiteLabel plan');
    if (!org) return Errors.notFound('Organization not found');

    const isEnterprise = org.plan === 'enterprise';
    return successResponse({ whiteLabel: org.whiteLabel || {}, isEnterprise });
  } catch (error) {
    console.error('Get white-label error:', error);
    return Errors.internal('Failed to fetch white-label settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;
    if (!auth.organizationId) return Errors.badRequest('No organization');

    await connectDB();
    const org = await Organization.findById(auth.organizationId);
    if (!org) return Errors.notFound('Organization not found');
    if (org.plan !== 'enterprise') return Errors.forbidden('White-label requires Enterprise plan');

    const body = await request.json();
    const { customDomain, hideBranding, brandName, brandColor, logoUrl } = body;

    org.whiteLabel = {
      enabled: true,
      customDomain: customDomain || null,
      hideBranding: hideBranding ?? false,
      brandName: brandName || null,
      brandColor: brandColor || null,
      logoUrl: logoUrl || null,
    };

    await org.save();
    return successResponse(org.whiteLabel);
  } catch (error) {
    console.error('Update white-label error:', error);
    return Errors.internal('Failed to update white-label settings');
  }
}
```

- [ ] **Step 3: Create white-label settings page**

Create `src/app/dashboard/settings/white-label/page.tsx` — Apple Enterprise-quality settings page.

Must include:

- Enterprise plan check (show upgrade CTA if not enterprise)
- Form fields: Custom Domain (input), Hide Branding (toggle), Brand Name (input), Brand Color (color picker input), Logo URL (input)
- Preview card showing how the widget footer looks with/without branding
- Save button with loading state
- All glassmorphism styling, framer-motion animations
- Fetch from `GET /api/org/white-label`, save to `PUT /api/org/white-label`
- Use `useAuth()` for user context

- [ ] **Step 4: Commit**

```bash
git add src/models/Organization.ts src/app/api/org/white-label/route.ts src/app/dashboard/settings/white-label/page.tsx
git commit -m "feat: add white-label settings for Enterprise plan"
```

---

### Task 4: Analytics Page — AI Quality Metrics Section

**Files:**

- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Read the current analytics page**

Read `src/app/dashboard/analytics/page.tsx` to understand structure.

- [ ] **Step 2: Add AI Quality Metrics section**

Add a new section below existing analytics content. Fetch from `GET /api/analytics/ai-quality?days={days}` (use the same days state as existing analytics).

Display:

1. **Resolution Rate card** — large percentage number with circular progress ring, green/yellow/red based on thresholds (>80% green, 50-80% yellow, <50% red)
2. **Knowledge Gaps card** — list of top unanswered questions with count badges, each with "Add to Knowledge Base" link → `/dashboard/builder`

Use glassmorphism cards, framer-motion fade-in, lucide-react icons (Brain, AlertTriangle).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "feat: add AI quality metrics section to analytics dashboard"
```

---

### Task 5: Team Audit Log

**Files:**

- Modify: `src/models/AuditLog.ts`
- Create: `src/app/api/org/audit-log/route.ts`
- Modify: `src/app/dashboard/team/page.tsx`

- [ ] **Step 0: Add organizationId field to AuditLog model**

In `src/models/AuditLog.ts`, add to the `IAuditLog` interface:

```typescript
  organizationId?: string;
```

Add to schema (after `userAgent`):

```typescript
    organizationId: { type: String, index: true },
```

- [ ] **Step 1: Create audit log API endpoint**

```typescript
// src/app/api/org/audit-log/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;
    if (!auth.organizationId) return Errors.badRequest('No organization');

    await connectDB();

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100);

    // AuditLog may have userId or actorId — check the model first
    const query = { organizationId: auth.organizationId };
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return Errors.internal('Failed to fetch audit log');
  }
}
```

NOTE: Read `src/models/AuditLog.ts` first to check actual schema fields. Adjust the query field name (it might be `organizationId`, `userId`, or `actorId`) based on the actual model.

- [ ] **Step 2: Add audit log tab to team page**

In `src/app/dashboard/team/page.tsx`, add a tab system:

- Tab 1: "Members" (existing content)
- Tab 2: "Activity Log" (new)

The Activity Log tab:

- Fetches from `GET /api/org/audit-log`
- Shows a timeline-style list: date, actor (name/email), action type (badge), description
- Pagination at bottom
- Clean glassmorphism styling

- [ ] **Step 3: Commit**

```bash
git add src/app/api/org/audit-log/route.ts src/app/dashboard/team/page.tsx
git commit -m "feat: add team audit log with activity timeline"
```

---

### Task 6: Run All Tests + Push

- [ ] **Step 1: Run all new tests**

```bash
npx vitest run src/test/abTestStats.test.ts src/test/aiQuality.test.ts
```

Expected: All tests PASS (6 + 3 = 9 tests)

- [ ] **Step 2: Run all existing tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```
