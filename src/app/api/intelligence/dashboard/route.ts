import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import ConversationInsight from '@/models/ConversationInsight';
import CustomerProfile from '@/models/CustomerProfile';
import Client from '@/models/Client';

/**
 * GET /api/intelligence/dashboard — Aggregated intelligence data
 *
 * Query params: clientId, days (default 30)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const days = parseInt(searchParams.get('days') || '30');

  if (!clientId) return Errors.badRequest('clientId is required');

  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all insights in date range
  const insights = await ConversationInsight.find({
    clientId,
    createdAt: { $gte: since },
  }).lean();

  // Aggregate by type
  const intentCounts = new Map<string, number>();
  const typeCounts: Record<string, number> = {};
  const competitorMentions: Map<string, number> = new Map();
  const featureRequests: Map<string, number> = new Map();
  let escalationCount = 0;
  let totalSentimentPositive = 0;
  let totalSentimentNegative = 0;

  for (const insight of insights) {
    typeCounts[insight.type] = (typeCounts[insight.type] || 0) + 1;

    if (insight.type === 'intent') {
      intentCounts.set(insight.label, (intentCounts.get(insight.label) || 0) + 1);
    }
    if (insight.type === 'competitor_mention') {
      competitorMentions.set(insight.label, (competitorMentions.get(insight.label) || 0) + 1);
    }
    if (insight.type === 'feature_request') {
      featureRequests.set(insight.label, (featureRequests.get(insight.label) || 0) + 1);
    }
    if (insight.type === 'escalation_needed') escalationCount++;
    if (insight.type === 'positive_feedback') totalSentimentPositive++;
    if (insight.type === 'complaint' || insight.type === 'churn_indicator') totalSentimentNegative++;
  }

  // Get avg scores from customer profiles
  const profileAgg = await CustomerProfile.aggregate([
    { $match: { clientId, lastActiveAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        avgBuying: { $avg: '$buyingSignals' },
        avgChurn: { $avg: '$churnRisk' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalConversations = profileAgg[0]?.count || 0;
  const avgBuyingSignal = Math.round(profileAgg[0]?.avgBuying || 0);
  const avgChurnRisk = Math.round(profileAgg[0]?.avgChurn || 0);
  const escalationRate = totalConversations > 0 ? Math.round((escalationCount / totalConversations) * 100) : 0;

  // Sentiment distribution
  const totalSentiment =
    totalSentimentPositive +
    totalSentimentNegative +
    (insights.length - totalSentimentPositive - totalSentimentNegative);
  const sentimentDistribution = {
    positive: totalSentimentPositive,
    negative: totalSentimentNegative,
    neutral: Math.max(0, insights.length - totalSentimentPositive - totalSentimentNegative),
  };

  // Satisfaction score (positive / total * 100)
  const satisfaction = totalSentiment > 0 ? Math.round((totalSentimentPositive / totalSentiment) * 100) : 50;

  return successResponse({
    summary: {
      avgBuyingSignal,
      avgChurnRisk,
      escalationRate,
      satisfaction,
      totalConversations,
      totalInsights: insights.length,
    },
    topIntents: Array.from(intentCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    sentimentDistribution,
    insightsByType: typeCounts,
    competitorMentions: Array.from(competitorMentions.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    featureRequests: Array.from(featureRequests.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    escalationCount,
  });
}
