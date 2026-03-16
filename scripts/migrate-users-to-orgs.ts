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
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually (no dotenv dependency)
const __dir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local may not exist in production
}

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
