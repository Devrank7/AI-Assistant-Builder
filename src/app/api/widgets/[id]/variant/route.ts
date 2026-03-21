// src/app/api/widgets/[id]/variant/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { successResponse } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const visitorId = request.nextUrl.searchParams.get('vid') || '';

    await connectDB();

    const activeTest = await ABTest.findOne({ clientId, status: 'running' });
    if (!activeTest || activeTest.variants.length === 0) {
      return successResponse({ variantId: null, config: {} });
    }

    // Deterministic assignment based on visitor hash
    const hash = simpleHash(visitorId + activeTest._id.toString());
    const variantIndex = hash % activeTest.variants.length;
    const variant = activeTest.variants[variantIndex];

    // Increment visitor count (fire-and-forget)
    ABTest.updateOne({ _id: activeTest._id, 'variants.variantId': variant.variantId }, { $inc: { 'variants.$.visitors': 1 } })
      .exec()
      .catch(() => {});

    return successResponse({
      variantId: variant.variantId,
      testId: activeTest._id.toString(),
      config: variant.config,
    });
  } catch {
    return successResponse({ variantId: null, config: {} });
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
