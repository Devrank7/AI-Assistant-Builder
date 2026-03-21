import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import { getUserPurchases } from '@/lib/marketplaceService';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const purchases = await getUserPurchases(auth.userId);
  return successResponse(purchases);
}
