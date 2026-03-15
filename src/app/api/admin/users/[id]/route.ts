import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id)
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .lean();
  if (!user) return Errors.notFound('User not found');

  const clients = await Client.find({ userId: id }).select('clientId name domain subscriptionStatus createdAt').lean();

  const totalMessages = await ChatLog.aggregate([
    { $match: { clientId: { $in: clients.map((c) => c.clientId) } } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    { $count: 'total' },
  ]);

  return successResponse({
    user: { ...user, _id: String(user._id) },
    clients: clients.map((c) => ({ ...c, _id: String(c._id) })),
    stats: {
      totalMessages: totalMessages[0]?.total ?? 0,
      clientsCount: clients.length,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();
  await connectDB();

  const allowedFields = ['plan', 'subscriptionStatus', 'trialEndsAt', 'billingPeriod'];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  if (body.extendTrialDays) {
    const existingUser = await User.findById(id).select('trialEndsAt').lean();
    const currentEnd = existingUser?.trialEndsAt ? new Date(existingUser.trialEndsAt as unknown as string) : new Date();
    currentEnd.setDate(currentEnd.getDate() + parseInt(body.extendTrialDays));
    update.trialEndsAt = currentEnd;
  }

  if (Object.keys(update).length === 0) return Errors.badRequest('No valid fields to update');

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .lean();

  if (!user) return Errors.notFound('User not found');

  return successResponse({ user: { ...user, _id: String(user._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id);
  if (!user) return Errors.notFound('User not found');

  const clients = await Client.find({ userId: id });
  for (const client of clients) {
    await ChatLog.deleteMany({ clientId: client.clientId });
    await client.deleteOne();
  }

  await user.deleteOne();

  return successResponse(null, 'User deleted');
}
