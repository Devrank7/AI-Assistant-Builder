import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import OnboardingProgress from '@/models/OnboardingProgress';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

// GET: Fetch current onboarding progress
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    let progress = await OnboardingProgress.findOne({ userId: auth.userId });

    if (!progress) {
      // Create a fresh record
      progress = await OnboardingProgress.create({
        userId: auth.userId,
        organizationId: auth.organizationId || undefined,
        currentStep: 0,
        completedSteps: [],
        skippedSteps: [],
        businessInfo: {
          companyName: '',
          industry: '',
          website: '',
          teamSize: '',
          useCase: '',
        },
        preferences: {
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          notifications: true,
        },
        isCompleted: false,
      });
    }

    return successResponse(progress.toObject());
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return Errors.internal('Failed to fetch onboarding progress');
  }
}

// PUT: Update onboarding progress (save step state, business info, preferences)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { currentStep, completedSteps, skippedSteps, businessInfo, preferences, firstWidgetId } = body;

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (typeof currentStep === 'number') updateData.currentStep = currentStep;
    if (Array.isArray(completedSteps)) updateData.completedSteps = completedSteps;
    if (Array.isArray(skippedSteps)) updateData.skippedSteps = skippedSteps;
    if (businessInfo && typeof businessInfo === 'object') {
      if (businessInfo.companyName !== undefined) updateData['businessInfo.companyName'] = businessInfo.companyName;
      if (businessInfo.industry !== undefined) updateData['businessInfo.industry'] = businessInfo.industry;
      if (businessInfo.website !== undefined) updateData['businessInfo.website'] = businessInfo.website;
      if (businessInfo.teamSize !== undefined) updateData['businessInfo.teamSize'] = businessInfo.teamSize;
      if (businessInfo.useCase !== undefined) updateData['businessInfo.useCase'] = businessInfo.useCase;
    }
    if (preferences && typeof preferences === 'object') {
      if (preferences.language !== undefined) updateData['preferences.language'] = preferences.language;
      if (preferences.timezone !== undefined) updateData['preferences.timezone'] = preferences.timezone;
      if (typeof preferences.notifications === 'boolean') {
        updateData['preferences.notifications'] = preferences.notifications;
      }
    }
    if (firstWidgetId) updateData.firstWidgetId = firstWidgetId;

    const progress = await OnboardingProgress.findOneAndUpdate(
      { userId: auth.userId },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return successResponse(progress.toObject());
  } catch (error) {
    console.error('Onboarding PUT error:', error);
    return Errors.internal('Failed to update onboarding progress');
  }
}

// POST: Complete onboarding
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json().catch(() => ({}));
    const { businessInfo, preferences, firstWidgetId } = body;

    await connectDB();

    const updateData: Record<string, unknown> = {
      isCompleted: true,
      completedAt: new Date(),
    };

    if (businessInfo) {
      if (businessInfo.companyName !== undefined) updateData['businessInfo.companyName'] = businessInfo.companyName;
      if (businessInfo.industry !== undefined) updateData['businessInfo.industry'] = businessInfo.industry;
      if (businessInfo.website !== undefined) updateData['businessInfo.website'] = businessInfo.website;
      if (businessInfo.teamSize !== undefined) updateData['businessInfo.teamSize'] = businessInfo.teamSize;
      if (businessInfo.useCase !== undefined) updateData['businessInfo.useCase'] = businessInfo.useCase;
    }
    if (preferences) {
      if (preferences.language !== undefined) updateData['preferences.language'] = preferences.language;
      if (preferences.timezone !== undefined) updateData['preferences.timezone'] = preferences.timezone;
      if (typeof preferences.notifications === 'boolean') {
        updateData['preferences.notifications'] = preferences.notifications;
      }
    }
    if (firstWidgetId) updateData.firstWidgetId = firstWidgetId;

    await OnboardingProgress.findOneAndUpdate(
      { userId: auth.userId },
      { $set: updateData },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Mark onboarding as completed on the User model
    await User.findByIdAndUpdate(auth.userId, { onboardingCompleted: true });

    return successResponse({ completed: true });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return Errors.internal('Failed to complete onboarding');
  }
}
