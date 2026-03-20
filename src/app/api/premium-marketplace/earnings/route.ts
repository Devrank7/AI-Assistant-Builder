import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import { getAuthorEarnings } from '@/lib/premiumMarketplace';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const earnings = await getAuthorEarnings(auth.userId);
  return successResponse(earnings);
}
