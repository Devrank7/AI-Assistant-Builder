/**
 * Payment Tiers API
 *
 * GET /api/payments/tiers - Get available subscription tiers
 */

import { NextResponse } from 'next/server';
import { getDynamicTiers } from '@/lib/pricing';
import { getPricingConfig } from '@/lib/pricingConfig';
import { getPaymentService } from '@/lib/PaymentService';

/**
 * GET - Get all available subscription tiers
 */
export async function GET() {
  try {
    const [tiers, config] = await Promise.all([getDynamicTiers(), getPricingConfig()]);
    const paymentService = getPaymentService();
    const availableProviders = paymentService.getAvailableProviders();

    return NextResponse.json({
      success: true,
      tiers,
      availableProviders,
      recommended: 'annual',
      pricing: {
        baseMonthlyPrice: config.baseMonthlyPrice,
        annualDiscount: config.annualDiscount,
        annualSavings: Math.round(config.baseMonthlyPrice * 12 * config.annualDiscount * 100) / 100,
      },
      costLimits: {
        warningThreshold: config.costWarningThreshold,
        blockThreshold: config.costBlockThreshold,
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
