import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyUser(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    await connectDB();

    const user = await User.findById(authResult.userId);
    if (!user) {
      return Errors.notFound('User not found');
    }

    if (user.emailVerified) {
      return Errors.badRequest('Email is already verified');
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    await user.save();

    await sendVerificationEmail(user.email, token);

    return successResponse(undefined, 'Verification email sent');
  } catch (error) {
    console.error('Send verification error:', error);
    return Errors.internal('Failed to send verification email');
  }
}
