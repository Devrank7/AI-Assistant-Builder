import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import ReferralProgram from '@/models/Referral';

/**
 * GET /api/referrals/stats
 * Returns detailed stats including monthly time-series data for charts.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const program = await ReferralProgram.findOne({ referrerId: auth.userId });
    if (!program) {
      return successResponse({
        stats: {
          totalClicks: 0,
          totalSignups: 0,
          totalConversions: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
        },
        conversionRate: 0,
        signupRate: 0,
        monthlyEarnings: buildEmptyMonthly(),
        recentActivity: [],
      });
    }

    // Build 6-month earnings time series from referredUsers data
    const monthlyEarnings = buildMonthlyEarnings(program.referredUsers);

    // Conversion funnel rates
    const signupRate =
      program.stats.totalClicks > 0 ? Math.round((program.stats.totalSignups / program.stats.totalClicks) * 100) : 0;
    const conversionRate =
      program.stats.totalSignups > 0
        ? Math.round((program.stats.totalConversions / program.stats.totalSignups) * 100)
        : 0;

    // Recent activity (last 10 entries, newest first)
    const recentActivity = [...program.referredUsers]
      .sort((a, b) => new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime())
      .slice(0, 10)
      .map((u) => ({
        email: maskEmail(u.email),
        signedUpAt: u.signedUpAt,
        convertedAt: u.convertedAt,
        plan: u.plan,
        rewardPaid: u.rewardPaid,
        rewardAmount: u.rewardAmount,
        status: u.rewardPaid ? 'paid' : u.convertedAt ? 'converted' : 'signed_up',
      }));

    return successResponse({
      stats: program.stats,
      conversionRate,
      signupRate,
      monthlyEarnings,
      recentActivity,
    });
  } catch (error) {
    console.error('[GET /api/referrals/stats]', error);
    return Errors.internal('Failed to load referral stats');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

interface ReferredUserLike {
  convertedAt?: Date | null;
  rewardAmount: number;
}

function buildMonthlyEarnings(referredUsers: ReferredUserLike[]) {
  const now = new Date();
  const months: { label: string; earnings: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      earnings: 0,
    });
  }

  for (const user of referredUsers) {
    if (!user.convertedAt || !user.rewardAmount) continue;
    const convDate = new Date(user.convertedAt);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      if (convDate >= d && convDate <= dEnd) {
        months[5 - i].earnings += user.rewardAmount;
        break;
      }
    }
  }

  return months;
}

function buildEmptyMonthly() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), earnings: 0 };
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 3 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
