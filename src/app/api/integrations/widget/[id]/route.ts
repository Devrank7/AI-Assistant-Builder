import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import WidgetIntegration from '@/models/WidgetIntegration';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  const { id: widgetId } = await params;

  await connectDB();
  const integrations = await WidgetIntegration.find({
    widgetId,
    userId: auth.userId,
    enabled: true,
  }).lean();

  return successResponse(integrations);
}
