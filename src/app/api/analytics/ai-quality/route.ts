// src/app/api/analytics/ai-quality/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAIQualityMetrics } from '@/lib/analytics/aiQuality';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const clientId = request.nextUrl.searchParams.get('clientId');

    await connectDB();

    if (clientId) {
      // Single widget
      const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
      const client = await Client.findOne({ ...query, clientId }).select('clientId');
      if (!client) return Errors.notFound('Widget not found');

      const metrics = await getAIQualityMetrics(clientId, days);
      return successResponse(metrics);
    }

    // All widgets aggregated
    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const clients = await Client.find(query).select('clientId username');

    const results = await Promise.all(
      clients.map(async (c) => ({
        clientId: c.clientId,
        name: c.username,
        metrics: await getAIQualityMetrics(c.clientId, days),
      }))
    );

    // Aggregate
    const avgResolution =
      results.length > 0 ? Math.round(results.reduce((s, r) => s + r.metrics.resolutionRate, 0) / results.length) : 100;

    const allGaps = results.flatMap((r) => r.metrics.knowledgeGaps);

    return successResponse({ avgResolutionRate: avgResolution, widgets: results, topGaps: allGaps.slice(0, 10) });
  } catch (error) {
    console.error('AI quality metrics error:', error);
    return Errors.internal('Failed to fetch AI quality metrics');
  }
}
