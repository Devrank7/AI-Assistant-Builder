import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getClientsNeedingRecrawl, evolveKnowledge } from '@/lib/knowledgeEvolution';

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
    const clients = await getClientsNeedingRecrawl(7);

    if (clients.length === 0) {
      return successResponse({ processed: 0, message: 'No clients need re-crawl' });
    }

    const results: Array<{
      clientId: string;
      status: string;
      diffs: number;
      error?: string;
    }> = [];

    // Process each client sequentially to avoid overwhelming resources
    for (const client of clients.slice(0, 10)) {
      try {
        const evolution = await evolveKnowledge(client.clientId, client.website, true);
        results.push({
          clientId: client.clientId,
          status: evolution.status,
          diffs: evolution.diffs.length,
          error: evolution.error || undefined,
        });
      } catch (err) {
        results.push({
          clientId: client.clientId,
          status: 'failed',
          diffs: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return successResponse({
      processed: results.length,
      totalPending: clients.length,
      results,
    });
  } catch (err) {
    console.error('Knowledge evolution cron error:', err);
    return Errors.internal('Cron job failed');
  }
}
