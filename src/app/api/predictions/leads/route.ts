import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getHotLeads } from '@/lib/predictiveEngagement';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) return successResponse([]);

    const data = await getHotLeads(clientId);
    return successResponse(data);
  } catch (error) {
    console.error('Get hot leads error:', error);
    return Errors.internal('Failed to fetch hot leads data');
  }
}
