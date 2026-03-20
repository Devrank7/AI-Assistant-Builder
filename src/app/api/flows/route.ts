// src/app/api/flows/route.ts
import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import Flow from '@/models/Flow';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    // Get user's client IDs
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    if (allowedClientIds.length === 0) {
      return successResponse({ flows: [], total: 0 });
    }

    const query: Record<string, unknown> = {
      clientId: clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds },
    };
    if (status) query.status = status;

    const flows = await Flow.find(query).sort({ updatedAt: -1 }).lean();
    return successResponse({ flows, total: flows.length });
  } catch (error) {
    console.error('Get flows error:', error);
    return Errors.internal('Failed to fetch flows');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const body = await request.json();

    if (!body.name || !body.trigger?.type || !body.clientId) {
      return Errors.badRequest('name, trigger.type, and clientId are required');
    }

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: body.clientId, organizationId: auth.organizationId }
      : { clientId: body.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Client not found');

    const flow = await Flow.create({
      flowId: nanoid(12),
      clientId: body.clientId,
      userId: auth.userId,
      name: body.name,
      status: body.status || 'draft',
      trigger: {
        type: body.trigger.type,
        conditions: body.trigger.conditions || [],
      },
      steps: body.steps || [],
      templateId: body.templateId || null,
    });

    return successResponse(flow, 'Flow created');
  } catch (error) {
    console.error('Create flow error:', error);
    return Errors.internal('Failed to create flow');
  }
}
