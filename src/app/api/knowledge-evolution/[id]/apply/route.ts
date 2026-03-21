import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import KnowledgeEvolutionTracker from '@/models/KnowledgeEvolutionTracker';
import { applyChange, applyAllChanges } from '@/lib/knowledgeEvolutionService';

type Params = { params: Promise<{ id: string }> };

// POST /api/knowledge-evolution/[id]/apply — apply detected changes to knowledge base
// Body: { changeIndex?: number } — if omitted, applies all pending changes
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId: id }).lean();
    if (!tracker) return Errors.notFound('Evolution tracker not found');

    const body = await request.json().catch(() => ({}));
    const { changeIndex } = body;

    if (typeof changeIndex === 'number') {
      // Apply a single change
      if (changeIndex < 0 || changeIndex >= tracker.changes.length) {
        return Errors.badRequest('Invalid change index');
      }
      const updated = await applyChange(id, changeIndex);
      return successResponse({
        applied: 1,
        changes: updated.changes.map((c, i) => ({
          index: i,
          applied: c.applied,
          appliedAt: c.appliedAt,
        })),
      });
    } else {
      // Apply all pending changes
      const result = await applyAllChanges(id);
      return successResponse({
        applied: result.applied,
      });
    }
  } catch (err) {
    console.error('POST /api/knowledge-evolution/[id]/apply error:', err);
    return Errors.internal('Failed to apply changes');
  }
}
