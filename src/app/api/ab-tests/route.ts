// src/app/api/ab-tests/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { createTest } from '@/lib/abTestService';
import { requirePlanFeature, PLAN_LIMITS } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const planErr = requirePlanFeature(auth.user.plan as Plan, 'ab_testing', 'A/B Testing');
    if (planErr) return Errors.forbidden(planErr);

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const orgId = auth.organizationId || auth.userId;
    const query: Record<string, string> = { organizationId: orgId };
    if (clientId) query.clientId = clientId;

    const tests = await ABTest.find(query).sort({ createdAt: -1 }).lean();

    return successResponse(tests);
  } catch (error) {
    console.error('Get AB tests error:', error);
    return Errors.internal('Failed to fetch A/B tests');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const planErrPost = requirePlanFeature(auth.user.plan as Plan, 'ab_testing', 'A/B Testing');
    if (planErrPost) return Errors.forbidden(planErrPost);

    const body = await request.json();
    const { name, description, clientId, minSampleSize, variants } = body;

    if (!name || !clientId) {
      return Errors.badRequest('name and clientId are required');
    }

    if (variants && variants.length < 2) {
      return Errors.badRequest('At least 2 variants are required');
    }

    const totalTraffic = variants?.reduce((s: number, v: { trafficPercent: number }) => s + (v.trafficPercent || 0), 0);
    if (variants && Math.abs(totalTraffic - 100) > 0.01) {
      return Errors.badRequest('Traffic split must total exactly 100%');
    }

    const orgId = auth.organizationId || auth.userId;

    // Enforce concurrent A/B test limit
    await connectDB();
    const plan = auth.user.plan as Plan;
    const limit = PLAN_LIMITS[plan]?.abTests ?? 0;
    if (limit !== -1) {
      const activeCount = await ABTest.countDocuments({
        organizationId: orgId,
        status: { $in: ['draft', 'running'] },
      });
      if (activeCount >= limit) {
        return Errors.forbidden(
          `A/B test limit reached (${activeCount}/${limit} active). Upgrade to Enterprise for unlimited tests.`
        );
      }
    }

    const test = await createTest(auth.userId, orgId, {
      name,
      description,
      clientId,
      minSampleSize,
      variants,
    });

    return successResponse(test, 'A/B test created', 201);
  } catch (error) {
    console.error('Create AB test error:', error);
    return Errors.internal('Failed to create A/B test');
  }
}
