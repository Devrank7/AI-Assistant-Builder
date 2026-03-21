import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { batchAnalyze } from '@/lib/conversationIntelligence';
import Client from '@/models/Client';
import { requirePlanFeature } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

/**
 * POST /api/intelligence/analyze — Trigger batch analysis for a client
 *
 * Query params: clientId, force (optional, re-analyze all)
 * Body: { clientId, force }
 */
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const planErr = requirePlanFeature(auth.user.plan as Plan, 'conversation_intelligence', 'Conversation Intelligence');
  if (planErr) return Errors.forbidden(planErr);

  await connectDB();

  let clientId: string | undefined;
  let force = false;

  try {
    const body = await request.json().catch(() => ({}));
    clientId = body.clientId;
    force = Boolean(body.force);
  } catch {
    // Fall back to query params
  }

  if (!clientId) {
    const { searchParams } = new URL(request.url);
    clientId = searchParams.get('clientId') || undefined;
    force = searchParams.get('force') === 'true';
  }

  if (!clientId) return Errors.badRequest('clientId is required');

  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  try {
    const result = await batchAnalyze(clientId, force);
    return successResponse({
      ...result,
      message: `Analysis complete: ${result.analyzed} analyzed, ${result.skipped} skipped, ${result.errors} errors`,
    });
  } catch (err) {
    console.error('[intelligence/analyze] Error:', err);
    return Errors.internal('Failed to run analysis');
  }
}
