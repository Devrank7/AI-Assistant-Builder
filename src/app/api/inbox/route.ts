/**
 * Inbox API (Shared Omnichannel Inbox)
 *
 * GET /api/inbox?clientId=xxx - List inbox threads
 * GET /api/inbox?clientId=xxx&stats=true - Get inbox stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { getInboxThreads, getInboxStats } from '@/lib/inboxManager';
import type { InboxStatus } from '@/models/InboxMessage';
import { requirePlanFeature } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const stats = searchParams.get('stats') === 'true';
    const status = searchParams.get('status') as InboxStatus | null;
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Enforce Enterprise plan for omnichannel inbox
    const Client = (await import('@/models/Client')).default;
    const User = (await import('@/models/User')).default;
    const client = await Client.findOne({ clientId }).select('userId').lean();
    if (client) {
      const owner = await User.findById((client as { userId?: string }).userId)
        .select('plan')
        .lean();
      const ownerPlan = ((owner as { plan?: string })?.plan || 'free') as Plan;
      const planErr = requirePlanFeature(ownerPlan, 'omnichannel_inbox', 'Omnichannel Inbox');
      if (planErr) {
        return NextResponse.json({ success: false, error: planErr }, { status: 403 });
      }
    }

    if (stats) {
      const data = await getInboxStats(clientId);
      return NextResponse.json({ success: true, ...data });
    }

    const { threads, total } = await getInboxThreads(clientId, {
      status: status || undefined,
      channel: channel || undefined,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, threads, total });
  } catch (error) {
    console.error('Inbox API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
