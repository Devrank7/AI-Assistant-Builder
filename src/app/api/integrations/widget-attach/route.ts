import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  const { widgetId, connectionId, actions, config } = await request.json();
  if (!widgetId || !connectionId) {
    return Errors.badRequest('widgetId and connectionId are required');
  }

  await connectDB();

  // Validate ownership of the connection
  const connection = await Integration.findOne({ _id: connectionId, userId: auth.userId, status: 'connected' });
  if (!connection) return Errors.notFound('Connection not found or not active');

  // Upsert — update if already exists for this widget+slug combination
  const widgetIntegration = await WidgetIntegration.findOneAndUpdate(
    { userId: auth.userId, widgetId, integrationSlug: connection.provider },
    {
      userId: auth.userId,
      widgetId,
      connectionId: connection._id,
      integrationSlug: connection.provider,
      enabledActions: actions || [],
      enabled: true,
      config: config || {},
    },
    { upsert: true, new: true }
  );

  return successResponse({ id: String(widgetIntegration._id) }, 'Widget integration attached');
}
