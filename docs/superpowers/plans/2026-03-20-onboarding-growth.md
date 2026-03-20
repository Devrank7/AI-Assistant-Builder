# Onboarding & Growth Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Onboarding & Growth feature (70% → 100%) by adding referral system, email onboarding sequences, notification trigger wiring, missing empty states, and growth loop tracking.

**Architecture:** Add a Referral model with unique codes per user, wire it into registration. Use existing Nodemailer + cron for drip email sequences (no Redis/Bull needed). Wire 6 key notification types (new_client, widget_deployed, knowledge_gap, team_invite, ab_test_result, widget_error) to their triggers. Add Apple-quality empty states to 7 dashboard pages missing them. Note: `nanoid(8)` for referral codes (shorter = better UX for sharing).

**Deferred:** Telegram Bot notifications (spec 8C), Agency Program (spec 8D), Marketplace Authors growth loop (spec 8D) — will be addressed in Integration Hub and Marketplace plans respectively.

**Tech Stack:** Next.js 15, MongoDB/Mongoose, Nodemailer (existing), nanoid, Vitest, Tailwind CSS v4, framer-motion, lucide-react

**Existing patterns to follow:**

- Auth: `verifyUser(request)` from `@/lib/auth` returns `{ authenticated, userId, organizationId }`
- API responses: `successResponse(data)` and `Errors.badRequest()` from `@/lib/apiResponse`
- Models: Mongoose with `Schema<IInterface>`, timestamps, TTL indexes
- IDs: `nanoid(12)` for public-facing IDs
- Testing: Vitest with `vi.mock()`, dynamic imports for DI
- Dashboard UI: Tailwind + framer-motion, glassmorphism (`bg-bg-primary/80 backdrop-blur`), lucide-react icons

---

## File Structure

| File                                                    | Responsibility                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| **Create:** `src/models/Referral.ts`                    | Referral tracking (referrer → referee, reward status)               |
| **Create:** `src/lib/referral.ts`                       | Generate codes, apply referral on signup, calculate rewards         |
| **Create:** `src/app/api/referral/route.ts`             | GET referral stats + code, POST generate code                       |
| **Create:** `src/app/api/referral/apply/route.ts`       | POST apply referral reward after signup                             |
| **Create:** `src/lib/emailSequences.ts`                 | Define sequences, check which emails are due, send them             |
| **Create:** `src/app/api/cron/email-sequences/route.ts` | Cron endpoint to process pending sequence emails                    |
| **Create:** `src/lib/notificationTriggers.ts`           | Central `notify()` helper that creates Notification + optional push |
| **Create:** `src/test/referral.test.ts`                 | Referral logic tests                                                |
| **Create:** `src/test/emailSequences.test.ts`           | Email sequence logic tests                                          |
| **Create:** `src/test/notificationTriggers.test.ts`     | Notification trigger tests                                          |
| **Modify:** `src/models/User.ts`                        | Add `referralCode`, `referredBy` fields                             |
| **Modify:** `src/app/api/auth/register/route.ts`        | Apply referral on signup, trigger welcome email sequence            |
| **Modify:** `src/app/dashboard/inbox/page.tsx`          | Add empty state                                                     |
| **Modify:** `src/app/dashboard/flows/page.tsx`          | Add empty state                                                     |
| **Modify:** `src/app/dashboard/integrations/page.tsx`   | Add empty state                                                     |
| **Modify:** `src/app/dashboard/chats/page.tsx`          | Add empty state                                                     |
| **Modify:** `src/app/dashboard/widgets/page.tsx`        | Add empty state                                                     |
| **Modify:** `src/app/dashboard/team/page.tsx`           | Add empty state                                                     |
| **Modify:** `src/app/dashboard/billing/page.tsx`        | Add empty state                                                     |
| **Modify:** `src/app/dashboard/layout.tsx`              | Add "Referrals" nav item under WORKSPACE                            |

---

### Task 1: Referral Model + Logic

