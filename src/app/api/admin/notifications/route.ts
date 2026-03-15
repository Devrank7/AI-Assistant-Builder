import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [pastDueUsers, expiringTrials] = await Promise.all([
    User.find({ subscriptionStatus: 'past_due' }).select('email name').limit(20).lean(),
    User.find({
      subscriptionStatus: 'trial',
      trialEndsAt: { $lte: threeDaysFromNow, $gte: now },
    })
      .select('email name trialEndsAt')
      .limit(20)
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

  return successResponse(alerts);
}
