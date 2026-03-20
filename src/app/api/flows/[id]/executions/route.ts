// src/app/api/flows/[id]/executions/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Flow from '@/models/Flow';
import FlowExecution from '@/models/FlowExecution';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const flow = await Flow.findOne({ flowId: id });
    if (!flow) return Errors.notFound('Flow not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: flow.clientId, organizationId: auth.organizationId }
      : { clientId: flow.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Flow not found');

    const total = await FlowExecution.countDocuments({ flowId: id });
    const executions = await FlowExecution.find({ flowId: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return successResponse({ executions, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get flow executions error:', error);
    return Errors.internal('Failed to fetch executions');
  }
}
