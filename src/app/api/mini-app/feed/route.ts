import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import BotAudit from '@/models/BotAudit';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const filter: Record<string, string> = {};
    if (type) filter.eventType = type;
    if (status) filter.status = status;

    const entries = await BotAudit.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    const mapped = entries.map((e) => ({
      id: e._id,
      timestamp: e.createdAt?.toISOString(),
      type: e.eventType,
      action: e.action,
      status: e.status,
      details: e.details || {},
    }));

    return successResponse({ entries: mapped });
  } catch (error) {
    console.error('[mini-app/feed] Error:', error);
    return Errors.internal('Failed to fetch feed');
  }
}
