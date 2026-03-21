import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

function getMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();
  if (!reseller) return Errors.notFound('Reseller account not found');

  const earnings = reseller.earnings ?? {
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
  };

  // Build last 6 months breakdown from sub-account MRR
  const now = new Date();
  const monthlyBreakdown: Array<{ month: string; revenue: number; accounts: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = getMonthLabel(d);
    const isCurrentMonth = i === 0;
    const isLastMonth = i === 1;

    let revenue = 0;
    let activeAccounts = 0;

    if (isCurrentMonth) {
      revenue = earnings.thisMonthEarnings ?? 0;
      activeAccounts = (reseller.subAccounts ?? []).filter((s) => s.status === 'active').length;
    } else if (isLastMonth) {
      revenue = earnings.lastMonthEarnings ?? 0;
      activeAccounts = (reseller.subAccounts ?? []).filter((s) => s.status === 'active').length;
    } else {
      // For older months, derive from payoutHistory or keep 0
      revenue = 0;
      activeAccounts = 0;
    }

    monthlyBreakdown.push({ month: label, revenue, accounts: activeAccounts });
  }

  // Per-account earnings breakdown
  const perAccount = (reseller.subAccounts ?? []).map((sub) => ({
    accountId: sub.accountId,
    companyName: sub.companyName,
    email: sub.email,
    plan: sub.plan,
    status: sub.status,
    monthlyRevenue: sub.monthlyRevenue ?? 0,
    commission: (sub.monthlyRevenue ?? 0) * ((reseller.commission?.percentage ?? 15) / 100),
  }));

  return successResponse({
    overview: {
      totalEarnings: earnings.totalEarnings ?? 0,
      pendingEarnings: earnings.pendingEarnings ?? 0,
      paidEarnings: earnings.paidEarnings ?? 0,
      thisMonthEarnings: earnings.thisMonthEarnings ?? 0,
      lastMonthEarnings: earnings.lastMonthEarnings ?? 0,
    },
    commissionRate: reseller.commission?.percentage ?? 15,
    minPayout: reseller.commission?.minPayout ?? 50,
    tier: reseller.tier ?? 'starter',
    monthly: monthlyBreakdown,
    perAccount,
    payoutHistory: (reseller.payoutHistory ?? []).slice().reverse(),
    // Legacy compat
    totalLifetime: earnings.totalEarnings ?? 0,
    currentMonth: earnings.thisMonthEarnings ?? 0,
    pendingPayout: earnings.pendingEarnings ?? 0,
  });
}
