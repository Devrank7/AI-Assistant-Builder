/**
 * Auto-Learning Stats API
 *
 * GET /api/learning?clientId=xxx - Get learning stats
 * POST /api/learning - Auto-apply pending corrections
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { getLearningStats, autoApplyCorrections } from '@/lib/autoLearning';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = new URL(request.url).searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const stats = await getLearningStats(clientId);
    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error('Learning stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const applied = await autoApplyCorrections(clientId);
    return NextResponse.json({ success: true, applied });
  } catch (error) {
    console.error('Auto-apply error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
