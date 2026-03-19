/**
 * Conversation Insights API
 *
 * GET /api/insights?clientId=xxx - Get insights summary
 * GET /api/insights?clientId=xxx&type=buying_signal - Filter by type
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ConversationInsight from '@/models/ConversationInsight';
import { getInsightsSummary } from '@/lib/conversationIntelligence';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type');
    const days = parseInt(searchParams.get('days') || '30');
    const summary = searchParams.get('summary') === 'true';

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Summary view for dashboard
    if (summary) {
      const data = await getInsightsSummary(clientId, days);
      return NextResponse.json({ success: true, ...data });
    }

    // List insights
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filter: Record<string, unknown> = { clientId, createdAt: { $gte: since } };
    if (type) filter.type = type;

    const insights = await ConversationInsight.find(filter).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({ success: true, insights, total: insights.length });
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
