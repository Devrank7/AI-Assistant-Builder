/**
 * Payment Tiers API
 *
 * GET /api/payments/tiers - Get available subscription tiers
 */

import { NextResponse } from 'next/server';
import { getAllTiers, BASE_MONTHLY_PRICE, ANNUAL_DISCOUNT } from '@/lib/pricing';

/**
 * GET - Get all available subscription tiers
 */
export async function GET() {
  try {
    const tiers = getAllTiers();

    return NextResponse.json({
      success: true,
      tiers,
      recommended: 'annual',
      pricing: {
        baseMonthlyPrice: BASE_MONTHLY_PRICE,
        annualDiscount: ANNUAL_DISCOUNT,
        annualSavings: BASE_MONTHLY_PRICE * 12 * ANNUAL_DISCOUNT,
      },
      meta: {
        currency: 'USD',
        billingCycle: 'prepaid',
        validOptions: [1, 3, 6, 12],
      },
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
