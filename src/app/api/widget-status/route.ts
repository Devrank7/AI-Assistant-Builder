import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import User from '@/models/User';
import { checkMessageLimit, PLAN_LIMITS } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

/**
 * GET /api/widget-status?clientId=xxx
 *
 * Called by the embedded widget script to check if it should render.
 * Returns { active: true/false, reason?, limit?, used? }
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ active: false, reason: 'MISSING_CLIENT_ID' }, { status: 400 });
    }

    await connectDB();

    const client = await Client.findOne({ clientId }).lean();
    if (!client) {
      return NextResponse.json({ active: false, reason: 'CLIENT_NOT_FOUND' }, { status: 404 });
    }

    const userId = (client as { userId?: string }).userId;
    if (!userId) {
      // Orphan widget (no owner) — allow for backwards compat
      return NextResponse.json({ active: true });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ active: false, reason: 'OWNER_NOT_FOUND' }, { status: 404 });
    }

    const plan = ((user as { plan?: string }).plan || 'none') as Plan;
    const limits = PLAN_LIMITS[plan];

    // No plan at all
    if (limits.messagesPerMonth === 0) {
      return NextResponse.json({
        active: false,
        reason: 'NO_PLAN',
        message: 'Widget owner has no active plan. Upgrade at winbixai.com/plans',
      });
    }

    // Unlimited plans — always active
    if (limits.messagesPerMonth === -1) {
      return NextResponse.json({ active: true });
    }

    // Check message limit
    const limitCheck = await checkMessageLimit(userId, plan);

    if (!limitCheck.allowed) {
      return NextResponse.json({
        active: false,
        reason: 'MESSAGE_LIMIT_EXCEEDED',
        message: `Monthly message limit reached (${limitCheck.used}/${limitCheck.limit}). Upgrade plan at winbixai.com/plans`,
        used: limitCheck.used,
        limit: limitCheck.limit,
      });
    }

    return NextResponse.json({
      active: true,
      used: limitCheck.used,
      limit: limitCheck.limit,
    });
  } catch (err) {
    console.error('[widget-status] Error:', err);
    // On error, allow widget to work (fail-open for better UX)
    return NextResponse.json({ active: true });
  }
}
