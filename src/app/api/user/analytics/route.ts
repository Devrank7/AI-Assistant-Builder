import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Get all user's widgets
    const clients = await Client.find({ userId: auth.userId }).select('clientId username clientType createdAt').lean();
    const clientIds = clients.map((c) => c.clientId);

    if (clientIds.length === 0) {
      return successResponse({
        totalWidgets: 0,
        totalChats: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        satisfactionPercent: 0,
        messagesPerDay: [],
        chatsPerDay: [],
        hourlyDistribution: [],
        channelBreakdown: [],
        topQuestions: [],
        widgetPerformance: [],
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await ChatLog.find({
      clientId: { $in: clientIds },
      createdAt: { $gte: startDate },
    }).lean();

    // Totals
    const totalChats = logs.length;
    const totalMessages = logs.reduce((sum, log) => sum + (log.messages?.length || 0), 0);

    // Response time
    let rtTotal = 0;
    let rtCount = 0;
    for (const log of logs) {
      if (!log.messages) continue;
      for (let i = 1; i < log.messages.length; i++) {
        const prev = log.messages[i - 1];
        const curr = log.messages[i];
        if (prev.role === 'user' && curr.role === 'assistant') {
          const diff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
          if (diff > 0 && diff < 300000) {
            rtTotal += diff;
            rtCount++;
          }
        }
      }
    }
    const avgResponseTime = rtCount > 0 ? Math.round(rtTotal / rtCount) : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { chats: number; messages: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().split('T')[0], { chats: 0, messages: 0 });
    }

    const channelMap = new Map<string, number>();
    const questionMap = new Map<string, number>();
    const hourlyMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);

    const widgetMap = new Map<string, { chats: number; messages: number }>();
    for (const c of clients) {
      widgetMap.set(c.clientId, { chats: 0, messages: 0 });
    }

    for (const log of logs) {
      const dayKey = new Date(log.createdAt).toISOString().split('T')[0];
      const existing = dailyMap.get(dayKey);
      if (existing) {
        existing.chats++;
        existing.messages += log.messages?.length || 0;
      }

      const hour = new Date(log.createdAt).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);

      const channel = (log.metadata as { channel?: string })?.channel || 'website';
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);

      const firstUserMsg = log.messages?.find((m: { role: string }) => m.role === 'user');
      if (firstUserMsg) {
        const normalized = (firstUserMsg.content as string).toLowerCase().trim().slice(0, 100);
        questionMap.set(normalized, (questionMap.get(normalized) || 0) + 1);
      }

      const wm = widgetMap.get(log.clientId);
      if (wm) {
        wm.chats++;
        wm.messages += log.messages?.length || 0;
      }
    }

    const messagesPerDay = Array.from(dailyMap.entries()).map(([date, s]) => ({ date, count: s.messages }));
    const chatsPerDay = Array.from(dailyMap.entries()).map(([date, s]) => ({ date, count: s.chats }));
    const hourlyDistribution = Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
    const channelBreakdown = Array.from(channelMap.entries())
      .map(([channel, count]) => ({
        channel,
        count,
        percent: totalChats > 0 ? Math.round((count / totalChats) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
    const topQuestions = Array.from(questionMap.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const widgetPerformance = clients
      .map((c) => {
        const wm = widgetMap.get(c.clientId) || { chats: 0, messages: 0 };
        return { name: c.username || c.clientId, chats: wm.chats, messages: wm.messages };
      })
      .sort((a, b) => b.chats - a.chats);

    return successResponse({
      totalWidgets: clients.length,
      totalChats,
      totalMessages,
      avgResponseTime,
      satisfactionPercent: 0,
      messagesPerDay,
      chatsPerDay,
      hourlyDistribution,
      channelBreakdown,
      topQuestions,
      widgetPerformance,
    });
  } catch (error) {
    console.error('User analytics error:', error);
    return Errors.internal('Failed to fetch analytics');
  }
}
