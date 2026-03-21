import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getTrackersDueForCrawl, crawlAndDiff } from '@/lib/knowledgeEvolutionService';

// GET /api/cron/knowledge-evolution
// Called by external cron every 24h. Crawls all URLs due for re-check.
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Errors.internal('CRON_SECRET not configured');
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token !== cronSecret) {
    return Errors.unauthorized('Invalid cron secret');
  }

  try {
    const trackers = await getTrackersDueForCrawl();

    if (trackers.length === 0) {
      return successResponse({ processed: 0, message: 'No trackers due for crawl' });
    }

    const results: Array<{
      evolutionId: string;
      clientId: string;
      crawlStatus: string;
      newChanges: number;
      error?: string;
    }> = [];

    // Process up to 20 per cron run to stay within time limits
    const batch = trackers.slice(0, 20);

    for (const tracker of batch) {
      try {
        const result = await crawlAndDiff(tracker.evolutionId);
        results.push({
          evolutionId: tracker.evolutionId,
          clientId: tracker.clientId,
          crawlStatus: result.crawlStatus,
          newChanges: result.newChanges,
        });
      } catch (err) {
        results.push({
          evolutionId: tracker.evolutionId,
          clientId: tracker.clientId,
          crawlStatus: 'failed',
          newChanges: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const summary = {
      processed: results.length,
      total: trackers.length,
      success: results.filter((r) => r.crawlStatus === 'success').length,
      noChange: results.filter((r) => r.crawlStatus === 'no_change').length,
      failed: results.filter((r) => r.crawlStatus === 'failed').length,
      totalNewChanges: results.reduce((s, r) => s + r.newChanges, 0),
    };

    return successResponse({ summary, results });
  } catch (err) {
    console.error('Cron knowledge-evolution error:', err);
    return Errors.internal('Cron job failed');
  }
}
