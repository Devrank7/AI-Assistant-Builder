import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { niche } = body;

    await connectDB();

    await User.findByIdAndUpdate(auth.userId, { onboardingCompleted: true, niche: niche || null }, { new: true });

    return successResponse({ onboardingCompleted: true });
  } catch (error) {
    console.error('Onboarding update error:', error);
    return Errors.internal('Failed to update onboarding status');
  }
}
