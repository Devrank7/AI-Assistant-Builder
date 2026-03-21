import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Referral from '@/models/Referral';

export async function generateReferralCode(userId: string): Promise<string> {
  await connectDB();
  const user = await User.findOne({ _id: userId });
  if (!user) throw new Error('User not found');
  if (user.referralCode) return user.referralCode;

  const code = nanoid(8).toUpperCase();
  const updated = await User.findByIdAndUpdate(userId, { referralCode: code }, { new: true });
  return updated!.referralCode!;
}

export async function applyReferral(code: string, refereeId: string): Promise<boolean> {
  await connectDB();

  // Find the referral program by code
  const referralProgram = await Referral.findOne({ referralCode: code, isActive: true });
  if (!referralProgram) return false;
  if (referralProgram.referrerId === refereeId) return false;

  // Check if this user was already referred
  const alreadyReferred = referralProgram.referredUsers.some((u: { userId: string }) => u.userId === refereeId);
  if (alreadyReferred) return false;

  // Get referee info
  const referee = await User.findById(refereeId);
  if (!referee) return false;

  // Add referee to the referral program
  await Referral.findByIdAndUpdate(referralProgram._id, {
    $push: {
      referredUsers: {
        userId: refereeId,
        email: referee.email || '',
        signedUpAt: new Date(),
        rewardPaid: false,
        rewardAmount: 0,
      },
    },
    $inc: {
      'stats.totalSignups': 1,
    },
  });

  await User.findByIdAndUpdate(refereeId, { referredBy: referralProgram.referrerId });
  return true;
}

export async function getReferralStats(userId: string) {
  await connectDB();
  const program = await Referral.findOne({ referrerId: userId });
  if (!program) {
    return { totalReferrals: 0, rewardsEarned: 0, recent: [] };
  }

  return {
    totalReferrals: program.stats.totalSignups,
    rewardsEarned: program.stats.totalEarnings,
    recent: program.referredUsers.slice(-20).reverse(),
  };
}
