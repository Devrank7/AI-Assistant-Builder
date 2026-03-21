import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import AgentRoutingRule from '@/models/AgentRoutingRule';
import Client from '@/models/Client';

/**
 * PATCH /api/agent-routing/[id] — Update a routing rule
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const rule = await AgentRoutingRule.findById(id);
  if (!rule) return Errors.notFound('Rule not found');

  const client = await Client.findOne({ clientId: rule.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Rule not found');

  const allowedFields = [
    'name',
    'priority',
    'fromPersonaId',
    'toPersonaId',
    'conditions',
    'matchMode',
    'isActive',
    'handoffMessage',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (rule as unknown as Record<string, unknown>)[field] = body[field];
    }
  }

  await rule.save();

  return successResponse(rule, 'Rule updated');
}

/**
 * DELETE /api/agent-routing/[id] — Delete a routing rule
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { id } = await params;

  const rule = await AgentRoutingRule.findById(id);
  if (!rule) return Errors.notFound('Rule not found');

  const client = await Client.findOne({ clientId: rule.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Rule not found');

  await AgentRoutingRule.findByIdAndDelete(id);

  return successResponse(null, 'Rule deleted');
}
