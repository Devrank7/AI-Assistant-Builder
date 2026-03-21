import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KnowledgeEvolutionTracker from '@/models/KnowledgeEvolutionTracker';

type Params = { params: Promise<{ id: string }> };

// GET /api/knowledge-evolution/[id] — get full evolution detail with change history
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId: id }).lean();
    if (!tracker) return Errors.notFound('Evolution tracker not found');

    return successResponse({
      id: tracker._id,
      evolutionId: tracker.evolutionId,
      clientId: tracker.clientId,
      sourceUrl: tracker.sourceUrl,
      isActive: tracker.isActive,
      schedule: tracker.schedule,
      stats: tracker.stats,
      changes: tracker.changes.map((c, idx) => ({
        index: idx,
        id: (c as { _id?: unknown })._id?.toString() || idx,
        detectedAt: c.detectedAt,
        type: c.type,
        summary: c.summary,
        oldSnippet: c.oldSnippet,
        newSnippet: c.newSnippet,
        applied: c.applied,
        appliedAt: c.appliedAt,
      })),
      crawlHistory: tracker.crawlHistory.slice(-30).map((h) => ({
        crawledAt: h.crawledAt,
        contentHash: h.contentHash,
        wordCount: h.wordCount,
        status: h.status,
        error: h.error,
      })),
      createdAt: tracker.createdAt,
      updatedAt: tracker.updatedAt,
    });
  } catch (err) {
    console.error('GET /api/knowledge-evolution/[id] error:', err);
    return Errors.internal('Failed to get evolution tracker');
  }
}

// PUT /api/knowledge-evolution/[id] — update schedule settings or isActive
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { enabled, intervalDays, isActive } = body;

    await connectDB();

    const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId: id });
    if (!tracker) return Errors.notFound('Evolution tracker not found');

    if (typeof enabled === 'boolean') {
      tracker.schedule.enabled = enabled;
    }
    if (typeof intervalDays === 'number' && intervalDays >= 1 && intervalDays <= 90) {
      tracker.schedule.intervalDays = intervalDays;
    }
    if (typeof isActive === 'boolean') {
      tracker.isActive = isActive;
    }

    // Recompute nextRun if schedule changed
    if (typeof enabled === 'boolean' || typeof intervalDays === 'number') {
      const lastRun = tracker.schedule.lastRun || tracker.createdAt;
      tracker.schedule.nextRun = new Date(lastRun.getTime() + tracker.schedule.intervalDays * 86400000);
    }

    tracker.markModified('schedule');
    await tracker.save();

    return successResponse(
      {
        evolutionId: tracker.evolutionId,
        schedule: tracker.schedule,
        isActive: tracker.isActive,
      },
      'Settings updated'
    );
  } catch (err) {
    console.error('PUT /api/knowledge-evolution/[id] error:', err);
    return Errors.internal('Failed to update settings');
  }
}

// DELETE /api/knowledge-evolution/[id] — remove URL tracking
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    const tracker = await KnowledgeEvolutionTracker.findOneAndDelete({ evolutionId: id });
    if (!tracker) return Errors.notFound('Evolution tracker not found');

    return successResponse({ deleted: true }, 'URL tracking removed');
  } catch (err) {
    console.error('DELETE /api/knowledge-evolution/[id] error:', err);
    return Errors.internal('Failed to remove URL tracking');
  }
}
