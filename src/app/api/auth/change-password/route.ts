import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { comparePassword, hashPassword, validatePassword } from '@/lib/passwords';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Errors.badRequest('Current password and new password are required');
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return Errors.badRequest(passwordError);
    }

    await connectDB();

    const user = await User.findById(auth.userId).select('passwordHash');
    if (!user) {
      return Errors.notFound('User not found');
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash as string);
    if (!isValid) {
      return Errors.badRequest('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return successResponse(undefined, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    return Errors.internal('Failed to change password');
  }
}
