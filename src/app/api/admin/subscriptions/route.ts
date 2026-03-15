import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';

const PLAN_PRICES: Record<string, number> = { basic: 29, pro: 79 };

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const plan = params.get('plan');
  const status = params.get('status');
  const expiringWithin = params.get('expiringWithin');
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (plan) filter.plan = plan;
  if (status) filter.subscriptionStatus = status;
  if (expiringWithin) {
    const days = parseInt(expiringWithin);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    filter.trialEndsAt = { $lte: cutoff, $gte: new Date() };
    filter.subscriptionStatus = 'trial';
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const clientCounts = await Client.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(clientCounts.map((c) => [String(c._id), c.count]));

  const activeCount = await User.countDocuments({ subscriptionStatus: 'active' });
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const trialsExpiringThisWeek = await User.countDocuments({
    subscriptionStatus: 'trial',
    trialEndsAt: { $lte: weekFromNow, $gte: now },
  });
  const pastDueCount = await User.countDocuments({ subscriptionStatus: 'past_due' });

  const totalMRR = users.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0), 0);

  return successResponse({
    summary: {
      activeSubscriptions: activeCount,
      trialsExpiringThisWeek,
      pastDue: pastDueCount,
      mrr: totalMRR,
    },
    users: users.map((u) => ({
      ...u,
      _id: String(u._id),
      clientsCount: countMap.get(String(u._id)) ?? 0,
      mrrAmount: PLAN_PRICES[u.plan] ?? 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
