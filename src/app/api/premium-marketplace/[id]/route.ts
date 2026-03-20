import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { approveTemplate } from '@/lib/premiumMarketplace';
import connectDB from '@/lib/mongodb';
import PremiumTemplate from '@/models/PremiumTemplate';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();
  const template = await PremiumTemplate.findById(id).lean();
  if (!template) return Errors.notFound('Template not found');

  return successResponse(template);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();

  await connectDB();
  const template = await PremiumTemplate.findById(id);
  if (!template) return Errors.notFound('Template not found');

  // Only author or admin can update
  if (template.authorId !== auth.userId && auth.orgRole !== 'owner') {
    return Errors.forbidden('Not authorized to update this template');
  }

  // Handle approve action
  if (body.action === 'approve') {
    if (auth.orgRole !== 'owner') return Errors.forbidden('Only admins can approve templates');
    const approved = await approveTemplate(id);
    return successResponse(approved, 'Template approved');
  }

  if (body.action === 'reject') {
    if (auth.orgRole !== 'owner') return Errors.forbidden('Only admins can reject templates');
    const rejected = await PremiumTemplate.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
    return successResponse(rejected, 'Template rejected');
  }

  // Regular update by author
  const allowedFields = [
    'title',
    'description',
    'longDescription',
    'tags',
    'price',
    'previewImages',
    'demoUrl',
    'themeConfig',
  ];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const updated = await PremiumTemplate.findByIdAndUpdate(id, update, { new: true });
  return successResponse(updated);
}
