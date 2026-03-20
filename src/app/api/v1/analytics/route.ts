import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import { getAnalytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope: read required');

    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId');
    const daysParam = searchParams.get('days');
    const days = daysParam ? Math.max(1, Math.min(365, parseInt(daysParam, 10))) : 30;

    if (isNaN(days)) {
      return Errors.badRequest('Invalid "days" parameter — must be a positive integer');
    }

    await connectDB();

    if (widgetId) {
      // Analytics for a single widget — verify it belongs to this org first
      const widget = await Client.findOne({
        clientId: widgetId,
        organizationId: auth.organizationId,
      })
        .select('clientId')
        .lean();

      if (!widget) return Errors.notFound('Widget not found');

      // getAnalytics accepts clientId (same as widgetId in this platform)
      const analytics = await getAnalytics(widgetId, days);
      return successResponse({ widgetId, days, analytics });
    }

    // No widgetId — aggregate across all widgets belonging to this org
    const widgets = await Client.find({ organizationId: auth.organizationId }).select('clientId').lean();

    if (widgets.length === 0) {
      return successResponse({ days, results: [], total: 0 });
    }

    // Fetch analytics for every widget in parallel
    const results = await Promise.all(
      widgets.map(async (w) => {
        try {
          const analytics = await getAnalytics(w.clientId, days);
          return { widgetId: w.clientId, analytics };
        } catch (err) {
          console.error(`Analytics fetch failed for widget ${w.clientId}:`, err);
          return { widgetId: w.clientId, analytics: null, error: 'Failed to fetch analytics' };
        }
      })
    );

    return successResponse({ days, results, total: results.length });
  } catch (error) {
    console.error('v1 GET /analytics error:', error);
    return Errors.internal('Failed to retrieve analytics');
  }
}
