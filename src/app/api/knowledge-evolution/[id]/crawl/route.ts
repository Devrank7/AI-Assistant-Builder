import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KnowledgeEvolutionTracker from '@/models/KnowledgeEvolutionTracker';
import { crawlAndDiff } from '@/lib/knowledgeEvolutionService';

type Params = { params: Promise<{ id: string }> };

// POST /api/knowledge-evolution/[id]/crawl — trigger manual crawl for a specific URL
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId: id }).lean();
    if (!tracker) return Errors.notFound('Evolution tracker not found');

    const result = await crawlAndDiff(id);

    return successResponse({
      evolutionId: id,
      crawlStatus: result.crawlStatus,
      newChanges: result.newChanges,
      stats: result.tracker.stats,
      schedule: result.tracker.schedule,
      lastCrawl:
        result.tracker.crawlHistory.length > 0
          ? result.tracker.crawlHistory[result.tracker.crawlHistory.length - 1]
          : null,
    });
  } catch (err) {
    console.error('POST /api/knowledge-evolution/[id]/crawl error:', err);
    return Errors.internal('Failed to trigger crawl');
  }
}
