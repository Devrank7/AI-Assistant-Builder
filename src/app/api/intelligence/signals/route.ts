import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import ConversationInsight from '@/models/ConversationInsight';
import Client from '@/models/Client';

/**
 * GET /api/intelligence/signals — Individual signals with pagination and filters
 *
 * Query params: clientId, type, page, limit, days
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const type = searchParams.get('type');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const days = parseInt(searchParams.get('days') || '30');

  if (!clientId) return Errors.badRequest('clientId is required');

  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const filter: Record<string, unknown> = {
    clientId,
    createdAt: { $gte: since },
  };

  if (type) filter.type = type;

  const [signals, total] = await Promise.all([
    ConversationInsight.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ConversationInsight.countDocuments(filter),
  ]);

  return successResponse({
    signals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
