/**
 * Customer Profiles API
 *
 * GET /api/customers?clientId=xxx - List customer profiles
 * GET /api/customers?clientId=xxx&visitorId=yyy - Get specific profile
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CustomerProfile from '@/models/CustomerProfile';
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
    const visitorId = searchParams.get('visitorId');
    const sortBy = searchParams.get('sort') || 'lastActiveAt';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const tag = searchParams.get('tag');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Single profile lookup
    if (visitorId) {
      const profile = await CustomerProfile.findOne({ clientId, visitorId }).lean();
      return NextResponse.json({ success: true, profile });
    }

    // List profiles
    const filter: Record<string, unknown> = { clientId };
    if (tag) filter.tags = tag;

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      lastActiveAt: { lastActiveAt: -1 },
      totalRevenue: { totalRevenue: -1 },
      buyingSignals: { buyingSignals: -1 },
      visitCount: { visitCount: -1 },
    };

    const [profiles, total] = await Promise.all([
      CustomerProfile.find(filter)
        .sort(sortMap[sortBy] || { lastActiveAt: -1 })
        .skip(offset)
        .limit(limit)
        .select(
          'visitorId name email phone tags sentiment.current visitCount messageCount totalRevenue buyingSignals lastActiveAt firstSeenAt'
        )
        .lean(),
      CustomerProfile.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, profiles, total });
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
