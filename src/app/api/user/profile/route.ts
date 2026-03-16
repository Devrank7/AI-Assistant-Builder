import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return Errors.badRequest('Name is required');
    }

    if (name.trim().length > 100) {
      return Errors.badRequest('Name is too long');
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(auth.userId, { name: name.trim() }, { new: true }).select(
      'email name plan subscriptionStatus emailVerified'
    );

    if (!user) {
      return Errors.notFound('User not found');
    }

    return successResponse({
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return Errors.internal('Failed to update profile');
  }
}
