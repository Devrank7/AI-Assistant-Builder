import connectDB from './mongodb';
import ResellerAccount from '@/models/ResellerAccount';
import Organization from '@/models/Organization';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function createResellerAccount(
  orgId: string,
  data: { name: string; email: string; company: string; maxSubAccounts?: number }
) {
  await connectDB();

  const existing = await ResellerAccount.findOne({ organizationId: orgId });
  if (existing) throw new Error('Reseller account already exists for this organization');

  const account = await ResellerAccount.create({
    organizationId: orgId,
    name: data.name,
    email: data.email,
    company: data.company,
    maxSubAccounts: data.maxSubAccounts || 50,
    subAccounts: [],
    billingOverride: { markupPercent: 20 },
    totalRevenue: 0,
    status: 'active',
  });

  return account;
}

export async function createSubAccount(resellerId: string, data: { name: string; email: string; plan?: string }) {
  await connectDB();

  const reseller = await ResellerAccount.findById(resellerId);
  if (!reseller) throw new Error('Reseller account not found');
  if (reseller.status !== 'active') throw new Error('Reseller account is suspended');
  if (reseller.subAccounts.length >= reseller.maxSubAccounts) {
    throw new Error('Maximum sub-accounts reached');
  }

  // Create new organization
  const org = await Organization.create({
    name: data.name,
    plan: data.plan || 'basic',
    createdBy: reseller.organizationId,
  });

  // Create admin user for sub-account
  const user = await User.create({
    email: data.email,
    password: new mongoose.Types.ObjectId().toString(), // Placeholder, user must reset
    organizationId: org._id,
    plan: data.plan || 'basic',
    onboardingCompleted: false,
  });

  // Add to reseller's sub-accounts
  reseller.subAccounts.push({
    organizationId: org._id.toString(),
    name: data.name,
    createdAt: new Date(),
  });
  await reseller.save();

  return { organization: org, user };
}

export async function getSubAccounts(resellerId: string) {
  await connectDB();

  const reseller = await ResellerAccount.findById(resellerId);
  if (!reseller) throw new Error('Reseller account not found');

  const subOrgIds = reseller.subAccounts.map((s) => s.organizationId);
  const orgs = await Organization.find({ _id: { $in: subOrgIds } }).lean();

  return reseller.subAccounts.map((sub) => {
    const org = orgs.find((o) => o._id.toString() === sub.organizationId);
    return {
      ...sub,
      plan: org?.plan || 'unknown',
      status: org ? 'active' : 'deleted',
    };
  });
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
  const subOrgIds = reseller.subAccounts.map((s) => s.organizationId);
  const activeUsers = await User.countDocuments({ organizationId: { $in: subOrgIds } });

  return {
    totalAccounts,
    totalRevenue: reseller.totalRevenue,
    activeUsers,
    maxSubAccounts: reseller.maxSubAccounts,
    markupPercent: reseller.billingOverride.markupPercent,
    topAccounts: reseller.subAccounts.slice(0, 5),
  };
}
