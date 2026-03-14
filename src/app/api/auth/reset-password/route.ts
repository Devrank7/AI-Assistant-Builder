import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, validatePassword } from '@/lib/passwords';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return Errors.badRequest('Token and password are required');
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return Errors.badRequest(passwordError);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await connectDB();

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return Errors.badRequest('Invalid or expired reset token');
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshTokens = [];
    await user.save();

    return successResponse(undefined, 'Password has been reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return Errors.internal('Failed to reset password');
  }
}
