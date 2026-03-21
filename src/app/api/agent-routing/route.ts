import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import AgentRoutingRule from '@/models/AgentRoutingRule';
import Client from '@/models/Client';
import { requirePlanFeature } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

/**
 * GET /api/agent-routing — List routing rules for a client
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const planErr = requirePlanFeature(auth.user.plan as Plan, 'multi_agent', 'Multi-Agent Orchestration');
  if (planErr) return Errors.forbidden(planErr);

  await connectDB();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) return Errors.badRequest('clientId is required');

  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  const rules = await AgentRoutingRule.find({ clientId }).sort({ priority: -1 }).lean();

  return successResponse(rules);
}

/**
 * POST /api/agent-routing — Create a new routing rule
 */
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const planErrPost = requirePlanFeature(auth.user.plan as Plan, 'multi_agent', 'Multi-Agent Orchestration');
  if (planErrPost) return Errors.forbidden(planErrPost);

  await connectDB();
  const body = await request.json();

  if (!body.clientId) return Errors.badRequest('clientId is required');
  if (!body.name) return Errors.badRequest('name is required');
  if (!body.toPersonaId) return Errors.badRequest('toPersonaId is required');

  const client = await Client.findOne({ clientId: body.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  const rule = await AgentRoutingRule.create({
    clientId: body.clientId,
    name: body.name,
    priority: body.priority || 0,
    fromPersonaId: body.fromPersonaId || '*',
    toPersonaId: body.toPersonaId,
    conditions: body.conditions || [],
    matchMode: body.matchMode || 'any',
    isActive: body.isActive !== false,
    handoffMessage: body.handoffMessage || '',
  });

  return successResponse(rule, 'Routing rule created', 201);
}
