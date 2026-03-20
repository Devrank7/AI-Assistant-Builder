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
  const referrer = await User.findOne({ referralCode: code });
  if (!referrer) return false;
  if (referrer._id.toString() === refereeId) return false;

  await Referral.create({
    referrerId: referrer._id.toString(),
    refereeId,
    code,
    rewardType: 'starter_month',
  });

  await User.findByIdAndUpdate(refereeId, { referredBy: referrer._id.toString() });
  return true;
}

export async function getReferralStats(userId: string) {
  await connectDB();
  const totalReferrals = await Referral.countDocuments({ referrerId: userId });
  const recent = await Referral.find({ referrerId: userId }).sort({ createdAt: -1 }).limit(20);
  const rewardsEarned = await Referral.countDocuments({ referrerId: userId, rewardApplied: true });

  return { totalReferrals, rewardsEarned, recent };
}
