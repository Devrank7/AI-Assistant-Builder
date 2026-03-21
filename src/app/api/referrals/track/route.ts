import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { successResponse, Errors } from '@/lib/apiResponse';
import ReferralProgram from '@/models/Referral';

/**
 * POST /api/referrals/track
 * Public endpoint — increments click count for a referral code.
 * Called by the landing page when a visitor arrives via a ref= param.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { referralCode } = body;

    if (!referralCode || typeof referralCode !== 'string') {
      return Errors.badRequest('referralCode is required');
    }

    const code = referralCode.trim().toUpperCase();

    await connectDB();

    const program = await ReferralProgram.findOne({
      referralCode: { $regex: new RegExp(`^${escapeRegex(code)}$`, 'i') },
      isActive: true,
    });

    if (!program) {
      // Silently succeed — don't leak whether a code exists
      return successResponse({ tracked: false });
    }

    await ReferralProgram.findByIdAndUpdate(program._id, {
      $inc: { 'stats.totalClicks': 1 },
    });

    return successResponse({ tracked: true });
  } catch (error) {
    console.error('[POST /api/referrals/track]', error);
    return Errors.internal('Failed to track referral');
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
