/**
 * Analytics API
 *
 * GET /api/analytics - Get analytics for client
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics, getQuickStats } from '@/lib/analytics';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const days = parseInt(searchParams.get('days') || '30');
    const quick = searchParams.get('quick') === 'true';

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (quick) {
      // Return just quick stats for dashboard cards
      const stats = await getQuickStats(clientId);
      return NextResponse.json({ success: true, stats });
    }

    // Return full analytics
    const analytics = await getAnalytics(clientId, days);
    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
