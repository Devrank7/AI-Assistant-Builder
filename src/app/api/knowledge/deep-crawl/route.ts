/**
 * POST /api/knowledge/deep-crawl
 *
 * Deep-crawls a website using crawlWebsite() (sitemap + WP API + BFS),
 * then uploads all extracted text as knowledge chunks with embeddings.
 *
 * Body: { clientId, websiteUrl, brandName?, replace? }
 *   - clientId: target client
 *   - websiteUrl: URL to crawl
 *   - brandName: optional label prepended to content
 *   - replace: if true, deletes existing knowledge before uploading (default: true)
 *
 * Returns crawl stats + number of chunks created.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { generateEmbedding, splitTextIntoChunks } from '@/lib/gemini';
import { verifyAdmin } from '@/lib/auth';
import { crawlWebsite } from '@/lib/crawler';
import { withRetry } from '@/lib/retry';
import { exportClientSeed } from '@/lib/exportSeed';

export async function POST(request: NextRequest) {
  try {
    // Admin-only
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, websiteUrl, brandName, replace = true } = await request.json();

    if (!clientId || !websiteUrl) {
      return NextResponse.json({ success: false, error: 'clientId and websiteUrl are required' }, { status: 400 });
    }

    await connectDB();

    // 1. Deep crawl
    const crawlResult = await crawlWebsite(websiteUrl, {
      maxPages: 50,
      maxTotalChars: 800_000,
      totalTimeoutMs: 180_000,
    });

    if (crawlResult.pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No pages crawled — site may be unreachable or JS-rendered',
          crawl: {
            totalPages: 0,
            totalChars: 0,
            durationMs: crawlResult.durationMs,
            strategies: crawlResult.strategies,
            errors: crawlResult.errors.slice(0, 10),
          },
        },
        { status: 422 }
      );
    }

    // 2. Compile all text
    let fullText = brandName ? `${brandName}\n\n` : '';
    for (const page of crawlResult.pages) {
      fullText += `--- ${page.title || page.url} ---\n${page.text}\n\n`;
    }

    // 3. Replace existing knowledge if requested
    if (replace) {
      await KnowledgeChunk.deleteMany({ clientId });
    }

    // 4. Chunk and embed (batched)
    const textChunks = splitTextIntoChunks(fullText, 500);
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1000;
    let savedChunks = 0;
    let failedChunks = 0;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch = textChunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (chunkText) => {
          const embedding = await withRetry(() => generateEmbedding(chunkText), {
            maxRetries: 3,
            backoffMs: 2000,
          });
          await KnowledgeChunk.create({
            clientId,
            text: chunkText,
            embedding,
            source: 'deep-crawl',
          });
        })
      );
      savedChunks += results.filter((r) => r.status === 'fulfilled').length;
      failedChunks += results.filter((r) => r.status === 'rejected').length;

      if (i + BATCH_SIZE < textChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // 5. Export seed
    exportClientSeed(clientId).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Crawled ${crawlResult.totalPages} pages, created ${savedChunks} knowledge chunks`,
      crawl: {
        totalPages: crawlResult.totalPages,
        totalChars: crawlResult.totalChars,
        durationMs: crawlResult.durationMs,
        strategies: crawlResult.strategies,
        errors: crawlResult.errors.slice(0, 10),
        pageUrls: crawlResult.pages.map((p) => p.url),
      },
      knowledge: {
        totalChunks: textChunks.length,
        savedChunks,
        failedChunks,
        replaced: replace,
      },
    });
  } catch (error) {
    console.error('[DeepCrawl] Error:', error);
    return NextResponse.json(
      { success: false, error: `Deep crawl failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
