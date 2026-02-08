import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Handoff from '@/models/Handoff';
import { verifyAdminOrClient } from '@/lib/auth';
import { resolveHandoff, assignHandoff } from '@/lib/handoff';

/**
 * GET /api/handoff?clientId=X — List handoffs (admin/client auth)
 * Optional: &status=pending|active|resolved
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId required' }, { status: 400 });
    }

    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const statusFilter = request.nextUrl.searchParams.get('status');
    const query: Record<string, unknown> = { clientId };
    if (statusFilter && ['pending', 'active', 'resolved'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const handoffs = await Handoff.find(query).sort({ requestedAt: -1 }).limit(100).lean();

    // Stats
    const [pendingCount, activeCount, resolvedCount] = await Promise.all([
      Handoff.countDocuments({ clientId, status: 'pending' }),
      Handoff.countDocuments({ clientId, status: 'active' }),
      Handoff.countDocuments({ clientId, status: 'resolved' }),
    ]);

    return NextResponse.json({
      success: true,
      handoffs,
      stats: {
        pending: pendingCount,
        active: activeCount,
        resolved: resolvedCount,
        total: pendingCount + activeCount + resolvedCount,
      },
    });
  } catch (error) {
    console.error('Handoff fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch handoffs' }, { status: 500 });
  }
}

/**
 * PATCH /api/handoff — Update handoff status (admin auth)
 * Body: { handoffId, action: 'assign' | 'resolve', assignedTo? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { handoffId, action, assignedTo } = await request.json();

    if (!handoffId || !action) {
      return NextResponse.json({ success: false, error: 'handoffId and action are required' }, { status: 400 });
    }

    let success = false;

    if (action === 'assign') {
      success = await assignHandoff(handoffId, assignedTo || 'admin');
    } else if (action === 'resolve') {
      success = await resolveHandoff(handoffId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action. Use "assign" or "resolve"' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ success: false, error: 'Handoff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Handoff update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update handoff' }, { status: 500 });
  }
}
