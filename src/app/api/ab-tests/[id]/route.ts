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

    const test = await ABTest.findById(id).lean();
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    // Enrich with statistical analysis
    const variantData = test.variants.map((v) => ({
      visitors: v.stats.impressions,
      conversions: v.stats.conversions,
    }));

    const statsResult = chiSquaredTest(variantData);

    const variantsWithStats = test.variants.map((v) => {
      const ci = calculateConfidence(v.stats.impressions, v.stats.conversions);
      const conversionRate =
        v.stats.impressions > 0 ? ((v.stats.conversions / v.stats.impressions) * 100).toFixed(2) : '0.00';
      return {
        ...v,
        conversionRate,
        confidenceInterval: ci,
      };
    });

    return successResponse({
      ...test,
      variants: variantsWithStats,
      statistics: {
        significant: statsResult.significant,
        confidence: statsResult.confidence,
        pValue: statsResult.pValue,
        chiSquared: statsResult.chiSquared,
        winnerIndex: statsResult.winnerIndex,
      },
    });
  } catch (error) {
    console.error('Get AB test error:', error);
    return Errors.internal('Failed to fetch A/B test');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    if (test.status !== 'draft') {
      return Errors.badRequest('Can only edit tests in draft status');
    }

    const { name, description, minSampleSize, variants } = body;
    if (name) test.name = name;
    if (description !== undefined) test.description = description;
    if (minSampleSize !== undefined) test.minSampleSize = minSampleSize;

    if (variants) {
      const total = variants.reduce((s: number, v: { trafficPercent: number }) => s + (v.trafficPercent || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        return Errors.badRequest('Traffic split must total exactly 100%');
      }
      test.variants = variants;
    }

    await test.save();
    return successResponse(test);
  } catch (error) {
    console.error('Update AB test error:', error);
    return Errors.internal('Failed to update A/B test');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    // Status transition
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['running'],
        running: ['paused', 'completed'],
        paused: ['running', 'completed'],
        completed: [],
      };
      if (!validTransitions[test.status]?.includes(body.status)) {
        return Errors.badRequest(`Cannot transition from ${test.status} to ${body.status}`);
      }
      test.status = body.status;
      if (body.status === 'running' && !test.startDate) test.startDate = new Date();
      if (body.status === 'completed') {
        test.endDate = new Date();
        const variantData = test.variants.map((v) => ({
          visitors: v.stats.impressions,
          conversions: v.stats.conversions,
        }));
        const result = chiSquaredTest(variantData);
        test.confidenceLevel = result.confidence;
        if (result.significant && result.winnerIndex !== null) {
          test.winnerVariantId = test.variants[result.winnerIndex].variantId;
        }
      }
    }

    // Increment stats
    if (body.record) {
      const { variantId, type } = body.record;
      const variant = test.variants.find((v) => v.variantId === variantId);
      if (variant && type === 'impression') variant.stats.impressions += 1;
      if (variant && type === 'conversion') variant.stats.conversions += 1;
      if (variant && type === 'conversation') variant.stats.conversations += 1;
    }

    await test.save();
    return successResponse(test);
  } catch (error) {
    console.error('Patch AB test error:', error);
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
