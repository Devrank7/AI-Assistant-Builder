# Phase 1c: Onboarding Wizard + 4-Tier Pricing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step onboarding wizard after signup and redesign the pricing page with 4-tier plan structure (Free/$29/$79/$299), replacing the old 2-plan page.

**Architecture:** New onboarding fields on User model trigger a redirect to `/dashboard/onboarding` after signup. The wizard collects niche + widget type + URL, then redirects to the Builder with pre-filled context. Pricing page is a full rewrite with 4 plans matching Organization PLAN_LIMITS. `/api/auth/me` is extended to include onboarding status so the frontend can route correctly.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB/Mongoose, Vitest

**Spec Reference:** `docs/superpowers/specs/2026-03-16-enterprise-winbix-design.md` — Sections 6C, 8A

---

## File Structure

### New Files

| File                                        | Responsibility                          |
| ------------------------------------------- | --------------------------------------- |
| `src/app/dashboard/onboarding/page.tsx`     | 4-step onboarding wizard UI             |
| `src/app/api/user/onboarding/route.ts`      | Mark onboarding complete + save niche   |
| `src/app/api/user/onboarding/route.test.ts` | Tests for onboarding API                |
| `src/app/pricing/page.tsx`                  | New 4-tier pricing page                 |
| `src/lib/pricing.ts`                        | Pricing constants, plan comparison data |
| `src/lib/__tests__/pricing.test.ts`         | Tests for pricing logic                 |

### Modified Files

| File                                 | Change                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| `src/models/User.ts`                 | Add `onboardingCompleted`, `niche` fields                             |
| `src/app/api/auth/me/route.ts`       | Include `onboardingCompleted`, `organizationId`, `orgRole`, `orgPlan` |
| `src/app/dashboard/layout.tsx`       | Redirect to onboarding if not completed                               |
| `src/app/dashboard/billing/page.tsx` | Update to show 4-tier plan structure                                  |

---

## Chunk 1: User Model + Pricing Logic

### Task 1: Add onboarding fields to User model

**Files:**

- Modify: `src/models/User.ts`

- [ ] **Step 1: Add onboarding fields**

In `src/models/User.ts`:

Add to `IUser` interface after `organizationId`:

```typescript
onboardingCompleted: boolean;
niche: string | null;
```

Add to `UserSchema` after `organizationId` field:

```typescript
    onboardingCompleted: { type: Boolean, default: false },
    niche: { type: String, default: null },
```

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All pass (default values prevent breakage)

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/User.ts && git commit -m "feat: add onboardingCompleted and niche fields to User model"
```

---

### Task 2: Create pricing constants module

**Files:**

- Create: `src/lib/pricing.ts`
- Test: `src/lib/__tests__/pricing.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { PRICING_PLANS, getPlanById, getFeatureComparison } from '../pricing';

