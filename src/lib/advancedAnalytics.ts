import connectDB from './mongodb';
import ChatLog from '@/models/ChatLog';
import Contact from '@/models/Contact';
import CustomerProfile from '@/models/CustomerProfile';
import ConversationInsight from '@/models/ConversationInsight';

export interface FunnelStage {
  name: string;
  count: number;
  dropOff: number;
  conversionRate: number;
}

export interface CohortRow {
  cohortWeek: string;
  totalUsers: number;
  retention: number[]; // percentage retained each week
}

export interface ChurnPrediction {
  visitorId: string;
  name?: string;
  email?: string;
  churnRisk: number;
  lastActiveAt: Date;
  messageCount: number;
  warningSignals: string[];
}

export interface RevenueAttribution {
  totalRevenue: number;
  byChannel: { channel: string; revenue: number; percentage: number }[];
  topConvertingIntents: { intent: string; conversions: number; revenue: number }[];
}

export async function getFunnelAnalysis(clientId: string, days: number = 30): Promise<FunnelStage[]> {
  await connectDB();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Stage 1: Visits (unique sessions)
  const allSessions = await ChatLog.distinct('sessionId', {
    clientId,
    createdAt: { $gte: since },
  });
  const visitCount = allSessions.length;

  // Stage 2: First Message (sessions with at least 1 user message)
  const firstMessageSessions = await ChatLog.countDocuments({
    clientId,
    createdAt: { $gte: since },
    'messages.role': 'user',
  });

  // Stage 3: Engaged (sessions with 3+ messages)
  const engagedResult = await ChatLog.aggregate([
    { $match: { clientId, createdAt: { $gte: since } } },
    { $project: { msgCount: { $size: '$messages' } } },
    { $match: { msgCount: { $gte: 3 } } },
    { $count: 'total' },
  ]);
  const engagedCount = engagedResult[0]?.total || 0;

  // Stage 4: Leads (contacts created in period)
  const leadCount = await Contact.countDocuments({
    clientId,
    createdAt: { $gte: since },
  });

  // Stage 5: Conversions (hot leads or with revenue)
  const conversionCount = await Contact.countDocuments({
    clientId,
    createdAt: { $gte: since },
    leadTemp: 'hot',
  });

  const stages = [
    { name: 'Visit', count: visitCount },
    { name: 'First Message', count: firstMessageSessions },
    { name: 'Engaged (3+ msgs)', count: engagedCount },
    { name: 'Lead', count: leadCount },
    { name: 'Conversion', count: conversionCount },
  ];

  return stages.map((stage, i) => {
    const prevCount = i === 0 ? stage.count : stages[i - 1].count;
    const dropOff = prevCount > 0 ? Math.round(((prevCount - stage.count) / prevCount) * 100) : 0;
    const conversionRate = visitCount > 0 ? Math.round((stage.count / visitCount) * 100) : 0;
    return { ...stage, dropOff, conversionRate };
  });
}

export async function getCohortRetention(clientId: string, weeks: number = 8): Promise<CohortRow[]> {
  await connectDB();

  const now = new Date();
  const cohorts: CohortRow[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const cohortStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const cohortEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

    // Find sessions that started in this cohort week
    const cohortSessions = await ChatLog.find({
      clientId,
      createdAt: { $gte: cohortStart, $lt: cohortEnd },
    }).distinct('sessionId');

    if (cohortSessions.length === 0) {
      cohorts.push({
        cohortWeek: cohortStart.toISOString().slice(0, 10),
        totalUsers: 0,
        retention: [],
      });
      continue;
    }

    const retention: number[] = [];

    // For each subsequent week, check how many of these sessions had return visits
    for (let retWeek = 0; retWeek <= w; retWeek++) {
      const retStart = new Date(cohortEnd.getTime() + retWeek * 7 * 24 * 60 * 60 * 1000);
      const retEnd = new Date(retStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (retWeek === 0) {
        retention.push(100);
        continue;
      }

      const returningSessions = await ChatLog.distinct('sessionId', {
        clientId,
        sessionId: { $in: cohortSessions },
        createdAt: { $gte: retStart, $lt: retEnd },
      });

      const retPct = Math.round((returningSessions.length / cohortSessions.length) * 100);
      retention.push(retPct);
    }

    cohorts.push({
      cohortWeek: cohortStart.toISOString().slice(0, 10),
      totalUsers: cohortSessions.length,
      retention,
    });
  }

  return cohorts;
}

export async function getPredictiveChurnScores(clientId: string): Promise<ChurnPrediction[]> {
  await connectDB();

  const highRiskProfiles = await CustomerProfile.find({
    clientId,
    churnRisk: { $gt: 40 },
  })
    .sort({ churnRisk: -1 })
    .limit(50)
    .lean();

  return highRiskProfiles.map((profile) => {
    const warningSignals: string[] = [];
    if (profile.churnRisk > 70) warningSignals.push('Critical churn risk');
    if (profile.sentiment?.current === 'negative') warningSignals.push('Negative sentiment');
    if (profile.messageCount < 3) warningSignals.push('Low engagement');

    const daysSinceActive = profile.lastActiveAt
      ? Math.floor((Date.now() - new Date(profile.lastActiveAt).getTime()) / (24 * 60 * 60 * 1000))
      : 999;
    if (daysSinceActive > 14) warningSignals.push(`Inactive ${daysSinceActive} days`);

    return {
      visitorId: profile.visitorId,
      name: profile.name,
      email: profile.email,
      churnRisk: profile.churnRisk,
      lastActiveAt: profile.lastActiveAt,
      messageCount: profile.messageCount,
      warningSignals,
    };
  });
}

export async function getRevenueAttribution(clientId: string, days: number = 30): Promise<RevenueAttribution> {
  await connectDB();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Revenue by channel from customer profiles
  const channelRevenue = await CustomerProfile.aggregate([
    { $match: { clientId, totalRevenue: { $gt: 0 } } },
    { $unwind: '$revenueEvents' },
    { $match: { 'revenueEvents.timestamp': { $gte: since } } },
    {
      $group: {
        _id: '$revenueEvents.source',
        revenue: { $sum: '$revenueEvents.amount' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const totalRevenue = channelRevenue.reduce((sum, c) => sum + c.revenue, 0);

  const byChannel = channelRevenue.map((c) => ({
    channel: c._id || 'direct',
    revenue: c.revenue,
    percentage: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0,
  }));

  // Top converting intents
  const intentConversions = await ConversationInsight.aggregate([
    {
      $match: {
        clientId,
        type: { $in: ['buying_signal', 'intent'] },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$label',
        conversions: { $sum: 1 },
      },
    },
    { $sort: { conversions: -1 } },
    { $limit: 10 },
  ]);

  const topConvertingIntents = intentConversions.map((i) => ({
    intent: i._id,
    conversions: i.conversions,
    revenue: 0, // Revenue per intent would need join with profiles
  }));

  return { totalRevenue, byChannel, topConvertingIntents };
}
