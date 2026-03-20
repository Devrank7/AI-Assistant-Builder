import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import TrainingExample from '@/models/TrainingExample';
import Client from '@/models/Client';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  await connectDB();

  const example = await TrainingExample.findById(id);
  if (!example) return Errors.notFound('Training example not found');

  // Verify ownership
  const client = await Client.findOne({ clientId: example.clientId, userId: auth.userId });
  if (!client) return Errors.forbidden('Not authorized for this widget');

  const body = await request.json();
  const allowedFields = ['status', 'idealResponse', 'userMessage', 'category', 'tags', 'reviewNote'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (example as Record<string, unknown>)[field] = body[field];
    }
  }

  if (body.status === 'approved' || body.status === 'rejected') {
    example.reviewedBy = auth.userId;
  }

  await example.save();
  return successResponse(example);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  await connectDB();

  const example = await TrainingExample.findById(id);
  if (!example) return Errors.notFound('Training example not found');

  // Verify ownership
  const client = await Client.findOne({ clientId: example.clientId, userId: auth.userId });
  if (!client) return Errors.forbidden('Not authorized for this widget');

  await TrainingExample.findByIdAndDelete(id);
  return successResponse(null, 'Training example deleted');
}
