import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import { getEvolutionHistory, evolveKnowledge } from '@/lib/knowledgeEvolution';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { clientId } = await params;

  try {
    const history = await getEvolutionHistory(clientId, 50);

    return successResponse({
      clientId,
      evolutions: history.map((e) => ({
        id: e._id,
        status: e.status,
        pagesScanned: e.pagesScanned,
        diffs: e.diffs,
        addedChunks: e.addedChunks,
        removedChunks: e.removedChunks,
        modifiedChunks: e.modifiedChunks,
        autoApplied: e.autoApplied,
        error: e.error,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
      })),
      total: history.length,
    });
  } catch (err) {
    console.error('Get evolution history error:', err);
    return Errors.internal('Failed to get evolution history');
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { clientId } = await params;

  try {
    await connectDB();
    const client = await Client.findOne({ clientId }).select('website');
    if (!client) {
      return Errors.notFound('Client not found');
    }
    if (!client.website) {
      return Errors.badRequest('Client has no website configured for crawling');
    }

    const body = await request.json().catch(() => ({}));
    const autoApply = body.autoApply !== false;

    // Start evolution (runs synchronously for now)
    const evolution = await evolveKnowledge(clientId, client.website, autoApply);

    return successResponse(
      {
        id: evolution._id,
        status: evolution.status,
        pagesScanned: evolution.pagesScanned,
        addedChunks: evolution.addedChunks,
        removedChunks: evolution.removedChunks,
        modifiedChunks: evolution.modifiedChunks,
        autoApplied: evolution.autoApplied,
        diffsCount: evolution.diffs.length,
        error: evolution.error,
      },
      'Knowledge evolution triggered'
    );
  } catch (err) {
    console.error('Trigger evolution error:', err);
    return Errors.internal('Failed to trigger knowledge evolution');
  }
}
