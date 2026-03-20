// src/lib/analytics/aiQuality.ts
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import ChatLog from '@/models/ChatLog';

/**
 * Resolution rate: % of conversations resolved without handoff.
 */
export async function getResolutionRate(clientId: string, days: number): Promise<number> {
  await connectDB();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const total = await Conversation.countDocuments({
    clientId,
    createdAt: { $gte: since },
  });

  if (total === 0) return 100;

  const handoffs = await Conversation.countDocuments({
    clientId,
    createdAt: { $gte: since },
    status: 'handoff',
  });

  return Math.round(((total - handoffs) / total) * 100);
}

/**
 * Knowledge gaps: questions the AI couldn't answer well.
 * Detects user messages that appear repeatedly (potential unanswered patterns).
 */
export async function getKnowledgeGaps(
  clientId: string,
  days: number,
  limit = 10
): Promise<Array<{ question: string; count: number }>> {
  await connectDB();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Find user messages that appear frequently — likely unanswered or poorly answered
  const gaps = await ChatLog.aggregate([
    {
      $match: {
        clientId,
        createdAt: { $gte: since },
        'messages.role': 'user',
      },
    },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    {
      $group: {
        _id: { $substr: ['$messages.content', 0, 200] },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return gaps.map((g) => ({ question: g._id, count: g.count }));
}

/**
 * Get all AI quality metrics for a client.
 */
export async function getAIQualityMetrics(clientId: string, days: number) {
  const [resolutionRate, knowledgeGaps] = await Promise.all([
    getResolutionRate(clientId, days),
    getKnowledgeGaps(clientId, days),
  ]);

  return { resolutionRate, knowledgeGaps };
}
