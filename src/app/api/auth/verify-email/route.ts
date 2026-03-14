import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return Errors.badRequest('Verification token is required');
    }

    await connectDB();

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return Errors.badRequest('Invalid verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    return successResponse(undefined, 'Email verified successfully');
  } catch (error) {
    console.error('Verify email error:', error);
    return Errors.internal('Failed to verify email');
  }
}
