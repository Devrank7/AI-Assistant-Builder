import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import WidgetIntegration from '@/models/WidgetIntegration';

// PATCH /api/integrations/widget-bindings/[id]
// Updates enabledActions, triggerEvents, enabled, config for a binding
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  let body: {
    enabledActions?: string[];
    triggerEvents?: string[];
    enabled?: boolean;
    config?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  await connectDB();

  const binding = await WidgetIntegration.findById(id);
  if (!binding) return Errors.notFound('Widget binding not found');

  // Check ownership via organizationId or userId
  const orgId = auth.organizationId || auth.userId;
  if (binding.organizationId !== orgId && binding.userId !== auth.userId) {
    return Errors.forbidden('Access denied');
  }

  const updates: Partial<{
    enabledActions: string[];
    triggerEvents: string[];
    enabled: boolean;
    config: Record<string, unknown>;
  }> = {};

  if (body.enabledActions !== undefined) updates.enabledActions = body.enabledActions;
  if (body.triggerEvents !== undefined) updates.triggerEvents = body.triggerEvents;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.config !== undefined) updates.config = body.config;

  const updated = await WidgetIntegration.findByIdAndUpdate(id, { $set: updates }, { new: true });
  return successResponse(updated, 'Widget binding updated');
}

// DELETE /api/integrations/widget-bindings/[id]
// Removes a widget binding
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  await connectDB();

  const binding = await WidgetIntegration.findById(id);
  if (!binding) return Errors.notFound('Widget binding not found');

  // Check ownership via organizationId or userId
  const orgId = auth.organizationId || auth.userId;
  if (binding.organizationId !== orgId && binding.userId !== auth.userId) {
    return Errors.forbidden('Access denied');
  }

  await WidgetIntegration.findByIdAndDelete(id);
  return successResponse(null, 'Widget binding deleted');
}
