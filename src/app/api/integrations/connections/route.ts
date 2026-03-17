import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  await connectDB();
  const connections = await Integration.find({ userId: auth.userId, status: { $ne: 'disconnected' } })
    .select('provider status isActive createdAt lastHealthCheck lastError aiDiagnostic metadata')
    .lean();

  return successResponse(connections);
}
