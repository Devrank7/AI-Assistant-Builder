import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import WidgetIntegration from '@/models/WidgetIntegration';
import Integration from '@/models/Integration';
import Client from '@/models/Client';

// GET /api/integrations/widget-bindings?widgetId=<id>
// Returns all WidgetIntegration bindings for a given widgetId (ownership verified)
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get('widgetId');
  if (!widgetId) return Errors.badRequest('widgetId query param is required');

  await connectDB();

  // Verify widget ownership
  const widget = await Client.findOne({ clientId: widgetId, userId: auth.userId }).select('clientId');
  if (!widget) return Errors.notFound('Widget not found or access denied');

  const bindings = await WidgetIntegration.find({ widgetId });
  return successResponse(bindings);
}

// POST /api/integrations/widget-bindings
// Creates a new WidgetIntegration binding
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  let body: {
    widgetId?: string;
    integrationSlug?: string;
    enabledActions?: string[];
    triggerEvents?: string[];
    config?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  const { widgetId, integrationSlug, enabledActions = [], triggerEvents = [], config = {} } = body;

  if (!widgetId) return Errors.badRequest('widgetId is required');
  if (!integrationSlug) return Errors.badRequest('integrationSlug is required');

  await connectDB();

  // Verify widget ownership
  const widget = await Client.findOne({ clientId: widgetId, userId: auth.userId }).select('clientId organizationId');
  if (!widget) return Errors.notFound('Widget not found or access denied');

  const organizationId = widget.organizationId || auth.organizationId || auth.userId;

  // Verify there is an active Integration connection for this user + slug
  const connection = await Integration.findOne({
    userId: auth.userId,
    provider: integrationSlug,
    isActive: true,
    status: 'connected',
  }).select('_id');

  if (!connection) {
    return Errors.badRequest(`No active integration connection found for slug: ${integrationSlug}`);
  }

  try {
    const binding = await WidgetIntegration.create({
      userId: auth.userId,
      organizationId,
      widgetId,
      integrationSlug,
      enabledActions,
      triggerEvents,
      config,
    });
    return successResponse(binding, 'Widget binding created', 201);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return Errors.badRequest('A binding for this widget and integration already exists');
    }
    console.error('[widget-bindings POST]', err);
    return Errors.internal();
  }
}