**Files:**

- Create: `src/models/Referral.ts`
- Create: `src/lib/referral.ts`
- Modify: `src/models/User.ts`
- Test: `src/test/referral.test.ts`

- [ ] **Step 1: Write failing tests for referral logic**

```typescript
// src/test/referral.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockUserFindOne = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockReferralCreate = vi.fn();
const mockReferralCountDocuments = vi.fn();
const mockReferralFind = vi.fn(() => ({ sort: vi.fn(() => ({ limit: vi.fn(() => []) })) }));

vi.mock('@/models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockUserFindByIdAndUpdate(...args),
  },
}));

vi.mock('@/models/Referral', () => ({
  default: {
    create: (...args: unknown[]) => mockReferralCreate(...args),
    countDocuments: (...args: unknown[]) => mockReferralCountDocuments(...args),
    find: (...args: unknown[]) => mockReferralFind(...args),
  },
}));

describe('referral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateReferralCode returns existing code if user has one', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: 'ABC123' });
    const { generateReferralCode } = await import('@/lib/referral');
    const code = await generateReferralCode('u1');
    expect(code).toBe('ABC123');
  });

  it('generateReferralCode creates new code if user has none', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: null });
    mockUserFindByIdAndUpdate.mockResolvedValue({ referralCode: 'NEW123' });
    const { generateReferralCode } = await import('@/lib/referral');
    const code = await generateReferralCode('u1');
    expect(code).toBeTruthy();
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalled();
  });

  it('applyReferral creates referral record and returns true', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'referrer1', referralCode: 'REF1' });
    mockReferralCreate.mockResolvedValue({ referrerId: 'referrer1', refereeId: 'newuser1' });
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('REF1', 'newuser1');
    expect(result).toBe(true);
    expect(mockReferralCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        referrerId: 'referrer1',
        refereeId: 'newuser1',
        code: 'REF1',
      })
    );
  });

  it('applyReferral returns false for invalid code', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('INVALID', 'newuser1');
    expect(result).toBe(false);
  });

  it('applyReferral returns false if user refers themselves', async () => {
    mockUserFindOne.mockResolvedValue({ _id: 'u1', referralCode: 'SELF' });
    const { applyReferral } = await import('@/lib/referral');
    const result = await applyReferral('SELF', 'u1');
    expect(result).toBe(false);
  });

  it('getReferralStats returns correct counts', async () => {
    mockReferralCountDocuments.mockResolvedValue(5);
    mockReferralFind.mockReturnValue({
      sort: vi.fn(() => ({ limit: vi.fn(() => [{ refereeId: 'r1', createdAt: new Date(), rewardApplied: true }]) })),
    });
    const { getReferralStats } = await import('@/lib/referral');
    const stats = await getReferralStats('u1');
    expect(stats.totalReferrals).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/referral.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Add referralCode and referredBy to User model**

In `src/models/User.ts`, add to the `IUser` interface:

```typescript
referralCode: string | null;
referredBy: string | null; // userId of referrer
```

Add to the schema:

```typescript
    referralCode: { type: String, default: null, unique: true, sparse: true },
    referredBy: { type: String, default: null, index: true },
```

Add index:

```typescript
UserSchema.index({ referralCode: 1 }, { sparse: true });
```

- [ ] **Step 4: Create Referral model**

```typescript
// src/models/Referral.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferral extends Document {
  referrerId: string;
  refereeId: string;
  code: string;
  rewardApplied: boolean;
  rewardType: 'starter_month' | 'none';
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: String, required: true, index: true },
    refereeId: { type: String, required: true, unique: true },
    code: { type: String, required: true, index: true },
    rewardApplied: { type: Boolean, default: false },
    rewardType: { type: String, enum: ['starter_month', 'none'], default: 'none' },
  },
  { timestamps: true }
);

const Referral: Model<IReferral> = mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
```

- [ ] **Step 5: Create referral logic**

```typescript
// src/lib/referral.ts
import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Referral from '@/models/Referral';

