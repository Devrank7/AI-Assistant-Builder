# Phase 1a: Entity Model & RBAC Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce Organization → User → Widget hierarchy with RBAC, migrate existing plans to 4-tier pricing, and consolidate billing at the org level — without breaking any existing functionality.

**Architecture:** New `Organization` and `OrgMember` models sit above the existing `User` and `Client` models. Every existing User gets an auto-created Organization (solo account). Auth middleware is extended to inject org context. Existing API routes continue to work unchanged — org-awareness is additive.

**Tech Stack:** MongoDB/Mongoose, TypeScript, Vitest, Next.js 15 API routes

**Spec Reference:** `docs/superpowers/specs/2026-03-16-enterprise-winbix-design.md` — Section 0

---

## File Structure

### New Files

| File                                    | Responsibility                                          |
| --------------------------------------- | ------------------------------------------------------- |
| `src/models/Organization.ts`            | Organization model — billing, plan, limits              |
| `src/models/OrgMember.ts`               | User ↔ Org membership with role                         |
| `src/lib/orgAuth.ts`                    | Org-aware auth helpers (getOrgForUser, checkPermission) |
| `src/app/api/org/route.ts`              | GET org details, PUT update org                         |
| `src/app/api/org/members/route.ts`      | GET/POST/DELETE org members                             |
| `src/app/api/org/invites/route.ts`      | POST create invite, GET pending invites                 |
| `src/models/OrgInvite.ts`               | Pending invite model (email, role, token, expiry)       |
| `scripts/migrate-users-to-orgs.ts`      | One-time migration: create org per user                 |
| `src/app/api/org/route.test.ts`         | Tests for org API                                       |
| `src/app/api/org/members/route.test.ts` | Tests for members API                                   |
| `src/lib/orgAuth.test.ts`               | Tests for org auth helpers                              |

### Modified Files

| File                                    | Change                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `src/models/User.ts`                    | Add `organizationId` field, extend Plan type with `'free' \| 'enterprise'` |
| `src/models/Client.ts`                  | Add `organizationId` field                                                 |
| `src/lib/auth.ts`                       | Extend `verifyUser` to return `organizationId` and role                    |
| `src/middleware.ts`                     | No changes needed (auth checks remain cookie-based)                        |
| `src/app/api/user/widgets/route.ts`     | Filter by org instead of userId                                            |
| `src/app/api/builder/sessions/route.ts` | Filter by org instead of userId                                            |
| `src/components/AuthProvider.tsx`       | Add org context to auth state                                              |

---

## Chunk 1: Organization & OrgMember Models

### Task 1: Create Organization Model

**Files:**

- Create: `src/models/Organization.ts`
- Test: `src/models/Organization.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/models/Organization.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// We test the schema shape and defaults, not DB persistence
describe('Organization model', () => {
  let Organization: typeof import('@/models/Organization').default;

  beforeEach(async () => {
    vi.resetModules();
    // Clear cached model to avoid OverwriteModelError
    delete mongoose.models.Organization;
    delete mongoose.modelSchemas.Organization;
    Organization = (await import('@/models/Organization')).default;
  });

  it('creates with correct defaults', () => {
    const org = new Organization({
      name: 'Test Org',
      ownerId: 'user123',
    });
    expect(org.name).toBe('Test Org');
    expect(org.ownerId).toBe('user123');
    expect(org.plan).toBe('free');
    expect(org.billingPeriod).toBe('monthly');
    expect(org.subscriptionStatus).toBe('active');
    expect(org.limits.maxWidgets).toBe(1);
    expect(org.limits.maxMessages).toBe(100);
    expect(org.limits.maxTeamMembers).toBe(1);
  });

  it('accepts all valid plan values', () => {
    const plans = ['free', 'starter', 'pro', 'enterprise'] as const;
    for (const plan of plans) {
      const org = new Organization({ name: 'Test', ownerId: 'u1', plan });
      expect(org.plan).toBe(plan);
    }
  });

  it('stores stripe fields', () => {
    const org = new Organization({
      name: 'Test',
      ownerId: 'u1',
      stripeCustomerId: 'cus_abc',
      stripeSubscriptionId: 'sub_xyz',
    });
    expect(org.stripeCustomerId).toBe('cus_abc');
    expect(org.stripeSubscriptionId).toBe('sub_xyz');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/models/Organization.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the Organization model**

```typescript
// src/models/Organization.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrgPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type OrgBillingPeriod = 'monthly' | 'annual';
export type OrgSubStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface OrgLimits {
  maxWidgets: number;
  maxMessages: number;
  maxTeamMembers: number;
  features: string[];
}

