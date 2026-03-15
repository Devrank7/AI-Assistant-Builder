import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const client = await Client.findOne({ $or: [{ _id: id }, { clientId: id }] }).lean();
  if (!client) return Errors.notFound('Client not found');

  let owner = null;
  if (client.userId) {
    owner = await User.findById(client.userId).select('email name plan subscriptionStatus').lean();
  }

  const totalSessions = await ChatLog.countDocuments({ clientId: client.clientId });

  return successResponse({
    client: { ...client, _id: String(client._id) },
    owner: owner ? { ...owner, _id: String(owner._id) } : null,
    stats: { totalSessions },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();
  await connectDB();

  const allowedFields = ['name', 'domain', 'subscriptionStatus', 'extraCreditsUsd', 'widgetPosition', 'primaryColor'];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) return Errors.badRequest('No valid fields to update');

  const client = await Client.findOneAndUpdate(
    { $or: [{ _id: id }, { clientId: id }] },
    { $set: update },
    { new: true }
  ).lean();

  if (!client) return Errors.notFound('Client not found');

  return successResponse({ client: { ...client, _id: String(client._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const client = await Client.findOne({ $or: [{ _id: id }, { clientId: id }] });
  if (!client) return Errors.notFound('Client not found');

  await ChatLog.deleteMany({ clientId: client.clientId });
  await client.deleteOne();

  return successResponse(null, 'Client deleted');
}
