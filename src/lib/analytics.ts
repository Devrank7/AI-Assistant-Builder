/**
 * Analytics Library
 *
 * Aggregation functions for chat analytics.
 * Includes: daily stats, hourly distribution, top questions,
 * response time calculation, satisfaction score, channel breakdown.
 */

import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import Feedback from '@/models/Feedback';

export interface DailyStats {
  date: string;
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}

export interface TopQuestion {
  text: string;
  count: number;
}

export interface ChannelStats {
  channel: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
  avgResponseTimeMs: number;
  satisfactionPercent: number;
  feedbackCount: number;
  dailyStats: DailyStats[];
  hourlyDistribution: HourlyDistribution[];
  topQuestions: TopQuestion[];
  channelStats: ChannelStats[];
}

/**
 * Calculate average response time from chat messages.
 * Response time = timestamp of assistant message - timestamp of preceding user message.
 */
function calculateAvgResponseTime(logs: Array<{ messages?: Array<{ role: string; timestamp: Date }> }>): number {
  let totalMs = 0;
  let count = 0;

  for (const log of logs) {
    if (!log.messages) continue;
    for (let i = 1; i < log.messages.length; i++) {
      const prev = log.messages[i - 1];
      const curr = log.messages[i];
      if (prev.role === 'user' && curr.role === 'assistant') {
        const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (diff > 0 && diff < 300000) {
          // Ignore outliers > 5 min
          totalMs += diff;
          count++;
        }
      }
    }
  }

  return count > 0 ? Math.round(totalMs / count) : 0;
}

/**
 * Calculate response time per day
 */
function calculateDailyResponseTimes(
  logs: Array<{ messages?: Array<{ role: string; timestamp: Date }>; createdAt: Date }>
): Map<string, { totalMs: number; count: number }> {
  const dailyResponseTimes = new Map<string, { totalMs: number; count: number }>();

  for (const log of logs) {
    if (!log.messages) continue;
    const dayKey = new Date(log.createdAt).toISOString().split('T')[0];

    for (let i = 1; i < log.messages.length; i++) {
      const prev = log.messages[i - 1];
      const curr = log.messages[i];
      if (prev.role === 'user' && curr.role === 'assistant') {
        const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (diff > 0 && diff < 300000) {
          const existing = dailyResponseTimes.get(dayKey) || { totalMs: 0, count: 0 };
          existing.totalMs += diff;
          existing.count++;
          dailyResponseTimes.set(dayKey, existing);
        }
      }
    }
  }

  return dailyResponseTimes;
}

/**
 * Get analytics summary for a client
 */
export async function getAnalytics(clientId: string, days: number = 30, channel?: string): Promise<AnalyticsSummary> {
  await connectDB();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Build query with optional channel filter
  const chatQuery: Record<string, unknown> = { clientId, createdAt: { $gte: startDate } };
  if (channel) {
    chatQuery['metadata.channel'] = channel;
  }

  const feedbackQuery: Record<string, unknown> = { clientId, createdAt: { $gte: startDate } };

  // Get all chat logs and feedback for the period
  const [logs, totalUp, totalDown] = await Promise.all([
    ChatLog.find(chatQuery).lean(),
    Feedback.countDocuments({ ...feedbackQuery, rating: 'up' }),
    Feedback.countDocuments({ ...feedbackQuery, rating: 'down' }),
  ]);

  // Calculate totals
  const totalChats = logs.length;
  const totalMessages = logs.reduce((sum, log) => sum + (log.messages?.length || 0), 0);
  const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

  // Response time
  const avgResponseTimeMs = calculateAvgResponseTime(logs);
  const dailyResponseTimes = calculateDailyResponseTimes(logs);

  // Satisfaction
  const feedbackCount = totalUp + totalDown;
  const satisfactionPercent = feedbackCount > 0 ? Math.round((totalUp / feedbackCount) * 100) : 0;

  // Daily stats
  const dailyMap = new Map<string, { chats: number; messages: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, { chats: 0, messages: 0 });
  }

  // Channel breakdown
  const channelMap = new Map<string, number>();

  logs.forEach((log) => {
    const key = new Date(log.createdAt).toISOString().split('T')[0];
    const existing = dailyMap.get(key) || { chats: 0, messages: 0 };
    existing.chats += 1;
    existing.messages += log.messages?.length || 0;
    dailyMap.set(key, existing);

    // Channel tracking
    const channel = (log.metadata as { channel?: string })?.channel || 'website';
    channelMap.set(channel, (channelMap.get(channel) || 0) + 1);
  });

  const dailyStats: DailyStats[] = Array.from(dailyMap.entries()).map(([date, stats]) => {
    const rt = dailyResponseTimes.get(date);
    return {
      date,
      totalChats: stats.chats,
      totalMessages: stats.messages,
      avgMessagesPerChat: stats.chats > 0 ? Math.round((stats.messages / stats.chats) * 10) / 10 : 0,
      avgResponseTimeMs: rt && rt.count > 0 ? Math.round(rt.totalMs / rt.count) : 0,
    };
  });

  // Hourly distribution
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, 0);
  }

  logs.forEach((log) => {
    const hour = new Date(log.createdAt).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });

  const hourlyDistribution: HourlyDistribution[] = Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  // Top questions
  const questionMap = new Map<string, number>();
  logs.forEach((log) => {
    const firstUserMsg = log.messages?.find((m: { role: string }) => m.role === 'user');
    if (firstUserMsg) {
      const normalized = (firstUserMsg.content as string).toLowerCase().trim().slice(0, 100);
      questionMap.set(normalized, (questionMap.get(normalized) || 0) + 1);
    }
  });

  const topQuestions: TopQuestion[] = Array.from(questionMap.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Channel stats
  const channelStats: ChannelStats[] = Array.from(channelMap.entries())
    .map(([channel, count]) => ({
      channel,
      count,
      percentage: totalChats > 0 ? Math.round((count / totalChats) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalChats,
    totalMessages,
    avgMessagesPerChat: Math.round(avgMessagesPerChat * 10) / 10,
    avgResponseTimeMs,
    satisfactionPercent,
    feedbackCount,
    dailyStats,
    hourlyDistribution,
    topQuestions,
    channelStats,
  };
}

/**
 * Get quick stats for dashboard cards
 */
export async function getQuickStats(clientId: string) {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [todayCount, weekCount, monthCount] = await Promise.all([
    ChatLog.countDocuments({ clientId, createdAt: { $gte: today } }),
    ChatLog.countDocuments({ clientId, createdAt: { $gte: weekAgo } }),
    ChatLog.countDocuments({ clientId, createdAt: { $gte: monthAgo } }),
  ]);

  return {
    today: todayCount,
    week: weekCount,
    month: monthCount,
  };
}
