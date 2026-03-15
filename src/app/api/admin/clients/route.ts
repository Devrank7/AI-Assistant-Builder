import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import Client from '@/models/Client';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') ?? '1');
  const limit = parseInt(params.get('limit') ?? '20');
  const search = params.get('search')?.trim();
  const clientType = params.get('clientType');
  const status = params.get('status');

  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ name: regex }, { domain: regex }, { clientId: regex }];
  }
  if (clientType) filter.clientType = clientType;
  if (status) filter.subscriptionStatus = status;

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Client.countDocuments(filter),
  ]);

  const userIds = [...new Set(clients.map((c) => c.userId).filter(Boolean))];
  const owners =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('email')
          .lean()
      : [];
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.email]));

  return successResponse({
    clients: clients.map((c) => ({
      ...c,
      _id: String(c._id),
      ownerEmail: c.userId ? (ownerMap.get(String(c.userId)) ?? '') : '',
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
