import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ApiKey from '@/models/ApiKey';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) return Errors.notFound('API key not found');

    const orgId = auth.organizationId || auth.userId;
    if (apiKey.organizationId !== orgId) return Errors.forbidden();

    const body = await request.json();

    if (body.name !== undefined) apiKey.name = body.name.trim();
    if (body.scopes !== undefined && Array.isArray(body.scopes)) apiKey.scopes = body.scopes;
    if (body.ipWhitelist !== undefined && Array.isArray(body.ipWhitelist)) apiKey.ipWhitelist = body.ipWhitelist;
    if (body.status === 'revoked') apiKey.status = 'revoked';

    await apiKey.save();
    return successResponse(apiKey);
  } catch (error) {
    console.error('Update API key error:', error);
    return Errors.internal('Failed to update API key');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const apiKey = await ApiKey.findById(id);
    if (!apiKey) return Errors.notFound('API key not found');

    const orgId = auth.organizationId || auth.userId;
    if (apiKey.organizationId !== orgId) return Errors.forbidden();

    apiKey.status = 'revoked';
    await apiKey.save();
    return successResponse(null, 'API key revoked');
  } catch (error) {
    console.error('Delete API key error:', error);
    return Errors.internal('Failed to revoke API key');
  }
}
