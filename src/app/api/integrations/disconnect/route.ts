import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  const { connectionId } = await request.json();
  if (!connectionId) return Errors.badRequest('connectionId is required');

  await connectDB();
  const connection = await Integration.findOne({ _id: connectionId, userId: auth.userId });
  if (!connection) return Errors.notFound('Connection not found');

  connection.status = 'disconnected';
  connection.accessToken = undefined;
  connection.refreshToken = undefined;
  await connection.save();

  await WidgetIntegration.deleteMany({ userId: auth.userId, connectionId: connection._id });

  return successResponse(null, 'Disconnected');
}
