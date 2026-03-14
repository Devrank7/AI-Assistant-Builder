import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { encrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  await connectDB();
  const integration = await Integration.findById(id);

  if (!integration) return Errors.notFound('Integration not found');
  if (integration.userId !== auth.userId) return Errors.forbidden('Not your integration');

  await Integration.findByIdAndDelete(id);
  return successResponse(undefined, 'Integration disconnected');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  await connectDB();
  const integration = await Integration.findById(id);

  if (!integration) return Errors.notFound('Integration not found');
  if (integration.userId !== auth.userId) return Errors.forbidden('Not your integration');

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.accessToken) updates.accessToken = encrypt(body.accessToken);
  if (body.refreshToken) updates.refreshToken = encrypt(body.refreshToken);
  if (body.tokenExpiry) updates.tokenExpiry = new Date(body.tokenExpiry);
  if (body.metadata) updates.metadata = body.metadata;
  if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;

  const updated = await Integration.findByIdAndUpdate(id, updates, { new: true }).select(
    'provider isActive createdAt metadata'
  );

  return successResponse(updated, 'Integration updated');
}
