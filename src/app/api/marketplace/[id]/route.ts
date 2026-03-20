import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser, verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import MarketplaceTemplate from '@/models/MarketplaceTemplate';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const template = await MarketplaceTemplate.findById(id);
  if (!template) return Errors.notFound('Template not found');

  // Only published templates are publicly visible
  if (template.status !== 'published') {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return Errors.notFound('Template not found');
    // Only author or admin can see non-published
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.authenticated && template.authorId !== auth.userId) {
      return Errors.notFound('Template not found');
    }
  }

  return successResponse(template);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const template = await MarketplaceTemplate.findById(id);
  if (!template) return Errors.notFound('Template not found');

  // Only author or admin can update
  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.authenticated && template.authorId !== auth.userId) {
    return Errors.forbidden('Not authorized to update this template');
  }

  const body = await request.json();
  const allowedFields = ['name', 'description', 'shortDescription', 'tags', 'screenshots', 'status'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Only admin can change status
  if (updates.status && !adminCheck.authenticated) {
    delete updates.status;
  }

  if (updates.status === 'published' && !template.publishedAt) {
    updates.publishedAt = new Date();
  }

  const updated = await MarketplaceTemplate.findByIdAndUpdate(id, updates, { new: true });
  return successResponse(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const template = await MarketplaceTemplate.findById(id);
  if (!template) return Errors.notFound('Template not found');

  const adminCheck = await verifyAdmin(request);
  if (!adminCheck.authenticated && template.authorId !== auth.userId) {
    return Errors.forbidden('Not authorized to delete this template');
  }

  await MarketplaceTemplate.findByIdAndUpdate(id, { status: 'rejected' });
  return successResponse(null, 'Template removed');
}
