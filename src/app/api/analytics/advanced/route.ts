// src/app/api/analytics/advanced/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { getAnalytics, getQuickStats } from '@/lib/analytics';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const channel = request.nextUrl.searchParams.get('channel') || undefined;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const clients = await Client.find(query).select('clientId username widgetType');

    const widgets = await Promise.all(
      clients.map(async (c) => {
        const [analytics, quickStats] = await Promise.all([
          getAnalytics(c.clientId, days, channel),
          getQuickStats(c.clientId),
        ]);
        return {
          clientId: c.clientId,
          name: c.username,
          widgetType: c.widgetType || 'ai_chat',
          analytics,
          quickStats,
        };
      })
    );

    // Aggregate totals
    const totals = {
      totalChats: widgets.reduce((s, w) => s + w.analytics.totalChats, 0),
      totalMessages: widgets.reduce((s, w) => s + w.analytics.totalMessages, 0),
      avgSatisfaction:
        widgets.length > 0
          ? Math.round(widgets.reduce((s, w) => s + w.analytics.satisfactionPercent, 0) / widgets.length)
          : 0,
      todayChats: widgets.reduce((s, w) => s + w.quickStats.today, 0),
      weekChats: widgets.reduce((s, w) => s + w.quickStats.week, 0),
      monthChats: widgets.reduce((s, w) => s + w.quickStats.month, 0),
    };

    return successResponse({ totals, widgets });
  } catch (error) {
    console.error('Advanced analytics error:', error);
    return Errors.internal('Failed to fetch analytics');
  }
}