describe('pricing', () => {
  it('has 4 plans in correct order', () => {
    expect(PRICING_PLANS).toHaveLength(4);
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'enterprise']);
  });

  it('getPlanById returns correct plan', () => {
    const starter = getPlanById('starter');
    expect(starter).toBeDefined();
    expect(starter!.monthlyPrice).toBe(29);
    expect(starter!.annualPrice).toBe(24);
  });

  it('getPlanById returns null for unknown plan', () => {
    expect(getPlanById('unknown' as any)).toBeNull();
  });

  it('free plan has $0 pricing', () => {
    const free = getPlanById('free');
    expect(free!.monthlyPrice).toBe(0);
    expect(free!.annualPrice).toBe(0);
  });

  it('enterprise plan has correct pricing', () => {
    const ent = getPlanById('enterprise');
    expect(ent!.monthlyPrice).toBe(299);
  });

  it('getFeatureComparison returns non-empty array', () => {
    const features = getFeatureComparison();
    expect(features.length).toBeGreaterThan(5);
    expect(features[0]).toHaveProperty('feature');
    expect(features[0]).toHaveProperty('free');
    expect(features[0]).toHaveProperty('starter');
    expect(features[0]).toHaveProperty('pro');
    expect(features[0]).toHaveProperty('enterprise');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/__tests__/pricing.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the pricing module**

```typescript
// src/lib/pricing.ts

export type PricingPlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  limits: {
    widgets: string;
    messages: string;
    teamMembers: string;
    channels: string;
  };
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with AI chat',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['1 AI Chat widget', '100 messages/month', 'Web channel only', 'Basic analytics', 'Community support'],
    limits: {
      widgets: '1',
      messages: '100/mo',
      teamMembers: '1',
      channels: 'Web only',
    },
    cta: 'Get Started Free',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small businesses',
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      '3 widgets (Chat + FAQ + Form)',
      '1,000 messages/month',
      'Web + Telegram',
      '3 preset integrations',
      '2 team members',
      'Email support',
    ],
    limits: {
      widgets: '3',
      messages: '1,000/mo',
      teamMembers: '2',
      channels: 'Web + Telegram',
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    monthlyPrice: 79,
    annualPrice: 66,
    popular: true,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels',
      'All preset integrations + webhooks',
      '5 team members',
      '2 concurrent A/B tests',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      widgets: 'Unlimited',
      messages: 'Unlimited',
      teamMembers: '5',
      channels: 'All channels',
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For agencies & enterprises',
    monthlyPrice: 299,
    annualPrice: 249,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels + custom',
      'All integrations + Agent-built custom API',
      'Unlimited team members',
      'Unlimited A/B tests',
      'Full white-label',
      'Custom domain',
      'Dedicated account manager',
      '99.9% SLA',
    ],
    limits: {
      widgets: 'Unlimited',
      messages: 'Unlimited',
      teamMembers: 'Unlimited',
      channels: 'All + custom',
    },
    cta: 'Contact Sales',
  },
];

export function getPlanById(id: PricingPlanId): PricingPlan | null {
  return PRICING_PLANS.find((p) => p.id === id) || null;
}

export interface FeatureRow {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

export function getFeatureComparison(): FeatureRow[] {
  return [
    { feature: 'Widgets', free: '1', starter: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
    {
      feature: 'Widget types',
      free: 'AI Chat',
      starter: 'Chat + FAQ + Form',
      pro: 'All types',
      enterprise: 'All types',
    },
    { feature: 'Messages', free: '100/mo', starter: '1,000/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Channels', free: 'Web', starter: 'Web + Telegram', pro: 'All', enterprise: 'All + custom' },
    {
      feature: 'Integrations',
      free: false,
      starter: '3 preset',
      pro: 'All preset + webhooks',
      enterprise: 'All + Agent-built',
    },
    { feature: 'A/B Testing', free: false, starter: false, pro: '2 concurrent', enterprise: 'Unlimited' },
    { feature: 'Analytics', free: 'Basic', starter: 'Standard', pro: 'Advanced', enterprise: 'Advanced + export' },
    { feature: 'Team seats', free: '1', starter: '2', pro: '5', enterprise: 'Unlimited' },
    { feature: 'White-label', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Custom domain', free: false, starter: false, pro: false, enterprise: true },
    {
      feature: 'Marketplace',
      free: 'Use only',
      starter: 'Use + publish',
      pro: 'Use + publish',
      enterprise: 'Use + publish',
    },
    { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated manager' },
    { feature: 'SLA', free: false, starter: false, pro: false, enterprise: '99.9%' },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/__tests__/pricing.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/pricing.ts src/lib/__tests__/pricing.test.ts && git commit -m "feat: add pricing constants and plan comparison data"
```

---

## Chunk 2: API Updates

### Task 3: Update /api/auth/me to include onboarding & org data

**Files:**

- Modify: `src/app/api/auth/me/route.ts`

- [ ] **Step 1: Update the /api/auth/me route**

Replace the current select and response:

```typescript
// Change the select to include new fields:
const user = await User.findById(payload.userId).select(
  'email name plan subscriptionStatus emailVerified onboardingCompleted niche organizationId'
);
```

Add org lookup after user found (dynamic import to avoid circular deps):

```typescript
let orgRole: string | null = null;
let orgPlan: string | null = null;
if (user.organizationId) {
  const OrgMember = (await import('@/models/OrgMember')).default;
  const Organization = (await import('@/models/Organization')).default;
  const [member, org] = await Promise.all([
    OrgMember.findOne({ organizationId: user.organizationId, userId: user._id.toString() }).select('role'),
    Organization.findById(user.organizationId).select('plan'),
  ]);
  orgRole = member?.role || null;
  orgPlan = org?.plan || null;
}
```

Update the response:

```typescript
return Response.json({
  success: true,
  user: {
    email: user.email,
    name: user.name,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted,
    organizationId: user.organizationId,
    orgRole,
    orgPlan,
  },
});
```

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All pass (new fields are additive)

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/auth/me/route.ts && git commit -m "feat: extend /api/auth/me with onboarding status and org data"
```

---

### Task 4: Create onboarding API endpoint

**Files:**

- Create: `src/app/api/user/onboarding/route.ts`
- Test: `src/app/api/user/onboarding/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/user/onboarding/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockUserFindByIdAndUpdate } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFindByIdAndUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { findByIdAndUpdate: mockUserFindByIdAndUpdate },
}));

