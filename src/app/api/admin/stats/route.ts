// src/app/api/admin/stats/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';

const PLAN_PRICES = { basic: 29, pro: 79 } as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    totalUsers,
    totalClients,
    planCounts,
    activeChatsToday,
    usersLastMonth,
    clientsLastMonth,
    recentUsers,
    recentClients,
    pastDueCount,
  ] = await Promise.all([
    User.countDocuments(),
    Client.countDocuments(),
    User.aggregate([
      {
        $group: {
          _id: null,
          basic: { $sum: { $cond: [{ $eq: ['$plan', 'basic'] }, 1, 0] } },
          pro: { $sum: { $cond: [{ $eq: ['$plan', 'pro'] }, 1, 0] } },
        },
      },
    ]),
    ChatLog.aggregate([{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $lt: monthAgo } }),
    Client.countDocuments({ createdAt: { $lt: monthAgo } }),
    User.find().sort({ createdAt: -1 }).limit(10).lean(),
    Client.find().sort({ createdAt: -1 }).limit(10).lean(),
    User.countDocuments({ subscriptionStatus: 'past_due' }),
  ]);

  const counts = planCounts[0] ?? { basic: 0, pro: 0 };
  const mrr = counts.basic * PLAN_PRICES.basic + counts.pro * PLAN_PRICES.pro;
  const chatsToday = activeChatsToday[0]?.count ?? 0;

  const usersTrend = usersLastMonth > 0 ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100) : 0;
  const clientsTrend =
    clientsLastMonth > 0 ? Math.round(((totalClients - clientsLastMonth) / clientsLastMonth) * 100) : 0;

  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [pastDueUsers, expiringTrials] = await Promise.all([
    User.find({ subscriptionStatus: 'past_due' }).limit(10).lean(),
    User.find({
      subscriptionStatus: 'trial',
      trialEndsAt: { $lte: threeDaysFromNow, $gte: now },
    })
      .limit(10)
      .lean(),
  ]);

  const alerts = [
    ...pastDueUsers.map((u) => ({
      id: String(u._id),
      type: 'past_due',
      title: 'Past Due Payment',
      message: `${u.email} — payment overdue`,
      link: `/admin/users/${u._id}`,
      severity: 'danger' as const,
    })),
    ...expiringTrials.map((u) => ({
      id: String(u._id),
      type: 'trial_expiring',
      title: 'Trial Expiring',
      message: `${u.email} — expires ${u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'soon'}`,
      link: `/admin/users/${u._id}`,
      severity: 'warning' as const,
    })),
  ];

  return successResponse({
    kpi: {
      totalUsers,
      totalClients,
      mrr,
      activeChatsToday: chatsToday,
      pastDueCount,
      trends: {
        users: usersTrend,
        clients: clientsTrend,
      },
    },
    alerts,
    recentUsers: recentUsers.map((u) => ({
      _id: String(u._id),
      email: u.email,
      name: u.name,
      plan: u.plan,
      subscriptionStatus: u.subscriptionStatus,
      createdAt: u.createdAt,
    })),
    recentClients: recentClients.map((c) => ({
      _id: String(c._id),
      clientId: c.clientId,
      name: c.name || c.clientId,
      domain: c.domain || '',
      subscriptionStatus: c.subscriptionStatus,
      createdAt: c.createdAt,
    })),
  });
}
