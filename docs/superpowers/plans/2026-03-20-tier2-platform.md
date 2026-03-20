# Tier 2 Platform: Custom Domain + Advanced Analytics + AI Training Studio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom domain with DNS validation and SSL, advanced analytics with funnels/cohorts/predictions, and AI training studio for human-in-the-loop quality improvement.

**Architecture:** Custom domain uses DNS CNAME verification + cert storage (no real Let's Encrypt in code — stores config for reverse proxy). Advanced analytics extends existing analytics.ts with new aggregation pipelines. Training studio adds a TrainingExample model and correction workflow UI.

**Tech Stack:** Next.js 15, TypeScript, MongoDB/Mongoose, recharts (existing charting), framer-motion

---

## Task 1: Custom Domain — Model & DNS Service

**Files:**

- Create: `src/models/CustomDomain.ts`
- Create: `src/lib/customDomainService.ts`
- Create: `src/test/customDomain.test.ts`

- [ ] **Step 1: Write CustomDomain model**

```typescript
// src/models/CustomDomain.ts
import mongoose, { Schema, Document } from 'mongoose';

export type DomainStatus = 'pending_verification' | 'verified' | 'ssl_provisioning' | 'active' | 'failed' | 'expired';

export interface ICustomDomain extends Document {
  organizationId: string;
  clientId?: string;
  domain: string;
  verificationToken: string;
  cnameTarget: string;
  status: DomainStatus;
  sslCertificateId?: string;
  sslExpiresAt?: Date;
  lastCheckedAt?: Date;
  verifiedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomDomainSchema = new Schema<ICustomDomain>(
  {
    organizationId: { type: String, required: true, index: true },
    clientId: String,
    domain: { type: String, required: true, unique: true },
    verificationToken: { type: String, required: true },
    cnameTarget: { type: String, default: 'proxy.winbixai.com' },
    status: {
      type: String,
      enum: ['pending_verification', 'verified', 'ssl_provisioning', 'active', 'failed', 'expired'],
      default: 'pending_verification',
    },
    sslCertificateId: String,
    sslExpiresAt: Date,
    lastCheckedAt: Date,
    verifiedAt: Date,
    error: String,
  },
  { timestamps: true }
);

export default mongoose.models.CustomDomain || mongoose.model<ICustomDomain>('CustomDomain', CustomDomainSchema);
```

- [ ] **Step 2: Write custom domain service**

```typescript
// src/lib/customDomainService.ts
import { connectDB } from '@/lib/mongodb';
import CustomDomain, { ICustomDomain } from '@/models/CustomDomain';
import crypto from 'crypto';
import dns from 'dns/promises';

const CNAME_TARGET = 'proxy.winbixai.com';

export async function createDomain(organizationId: string, domain: string, clientId?: string): Promise<ICustomDomain> {
  await connectDB();

  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) throw new Error('Invalid domain format');

  // Check not already taken
  const existing = await CustomDomain.findOne({ domain });
  if (existing) throw new Error('Domain already registered');

  const verificationToken = `winbix-verify-${crypto.randomBytes(16).toString('hex')}`;

  return CustomDomain.create({
    organizationId,
    clientId,
    domain,
    verificationToken,
    cnameTarget: CNAME_TARGET,
    status: 'pending_verification',
  });
}

export async function verifyDomain(domainId: string): Promise<{ verified: boolean; error?: string }> {
  await connectDB();
  const domainDoc = await CustomDomain.findById(domainId);
  if (!domainDoc) throw new Error('Domain not found');

  try {
    // Check CNAME record
    const records = await dns.resolveCname(domainDoc.domain).catch(() => []);
    const cnameVerified = records.some((r) => r === CNAME_TARGET || r === `${CNAME_TARGET}.`);

    // Check TXT record for verification token
    const txtRecords = await dns.resolveTxt(`_winbix.${domainDoc.domain}`).catch(() => []);
    const txtVerified = txtRecords.flat().some((r) => r === domainDoc.verificationToken);

    if (cnameVerified || txtVerified) {
      domainDoc.status = 'verified';
      domainDoc.verifiedAt = new Date();
      domainDoc.lastCheckedAt = new Date();
      await domainDoc.save();

      // Trigger SSL provisioning (async)
      provisionSSL(domainDoc._id.toString()).catch(console.error);

      return { verified: true };
    }

    domainDoc.lastCheckedAt = new Date();
    await domainDoc.save();

    return {
      verified: false,
      error: `DNS records not found. Add a CNAME record: ${domainDoc.domain} → ${CNAME_TARGET} OR a TXT record: _winbix.${domainDoc.domain} → ${domainDoc.verificationToken}`,
    };
  } catch (error: any) {
    domainDoc.lastCheckedAt = new Date();
    domainDoc.error = error.message;
    await domainDoc.save();
    return { verified: false, error: error.message };
  }
}

export async function provisionSSL(domainId: string): Promise<void> {
  await connectDB();
  const domainDoc = await CustomDomain.findById(domainId);
  if (!domainDoc || domainDoc.status !== 'verified') return;

  domainDoc.status = 'ssl_provisioning';
  await domainDoc.save();

  // In production: call Let's Encrypt API or Cloudflare for SSL cert
  // For now: mark as active (SSL handled by reverse proxy)
  domainDoc.status = 'active';
  domainDoc.sslExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await domainDoc.save();
}

export async function getDomains(organizationId: string): Promise<ICustomDomain[]> {
  await connectDB();
  return CustomDomain.find({ organizationId }).sort({ createdAt: -1 });
}

export async function deleteDomain(domainId: string, organizationId: string): Promise<boolean> {
  await connectDB();
  const result = await CustomDomain.deleteOne({ _id: domainId, organizationId });
  return result.deletedCount > 0;
}
```

- [ ] **Step 3: Write tests**

```typescript
// src/test/customDomain.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Custom Domain Service', () => {
  it('validates domain format', async () => {
    vi.doMock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
    vi.doMock('@/models/CustomDomain', () => ({
      default: { findOne: vi.fn().mockResolvedValue(null), create: vi.fn((data) => data) },
    }));
    const { createDomain } = await import('@/lib/customDomainService');
    await expect(createDomain('org1', 'not a domain')).rejects.toThrow('Invalid domain format');
  });

  it('creates domain with verification token', async () => {
    vi.doMock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
    vi.doMock('@/models/CustomDomain', () => ({
      default: {
        findOne: vi.fn().mockResolvedValue(null),
        create: vi.fn((data) => ({ ...data, _id: 'test-id' })),
      },
    }));
    const { createDomain } = await import('@/lib/customDomainService');
    const result = await createDomain('org1', 'chat.example.com');
    expect(result.domain).toBe('chat.example.com');
    expect(result.verificationToken).toMatch(/^winbix-verify-/);
    expect(result.cnameTarget).toBe('proxy.winbixai.com');
  });

  it('rejects duplicate domains', async () => {
    vi.doMock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
    vi.doMock('@/models/CustomDomain', () => ({
      default: { findOne: vi.fn().mockResolvedValue({ domain: 'chat.example.com' }) },
    }));
    const { createDomain } = await import('@/lib/customDomainService');
    await expect(createDomain('org1', 'chat.example.com')).rejects.toThrow('already registered');
  });
});
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/models/CustomDomain.ts src/lib/customDomainService.ts src/test/customDomain.test.ts
git commit -m "feat(domains): add custom domain model with DNS verification and SSL provisioning"
```

---

## Task 2: Custom Domain — API & Dashboard

**Files:**

- Create: `src/app/api/org/domains/route.ts`
- Create: `src/app/api/org/domains/[id]/route.ts`
- Create: `src/app/api/org/domains/[id]/verify/route.ts`
- Create: `src/app/dashboard/settings/domains/page.tsx`

- [ ] **Step 1: Write domain API routes**

GET/POST `/api/org/domains` — List and create custom domains (Enterprise plan required).
DELETE `/api/org/domains/[id]` — Delete a domain.
POST `/api/org/domains/[id]/verify` — Trigger DNS verification.

- [ ] **Step 2: Write domains management page**

Dashboard page showing:

- List of registered domains with status badges (pending → verified → active)
- "Add Domain" flow: enter domain → show DNS instructions (CNAME + TXT) → verify button
- Real-time verification status with polling
- SSL certificate expiry info
- Domain → Widget assignment dropdown
- Copy-paste DNS record cards with one-click copy

- [ ] **Step 3: Add to settings page and commit**

```bash
git commit -m "feat(domains): add custom domain API routes and management dashboard"
```

---

## Task 3: Advanced Analytics v2 — Backend Aggregations

**Files:**

- Create: `src/lib/advancedAnalytics.ts`
- Create: `src/app/api/analytics/funnels/route.ts`
- Create: `src/app/api/analytics/cohorts/route.ts`
- Create: `src/app/api/analytics/predictions/route.ts`
- Create: `src/test/advancedAnalytics.test.ts`

- [ ] **Step 1: Write advanced analytics service**

```typescript
// src/lib/advancedAnalytics.ts
import { connectDB } from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import Contact from '@/models/Contact';
import CustomerProfile from '@/models/CustomerProfile';
import ConversationInsight from '@/models/ConversationInsight';

interface FunnelStep {
  name: string;
  count: number;
  dropoff: number;
  conversionRate: number;
}

export async function getFunnelAnalysis(clientId: string, days = 30): Promise<FunnelStep[]> {
  await connectDB();
  const since = new Date(Date.now() - days * 86400000);

  // Funnel: Visit → First Message → Engaged (3+ msgs) → Lead → Conversion
  const totalSessions = await ChatLog.distinct('sessionId', { clientId, createdAt: { $gte: since } });
  const firstMessage = totalSessions.length;

  const engagedSessions = await ChatLog.aggregate([
    { $match: { clientId, createdAt: { $gte: since }, role: 'user' } },
    { $group: { _id: '$sessionId', count: { $sum: 1 } } },
    { $match: { count: { $gte: 3 } } },
  ]);
  const engaged = engagedSessions.length;

  const leads = await Contact.countDocuments({ clientId, createdAt: { $gte: since } });
  const conversions = await Contact.countDocuments({ clientId, createdAt: { $gte: since }, tags: 'converted' });

  const steps = [
    { name: 'Visitors', count: firstMessage },
    { name: 'Engaged (3+ messages)', count: engaged },
    { name: 'Leads Captured', count: leads },
    { name: 'Conversions', count: conversions },
  ];

  return steps.map((step, i) => ({
    ...step,
    dropoff: i > 0 ? steps[i - 1].count - step.count : 0,
    conversionRate: i > 0 && steps[i - 1].count > 0 ? Math.round((step.count / steps[i - 1].count) * 100) : 100,
  }));
}

interface CohortRow {
  cohort: string;
  totalUsers: number;
  retention: number[];
}

export async function getCohortRetention(clientId: string, weeks = 8): Promise<CohortRow[]> {
  await connectDB();
  const cohorts: CohortRow[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const cohortStart = new Date(Date.now() - (w + 1) * 7 * 86400000);
    const cohortEnd = new Date(Date.now() - w * 7 * 86400000);

    const cohortLabel = cohortStart.toISOString().slice(0, 10);

    // Users who first chatted in this week
    const firstTimers = await ChatLog.aggregate([
      { $match: { clientId, createdAt: { $gte: cohortStart, $lt: cohortEnd }, role: 'user' } },
      { $group: { _id: '$sessionId' } },
    ]);

    const sessionIds = firstTimers.map((s) => s._id);
    const totalUsers = sessionIds.length;

    // Check retention for each subsequent week
    const retention: number[] = [];
    for (let rw = 1; rw <= weeks - w - 1; rw++) {
      const retStart = new Date(cohortEnd.getTime() + (rw - 1) * 7 * 86400000);
      const retEnd = new Date(cohortEnd.getTime() + rw * 7 * 86400000);

      const returning = await ChatLog.distinct('sessionId', {
        clientId,
        sessionId: { $in: sessionIds },
        createdAt: { $gte: retStart, $lt: retEnd },
        role: 'user',
      });

      retention.push(totalUsers > 0 ? Math.round((returning.length / totalUsers) * 100) : 0);
    }

    cohorts.push({ cohort: cohortLabel, totalUsers, retention });
  }

  return cohorts;
}

export async function getPredictiveChurnScores(clientId: string): Promise<
  Array<{
    visitorId: string;
    name?: string;
    churnScore: number;
    signals: string[];
    lastActive: Date;
  }>
> {
  await connectDB();

  const profiles = await CustomerProfile.find({
    clientId,
    'intelligence.churnRisk': { $gt: 40 },
  })
    .sort({ 'intelligence.churnRisk': -1 })
    .limit(20);

  return profiles.map((p) => ({
    visitorId: p.visitorId || p._id.toString(),
    name: p.identity?.name,
    churnScore: p.intelligence?.churnRisk || 0,
    signals: [
      p.intelligence?.churnRisk > 70 ? 'High frustration detected' : '',
      p.sentiment?.current === 'negative' ? 'Negative sentiment' : '',
      p.engagement?.messageCount < 3 ? 'Low engagement' : '',
    ].filter(Boolean),
    lastActive: p.updatedAt,
  }));
}

export async function getRevenueAttribution(
  clientId: string,
  days = 30
): Promise<{
  totalRevenue: number;
  byChannel: Record<string, number>;
  byAgent: Record<string, number>;
  topConvertingIntents: Array<{ intent: string; conversions: number; revenue: number }>;
}> {
  await connectDB();
  const since = new Date(Date.now() - days * 86400000);

  const profiles = await CustomerProfile.find({
    clientId,
    'revenue.totalRevenue': { $gt: 0 },
    updatedAt: { $gte: since },
  });

  const totalRevenue = profiles.reduce((sum, p) => sum + (p.revenue?.totalRevenue || 0), 0);

  const byChannel: Record<string, number> = {};
  const byAgent: Record<string, number> = {};

  for (const p of profiles) {
    const channel = p.source || 'website';
    byChannel[channel] = (byChannel[channel] || 0) + (p.revenue?.totalRevenue || 0);
  }

  // Top converting intents
  const insights = await ConversationInsight.aggregate([
    { $match: { clientId, type: 'buying_signal', createdAt: { $gte: since }, confidence: { $gt: 0.7 } } },
    { $group: { _id: '$label', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return {
    totalRevenue,
    byChannel,
    byAgent,
    topConvertingIntents: insights.map((i) => ({ intent: i._id, conversions: i.count, revenue: 0 })),
  };
}
```

- [ ] **Step 2: Write API routes**

GET `/api/analytics/funnels?clientId=&days=30` — Funnel analysis.
GET `/api/analytics/cohorts?clientId=&weeks=8` — Cohort retention.
GET `/api/analytics/predictions?clientId=` — Predictive churn scores.
GET `/api/analytics/revenue?clientId=&days=30` — Revenue attribution.

- [ ] **Step 3: Write tests and commit**

```bash
git commit -m "feat(analytics): add funnel, cohort, prediction, and revenue attribution analytics"
```

---

## Task 4: Advanced Analytics v2 — Dashboard Page

**Files:**

- Create: `src/app/dashboard/analytics/advanced/page.tsx`
- Modify: `src/app/dashboard/analytics/page.tsx` (add link to advanced)
- Modify: `src/app/dashboard/layout.tsx` (add nav item)

- [ ] **Step 1: Write advanced analytics dashboard**

Full page with 4 sections:

**Section 1: Conversion Funnel**

- Horizontal funnel visualization (bars decreasing left to right)
- Step labels, counts, drop-off %, conversion rate
- Color gradient from green (entry) to red (exit)

**Section 2: Cohort Retention Matrix**

- Week-by-week retention heatmap
- Green (high retention) → Red (low retention)
- Row = cohort week, Column = weeks since first interaction
- Hover tooltip with exact numbers

**Section 3: Revenue Attribution**

- Total revenue card
- Channel breakdown (pie chart)
- Top converting intents (bar chart)
- Revenue trend line (30 days)

**Section 4: Churn Predictions**

- High-risk visitors list
- Churn score bar (0-100, color-coded)
- Warning signals per visitor
- Last active date
- "Reach Out" action button

All sections: glassmorphism cards, framer-motion stagger, responsive grid (2x2 on desktop, 1 column on mobile).

- [ ] **Step 2: Add nav and commit**

```bash
git commit -m "feat(analytics): add advanced analytics dashboard with funnels, cohorts, and predictions"
```

---

## Task 5: AI Training Studio — Model & Service

**Files:**

- Create: `src/models/TrainingExample.ts`
- Create: `src/lib/trainingStudio.ts`
- Create: `src/test/trainingStudio.test.ts`

- [ ] **Step 1: Write TrainingExample model**

```typescript
// src/models/TrainingExample.ts
import mongoose, { Schema, Document } from 'mongoose';

export type TrainingStatus = 'pending' | 'approved' | 'rejected' | 'applied';
export type TrainingSource = 'manual' | 'correction' | 'feedback' | 'imported';

export interface ITrainingExample extends Document {
  clientId: string;
  userId: string;
  source: TrainingSource;
  userMessage: string;
  idealResponse: string;
  actualResponse?: string;
  category: string;
  tags: string[];
  qualityScore?: number;
  status: TrainingStatus;
  appliedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingExampleSchema = new Schema<ITrainingExample>(
  {
    clientId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    source: { type: String, enum: ['manual', 'correction', 'feedback', 'imported'], default: 'manual' },
    userMessage: { type: String, required: true },
    idealResponse: { type: String, required: true },
    actualResponse: String,
    category: { type: String, default: 'general' },
    tags: [String],
    qualityScore: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'applied'], default: 'pending' },
    appliedAt: Date,
    reviewedBy: String,
    reviewNote: String,
  },
  { timestamps: true }
);

TrainingExampleSchema.index({ clientId: 1, status: 1, createdAt: -1 });

export default mongoose.models.TrainingExample ||
  mongoose.model<ITrainingExample>('TrainingExample', TrainingExampleSchema);
```

- [ ] **Step 2: Write training studio service**

```typescript
// src/lib/trainingStudio.ts
import { connectDB } from '@/lib/mongodb';
import TrainingExample from '@/models/TrainingExample';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { generateEmbedding } from '@/lib/gemini';
import { generateWithFallback } from '@/lib/multiModelProvider';

export async function addTrainingExample(data: {
  clientId: string;
  userId: string;
  userMessage: string;
  idealResponse: string;
  actualResponse?: string;
  source?: string;
  category?: string;
  tags?: string[];
}): Promise<any> {
  await connectDB();

  // Auto-score quality using AI
  let qualityScore = 0;
  try {
    const result = await generateWithFallback({
      systemPrompt:
        'Score this training example quality from 0-100. Consider: relevance, clarity, accuracy, helpfulness. Return just the number.',
      messages: [
        {
          role: 'user',
          content: `User: "${data.userMessage}"\nIdeal Response: "${data.idealResponse}"`,
        },
      ],
      temperature: 0.1,
      maxTokens: 10,
    });
    qualityScore = parseInt(result.text.match(/\d+/)?.[0] || '0');
  } catch {
    qualityScore = 50;
  }

  return TrainingExample.create({
    ...data,
    qualityScore,
    status: 'pending',
  });
}

export async function applyTrainingExamples(clientId: string): Promise<{ applied: number }> {
  await connectDB();

  const approved = await TrainingExample.find({ clientId, status: 'approved' });
  let applied = 0;

  for (const example of approved) {
    // Create a knowledge chunk from the training example
    const text = `Q: ${example.userMessage}\nA: ${example.idealResponse}`;
    const embedding = await generateEmbedding(text);

    await KnowledgeChunk.create({
      clientId,
      text,
      embedding,
      source: 'training',
    });

    example.status = 'applied';
    example.appliedAt = new Date();
    await example.save();
    applied++;
  }

  return { applied };
}

export async function getTrainingStats(clientId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  applied: number;
  avgQuality: number;
  categories: Record<string, number>;
}> {
  await connectDB();

  const stats = await TrainingExample.aggregate([
    { $match: { clientId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        applied: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } },
        avgQuality: { $avg: '$qualityScore' },
      },
    },
  ]);

  const categories = await TrainingExample.aggregate([
    { $match: { clientId } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const s = stats[0] || { total: 0, pending: 0, approved: 0, applied: 0, avgQuality: 0 };

  return {
    ...s,
    avgQuality: Math.round(s.avgQuality || 0),
    categories: Object.fromEntries(categories.map((c) => [c._id, c.count])),
  };
}

export async function importFromCorrections(clientId: string): Promise<number> {
  await connectDB();
  const Correction = (await import('@/models/Correction')).default;

  const corrections = await Correction.find({ clientId, status: 'applied' });
  let imported = 0;

  for (const corr of corrections) {
    const existing = await TrainingExample.findOne({
      clientId,
      userMessage: corr.originalQuestion,
      source: 'correction',
    });

    if (!existing) {
      await addTrainingExample({
        clientId,
        userId: 'system',
        userMessage: corr.originalQuestion,
        idealResponse: corr.correctedAnswer,
        actualResponse: corr.originalAnswer,
        source: 'correction',
        category: 'auto-correction',
      });
      imported++;
    }
  }

  return imported;
}
```

- [ ] **Step 3: Write tests and commit**

```bash
git commit -m "feat(training): add TrainingExample model and training studio service"
```

---

## Task 6: AI Training Studio — API Routes

**Files:**

- Create: `src/app/api/training/route.ts`
- Create: `src/app/api/training/[id]/route.ts`
- Create: `src/app/api/training/apply/route.ts`
- Create: `src/app/api/training/import/route.ts`
- Create: `src/app/api/training/stats/route.ts`

- [ ] **Step 1: Write training API routes**

GET `/api/training?clientId=&status=&page=&limit=` — List training examples with pagination/filtering.
POST `/api/training` — Create new training example (manual upload).
PATCH `/api/training/[id]` — Update status (approve/reject), edit response, add review note.
DELETE `/api/training/[id]` — Delete training example.
POST `/api/training/apply?clientId=` — Apply all approved examples to knowledge base.
POST `/api/training/import?clientId=` — Import from existing corrections.
GET `/api/training/stats?clientId=` — Training statistics.

All routes require verifyUser auth, check clientId ownership.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(training): add training studio API routes (CRUD, apply, import, stats)"
```

---

## Task 7: AI Training Studio — Dashboard Page

**Files:**

- Create: `src/app/dashboard/training/page.tsx`
- Modify: `src/app/dashboard/layout.tsx` (add nav items for training + domains + advanced analytics)

- [ ] **Step 1: Write training studio dashboard**

Full page with tabs:

**Tab 1: Training Examples**

- Table with columns: User Message, Ideal Response, Actual Response, Quality Score, Status, Actions
- Status badges (pending=yellow, approved=green, rejected=red, applied=blue)
- Approve/Reject buttons per row
- Edit response inline
- Bulk actions (approve all, reject all)
- Filter by status, category, quality score range

**Tab 2: Add Training Data**

- Manual entry form: user message + ideal response + category + tags
- Bulk import from CSV
- Import from corrections button
- Quality score preview

**Tab 3: Analytics**

- Training data stats cards (total, pending, approved, applied, avg quality)
- Category distribution chart
- Quality score distribution histogram
- Training timeline (examples added over time)
- "Apply Approved" button with confirmation modal

Style: glassmorphism cards, framer-motion stagger, tabs with underline indicator, responsive.

- [ ] **Step 2: Update dashboard layout**

Add nav items:

- "Training Studio" (GraduationCap icon) → /dashboard/training
- "Domains" (Globe icon) → /dashboard/settings/domains
- "Advanced Analytics" (TrendingUp icon) → /dashboard/analytics/advanced
- "Intelligence" (Brain icon) → /dashboard/intelligence
- "Agents" (Bot icon) → /dashboard/agents

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(training): add AI training studio dashboard and update navigation"
```
