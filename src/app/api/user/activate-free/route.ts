import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const user = await User.findById(auth.userId);
    if (!user) return Errors.notFound('User not found');

    // Only activate free plan if user has no plan
    if (user.plan !== 'none') {
      return successResponse({ message: 'Already on a plan', plan: user.plan });
    }

    user.plan = 'free';
    user.subscriptionStatus = 'active';
    await user.save();

    return successResponse({ message: 'Free plan activated', plan: 'free' });
  } catch (err) {
    return Errors.internal((err as Error).message);
  }
}
