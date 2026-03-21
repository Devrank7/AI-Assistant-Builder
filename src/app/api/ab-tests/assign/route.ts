// src/app/api/ab-tests/assign/route.ts
// Public endpoint — assigns a visitor to a variant deterministically.
// GET ?clientId=xxx&visitorId=yyy
import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { assignVariant, recordImpression } from '@/lib/abTestService';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const visitorId = searchParams.get('visitorId');
    const noRecord = searchParams.get('noRecord') === '1';

    if (!clientId || !visitorId) {
      return Errors.badRequest('clientId and visitorId are required');
    }

    const variantId = await assignVariant(clientId, visitorId);
    if (!variantId) {
      return successResponse({ variantId: null, config: null });
    }

    // Fetch variant config to return to the widget
    await connectDB();
    const test = await ABTest.findOne({ clientId, status: 'running' }).lean();
    const variant = test?.variants.find((v) => v.variantId === variantId);

    // Record impression (fire-and-forget)
    if (!noRecord && test) {
      recordImpression(test.testId, variantId).catch(() => {});
    }

    return successResponse({
      testId: test?.testId ?? null,
      variantId,
      variantName: variant?.name ?? null,
      config: variant?.config ?? null,
    });
  } catch (error) {
    console.error('Assign variant error:', error);
    return Errors.internal('Failed to assign variant');
  }
}
