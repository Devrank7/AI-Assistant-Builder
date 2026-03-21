import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import OnboardingProgress from '@/models/OnboardingProgress';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

// POST: Skip onboarding entirely
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    await OnboardingProgress.findOneAndUpdate(
      { userId: auth.userId },
      {
        $set: {
          isCompleted: true,
          completedAt: new Date(),
          skippedSteps: ['welcome', 'business', 'widget', 'customize', 'install'],
        },
        $setOnInsert: {
          userId: auth.userId,
          organizationId: auth.organizationId || undefined,
          currentStep: 0,
          completedSteps: [],
          businessInfo: { companyName: '', industry: '', website: '', teamSize: '', useCase: '' },
          preferences: { language: 'en', timezone: 'UTC', notifications: true },
        },
      },
      { upsert: true }
    );

    // Mark onboarding as completed on the User model as well
    await User.findByIdAndUpdate(auth.userId, { onboardingCompleted: true });

    return successResponse({ skipped: true });
  } catch (error) {
    console.error('Onboarding skip error:', error);
    return Errors.internal('Failed to skip onboarding');
  }
}
