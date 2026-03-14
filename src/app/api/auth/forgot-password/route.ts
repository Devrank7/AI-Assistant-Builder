import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyRateLimit } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const rateLimitError = applyRateLimit(request, 'auth');
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Errors.badRequest('Email is required');
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (err) {
        console.error('Failed to send password reset email:', err);
      }
    }

    // Always return success to not reveal if email exists
    return successResponse(undefined, 'If an account with that email exists, a password reset link has been sent.');
  } catch (error) {
    console.error('Forgot password error:', error);
    return Errors.internal('Failed to process password reset request');
  }
}
