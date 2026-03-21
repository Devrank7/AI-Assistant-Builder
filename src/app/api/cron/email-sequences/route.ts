import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { processSequenceForUser, type SequenceUser } from '@/lib/emailSequences';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Errors.unauthorized('Invalid cron secret');
    }

    await connectDB();

    // Find users who signed up in the last 31 days and haven't completed all emails
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const users = await User.find({
      createdAt: { $gte: thirtyOneDaysAgo },
      emailVerified: true,
    }).select('email name createdAt onboardingCompleted plan emailSequencesSent');

    let totalSent = 0;
    for (const user of users) {
      const sentIds = await processSequenceForUser(user as unknown as SequenceUser);
      if (sentIds.length > 0) {
        await User.findByIdAndUpdate(user._id, {
          $push: { emailSequencesSent: { $each: sentIds } },
        });
        totalSent += sentIds.length;
      }
    }

    return successResponse({ processed: users.length, emailsSent: totalSent });
  } catch (error) {
    console.error('Email sequences cron error:', error);
    return Errors.internal('Failed to process email sequences');
  }
}
