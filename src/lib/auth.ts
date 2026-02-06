import { NextRequest } from 'next/server';
import connectDB from './mongodb';
import Client from '@/models/Client';
import { Errors } from './apiResponse';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from './rateLimit';

export type AuthResult =
  | { authenticated: true; role: 'admin' }
  | { authenticated: true; role: 'client'; clientId: string }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };

export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    const token = request.cookies.get('admin_token')?.value || request.nextUrl.searchParams.get('adminToken');
    if (!token) return { authenticated: false, response: Errors.unauthorized('Missing authorization') };
    if (token !== process.env.ADMIN_SECRET_TOKEN)
      return { authenticated: false, response: Errors.unauthorized('Invalid token') };
    return { authenticated: true, role: 'admin' };
  }
  const token = authHeader.slice(7);
  if (token !== process.env.ADMIN_SECRET_TOKEN)
    return { authenticated: false, response: Errors.unauthorized('Invalid token') };
  return { authenticated: true, role: 'admin' };
}

export async function verifyClient(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('client_token')?.value || request.nextUrl.searchParams.get('clientToken');
  if (!token) return { authenticated: false, response: Errors.unauthorized('Missing client token') };
  await connectDB();
  const client = await Client.findOne({ clientToken: token }).select('clientId');
  if (!client) return { authenticated: false, response: Errors.unauthorized('Invalid client token') };
  return { authenticated: true, role: 'client', clientId: client.clientId };
}

export async function verifyAdminOrClient(request: NextRequest): Promise<AuthResult> {
  const adminResult = await verifyAdmin(request);
  if (adminResult.authenticated) return adminResult;
  return verifyClient(request);
}

export function applyRateLimit(request: NextRequest, type: keyof typeof RATE_LIMITS = 'api') {
  const key = getRateLimitKey(request, type);
  const result = checkRateLimit(key, RATE_LIMITS[type]);
  if (!result.allowed) return Errors.tooManyRequests('Rate limit exceeded. Try again later.');
  return null;
}
