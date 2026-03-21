import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KnowledgeEvolutionTracker from '@/models/KnowledgeEvolutionTracker';
import Client from '@/models/Client';
import { setupEvolution } from '@/lib/knowledgeEvolutionService';

// GET /api/knowledge-evolution — list evolution trackers for user's widgets
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  try {
    await connectDB();

    const filter: Record<string, unknown> = { userId: auth.userId };
    if (auth.organizationId) {
      filter.$or = [{ userId: auth.userId }, { organizationId: auth.organizationId }];
      delete filter.userId;
    }
    if (clientId) filter.clientId = clientId;

    const trackers = await KnowledgeEvolutionTracker.find(filter).sort({ updatedAt: -1 }).lean();

    return successResponse({
      trackers: trackers.map((t) => ({
        id: t._id,
        evolutionId: t.evolutionId,
        clientId: t.clientId,
        sourceUrl: t.sourceUrl,
        isActive: t.isActive,
        schedule: t.schedule,
        stats: t.stats,
        lastCrawlStatus: t.crawlHistory.length > 0 ? t.crawlHistory[t.crawlHistory.length - 1].status : null,
        pendingChanges: t.changes.filter((c) => !c.applied).length,
        totalChanges: t.changes.length,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total: trackers.length,
    });
  } catch (err) {
    console.error('GET /api/knowledge-evolution error:', err);
    return Errors.internal('Failed to list evolution trackers');
  }
}

// POST /api/knowledge-evolution — add a new URL to track
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { clientId, sourceUrl, intervalDays } = body;

    if (!clientId) return Errors.badRequest('clientId is required');
    if (!sourceUrl) return Errors.badRequest('sourceUrl is required');

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return Errors.badRequest('Invalid URL format');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return Errors.badRequest('URL must use http or https');
    }

    await connectDB();

    // Verify client ownership
    const client = await Client.findOne({ clientId }).select('userId organizationId website');
    if (!client) return Errors.notFound('Client not found');

    const tracker = await setupEvolution(clientId, sourceUrl, {
      organizationId: auth.organizationId || undefined,
      userId: auth.userId,
      intervalDays: intervalDays ? Number(intervalDays) : 7,
    });

    return successResponse(
      {
        id: tracker._id,
        evolutionId: tracker.evolutionId,
        clientId: tracker.clientId,
        sourceUrl: tracker.sourceUrl,
        schedule: tracker.schedule,
        stats: tracker.stats,
        isActive: tracker.isActive,
        createdAt: tracker.createdAt,
      },
      'URL tracking added',
      201
    );
  } catch (err) {
    console.error('POST /api/knowledge-evolution error:', err);
    return Errors.internal('Failed to add URL tracking');
  }
}
