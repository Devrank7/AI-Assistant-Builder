// src/app/api/ab-tests/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { chiSquaredTest, calculateConfidence } from '@/lib/abTestStats';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    // Calculate statistics
    const stats = chiSquaredTest(
      test.variants.map((v) => ({
        visitors: v.visitors,
        conversions: v.conversions,
      }))
    );

    const variantsWithCI = test.variants.map((v) => ({
      ...v.toObject(),
      conversionRate: v.visitors > 0 ? ((v.conversions / v.visitors) * 100).toFixed(2) : '0',
      ci: calculateConfidence(v.visitors, v.conversions),
    }));

    return successResponse({
      ...test.toObject(),
      variants: variantsWithCI,
      stats,
    });
  } catch (error) {
    console.error('Get AB test error:', error);
    return Errors.internal('Failed to fetch A/B test');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    if (status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused', 'completed'],
        paused: ['running', 'completed'],
        completed: [],
      };
      if (!validTransitions[test.status]?.includes(status)) {
        return Errors.badRequest(`Cannot transition from ${test.status} to ${status}`);
      }

      test.status = status;
      if (status === 'running' && !test.startedAt) test.startedAt = new Date();
      if (status === 'completed') {
        test.endedAt = new Date();
        // Auto-detect winner
        const stats = chiSquaredTest(
          test.variants.map((v) => ({
            visitors: v.visitors,
            conversions: v.conversions,
          }))
        );
        if (stats.significant && stats.winnerIndex !== null) {
          test.winnerVariantId = test.variants[stats.winnerIndex].id;
        }
      }
    }

    // Allow updating variant visitors/conversions (for recording)
    if (body.variants) {
      for (const update of body.variants) {
        const variant = test.variants.find((v) => v.id === update.id);
        if (variant) {
          if (update.visitors !== undefined) variant.visitors = update.visitors;
          if (update.conversions !== undefined) variant.conversions = update.conversions;
        }
      }
    }

    await test.save();
    return successResponse(test);
  } catch (error) {
    console.error('Update AB test error:', error);
    return Errors.internal('Failed to update A/B test');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    await ABTest.findByIdAndDelete(id);
    return successResponse(null, 'A/B test deleted');
  } catch (error) {
    console.error('Delete AB test error:', error);
    return Errors.internal('Failed to delete A/B test');
  }
}
