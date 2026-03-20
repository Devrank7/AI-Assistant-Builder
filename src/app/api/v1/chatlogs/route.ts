import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope: read required');

    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : DEFAULT_PAGE;
    const limit = limitParam ? Math.max(1, Math.min(MAX_LIMIT, parseInt(limitParam, 10))) : DEFAULT_LIMIT;

    if (isNaN(page) || isNaN(limit)) {
      return Errors.badRequest('Invalid "page" or "limit" parameter — must be positive integers');
    }

    await connectDB();

    let clientIds: string[];

    if (widgetId) {
      // Verify the requested widget belongs to this org
      const widget = await Client.findOne({
        clientId: widgetId,
        organizationId: auth.organizationId,
      })
        .select('clientId')
        .lean();

      if (!widget) return Errors.notFound('Widget not found');
      clientIds = [widgetId];
    } else {
      // Fetch logs across all widgets belonging to this org
      const widgets = await Client.find({ organizationId: auth.organizationId }).select('clientId').lean();
      clientIds = widgets.map((w) => w.clientId);
    }

    if (clientIds.length === 0) {
      return successResponse({ chatlogs: [], page, limit, total: 0, totalPages: 0 });
    }

    const query = { clientId: { $in: clientIds } };
    const skip = (page - 1) * limit;

    const [chatlogs, total] = await Promise.all([
      ChatLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ChatLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      chatlogs,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('v1 GET /chatlogs error:', error);
    return Errors.internal('Failed to retrieve chat logs');
  }
}
