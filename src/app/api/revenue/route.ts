/**
 * Revenue Attribution API
 *
 * GET /api/revenue?clientId=xxx - Get funnel metrics
 * GET /api/revenue?clientId=xxx&timeline=true - Get revenue timeline
 * GET /api/revenue?clientId=xxx&top=true - Get top customers by revenue
 * POST /api/revenue - Record a revenue event
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { trackFunnelEvent, getFunnelMetrics, getRevenueTimeline, getTopCustomersByRevenue } from '@/lib/revenueTracker';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const days = parseInt(searchParams.get('days') || '30');
    const timeline = searchParams.get('timeline') === 'true';
    const top = searchParams.get('top') === 'true';

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    if (timeline) {
      const data = await getRevenueTimeline(clientId, days);
      return NextResponse.json({ success: true, timeline: data });
    }

    if (top) {
      const data = await getTopCustomersByRevenue(clientId);
      return NextResponse.json({ success: true, topCustomers: data });
    }

    const funnel = await getFunnelMetrics(clientId, days);
    return NextResponse.json({ success: true, funnel });
  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, visitorId, sessionId, stage, amount, currency, source, integrationSlug, externalId } = body;

    if (!clientId || !visitorId || !sessionId || !stage) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await trackFunnelEvent(clientId, visitorId, sessionId, stage, {
      amount,
      currency,
      source,
      integrationSlug,
      externalId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revenue POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
