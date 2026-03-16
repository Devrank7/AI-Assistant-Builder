import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import connectDB from './mongodb';
import Client from '@/models/Client';
import User from '@/models/User';
import { Errors } from './apiResponse';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from './rateLimit';
import { verifyAccessToken } from './jwt';

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export type AuthResult =
  | { authenticated: true; role: 'admin' }
  | { authenticated: true; role: 'client'; clientId: string }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };

export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return { authenticated: false, response: Errors.unauthorized('Missing authorization') };
    if (!process.env.ADMIN_SECRET_TOKEN || !safeCompare(token, process.env.ADMIN_SECRET_TOKEN))
      return { authenticated: false, response: Errors.unauthorized('Invalid token') };
    return { authenticated: true, role: 'admin' };
  }
  const token = authHeader.slice(7);
  if (!process.env.ADMIN_SECRET_TOKEN || !safeCompare(token, process.env.ADMIN_SECRET_TOKEN))
    return { authenticated: false, response: Errors.unauthorized('Invalid token') };
  return { authenticated: true, role: 'admin' };
}

export async function verifyClient(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : request.cookies.get('client_token')?.value;
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

export type UserAuthResult =
  | {
      authenticated: true;
      userId: string;
      user: { email: string; plan: string; subscriptionStatus: string };
      organizationId: string | null;
      orgRole: string | null;
    }
  | { authenticated: false; response: ReturnType<typeof Errors.unauthorized> };

export async function verifyUser(request: NextRequest): Promise<UserAuthResult> {
  const accessToken = request.cookies.get('access_token')?.value;
  if (!accessToken) return { authenticated: false, response: Errors.unauthorized('Not authenticated') };
  try {
    const payload = verifyAccessToken(accessToken);
    await connectDB();
    const user = await User.findById(payload.userId).select('email plan subscriptionStatus organizationId');
    if (!user) return { authenticated: false, response: Errors.unauthorized('User not found') };

    // Fetch org role if user belongs to an org
    let orgRole: string | null = null;
    if (user.organizationId) {
      const OrgMember = (await import('@/models/OrgMember')).default;
      const membership = await OrgMember.findOne({
        organizationId: user.organizationId,
        userId: payload.userId,
      }).select('role');
      orgRole = membership?.role || null;
    }

    return {
      authenticated: true,
      userId: payload.userId,
      user: { email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus },
      organizationId: user.organizationId || null,
      orgRole,
    };
  } catch {
    return { authenticated: false, response: Errors.unauthorized('Invalid or expired token') };
  }
}

export function applyRateLimit(request: NextRequest, type: keyof typeof RATE_LIMITS = 'api') {
  const key = getRateLimitKey(request, type);
  const result = checkRateLimit(key, RATE_LIMITS[type]);
  if (!result.allowed) return Errors.tooManyRequests('Rate limit exceeded. Try again later.');
  return null;
}
