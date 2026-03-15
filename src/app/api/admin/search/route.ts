import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return successResponse({ users: [], clients: [] });

  await connectDB();

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  const regex = new RegExp(escapeRegex(q), 'i');

  const [users, clients] = await Promise.all([
    User.find({ $or: [{ email: regex }, { name: regex }] })
      .select('email name plan subscriptionStatus')
      .limit(10)
      .lean(),
    Client.find({ $or: [{ username: regex }, { website: regex }, { clientId: regex }] })
      .select('clientId username website subscriptionStatus userId')
      .limit(10)
      .lean(),
  ]);

  const userIds = [...new Set(clients.map((c) => c.userId).filter((id): id is string => Boolean(id)))];
  const owners =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('email')
          .lean()
      : [];
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.email]));

  return successResponse({
    users: users.map((u) => ({
      _id: String(u._id),
      email: u.email,
      name: u.name,
      plan: u.plan,
      status: u.subscriptionStatus,
    })),
    clients: clients.map((c) => ({
      _id: String(c._id),
      name: c.username || c.clientId,
      domain: c.website || '',
      status: c.subscriptionStatus,
      ownerEmail: c.userId ? (ownerMap.get(String(c.userId)) ?? '') : '',
    })),
  });
}
