import connectDB from './mongodb';
import ResellerAccount from '@/models/ResellerAccount';
import Organization from '@/models/Organization';
import User from '@/models/User';
import mongoose, { Types } from 'mongoose';

export async function createResellerAccount(
  orgId: string,
  data: { name: string; email: string; company: string; maxSubAccounts?: number }
) {
  await connectDB();

  const existing = await ResellerAccount.findOne({ organizationId: orgId });
  if (existing) throw new Error('Reseller account already exists for this organization');

  const account = await ResellerAccount.create({
    organizationId: orgId,
    resellerId: orgId,
    name: data.name,
    email: data.email,
    companyName: data.company,
    company: data.company,
    contactEmail: data.email,
    maxSubAccounts: data.maxSubAccounts ?? 50,
    subAccounts: [],
    billingOverride: { markupPercent: 20 },
    totalRevenue: 0,
    status: 'active',
    tier: 'starter',
    commission: { percentage: 15, minPayout: 50 },
    earnings: {
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      thisMonthEarnings: 0,
      lastMonthEarnings: 0,
    },
    settings: { whiteLabel: false },
  });

  return account;
}

export async function createSubAccount(resellerId: string, data: { name: string; email: string; plan?: string }) {
  await connectDB();

  const reseller = await ResellerAccount.findById(resellerId);
  if (!reseller) throw new Error('Reseller account not found');
  if (reseller.status !== 'active') throw new Error('Reseller account is suspended');
  const maxAccounts = reseller.maxSubAccounts ?? 50;
  if (reseller.subAccounts.length >= maxAccounts) {
    throw new Error('Maximum sub-accounts reached');
  }

  // Create new organization
  const org = await Organization.create({
    name: data.name,
    plan: data.plan ?? 'basic',
    ownerId: reseller.organizationId,
  });

  // Create admin user for sub-account
  const user = await User.create({
    email: data.email,
    passwordHash: new mongoose.Types.ObjectId().toString(), // Placeholder, user must reset
    organizationId: (org._id as Types.ObjectId).toString(),
    plan: data.plan ?? 'basic',
    onboardingCompleted: false,
  });

  // Add to reseller's sub-accounts using new schema shape
  reseller.subAccounts.push({
    accountId: (org._id as Types.ObjectId).toString(),
    companyName: data.name,
    email: data.email,
    plan: data.plan ?? 'basic',
    status: 'active',
    widgetCount: 0,
    monthlyRevenue: 0,
    createdAt: new Date(),
  });
  await reseller.save();

  return { organization: org, user };
}

export async function getSubAccounts(resellerId: string) {
  await connectDB();

  const reseller = await ResellerAccount.findById(resellerId);
  if (!reseller) throw new Error('Reseller account not found');

  return reseller.subAccounts.map((sub) => ({
    accountId: sub.accountId,
    companyName: sub.companyName,
    email: sub.email,
    plan: sub.plan,
    status: sub.status,
    widgetCount: sub.widgetCount ?? 0,
    monthlyRevenue: sub.monthlyRevenue ?? 0,
    createdAt: sub.createdAt,
  }));
}

export async function updateBillingOverride(
  resellerId: string,
  markup: { markupPercent?: number; customPricing?: Record<string, number> }
) {
  await connectDB();

  const update: Record<string, unknown> = {};
  if (markup.markupPercent !== undefined) {
    update['billingOverride.markupPercent'] = markup.markupPercent;
  }
  if (markup.customPricing) {
    update['billingOverride.customPricing'] = markup.customPricing;
  }

  return ResellerAccount.findByIdAndUpdate(resellerId, { $set: update }, { new: true });
}

export async function getResellerDashboard(resellerId: string) {
  await connectDB();

  const reseller = await ResellerAccount.findById(resellerId);
  if (!reseller) throw new Error('Reseller account not found');

  const totalAccounts = reseller.subAccounts.length;
  const activeAccounts = reseller.subAccounts.filter((s) => s.status === 'active').length;
  const totalMRR = reseller.subAccounts.reduce((sum, s) => sum + (s.monthlyRevenue ?? 0), 0);

  return {
    totalAccounts,
    activeAccounts,
    totalRevenue: reseller.totalRevenue ?? 0,
    totalMRR,
    maxSubAccounts: reseller.maxSubAccounts ?? 50,
    markupPercent: reseller.billingOverride?.markupPercent ?? 20,
    commissionRate: reseller.commission?.percentage ?? 15,
    tier: reseller.tier ?? 'starter',
    earnings: reseller.earnings,
    topAccounts: reseller.subAccounts.slice(0, 5),
    // Legacy compat fields
    totalSubAccounts: totalAccounts,
    monthlyEarnings: reseller.earnings?.thisMonthEarnings ?? 0,
    pendingPayout: reseller.earnings?.pendingEarnings ?? 0,
    monthly: [],
    currentMonth: reseller.earnings?.thisMonthEarnings ?? 0,
    totalLifetime: reseller.earnings?.totalEarnings ?? 0,
  };
}
