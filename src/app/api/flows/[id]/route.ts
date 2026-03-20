// src/app/api/flows/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Flow from '@/models/Flow';
import FlowExecution from '@/models/FlowExecution';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const flow = await Flow.findOne({ flowId: id });
    if (!flow) return Errors.notFound('Flow not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: flow.clientId, organizationId: auth.organizationId }
      : { clientId: flow.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Flow not found');

    if (body.name !== undefined) flow.name = body.name;
    if (body.status !== undefined) flow.status = body.status;
    if (body.trigger !== undefined) flow.trigger = body.trigger;
    if (body.steps !== undefined) flow.steps = body.steps;
    await flow.save();

    return successResponse(flow, 'Flow updated');
  } catch (error) {
    console.error('Update flow error:', error);
    return Errors.internal('Failed to update flow');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const flow = await Flow.findOne({ flowId: id });
    if (!flow) return Errors.notFound('Flow not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: flow.clientId, organizationId: auth.organizationId }
      : { clientId: flow.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Flow not found');

    await Flow.deleteOne({ flowId: id });
    await FlowExecution.deleteMany({ flowId: id });

    return successResponse(null, 'Flow deleted');
  } catch (error) {
    console.error('Delete flow error:', error);
    return Errors.internal('Failed to delete flow');
  }
}
