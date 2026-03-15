import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') ?? '1');
  const limit = Math.min(parseInt(params.get('limit') ?? '20'), 100);
  const search = params.get('search')?.trim();
  const plan = params.get('plan');
  const status = params.get('status');
  const sortBy = params.get('sortBy') ?? 'createdAt';
  const sortDir = params.get('sortDir') === 'asc' ? 1 : -1;

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ email: regex }, { name: regex }];
  }
  if (plan) filter.plan = plan;
  if (status) filter.subscriptionStatus = status;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return successResponse({
    users: users.map((u) => ({ ...u, _id: String(u._id) })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
