import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateReferralCode, getReferralStats } from '@/lib/referral';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const stats = await getReferralStats(auth.userId);
    const code = await generateReferralCode(auth.userId);
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com'}/register?ref=${code}`;

    return successResponse({ code, referralLink, ...stats });
  } catch (error) {
    console.error('Referral stats error:', error);
    return Errors.internal('Failed to fetch referral data');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const code = await generateReferralCode(auth.userId);
    const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com'}/register?ref=${code}`;

    return successResponse({ code, referralLink }, 'Referral code generated');
  } catch (error) {
    console.error('Generate referral error:', error);
    return Errors.internal('Failed to generate referral code');
  }
}
