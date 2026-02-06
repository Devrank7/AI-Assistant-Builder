/**
 * Credits Status API
 *
 * GET /api/credits/status - Get credit usage and limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkCostLimit, TOP_UP_OPTIONS } from '@/lib/costGuard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const result = await checkCostLimit(clientId);

    return NextResponse.json({
      success: true,
      credits: {
        used: result.monthlyCostUsd,
        baseLimit: 40,
        extraCredits: result.extraCreditsUsd,
        effectiveLimit: result.effectiveLimit,
        remaining: result.remainingCredits,
        status: result.status,
        canTopUp: result.canTopUp,
        topUpOptions: TOP_UP_OPTIONS,
      },
    });
  } catch (error) {
    console.error('Credits status error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
