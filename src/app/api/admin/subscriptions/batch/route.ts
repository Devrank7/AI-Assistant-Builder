import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { action, userIds, value } = await request.json();

  if (!action || !Array.isArray(userIds) || userIds.length === 0) {
    return Errors.badRequest('Missing action or userIds');
  }

  await connectDB();

  let result;

  switch (action) {
    case 'extend_trial': {
      const days = parseInt(value) || 7;
      result = await User.updateMany({ _id: { $in: userIds } }, [
        {
          $set: {
            trialEndsAt: { $dateAdd: { startDate: { $ifNull: ['$trialEndsAt', '$$NOW'] }, unit: 'day', amount: days } },
          },
        },
      ]);
      break;
    }
    case 'change_plan': {
      if (!['none', 'basic', 'pro'].includes(value)) return Errors.badRequest('Invalid plan');
      result = await User.updateMany({ _id: { $in: userIds } }, { $set: { plan: value } });
      break;
    }
    default:
      return Errors.badRequest(`Unknown action: ${action}`);
  }

  return successResponse({ modifiedCount: result.modifiedCount });
}