export async function generateReferralCode(userId: string): Promise<string> {
  await connectDB();
  const user = await User.findOne({ _id: userId }).select('referralCode');
  if (!user) throw new Error('User not found');
  if (user.referralCode) return user.referralCode;

  const code = nanoid(8).toUpperCase();
  const updated = await User.findByIdAndUpdate(userId, { referralCode: code }, { new: true });
  return updated!.referralCode!;
}

export async function applyReferral(code: string, refereeId: string): Promise<boolean> {
  await connectDB();
  const referrer = await User.findOne({ referralCode: code }).select('_id');
  if (!referrer) return false;
  if (referrer._id.toString() === refereeId) return false;

  await Referral.create({
    referrerId: referrer._id.toString(),
    refereeId,
    code,
    rewardType: 'starter_month',
  });

  await User.findByIdAndUpdate(refereeId, { referredBy: referrer._id.toString() });
  return true;
}

export async function getReferralStats(userId: string) {
  await connectDB();
  const totalReferrals = await Referral.countDocuments({ referrerId: userId });
  const recent = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(20);
  const rewardsEarned = await Referral.countDocuments({ referrerId: userId, rewardApplied: true });

  return { totalReferrals, rewardsEarned, recent };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/test/referral.test.ts`
Expected: 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/models/Referral.ts src/lib/referral.ts src/models/User.ts src/test/referral.test.ts
git commit -m "feat: add referral system model and core logic"
```

---

### Task 2: Referral API Endpoints

**Files:**

- Create: `src/app/api/referral/route.ts`
- Create: `src/app/api/referral/apply/route.ts`
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Create referral API (GET stats + POST generate code)**

```typescript
// src/app/api/referral/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateReferralCode, getReferralStats } from '@/lib/referral';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const stats = await getReferralStats(auth.userId);
    const code = await generateReferralCode(auth.userId);
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com'}/register?ref=${code}`;

    return successResponse({ code, referralLink, ...stats });
  } catch (error) {
    console.error('Referral stats error:', error);
    return Errors.internal('Failed to fetch referral data');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const code = await generateReferralCode(auth.userId);
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com'}/register?ref=${code}`;

    return successResponse({ code, referralLink }, 'Referral code generated');
  } catch (error) {
    console.error('Generate referral error:', error);
    return Errors.internal('Failed to generate referral code');
  }
}
```

- [ ] **Step 2: Create referral apply endpoint (internal, called during registration)**

```typescript
// src/app/api/referral/apply/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyReferral } from '@/lib/referral';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { code } = await request.json();
    if (!code) return Errors.badRequest('Referral code required');

    const applied = await applyReferral(code, auth.userId);
    if (!applied) return Errors.badRequest('Invalid or expired referral code');

    return successResponse({ applied: true }, 'Referral applied successfully');
  } catch (error) {
    console.error('Apply referral error:', error);
    return Errors.internal('Failed to apply referral');
  }
}
```

- [ ] **Step 3: Wire referral into registration**

In `src/app/api/auth/register/route.ts`, after `await user.save()` (the second save, after org creation, around line 69), add:

```typescript
// Apply referral if code provided
const referralCode = body.referralCode;
if (referralCode) {
  const { applyReferral } = await import('@/lib/referral');
  await applyReferral(referralCode, user._id.toString()).catch(() => {});
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/referral/route.ts src/app/api/referral/apply/route.ts src/app/api/auth/register/route.ts
git commit -m "feat: add referral API endpoints and wire into registration"
```

---

### Task 3: Email Sequences Engine

**Files:**

- Create: `src/lib/emailSequences.ts`
- Create: `src/app/api/cron/email-sequences/route.ts`
- Test: `src/test/emailSequences.test.ts`

- [ ] **Step 1: Write failing tests for email sequences**

```typescript
// src/test/emailSequences.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/notifications', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

const mockUserFind = vi.fn();
vi.mock('@/models/User', () => ({
  default: {
    find: (...args: unknown[]) => mockUserFind(...args),
    findByIdAndUpdate: vi.fn(),
  },
}));

describe('emailSequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSequenceForUser returns correct emails based on days since signup', async () => {
    const { getSequenceForUser, ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: [],
    };
    const due = getSequenceForUser(user as any, ONBOARDING_SEQUENCE);
    expect(due.length).toBeGreaterThan(0);
    expect(due[0].day).toBeLessThanOrEqual(1);
  });

  it('getSequenceForUser skips already-sent emails', async () => {
    const { getSequenceForUser, ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: ['onboarding_day0', 'onboarding_day1'],
    };
    const due = getSequenceForUser(user as any, ONBOARDING_SEQUENCE);
    const ids = due.map((e) => e.id);
    expect(ids).not.toContain('onboarding_day0');
    expect(ids).not.toContain('onboarding_day1');
  });

  it('buildEmailHtml returns valid HTML with user name', async () => {
    const { buildEmailHtml } = await import('@/lib/emailSequences');
    const html = buildEmailHtml('Welcome, {{name}}!', 'Start building', '/dashboard', { name: 'Alex' });
    expect(html).toContain('Alex');
    expect(html).toContain('/dashboard');
  });

  it('ONBOARDING_SEQUENCE has 7 emails over 30 days', async () => {
    const { ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    expect(ONBOARDING_SEQUENCE.length).toBe(7);
    expect(ONBOARDING_SEQUENCE[ONBOARDING_SEQUENCE.length - 1].day).toBe(30);
  });

  it('processSequenceForUser sends due emails and returns sent IDs', async () => {
    const { sendEmail } = await import('@/lib/notifications');
    const { processSequenceForUser } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: [],
    };
    const sent = await processSequenceForUser(user as any);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent).toContain('onboarding_day0');
    expect(sendEmail).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/emailSequences.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create email sequences engine**

```typescript
// src/lib/emailSequences.ts
import { sendEmail } from '@/lib/notifications';

export interface SequenceEmail {
  id: string;
  day: number; // days after signup
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  condition?: (user: SequenceUser) => boolean;
}

export interface SequenceUser {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  onboardingCompleted: boolean;
  plan: string;
  emailSequencesSent: string[];
}

export const ONBOARDING_SEQUENCE: SequenceEmail[] = [
  {
    id: 'onboarding_day0',
    day: 0,
    subject: 'Welcome to WinBix AI — Your first widget awaits',
    heading: 'Welcome, {{name}}!',
    body: 'You just joined 500+ businesses using AI to engage customers. Your dashboard is ready — create your first widget in under 3 minutes.',
    ctaText: 'Create Your Widget',
    ctaUrl: '/dashboard',
  },
  {
    id: 'onboarding_day1',
    day: 1,
    subject: 'Quick start: embed your widget in 30 seconds',
    heading: 'Ready to go live?',
    body: 'Copy one line of code and paste it into your website. Your AI assistant will be live instantly.',
    ctaText: 'Get Embed Code',
    ctaUrl: '/dashboard/installation',
    condition: (u) => !u.onboardingCompleted,
  },
  {
    id: 'onboarding_day3',
    day: 3,
    subject: 'Your widget is waiting for its first conversation',
    heading: 'Test your widget',
    body: 'Open your website and start a test conversation. See how your AI responds to real questions.',
    ctaText: 'Open Dashboard',
    ctaUrl: '/dashboard/chats',
    condition: (u) => !u.onboardingCompleted,
  },
  {
    id: 'onboarding_day7',
    day: 7,
    subject: 'Your Week 1 report is ready',
    heading: 'Week 1 at WinBix AI',
    body: 'Check your analytics to see how your widget performed this week. See conversations, leads, and engagement metrics.',
    ctaText: 'View Analytics',
    ctaUrl: '/dashboard/analytics',
  },
  {
    id: 'onboarding_day10',
    day: 10,
    subject: 'Unlock more with WinBix Pro',
    heading: 'Ready to level up?',
    body: "You've been using WinBix for 10 days. Upgrade to unlock unlimited messages, all channels, A/B testing, and advanced analytics.",
    ctaText: 'View Plans',
    ctaUrl: '/pricing',
    condition: (u) => u.plan === 'free' || u.plan === 'none',
  },
  {
    id: 'onboarding_day14',
    day: 14,
    subject: 'Connect more channels — Telegram, WhatsApp, Instagram',
    heading: 'Go omnichannel',
    body: 'Your customers are everywhere. Connect Telegram, WhatsApp, and Instagram to manage all conversations from one inbox.',
    ctaText: 'Connect Channels',
    ctaUrl: '/dashboard/integrations',
  },
  {
    id: 'onboarding_day30',
    day: 30,
    subject: 'Your monthly performance report',
    heading: 'Month 1 complete!',
    body: 'See your full first month of analytics — conversations, leads captured, satisfaction scores, and top questions.',
    ctaText: 'View Report',
    ctaUrl: '/dashboard/analytics',
  },
];

export function getSequenceForUser(user: SequenceUser, sequence: SequenceEmail[]): SequenceEmail[] {
  const daysSinceSignup = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const sent = new Set(user.emailSequencesSent || []);

  return sequence.filter((email) => {
    if (sent.has(email.id)) return false;
    if (email.day > daysSinceSignup) return false;
    if (email.condition && !email.condition(user)) return false;
    return true;
  });
}

export function buildEmailHtml(heading: string, ctaText: string, ctaUrl: string, vars: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
  let resolvedHeading = heading;
  for (const [key, val] of Object.entries(vars)) {
    resolvedHeading = resolvedHeading.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #3B82F6; color: white; font-weight: 700; width: 36px; height: 36px; line-height: 36px; border-radius: 10px; font-size: 16px;">W</div>
        <span style="display: inline-block; margin-left: 8px; font-weight: 600; font-size: 18px; color: #111;">WinBix AI</span>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; color: #111; margin: 0 0 16px;">${resolvedHeading}</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px;">${vars.body || ''}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}${ctaUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">${ctaText}</a>
      </div>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
      <p style="font-size: 12px; color: #9CA3AF; text-align: center;">WinBix AI · AI-powered chat widgets for your business</p>
    </div>
  `;
}

export async function processSequenceForUser(user: SequenceUser): Promise<string[]> {
  const due = getSequenceForUser(user, ONBOARDING_SEQUENCE);
  const sent: string[] = [];

  for (const email of due) {
    const html = buildEmailHtml(email.heading, email.ctaText, email.ctaUrl, {
      name: user.name || 'there',
      body: email.body,
    });

    const success = await sendEmail(user.email, email.subject, html);
    if (success) sent.push(email.id);
  }

  return sent;
}
```

- [ ] **Step 4: Add emailSequencesSent to User model**

In `src/models/User.ts`, add to `IUser` interface:

```typescript
  emailSequencesSent: string[];
```

Add to schema:

```typescript
    emailSequencesSent: { type: [String], default: [] },
```

- [ ] **Step 5: Create cron endpoint for email sequences**

```typescript
// src/app/api/cron/email-sequences/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { processSequenceForUser } from '@/lib/emailSequences';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Errors.unauthorized('Invalid cron secret');
    }

    await connectDB();

    // Find users who signed up in the last 31 days and haven't completed all emails
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const users = await User.find({
      createdAt: { $gte: thirtyOneDaysAgo },
      emailVerified: true,
    }).select('email name createdAt onboardingCompleted plan emailSequencesSent');

    let totalSent = 0;
    for (const user of users) {
      const sentIds = await processSequenceForUser(user as any);
      if (sentIds.length > 0) {
        await User.findByIdAndUpdate(user._id, {
          $push: { emailSequencesSent: { $each: sentIds } },
        });
        totalSent += sentIds.length;
      }
    }

    return successResponse({ processed: users.length, emailsSent: totalSent });
  } catch (error) {
    console.error('Email sequences cron error:', error);
    return Errors.internal('Failed to process email sequences');
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/test/emailSequences.test.ts`
Expected: 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/emailSequences.ts src/app/api/cron/email-sequences/route.ts src/test/emailSequences.test.ts src/models/User.ts
git commit -m "feat: add email onboarding sequences with cron processor"
```

---

### Task 4: Notification Triggers

**Files:**

- Create: `src/lib/notificationTriggers.ts`
- Test: `src/test/notificationTriggers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/test/notificationTriggers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockCreate = vi.fn();
vi.mock('@/models/Notification', () => ({
  default: { create: (...args: unknown[]) => mockCreate(...args) },
}));

describe('notificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ _id: 'n1' });
  });

  it('notify creates notification with correct fields', async () => {
    const { notify } = await import('@/lib/notificationTriggers');
    await notify({
      type: 'widget_deployed',
      userId: 'u1',
      title: 'Widget deployed',
      message: 'Your widget is live',
      targetId: 'client1',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'widget_deployed',
        userId: 'u1',
        title: 'Widget deployed',
        message: 'Your widget is live',
        targetId: 'client1',
      })
    );
  });

  it('notifyWidgetDeployed creates correct notification', async () => {
    const { notifyWidgetDeployed } = await import('@/lib/notificationTriggers');
    await notifyWidgetDeployed('u1', 'client1', 'My Widget');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'widget_deployed',
        title: 'Widget deployed',
      })
    );
  });

  it('notifyKnowledgeGap creates correct notification', async () => {
    const { notifyKnowledgeGap } = await import('@/lib/notificationTriggers');
    await notifyKnowledgeGap('u1', 'client1', 'What are your hours?');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'knowledge_gap',
      })
    );
  });

  it('notifyTeamInvite creates correct notification', async () => {
    const { notifyTeamInvite } = await import('@/lib/notificationTriggers');
    await notifyTeamInvite('u1', 'Org Name', 'admin');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'team_invite',
      })
    );
  });

  it('notifyABTestResult creates correct notification', async () => {
    const { notifyABTestResult } = await import('@/lib/notificationTriggers');
    await notifyABTestResult('u1', 'test1', 'Variant B won');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ab_test_result',
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/notificationTriggers.test.ts`
Expected: FAIL

- [ ] **Step 3: Create notification triggers module**

```typescript
// src/lib/notificationTriggers.ts
import connectDB from '@/lib/mongodb';
import Notification, { NotificationType } from '@/models/Notification';

interface NotifyInput {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function notify(input: NotifyInput): Promise<void> {
  await connectDB();
  await Notification.create({
    type: input.type,
    userId: input.userId,
    title: input.title,
    message: input.message,
    targetId: input.targetId,
    metadata: input.metadata || {},
  });
}

export async function notifyWidgetDeployed(userId: string, clientId: string, widgetName: string) {
  await notify({
    type: 'widget_deployed',
    userId,
    title: 'Widget deployed',
    message: `"${widgetName}" is live and ready to receive visitors.`,
    targetId: clientId,
  });
}

export async function notifyKnowledgeGap(userId: string, clientId: string, question: string) {
  await notify({
    type: 'knowledge_gap',
    userId,
    title: 'Knowledge gap detected',
    message: `A visitor asked "${question.substring(0, 100)}" but your AI couldn't find an answer. Consider adding this to your knowledge base.`,
    targetId: clientId,
  });
}

