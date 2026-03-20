import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KnowledgeEvolution from '@/models/KnowledgeEvolution';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const skip = (page - 1) * limit;

  try {
    await connectDB();

    // Get evolutions for all clients the user has access to
    const evolutions = await KnowledgeEvolution.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const total = await KnowledgeEvolution.countDocuments();

    return successResponse({
      evolutions: evolutions.map((e) => ({
        id: e._id,
        clientId: e.clientId,
        crawlUrl: e.crawlUrl,
        status: e.status,
        pagesScanned: e.pagesScanned,
        addedChunks: e.addedChunks,
        removedChunks: e.removedChunks,
        modifiedChunks: e.modifiedChunks,
        autoApplied: e.autoApplied,
        error: e.error,
        diffsCount: e.diffs?.length || 0,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List evolutions error:', err);
    return Errors.internal('Failed to list knowledge evolutions');
  }
}
