import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyReferral } from '@/lib/referral';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { code } = await request.json();
    if (!code) return Errors.badRequest('Referral code required');

    const applied = await applyReferral(code, auth.userId);
    if (!applied) return Errors.badRequest('Invalid or expired referral code');

    return successResponse({ applied: true }, 'Referral applied successfully');
  } catch (error) {
    console.error('Apply referral error:', error);
    return Errors.internal('Failed to apply referral');
  }
}
