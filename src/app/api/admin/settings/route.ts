/**
 * Admin Settings API
 *
 * GET  /api/admin/settings - Get current pricing config
 * PUT  /api/admin/settings - Update pricing config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPricingConfig, updatePricingConfig, PricingConfigData } from '@/lib/pricingConfig';

export async function GET() {
  try {
    const config = await getPricingConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates: Partial<PricingConfigData> = {};

    if (body.baseMonthlyPrice !== undefined) {
      const price = Number(body.baseMonthlyPrice);
      if (isNaN(price) || price < 1 || price > 10000) {
        return NextResponse.json(
          { success: false, error: 'baseMonthlyPrice must be between 1 and 10000' },
          { status: 400 }
        );
      }
      updates.baseMonthlyPrice = price;
    }

    if (body.annualDiscount !== undefined) {
      const discount = Number(body.annualDiscount);
      if (isNaN(discount) || discount < 0 || discount > 0.99) {
        return NextResponse.json(
          { success: false, error: 'annualDiscount must be between 0 and 0.99' },
          { status: 400 }
        );
      }
      updates.annualDiscount = discount;
    }

    if (body.costWarningThreshold !== undefined) {
      const warning = Number(body.costWarningThreshold);
      if (isNaN(warning) || warning < 1 || warning > 10000) {
        return NextResponse.json(
          { success: false, error: 'costWarningThreshold must be between 1 and 10000' },
          { status: 400 }
        );
      }
      updates.costWarningThreshold = warning;
    }

    if (body.costBlockThreshold !== undefined) {
      const block = Number(body.costBlockThreshold);
      if (isNaN(block) || block < 1 || block > 10000) {
        return NextResponse.json(
          { success: false, error: 'costBlockThreshold must be between 1 and 10000' },
          { status: 400 }
        );
      }
      updates.costBlockThreshold = block;
    }

    // Validate that warning < block if both are being set
    const current = await getPricingConfig();
    const effectiveWarning = updates.costWarningThreshold ?? current.costWarningThreshold;
    const effectiveBlock = updates.costBlockThreshold ?? current.costBlockThreshold;

    if (effectiveWarning >= effectiveBlock) {
      return NextResponse.json(
        { success: false, error: 'costWarningThreshold must be less than costBlockThreshold' },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const config = await updatePricingConfig(updates);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