export const PLAN_LIMITS: Record<OrgPlan, OrgLimits> = {
  free: { maxWidgets: 1, maxMessages: 100, maxTeamMembers: 1, features: ['chat'] },
  starter: { maxWidgets: 3, maxMessages: 1000, maxTeamMembers: 2, features: ['chat', 'faq', 'form'] },
  pro: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
  enterprise: {
    maxWidgets: 999,
    maxMessages: 999999,
    maxTeamMembers: 999,
    features: ['all', 'whitelabel', 'custom_api'],
  },
};

export interface IOrganization extends Document {
  name: string;
  ownerId: string;
  plan: OrgPlan;
  billingPeriod: OrgBillingPeriod;
  subscriptionStatus: OrgSubStatus;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  limits: OrgLimits;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    billingPeriod: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    subscriptionStatus: { type: String, enum: ['trial', 'active', 'past_due', 'canceled'], default: 'active' },
    trialEndsAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null, sparse: true },
    stripeSubscriptionId: { type: String, default: null },
    limits: {
      maxWidgets: { type: Number, default: 1 },
      maxMessages: { type: Number, default: 100 },
      maxTeamMembers: { type: Number, default: 1 },
      features: { type: [String], default: ['chat'] },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ stripeCustomerId: 1 }, { sparse: true });

const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/models/Organization.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/Organization.ts src/models/Organization.test.ts && git commit -m "feat: add Organization model with plan limits"
```

---

### Task 2: Create OrgMember Model

**Files:**

- Create: `src/models/OrgMember.ts`
- Test: `src/models/OrgMember.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/models/OrgMember.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