import { POST } from './route';

describe('POST /api/user/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ niche: 'dental' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('marks onboarding as completed with niche', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user123',
      organizationId: null,
      orgRole: null,
      user: { email: 'test@test.com', plan: 'free', subscriptionStatus: 'trial' },
    });
    mockUserFindByIdAndUpdate.mockResolvedValue({ onboardingCompleted: true, niche: 'dental' });

    const req = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ niche: 'dental' }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      'user123',
      { onboardingCompleted: true, niche: 'dental' },
      { new: true }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/user/onboarding/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the onboarding API route**

```typescript
// src/app/api/user/onboarding/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { niche } = body;

    await connectDB();

    await User.findByIdAndUpdate(auth.userId, { onboardingCompleted: true, niche: niche || null }, { new: true });

    return successResponse({ onboardingCompleted: true });
  } catch (error) {
    console.error('Onboarding update error:', error);
    return Errors.internal('Failed to update onboarding status');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/user/onboarding/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/user/onboarding/route.ts src/app/api/user/onboarding/route.test.ts && git commit -m "feat: add onboarding completion API endpoint"
```

---

## Chunk 3: Onboarding Wizard UI

### Task 5: Update AuthProvider with onboarding fields

**Files:**

- Modify: `src/components/AuthProvider.tsx`

- [ ] **Step 1: Add onboarding fields to User interface**

In `AuthProvider.tsx`, update the User interface:

```typescript
interface User {
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  emailVerified: boolean;
  organizationId?: string | null;
  orgRole?: string | null;
  orgPlan?: string | null;
  onboardingCompleted?: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/components/AuthProvider.tsx && git commit -m "feat: add onboardingCompleted to AuthProvider User interface"
```

---

### Task 6: Create onboarding wizard page

**Files:**

- Create: `src/app/dashboard/onboarding/page.tsx`

This is the core onboarding experience — a 4-step wizard:

1. "What's your business?" — niche selection (grid of industry cards)
2. "What do you want to build?" — widget type (ai_chat / smart_faq / lead_form)
3. "Drop your website URL" — or skip
4. "Let's build!" — redirect to Builder

- [ ] **Step 1: Create the onboarding wizard component**

