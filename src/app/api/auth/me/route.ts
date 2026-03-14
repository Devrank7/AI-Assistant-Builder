import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAccessToken } from '@/lib/jwt';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    if (!accessToken) {
      return Errors.unauthorized('Not authenticated');
    }

    let payload;
    try {
      payload = verifyAccessToken(accessToken);
    } catch {
      return Errors.unauthorized('Invalid or expired token');
    }

    await connectDB();

    const user = await User.findById(payload.userId).select('email name plan subscriptionStatus emailVerified');
    if (!user) {
      return Errors.unauthorized('User not found');
    }

    return successResponse({
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('Me error:', error);
    return Errors.internal('Failed to get user info');
  }
}
