import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProactiveTrigger from '@/models/ProactiveTrigger';
import { verifyAdminOrClient } from '@/lib/auth';

/**
 * GET /api/proactive-triggers/manage?clientId=X — List all triggers (admin auth)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();
    const triggers = await ProactiveTrigger.find({ clientId }).sort({ priority: -1 }).lean();

    return NextResponse.json({ success: true, triggers });
  } catch (error) {
    console.error('Error fetching triggers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch triggers' }, { status: 500 });
  }
}

/**
 * POST /api/proactive-triggers/manage — Create trigger (admin auth)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, triggerType, config, isActive, priority, maxShowsPerSession, cooldownMinutes } = body;

    if (!clientId || !triggerType || !config?.message) {
      return NextResponse.json(
        { success: false, error: 'clientId, triggerType, and config.message are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const trigger = await ProactiveTrigger.create({
      clientId,
      triggerType,
      config,
      isActive: isActive ?? true,
      priority: priority ?? 0,
      maxShowsPerSession: maxShowsPerSession ?? 1,
      cooldownMinutes: cooldownMinutes ?? 30,
    });

    return NextResponse.json({ success: true, trigger }, { status: 201 });
  } catch (error) {
    console.error('Error creating trigger:', error);
    return NextResponse.json({ success: false, error: 'Failed to create trigger' }, { status: 500 });
  }
}

/**
 * PATCH /api/proactive-triggers/manage — Update trigger (admin auth)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { triggerId, ...updateData } = body;

    if (!triggerId) {
      return NextResponse.json({ success: false, error: 'triggerId is required' }, { status: 400 });
    }

    const allowedFields = ['triggerType', 'config', 'isActive', 'priority', 'maxShowsPerSession', 'cooldownMinutes'];
    const filtered: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) filtered[field] = updateData[field];
    }

    await connectDB();

    const trigger = await ProactiveTrigger.findByIdAndUpdate(triggerId, { $set: filtered }, { new: true });

    if (!trigger) {
      return NextResponse.json({ success: false, error: 'Trigger not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trigger });
  } catch (error) {
    console.error('Error updating trigger:', error);
    return NextResponse.json({ success: false, error: 'Failed to update trigger' }, { status: 500 });
  }
}

/**
 * DELETE /api/proactive-triggers/manage — Delete trigger (admin auth)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const triggerId = request.nextUrl.searchParams.get('triggerId');
    if (!triggerId) {
      return NextResponse.json({ success: false, error: 'triggerId is required' }, { status: 400 });
    }

    await connectDB();
    const result = await ProactiveTrigger.findByIdAndDelete(triggerId);

    if (!result) {
      return NextResponse.json({ success: false, error: 'Trigger not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trigger:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete trigger' }, { status: 500 });
  }
}
