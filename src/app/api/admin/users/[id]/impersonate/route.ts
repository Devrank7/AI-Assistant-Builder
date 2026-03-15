import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select('email name').lean();
  if (!user) return Errors.notFound('User not found');

  const secret = process.env.JWT_SECRET;
  if (!secret) return Errors.internal('JWT secret not configured');

  const token = jwt.sign({ userId: String(user._id), email: user.email, impersonated: true }, secret, {
    expiresIn: '1h',
  });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return successResponse({ token, expiresAt, email: user.email });
}
