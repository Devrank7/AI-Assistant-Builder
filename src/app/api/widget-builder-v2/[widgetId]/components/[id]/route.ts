import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { updateComponent } from '@/lib/widgetBuilderV2';
import connectDB from '@/lib/mongodb';
import WidgetComponent from '@/models/WidgetComponent';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ widgetId: string; id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const updated = await updateComponent(id, body);
  if (!updated) return Errors.notFound('Component not found');

  return successResponse(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ widgetId: string; id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();
  const deleted = await WidgetComponent.findByIdAndDelete(id);
  if (!deleted) return Errors.notFound('Component not found');

  return successResponse(null, 'Component deleted');
}
