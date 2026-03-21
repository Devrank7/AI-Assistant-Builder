import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import ReferralProgram from '@/models/Referral';
import User from '@/models/User';
import { nanoid } from 'nanoid';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://winbixai.com';

function generateReferralId(): string {
  return `REF-${nanoid(8)}`;
}

function generateReferralCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  const suffix = nanoid(4);
  return `WINBIX-${slug}${suffix}`;
}

/** GET /api/referrals — fetch or auto-create the user's referral program */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    let program = await ReferralProgram.findOne({ referrerId: auth.userId });

    if (!program) {
      // Auto-create on first access
      const user = await User.findById(auth.userId).select('name email referralCode');
      if (!user) return Errors.notFound('User not found');

      const referralCode = user.referralCode || generateReferralCode(user.name || user.email);
      const referralId = generateReferralId();
      const referralLink = `${BASE_URL}/?ref=${referralCode}`;

      // Save referral code to user if not already set
      if (!user.referralCode) {
        user.referralCode = referralCode;
        await user.save();
      }

      program = await ReferralProgram.create({
        referralId,
        referrerId: auth.userId,
        referrerOrgId: auth.organizationId || undefined,
        referralCode,
        referralLink,
        rewardType: 'percentage',
        rewardValue: 20,
        isActive: true,
      });
    }

    return successResponse({
      referralId: program.referralId,
      referralCode: program.referralCode,
      referralLink: program.referralLink,
      stats: program.stats,
      rewardType: program.rewardType,
      rewardValue: program.rewardValue,
      isActive: program.isActive,
      referredUsers: program.referredUsers.map((u) => ({
        email: maskEmail(u.email),
        signedUpAt: u.signedUpAt,
        convertedAt: u.convertedAt,
        plan: u.plan,
        rewardPaid: u.rewardPaid,
        rewardAmount: u.rewardAmount,
        status: u.rewardPaid ? 'paid' : u.convertedAt ? 'converted' : 'signed_up',
      })),
      payoutHistory: program.payoutHistory,
      notifyOnSignup: program.notifyOnSignup,
      notifyOnConversion: program.notifyOnConversion,
    });
  } catch (error) {
    console.error('[GET /api/referrals]', error);
    return Errors.internal('Failed to load referral data');
  }
}

/** PUT /api/referrals — update referral preferences (custom code, notification prefs) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { customCode, notifyOnSignup, notifyOnConversion } = body;

    await connectDB();

    const program = await ReferralProgram.findOne({ referrerId: auth.userId });
    if (!program) return Errors.notFound('Referral program not found');

    if (customCode !== undefined) {
      const raw = String(customCode)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '');

      if (raw.length < 4 || raw.length > 24) {
        return Errors.badRequest('Custom code must be between 4 and 24 characters');
      }

      // Check availability — exclude current user's program
      const existing = await ReferralProgram.findOne({
        referralCode: { $regex: new RegExp(`^WINBIX-${raw}$`, 'i') },
        referrerId: { $ne: auth.userId },
      });
      if (existing) {
        return Errors.badRequest('That referral code is already taken');
      }

      const newCode = `WINBIX-${raw}`;
      program.referralCode = newCode;
      program.referralLink = `${BASE_URL}/?ref=${newCode}`;

      // Sync to User model
      await User.findByIdAndUpdate(auth.userId, { referralCode: newCode });
    }

    if (typeof notifyOnSignup === 'boolean') program.notifyOnSignup = notifyOnSignup;
    if (typeof notifyOnConversion === 'boolean') program.notifyOnConversion = notifyOnConversion;

    await program.save();

    return successResponse({
      referralCode: program.referralCode,
      referralLink: program.referralLink,
      notifyOnSignup: program.notifyOnSignup,
      notifyOnConversion: program.notifyOnConversion,
    });
  } catch (error) {
    console.error('[PUT /api/referrals]', error);
    return Errors.internal('Failed to update referral settings');
  }
}

/** POST /api/referrals — request a payout */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const program = await ReferralProgram.findOne({ referrerId: auth.userId });
    if (!program) return Errors.notFound('Referral program not found');

    const MIN_PAYOUT = 50;
    if (program.stats.pendingEarnings < MIN_PAYOUT) {
      return Errors.badRequest(
        `Minimum payout is $${MIN_PAYOUT}. You have $${program.stats.pendingEarnings.toFixed(2)} pending.`
      );
    }

    // Check no existing pending payout request
    const hasPending = program.payoutHistory.some((p) => p.status === 'pending');
    if (hasPending) {
      return Errors.badRequest('You already have a pending payout request');
    }

    const amount = program.stats.pendingEarnings;
    program.payoutHistory.push({
      amount,
      requestedAt: new Date(),
      status: 'pending',
    });

    await program.save();

    return successResponse({ amount, message: 'Payout request submitted' });
  } catch (error) {
    console.error('[POST /api/referrals]', error);
    return Errors.internal('Failed to request payout');
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 3 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
