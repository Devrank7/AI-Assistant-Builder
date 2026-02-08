import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProactiveTrigger from '@/models/ProactiveTrigger';

/**
 * GET /api/proactive-triggers?clientId=X — Returns active triggers for widget (public, no auth)
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const triggers = await ProactiveTrigger.find({ clientId, isActive: true })
      .sort({ priority: -1 })
      .select('triggerType config maxShowsPerSession cooldownMinutes priority')
      .lean();

    return NextResponse.json({ success: true, triggers });
  } catch (error) {
    console.error('Error fetching proactive triggers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch triggers' }, { status: 500 });
  }
}
