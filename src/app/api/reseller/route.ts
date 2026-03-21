import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

const TIER_COMMISSION: Record<string, number> = {
  starter: 15,
  professional: 20,
  enterprise: 25,
};

const TIER_MIN_PAYOUT: Record<string, number> = {
  starter: 50,
  professional: 100,
  enterprise: 200,
};

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  let account = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();

  // Auto-create starter account if none exists
  if (!account) {
    const created = await ResellerAccount.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      resellerId: auth.organizationId,
      companyName: '',
      contactEmail: auth.user.email,
      status: 'active',
      tier: 'starter',
      commission: { percentage: 15, minPayout: 50 },
      subAccounts: [],
      earnings: {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
      },
      payoutHistory: [],
      settings: { whiteLabel: false },
    });
    account = created.toObject();
  }

  return successResponse(account);
}

export async function PUT(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  const update: Record<string, unknown> = {};

  if (typeof body.companyName === 'string') update.companyName = body.companyName.trim();
  if (typeof body.contactEmail === 'string') update.contactEmail = body.contactEmail.trim();
  if (typeof body.tier === 'string' && ['starter', 'professional', 'enterprise'].includes(body.tier as string)) {
    const tier = body.tier as string;
    update.tier = tier;
    update['commission.percentage'] = TIER_COMMISSION[tier];
    update['commission.minPayout'] = TIER_MIN_PAYOUT[tier];
  }
  if (body.settings && typeof body.settings === 'object') {
    const s = body.settings as Record<string, unknown>;
    if (typeof s.whiteLabel === 'boolean') update['settings.whiteLabel'] = s.whiteLabel;
    if (typeof s.customDomain === 'string') update['settings.customDomain'] = s.customDomain.trim();
    if (typeof s.brandName === 'string') update['settings.brandName'] = s.brandName.trim();
    if (typeof s.brandLogo === 'string') update['settings.brandLogo'] = s.brandLogo;
  }

  const account = await ResellerAccount.findOneAndUpdate(
    { organizationId: auth.organizationId },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  return successResponse(account, 'Settings updated');
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  if (!body.name || !body.email || !body.company) {
    return Errors.badRequest('Missing required fields: name, email, company');
  }

  try {
    const { createResellerAccount } = await import('@/lib/resellerService');
    const account = await createResellerAccount(
      auth.organizationId,
      body as { name: string; email: string; company: string }
    );
    return successResponse(account, 'Reseller account created');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create reseller account';
    return Errors.badRequest(message);
  }
}