export async function notifyTeamInvite(userId: string, orgName: string, role: string) {
  await notify({
    type: 'team_invite',
    userId,
    title: 'Team invitation',
    message: `You've been invited to join "${orgName}" as ${role}.`,
  });
}

export async function notifyABTestResult(userId: string, testId: string, result: string) {
  await notify({
    type: 'ab_test_result',
    userId,
    title: 'A/B test result',
    message: result,
    targetId: testId,
  });
}

export async function notifyNewClient(userId: string, clientId: string, clientName: string) {
  await notify({
    type: 'new_client',
    userId,
    title: 'New widget created',
    message: `Widget "${clientName}" has been created successfully.`,
    targetId: clientId,
  });
}

export async function notifyWidgetError(userId: string, clientId: string, error: string) {
  await notify({
    type: 'widget_error',
    userId,
    title: 'Widget error',
    message: `An error occurred with your widget: ${error.substring(0, 200)}`,
    targetId: clientId,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/notificationTriggers.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/notificationTriggers.ts src/test/notificationTriggers.test.ts
git commit -m "feat: add centralized notification trigger helpers"
```

---

### Task 5: Wire Notification Triggers Into Existing Code

**Files:**

- Modify: `src/app/api/auth/register/route.ts` — trigger welcome notification
- Modify: `src/app/api/org/members/route.ts` — trigger team_invite notification

- [ ] **Step 1: Wire welcome notification in registration**

In `src/app/api/auth/register/route.ts`, after the referral code block (added in Task 2), add:

```typescript
// Welcome notification
const { notify } = await import('@/lib/notificationTriggers');
await notify({
  type: 'new_client',
  userId: user._id.toString(),
  title: 'Welcome to WinBix AI!',
  message: 'Your account is ready. Create your first AI widget to get started.',
}).catch(() => {});
```

- [ ] **Step 2: Wire team invite notification**

In `src/app/api/org/members/route.ts`, find the POST handler that creates OrgInvite. After the invite is created, add:

```typescript
// Notify invited user if they already have an account
const existingUser = await User.findOne({ email: email.toLowerCase() }).select('_id');
if (existingUser) {
  const { notifyTeamInvite } = await import('@/lib/notificationTriggers');
  await notifyTeamInvite(existingUser._id.toString(), org.name, role).catch(() => {});
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/register/route.ts src/app/api/org/members/route.ts
git commit -m "feat: wire notification triggers into registration and team invites"
```

---

### Task 6: Smart Empty States for Missing Dashboard Pages

**Files:**

- Modify: `src/app/dashboard/inbox/page.tsx`
- Modify: `src/app/dashboard/flows/page.tsx`
- Modify: `src/app/dashboard/integrations/page.tsx`
- Modify: `src/app/dashboard/chats/page.tsx`
- Modify: `src/app/dashboard/widgets/page.tsx`
- Modify: `src/app/dashboard/team/page.tsx`
- Modify: `src/app/dashboard/billing/page.tsx`

For this task, read each file first, find where the empty state should go (typically inside the `if (items.length === 0)` or similar check), and add an Apple-quality empty state with:

1. A relevant lucide-react icon (48px, muted color)
2. A heading (16px, semibold, text-text-primary)
3. A description (14px, text-text-secondary)
4. A CTA button linking to the relevant action
5. framer-motion fade-in animation

- [ ] **Step 1: Read each page file to understand structure**

Read all 7 files listed above. Note where empty states should be inserted.

- [ ] **Step 2: Add empty states to all 7 pages**

Each empty state follows this pattern (adapt icon, text, and CTA for each page):

```tsx
{
  items.length === 0 && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <IconName className="text-text-tertiary h-8 w-8" />
      </div>
      <h3 className="text-text-primary mb-1.5 text-base font-semibold">No items yet</h3>
      <p className="text-text-secondary mb-6 max-w-sm text-sm">
        Description of what this section does and why user should create their first item.
      </p>
      <Link
        href="/dashboard/relevant-page"
        className="bg-accent hover:bg-accent/90 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
      >
        Create First Item
      </Link>
    </motion.div>
  );
}
```

**Page-specific content:**

| Page         | Icon            | Heading                   | CTA                                                      |
| ------------ | --------------- | ------------------------- | -------------------------------------------------------- |
| inbox        | `Mail`          | No conversations yet      | Your inbox will populate when visitors start chatting    |
| flows        | `Workflow`      | No automation flows yet   | Create Flow                                              |
| integrations | `Plug`          | No integrations connected | Connect Integration                                      |
| chats        | `Bot`           | No active chat sessions   | Sessions appear when visitors interact with your widgets |
| widgets      | `MessageSquare` | No widgets yet            | Create Widget                                            |
| team         | `Users`         | Just you for now          | Invite Team Member                                       |
| billing      | `CreditCard`    | No active subscription    | View Plans                                               |

- [ ] **Step 3: Verify each page renders without errors**

Run: `npx next build` (or check in dev mode)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/inbox/page.tsx src/app/dashboard/flows/page.tsx src/app/dashboard/integrations/page.tsx src/app/dashboard/chats/page.tsx src/app/dashboard/widgets/page.tsx src/app/dashboard/team/page.tsx src/app/dashboard/billing/page.tsx
git commit -m "feat: add Apple-quality empty states to all dashboard pages"
```

---

### Task 7: Referral Dashboard Page

**Files:**

- Create: `src/app/dashboard/referrals/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add Referrals nav item to sidebar**

In `src/app/dashboard/layout.tsx`, add to the WORKSPACE section (after Settings):

```typescript
import { Gift } from 'lucide-react'; // Add to imports
```

Add to the WORKSPACE items array:

```typescript
{ label: 'Referrals', href: '/dashboard/referrals', icon: Gift },
```

- [ ] **Step 2: Create Referrals dashboard page**

Create `src/app/dashboard/referrals/page.tsx` — Apple-quality referral dashboard with:

1. **Stats row**: Total referrals, Rewards earned, Your referral code (copy button)
2. **Referral link**: Full URL with copy-to-clipboard
3. **Share buttons**: Copy link, Twitter/X share, Email share
4. **Recent referrals table**: Date, status (pending/rewarded), reward type
5. **How it works section**: 3-step visual (Share → Friend Signs Up → Both Earn)
6. All with glassmorphism cards, framer-motion, lucide-react icons

The page should:

- Fetch from `GET /api/referral`
- Use `useState`, `useEffect` for data fetching
- Use `useAuth()` hook for user context
- Handle loading/error states
- Copy-to-clipboard with toast feedback

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/referrals/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add Referrals dashboard page with sharing and stats"
```

---

### Task 8: Growth Loop — Powered By Tracking

**Files:**

- Modify: `src/app/api/auth/register/route.ts` — capture `ref` query param source

- [ ] **Step 1: Modify the registration page to capture `ref` query param**

Find the registration page/component (likely in `src/app/register/page.tsx` or `src/components/AuthModal.tsx` or similar). Add logic to:

1. Read `ref` from URL search params: `const searchParams = useSearchParams(); const ref = searchParams.get('ref');`
2. Include it in the registration POST body: `{ email, password, name, referralCode: ref }`

This connects the frontend to the backend wiring from Task 2.

- [ ] **Step 2: Verify the full flow**

1. Widget "Powered by WinBix AI" links to `https://winbixai.com/register?ref=WIDGET`
2. Registration page reads `ref` from URL params
3. Passes `referralCode` in POST body
4. Backend `applyReferral()` tracks it

- [ ] **Step 3: Commit**

```bash
git add <registration-page-file>
git commit -m "feat: capture referral code from URL on registration"
```

---

### Task 9: Run All Tests + Push

- [ ] **Step 1: Run all new tests**

```bash
npx vitest run src/test/referral.test.ts src/test/emailSequences.test.ts src/test/notificationTriggers.test.ts
```

Expected: All tests PASS (6 + 5 + 5 = 16 tests)

- [ ] **Step 2: Run existing tests to verify no breakage**

```bash
npx vitest run
```

Expected: All existing tests still pass

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```