```tsx
// src/app/dashboard/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { WIDGET_TYPES, type WidgetTypeId } from '@/lib/builder/widgetTypes';

const NICHES = [
  { id: 'dental', label: 'Dental Clinic', icon: '🦷' },
  { id: 'beauty', label: 'Beauty Salon', icon: '💅' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'realestate', label: 'Real Estate', icon: '🏠' },
  { id: 'saas', label: 'SaaS / Tech', icon: '💻' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
  { id: 'auto', label: 'Auto Service', icon: '🚗' },
  { id: 'consulting', label: 'Consulting', icon: '📊' },
  { id: 'other', label: 'Other', icon: '✨' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState<string | null>(null);
  const [widgetType, setWidgetType] = useState<WidgetTypeId>('ai_chat');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      });
      await refreshUser();
      // Redirect to builder with context
      const params = new URLSearchParams();
      if (widgetType) params.set('widgetType', widgetType);
      if (url) params.set('url', url);
      router.push(`/dashboard/builder?${params.toString()}`);
    } catch {
      // Still redirect on error
      router.push('/dashboard/builder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#06070b' }}>
      <div className="w-full max-w-2xl px-6 py-12">
        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Step {step + 1} of {totalSteps}
            </span>
            <button onClick={completeOnboarding} className="text-xs text-gray-600 transition hover:text-gray-400">
              Skip setup
            </button>
          </div>
          <div className="h-1 rounded-full bg-white/5">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Niche */}
        {step === 0 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">What&apos;s your business?</h1>
            <p className="mb-8 text-gray-500">We&apos;ll customize your experience based on your industry.</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {NICHES.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setNiche(n.id);
                    setStep(1);
                  }}
                  className="rounded-xl border p-4 text-center transition-all duration-200"
                  style={{
                    background: niche === n.id ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                    borderColor: niche === n.id ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="mb-1 block text-2xl">{n.icon}</span>
                  <span className="block text-xs font-medium text-gray-400">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Widget Type */}
        {step === 1 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">What do you want to build?</h1>
            <p className="mb-8 text-gray-500">Choose a widget type. You can always create more later.</p>
            <div className="space-y-3">
              {WIDGET_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setWidgetType(type.id);
                    setStep(2);
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border p-5 text-left transition-all duration-200"
                  style={{
                    background: widgetType === type.id ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: widgetType === type.id ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <span className="block text-sm font-semibold text-white">{type.label}</span>
                    <span className="block text-xs text-gray-500">{type.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: URL */}
        {step === 2 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">Got a website?</h1>
            <p className="mb-8 text-gray-500">
              We&apos;ll analyze your brand and auto-design the widget. Or skip to build from scratch.
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="your-website.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-cyan-500/30"
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:from-cyan-500 hover:to-blue-500"
              >
                {url.trim() ? 'Continue' : 'Skip — build from scratch'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 3 && (
          <div className="text-center">
            <div className="mb-6 text-6xl">🚀</div>
            <h1 className="mb-2 text-3xl font-bold text-white">Ready to build!</h1>
            <p className="mb-8 text-gray-500">
              Our AI agents will create your {WIDGET_TYPES.find((t) => t.id === widgetType)?.label || 'widget'} in under
              a minute.
            </p>
            <button
              onClick={completeOnboarding}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-10 py-4 text-base font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
            >
              {saving ? 'Setting up...' : 'Launch Builder'}
            </button>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < 3 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-6 text-sm text-gray-600 transition hover:text-gray-400"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/onboarding/page.tsx && git commit -m "feat: add 4-step onboarding wizard"
```

---

### Task 7: Update dashboard layout to redirect to onboarding

**Files:**

- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read the current dashboard layout**

Read `src/app/dashboard/layout.tsx` to understand the current structure.

- [ ] **Step 2: Add onboarding redirect**

Near the top of the component (after auth check), add:

```typescript
// Redirect to onboarding if not completed (but allow access to onboarding page itself)
useEffect(() => {
  if (user && !user.onboardingCompleted && !pathname.startsWith('/dashboard/onboarding')) {
    router.push('/dashboard/onboarding');
  }
}, [user, pathname, router]);
```

Make sure `usePathname` is imported from `next/navigation` and used.

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/layout.tsx && git commit -m "feat: redirect new users to onboarding wizard"
```

---

## Chunk 4: Pricing Page

### Task 8: Create new 4-tier pricing page

**Files:**

- Create: `src/app/pricing/page.tsx`

- [ ] **Step 1: Create the pricing page**

This is a full rewrite of the old `/plans` page with 4 tiers, annual/monthly toggle, feature comparison table, and FAQ.

```tsx
// src/app/pricing/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import { PRICING_PLANS, getFeatureComparison, type PricingPlanId } from '@/lib/pricing';

