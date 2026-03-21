import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getSignals } from '@/lib/conversationIntelligence';
import Client from '@/models/Client';
import { requirePlanFeature } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

/**
 * GET /api/intelligence/signals — Individual signals with pagination and filters
 *
 * Query params: clientId, type, page, limit, days
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const planErr = requirePlanFeature(auth.user.plan as Plan, 'conversation_intelligence', 'Conversation Intelligence');
  if (planErr) return Errors.forbidden(planErr);

  await connectDB();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const type = searchParams.get('type') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));

  if (!clientId) return Errors.badRequest('clientId is required');

  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  try {
    const result = await getSignals(clientId, days, type, page, limit);
    return successResponse({
      signals: result.signals,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    console.error('[intelligence/signals] Error:', err);
    return Errors.internal('Failed to load signals');
  }
}
