// src/app/api/ab-tests/[id]/start/route.ts
// POST: transition test status (start / pause / resume / complete)
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { chiSquaredTest } from '@/lib/abTestStats';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['running'],
  running: ['paused', 'completed'],
  paused: ['running', 'completed'],
  completed: [],
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    const test = await ABTest.findById(id);
    if (!test) return Errors.notFound('A/B test not found');

    const orgId = auth.organizationId || auth.userId;
    if (test.organizationId !== orgId) return Errors.forbidden();

    // Map action → target status
    const actionMap: Record<string, string> = {
      start: 'running',
      pause: 'paused',
      resume: 'running',
      complete: 'completed',
    };

    const targetStatus = action ? actionMap[action] : undefined;
    if (!targetStatus) {
      return Errors.badRequest('action must be one of: start, pause, resume, complete');
    }

    const allowed = VALID_TRANSITIONS[test.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      return Errors.badRequest(
        `Cannot transition from "${test.status}" to "${targetStatus}". ` +
          `Allowed: ${allowed.length ? allowed.join(', ') : 'none'}`
      );
    }

    test.status = targetStatus as 'draft' | 'running' | 'paused' | 'completed';

    if (targetStatus === 'running' && !test.startDate) {
      test.startDate = new Date();
    }

    if (targetStatus === 'completed') {
      test.endDate = new Date();
      // Auto-detect winner
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

    await test.save();
    return successResponse(test, `Test ${action}ed successfully`);
  } catch (error) {
    console.error('AB test action error:', error);
    return Errors.internal('Failed to update test status');
  }
}