describe('OrgMember model', () => {
  let OrgMember: typeof import('@/models/OrgMember').default;

  beforeEach(async () => {
    vi.resetModules();
    delete mongoose.models.OrgMember;
    delete mongoose.modelSchemas.OrgMember;
    OrgMember = (await import('@/models/OrgMember')).default;
  });

  it('creates with correct defaults', () => {
    const member = new OrgMember({
      organizationId: 'org123',
      userId: 'user456',
    });
    expect(member.organizationId).toBe('org123');
    expect(member.userId).toBe('user456');
    expect(member.role).toBe('viewer');
  });

  it('accepts all valid roles', () => {
    const roles = ['owner', 'admin', 'editor', 'viewer'] as const;
    for (const role of roles) {
      const member = new OrgMember({ organizationId: 'o1', userId: 'u1', role });
      expect(member.role).toBe(role);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/models/OrgMember.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the OrgMember model**

```typescript
// src/models/OrgMember.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface IOrgMember extends Document {
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMemberSchema = new Schema<IOrgMember>(
  {
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
  },
  { timestamps: true }
);

OrgMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

const OrgMember: Model<IOrgMember> =
  mongoose.models.OrgMember || mongoose.model<IOrgMember>('OrgMember', OrgMemberSchema);

export default OrgMember;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/models/OrgMember.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/OrgMember.ts src/models/OrgMember.test.ts && git commit -m "feat: add OrgMember model with role-based access"
```

---

### Task 3: Create OrgInvite Model

**Files:**

- Create: `src/models/OrgInvite.ts`

- [ ] **Step 1: Write the model**

```typescript
// src/models/OrgInvite.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OrgRole } from './OrgMember';

export interface IOrgInvite extends Document {
  organizationId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

const OrgInviteSchema = new Schema<IOrgInvite>(
  {
    organizationId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OrgInviteSchema.index({ organizationId: 1, email: 1 }, { unique: true });
OrgInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrgInvite: Model<IOrgInvite> =
  mongoose.models.OrgInvite || mongoose.model<IOrgInvite>('OrgInvite', OrgInviteSchema);

export default OrgInvite;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/OrgInvite.ts && git commit -m "feat: add OrgInvite model for team invitations"
```

---

### Task 4: Add organizationId to User and Client models

**Files:**

- Modify: `src/models/User.ts`
- Modify: `src/models/Client.ts`

- [ ] **Step 1: Update User model**

In `src/models/User.ts`:

Add to `Plan` type:

```typescript
// Change this line:
export type Plan = 'none' | 'basic' | 'pro';
// To:
export type Plan = 'none' | 'basic' | 'pro' | 'free' | 'starter' | 'enterprise';
```

Add to `IUser` interface:

```typescript
organizationId: string | null;
```

Add to `UserSchema` fields (after `emailVerificationToken`):

```typescript
    organizationId: { type: String, default: null, index: true },
```

Add to schema enum for `plan`:

```typescript
    plan: { type: String, enum: ['none', 'basic', 'pro', 'free', 'starter', 'enterprise'], default: 'none' },
```

- [ ] **Step 2: Update Client model**

In `src/models/Client.ts`:

Add to `IClient` interface:

```typescript
  organizationId?: string;
```

Add to `ClientSchema` fields (after `userId`):

```typescript
    organizationId: {
      type: String,
      index: true,
    },
```

- [ ] **Step 3: Run existing tests to verify no breakage**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All existing tests PASS (new fields have defaults, so nothing breaks)

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/User.ts src/models/Client.ts && git commit -m "feat: add organizationId to User and Client models, extend Plan type"
```

---

## Chunk 2: Org Auth & Permission Helpers

### Task 5: Create orgAuth helpers

**Files:**

- Create: `src/lib/orgAuth.ts`
- Test: `src/lib/orgAuth.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/orgAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrgMemberFindOne = vi.fn();
const mockOrganizationFindById = vi.fn();
const mockConnectDB = vi.fn();

vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/OrgMember', () => ({
  default: { findOne: mockOrgMemberFindOne },
}));
vi.mock('@/models/Organization', () => ({
  default: { findById: mockOrganizationFindById },
  PLAN_LIMITS: {
    free: { maxWidgets: 1, maxMessages: 100, maxTeamMembers: 1, features: ['chat'] },
    starter: { maxWidgets: 3, maxMessages: 1000, maxTeamMembers: 2, features: ['chat', 'faq', 'form'] },
    pro: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
    enterprise: {
      maxWidgets: 999,
      maxMessages: 999999,
      maxTeamMembers: 999,
      features: ['all', 'whitelabel', 'custom_api'],
    },
  },
}));

import { getOrgForUser, checkPermission, PERMISSIONS } from './orgAuth';

describe('getOrgForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns org and role when membership exists', async () => {
    mockOrgMemberFindOne.mockResolvedValue({ organizationId: 'org1', role: 'admin' });
    mockOrganizationFindById.mockResolvedValue({ _id: 'org1', plan: 'pro', name: 'Test Org', limits: {} });

    const result = await getOrgForUser('user1');
    expect(result).toEqual({
      organization: expect.objectContaining({ _id: 'org1', plan: 'pro' }),
      role: 'admin',
    });
  });

  it('returns null when no membership', async () => {
    mockOrgMemberFindOne.mockResolvedValue(null);
    const result = await getOrgForUser('user1');
    expect(result).toBeNull();
  });
});