export default function PricingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const features = getFeatureComparison();

  const handleSubscribe = async (planId: PricingPlanId) => {
    if (planId === 'free') {
      if (!user) {
        setAuthModalTab('signup');
        setShowAuthModal(true);
      } else {
        window.location.href = '/dashboard';
      }
      return;
    }

    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@winbixai.com?subject=Enterprise Plan Inquiry';
      return;
    }

    if (!user) {
      setAuthModalTab('signup');
      setShowAuthModal(true);
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, period: annual ? 'annual' : 'monthly' }),
      });
      const data = await res.json();
      const checkoutUrl = data.url || data.data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      // handle error
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060810] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">WinBix AI</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 pt-20 pb-8 text-center md:px-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/15 bg-cyan-500/8 px-4 py-1.5 text-xs font-semibold tracking-wide text-cyan-400 uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Pricing
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Simple, transparent pricing</h1>
        <p className="mx-auto mb-10 max-w-lg text-lg text-gray-400">Start free. Upgrade as you grow. No hidden fees.</p>

        {/* Annual/Monthly Toggle */}
        <div className="mb-16 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${!annual ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${annual ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Annual <span className="ml-1 text-xs text-emerald-400">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto grid max-w-7xl gap-4 px-6 pb-20 md:grid-cols-4 md:px-12">
        {PRICING_PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isCurrentPlan = user?.plan === plan.id || (user?.plan === 'none' && plan.id === 'free');

          return (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-2xl border p-6"
              style={{
                background: plan.popular ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.02)',
                borderColor: plan.popular ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="mb-1 text-lg font-bold text-white">{plan.name}</h3>
              <p className="mb-4 text-sm text-gray-500">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${price}</span>
                {price > 0 && <span className="text-gray-500">/mo</span>}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || loadingPlan === plan.id}
                className="mb-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
                style={{
                  background: plan.popular ? 'linear-gradient(135deg, #0891b2, #2563eb)' : 'rgba(255,255,255,0.06)',
                  color: plan.popular ? '#fff' : '#e5e7eb',
                }}
              >
                {isCurrentPlan ? 'Current Plan' : loadingPlan === plan.id ? 'Loading...' : plan.cta}
              </button>

              <ul className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="mx-auto max-w-7xl px-6 pb-20 md:px-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Compare plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left font-medium text-gray-500">Feature</th>
                <th className="pb-4 text-center font-medium text-gray-500">Free</th>
                <th className="pb-4 text-center font-medium text-gray-500">Starter</th>
                <th className="pb-4 text-center font-medium text-cyan-400">Pro</th>
                <th className="pb-4 text-center font-medium text-gray-500">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {features.map((row) => (
                <tr key={row.feature} className="border-b border-white/5">
                  <td className="py-3 text-gray-300">{row.feature}</td>
                  {(['free', 'starter', 'pro', 'enterprise'] as const).map((plan) => (
                    <td key={plan} className="py-3 text-center text-gray-400">
                      {typeof row[plan] === 'boolean' ? (
                        row[plan] ? (
                          <svg
                            className="mx-auto h-5 w-5 text-cyan-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )
                      ) : (
                        row[plan]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authModalTab} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/pricing/page.tsx && git commit -m "feat: add 4-tier pricing page with comparison table"
```

---

### Task 9: Update billing page to reflect 4-tier plans

**Files:**

- Modify: `src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Read the current billing page**

Read `src/app/dashboard/billing/page.tsx` to understand the current structure.

- [ ] **Step 2: Update planFeatures to reflect 4 tiers**

Replace the old `planFeatures` array with:

```typescript
import { PRICING_PLANS, getPlanById } from '@/lib/pricing';
```

Update the feature comparison table and plan display to use data from `pricing.ts`. Update the "Upgrade" link to point to `/pricing` instead of `/plans`.

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/dashboard/billing/page.tsx && git commit -m "feat: update billing page for 4-tier plan structure"
```

---

## Chunk 5: Final Integration & Verification

### Task 10: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS (or same pre-existing failures only)

- [ ] **Step 2: Run type check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit`
Expected: No new type errors (only pre-existing geminiAgent.ts + ContextPanel.tsx)

### Task 11: Commit and push

- [ ] **Step 1: Review all changes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git status && git log --oneline -15`

- [ ] **Step 2: Push to remote**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git push origin main`
Expected: Push succeeds
