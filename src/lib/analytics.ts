/**
 * Analytics Library
 * 
 * Aggregation functions for chat analytics.
 */

import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';

export interface DailyStats {
    date: string;
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
}

export interface HourlyDistribution {
    hour: number;
    count: number;
}

export interface TopQuestion {
    text: string;
    count: number;
}

export interface AnalyticsSummary {
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
    avgResponseTimeMs: number;
    dailyStats: DailyStats[];
    hourlyDistribution: HourlyDistribution[];
    topQuestions: TopQuestion[];
}

/**
 * Get analytics summary for a client
 */
export async function getAnalytics(
    clientId: string,
    days: number = 30
): Promise<AnalyticsSummary> {
    await connectDB();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all chat logs for the period
    const logs = await ChatLog.find({
        clientId,
        createdAt: { $gte: startDate },
    }).lean();

    // Calculate totals
    const totalChats = logs.length;
    const totalMessages = logs.reduce((sum, log) => sum + (log.messages?.length || 0), 0);
    const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

    // Daily stats
    const dailyMap = new Map<string, { chats: number; messages: number }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, { chats: 0, messages: 0 });
    }

    // Fill in data
    logs.forEach(log => {
        const key = new Date(log.createdAt).toISOString().split('T')[0];
        const existing = dailyMap.get(key) || { chats: 0, messages: 0 };
        existing.chats += 1;
        existing.messages += log.messages?.length || 0;
        dailyMap.set(key, existing);
    });

    const dailyStats: DailyStats[] = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        totalChats: stats.chats,
        totalMessages: stats.messages,
        avgMessagesPerChat: stats.chats > 0 ? stats.messages / stats.chats : 0,
    }));

    // Hourly distribution
    const hourlyMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, 0);
    }

    logs.forEach(log => {
        const hour = new Date(log.createdAt).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    const hourlyDistribution: HourlyDistribution[] = Array.from(hourlyMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

    // Top questions (extract first user message from each chat)
    const questionMap = new Map<string, number>();

    logs.forEach(log => {
        const firstUserMsg = log.messages?.find((m: { role: string }) => m.role === 'user');
        if (firstUserMsg) {
            // Normalize the question
            const normalized = (firstUserMsg.content as string)
                .toLowerCase()
                .trim()
                .slice(0, 100);
            questionMap.set(normalized, (questionMap.get(normalized) || 0) + 1);
        }
    });

    const topQuestions: TopQuestion[] = Array.from(questionMap.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalChats,
        totalMessages,
        avgMessagesPerChat: Math.round(avgMessagesPerChat * 10) / 10,
        avgResponseTimeMs: 0, // TODO: Calculate from actual response times
        dailyStats,
        hourlyDistribution,
        topQuestions,
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