describe('checkPermission', () => {
  it('owner can manage billing', () => {
    expect(checkPermission('owner', 'manage_billing')).toBe(true);
  });

  it('admin cannot manage billing', () => {
    expect(checkPermission('admin', 'manage_billing')).toBe(false);
  });

  it('editor can create widgets', () => {
    expect(checkPermission('editor', 'create_widgets')).toBe(true);
  });

  it('viewer can only view', () => {
    expect(checkPermission('viewer', 'view_analytics')).toBe(true);
    expect(checkPermission('viewer', 'create_widgets')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/orgAuth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the orgAuth module**

```typescript
// src/lib/orgAuth.ts
import connectDB from './mongodb';
import OrgMember from '@/models/OrgMember';
import Organization, { type IOrganization } from '@/models/Organization';
import type { OrgRole } from '@/models/OrgMember';

export type Permission =
  | 'manage_billing'
  | 'invite_members'
  | 'create_widgets'
  | 'edit_widgets'
  | 'edit_knowledge'
  | 'manage_integrations'
  | 'view_analytics'
  | 'view_chats'
  | 'manage_ab_tests'
  | 'publish_marketplace'
  | 'manage_api_keys'
  | 'manage_whitelabel';

export const PERMISSIONS: Record<Permission, OrgRole[]> = {
  manage_billing: ['owner'],
  invite_members: ['owner', 'admin'],
  create_widgets: ['owner', 'admin', 'editor'],
  edit_widgets: ['owner', 'admin', 'editor'],
  edit_knowledge: ['owner', 'admin', 'editor'],
  manage_integrations: ['owner', 'admin', 'editor'],
  view_analytics: ['owner', 'admin', 'editor', 'viewer'],
  view_chats: ['owner', 'admin', 'editor', 'viewer'],
  manage_ab_tests: ['owner', 'admin', 'editor'],
  publish_marketplace: ['owner', 'admin', 'editor'],
  manage_api_keys: ['owner', 'admin'],
  manage_whitelabel: ['owner', 'admin'],
};

export function checkPermission(role: OrgRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export async function getOrgForUser(userId: string): Promise<{ organization: IOrganization; role: OrgRole } | null> {
  await connectDB();
  const membership = await OrgMember.findOne({ userId });
  if (!membership) return null;

  const organization = await Organization.findById(membership.organizationId);
  if (!organization) return null;

  return { organization, role: membership.role as OrgRole };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/orgAuth.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/orgAuth.ts src/lib/orgAuth.test.ts && git commit -m "feat: add org auth helpers with RBAC permission system"
```

---

### Task 6: Extend verifyUser to return org context

**Files:**

- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update UserAuthResult type and verifyUser function**

In `src/lib/auth.ts`, change the `UserAuthResult` type:

```typescript
// Change:
export type UserAuthResult =
  | { authenticated: true; userId: string; user: { email: string; plan: string; subscriptionStatus: string } }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };

// To:
export type UserAuthResult =
  | {
      authenticated: true;
      userId: string;
      user: { email: string; plan: string; subscriptionStatus: string };
      organizationId: string | null;
      orgRole: string | null;
    }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };
```

Update the `verifyUser` function — add org lookup after user fetch:

```typescript
export async function verifyUser(request: NextRequest): Promise<UserAuthResult> {
  const accessToken = request.cookies.get('access_token')?.value;
  if (!accessToken) return { authenticated: false, response: Errors.unauthorized('Not authenticated') };
  try {
    const payload = verifyAccessToken(accessToken);
    await connectDB();
    const user = await User.findById(payload.userId).select('email plan subscriptionStatus organizationId');
    if (!user) return { authenticated: false, response: Errors.unauthorized('User not found') };

    // Fetch org role if user belongs to an org
    let orgRole: string | null = null;
    if (user.organizationId) {
      const OrgMember = (await import('@/models/OrgMember')).default;
      const membership = await OrgMember.findOne({
        organizationId: user.organizationId,
        userId: payload.userId,
      }).select('role');
      orgRole = membership?.role || null;
    }

    return {
      authenticated: true,
      userId: payload.userId,
      user: { email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus },
      organizationId: user.organizationId || null,
      orgRole,
    };
  } catch {
    return { authenticated: false, response: Errors.unauthorized('Invalid or expired token') };
  }
}
```

- [ ] **Step 2: Run existing tests to verify no breakage**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All existing tests PASS. Tests that mock `verifyUser` won't break because they mock the return value directly.

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/auth.ts && git commit -m "feat: extend verifyUser to return organizationId and orgRole"
```

---

## Chunk 3: Migration Script & Org API Routes

### Task 7: Create migration script

**Files:**

- Create: `scripts/migrate-users-to-orgs.ts`

- [ ] **Step 1: Write the migration script**

```typescript
// scripts/migrate-users-to-orgs.ts
/**
 * One-time migration: create Organization + OrgMember for each existing User.
 *
 * Plan mapping:
 *   none  → free
 *   basic → starter
 *   pro   → pro
 *
 * Run: npx tsx scripts/migrate-users-to-orgs.ts
 * Idempotent: skips users that already have an organizationId.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PLAN_MAP: Record<string, string> = {
  none: 'free',
  basic: 'starter',
  pro: 'pro',
};

const PLAN_LIMITS: Record<
  string,
  { maxWidgets: number; maxMessages: number; maxTeamMembers: number; features: string[] }
> = {
  free: { maxWidgets: 1, maxMessages: 100, maxTeamMembers: 1, features: ['chat'] },
  starter: { maxWidgets: 3, maxMessages: 1000, maxTeamMembers: 2, features: ['chat', 'faq', 'form'] },
  pro: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const usersCol = db.collection('users');
  const orgsCol = db.collection('organizations');
  const membersCol = db.collection('orgmembers');
  const clientsCol = db.collection('clients');

  const users = await usersCol.find({ organizationId: { $exists: false } }).toArray();
  console.log(`Found ${users.length} users to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    // Check if already migrated (organizationId set)
    if (user.organizationId) {
      skipped++;
      continue;
    }

    const newPlan = PLAN_MAP[user.plan] || 'free';
    const limits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.free;

    // Create organization
    const orgResult = await orgsCol.insertOne({
      name: user.name ? `${user.name}'s Organization` : `${user.email}'s Organization`,
      ownerId: user._id.toString(),
      plan: newPlan,
      billingPeriod: user.billingPeriod || 'monthly',
      subscriptionStatus: user.subscriptionStatus || 'active',
      trialEndsAt: user.trialEndsAt || null,
      stripeCustomerId: user.stripeCustomerId || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      limits,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orgId = orgResult.insertedId.toString();

    // Create owner membership
    await membersCol.insertOne({
      organizationId: orgId,
      userId: user._id.toString(),
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update user with organizationId
    await usersCol.updateOne({ _id: user._id }, { $set: { organizationId: orgId } });

    // Update all clients belonging to this user
    await clientsCol.updateMany({ userId: user._id.toString() }, { $set: { organizationId: orgId } });

    migrated++;
    if (migrated % 10 === 0) console.log(`  Migrated ${migrated}/${users.length}`);
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit (do NOT run yet — will be run during deployment)**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add scripts/migrate-users-to-orgs.ts && git commit -m "feat: add user-to-org migration script"
```

---

### Task 8: Org API — GET/PUT organization

**Files:**

- Create: `src/app/api/org/route.ts`
- Test: `src/app/api/org/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/org/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockVerifyUser = vi.fn();
const mockConnectDB = vi.fn();
const mockOrgFindById = vi.fn();
const mockOrgMemberFind = vi.fn();

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Organization', () => ({
  default: { findById: mockOrgFindById },
}));
vi.mock('@/models/OrgMember', () => ({
  default: { find: mockOrgMemberFind },
}));

import { GET } from './route';

describe('GET /api/org', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 if not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: new Response(JSON.stringify({ success: false }), { status: 401 }),
    });

    const req = new NextRequest('http://localhost/api/org');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns org details when authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'u1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
    });
    mockOrgFindById.mockResolvedValue({
      _id: 'org1',
      name: 'Test Org',
      plan: 'pro',
      limits: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
      toObject: () => ({
        _id: 'org1',
        name: 'Test Org',
        plan: 'pro',
        limits: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
      }),
    });
    mockOrgMemberFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([{ userId: 'u1', role: 'owner' }]),
    });

    const req = new NextRequest('http://localhost/api/org');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Test Org');
    expect(json.data.plan).toBe('pro');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/org/route.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the org API route**

```typescript
// src/app/api/org/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrgMember from '@/models/OrgMember';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission, type Permission } from '@/lib/orgAuth';
import type { OrgRole } from '@/models/OrgMember';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');

  await connectDB();

  const org = await Organization.findById(auth.organizationId);
  if (!org) return Errors.notFound('Organization not found');

  const members = await OrgMember.find({ organizationId: auth.organizationId }).select('userId role');

  return successResponse({
    ...org.toObject(),
    members,
    currentUserRole: auth.orgRole,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');
  if (!auth.orgRole || !checkPermission(auth.orgRole as OrgRole, 'manage_billing')) {
    return Errors.forbidden('Only the owner can update organization settings');
  }

  await connectDB();

  const body = await request.json();
  const allowedFields = ['name'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return Errors.badRequest('No valid fields to update');
  }

  const org = await Organization.findByIdAndUpdate(auth.organizationId, updates, { new: true });
  if (!org) return Errors.notFound('Organization not found');

  return successResponse(org);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/org/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/org/route.ts src/app/api/org/route.test.ts && git commit -m "feat: add org API route for GET/PUT organization"
```

---

### Task 9: Org Members API

**Files:**

- Create: `src/app/api/org/members/route.ts`

- [ ] **Step 1: Write the members API**

```typescript
// src/app/api/org/members/route.ts
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import connectDB from '@/lib/mongodb';
import OrgMember from '@/models/OrgMember';
import OrgInvite from '@/models/OrgInvite';
import Organization, { PLAN_LIMITS, type OrgPlan } from '@/models/Organization';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission } from '@/lib/orgAuth';
import type { OrgRole } from '@/models/OrgMember';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');

  await connectDB();

  const members = await OrgMember.find({ organizationId: auth.organizationId });

  // Enrich with user info
  const userIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('email name');
  const userMap = new Map(users.map((u) => [u._id.toString(), { email: u.email, name: u.name }]));

  const enriched = members.map((m) => ({
    userId: m.userId,
    role: m.role,
    ...userMap.get(m.userId),
    joinedAt: m.createdAt,
  }));

  return successResponse(enriched);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId || !auth.orgRole) return Errors.notFound('No organization found');
  if (!checkPermission(auth.orgRole as OrgRole, 'invite_members')) {
    return Errors.forbidden('You do not have permission to invite members');
  }

  const body = await request.json();
  const { email, role } = body as { email?: string; role?: OrgRole };

  if (!email) return Errors.badRequest('email is required');
  if (role && !['admin', 'editor', 'viewer'].includes(role)) {
    return Errors.badRequest('Invalid role. Allowed: admin, editor, viewer');
  }

  await connectDB();

  // Check team size limit
  const org = await Organization.findById(auth.organizationId);
  if (!org) return Errors.notFound('Organization not found');

  const currentCount = await OrgMember.countDocuments({ organizationId: auth.organizationId });
  const limits = PLAN_LIMITS[org.plan as OrgPlan];
  if (currentCount >= limits.maxTeamMembers) {
    return Errors.forbidden(`Team member limit reached (${limits.maxTeamMembers}). Upgrade your plan.`);
  }

  // Create invite
  const token = randomBytes(32).toString('hex');
  const invite = await OrgInvite.findOneAndUpdate(
    { organizationId: auth.organizationId, email: email.toLowerCase() },
    {
      role: role || 'viewer',
      token,
      invitedBy: auth.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    { upsert: true, new: true }
  );

  return successResponse({ inviteId: invite._id, token: invite.token, expiresAt: invite.expiresAt });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId || !auth.orgRole) return Errors.notFound('No organization found');
  if (!checkPermission(auth.orgRole as OrgRole, 'invite_members')) {
    return Errors.forbidden('You do not have permission to remove members');
  }

  const body = await request.json();
  const { userId } = body as { userId?: string };
  if (!userId) return Errors.badRequest('userId is required');

  // Cannot remove the owner
  const targetMember = await OrgMember.findOne({ organizationId: auth.organizationId, userId });
  if (!targetMember) return Errors.notFound('Member not found');
  if (targetMember.role === 'owner') return Errors.forbidden('Cannot remove the organization owner');

  await connectDB();
  await OrgMember.deleteOne({ organizationId: auth.organizationId, userId });

  // Remove organizationId from user
  await User.findByIdAndUpdate(userId, { $set: { organizationId: null } });

  return successResponse(undefined, 'Member removed');
}
```

- [ ] **Step 2: Run all tests to verify no breakage**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/org/members/route.ts && git commit -m "feat: add org members API (list, invite, remove)"
```

---

## Chunk 4: Auto-Create Org on Signup & Update AuthProvider

### Task 10: Auto-create Organization on user signup

**Files:**

- Modify: `src/app/api/auth/signup/route.ts` (or wherever signup happens)

- [ ] **Step 1: Find the signup route**

Run: `grep -r "User.create\|new User" src/app/api/auth/ --include="*.ts" -l` to locate where users are created.

- [ ] **Step 2: After user creation, add org creation**

Add this block **after** the new User is saved (but before returning the response):

```typescript
// Auto-create organization for new user
const Organization = (await import('@/models/Organization')).default;
const OrgMember = (await import('@/models/OrgMember')).default;
const { PLAN_LIMITS } = await import('@/models/Organization');

const org = await Organization.create({
  name: `${user.name}'s Organization`,
  ownerId: user._id.toString(),
  plan: 'free',
  stripeCustomerId: user.stripeCustomerId,
  limits: PLAN_LIMITS.free,
});

await OrgMember.create({
  organizationId: org._id.toString(),
  userId: user._id.toString(),
  role: 'owner',
});

user.organizationId = org._id.toString();
await user.save();
```

- [ ] **Step 3: Run all tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/auth/ && git commit -m "feat: auto-create Organization on user signup"
```

---

### Task 11: Update AuthProvider to expose org context

**Files:**

- Modify: `src/components/AuthProvider.tsx`

- [ ] **Step 1: Read the current AuthProvider file first**

Run: Read `src/components/AuthProvider.tsx` to see current structure.

- [ ] **Step 2: Add org fields to user state**

In the user state interface, add:

```typescript
organizationId?: string | null;
orgRole?: string | null;
orgPlan?: string | null;
```

In the `/api/auth/me` or wherever user data is fetched, ensure the response includes org data. If the API doesn't return it yet, add a follow-up fetch to `/api/org` or include it in the me endpoint.

- [ ] **Step 3: Run the dev server briefly to verify no UI crash**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx next build` (dry check)
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/components/AuthProvider.tsx && git commit -m "feat: expose org context in AuthProvider"
```

---

### Task 12: Update widget queries to be org-aware

**Files:**

- Modify: `src/app/api/user/widgets/route.ts`
- Modify: `src/app/api/builder/sessions/route.ts`

- [ ] **Step 1: Update user widgets route**

In `src/app/api/user/widgets/route.ts` GET handler, change:

```typescript
// Before:
const clients = await Client.find({ userId: auth.userId });

// After:
const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
const clients = await Client.find(query);
```

Apply same pattern to DELETE handler.

- [ ] **Step 2: Update builder sessions route**

In `src/app/api/builder/sessions/route.ts`, apply same pattern — query by `organizationId` if available, fall back to `userId`.

- [ ] **Step 3: Run existing tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/user/widgets/route.ts src/app/api/builder/sessions/route.ts && git commit -m "feat: make widget and session queries org-aware"
```

---

## Chunk 5: Final Integration & Verification

### Task 13: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS

- [ ] **Step 2: Run type check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit`
Expected: No new type errors (pre-existing errors may exist)

- [ ] **Step 3: Run build**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx next build`
Expected: Build succeeds

### Task 14: Final commit with all changes

- [ ] **Step 1: Review all changes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git status && git log --oneline -10`
Expected: See ~8 commits from this phase

- [ ] **Step 2: Push to remote**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git push origin main`
Expected: Push succeeds
