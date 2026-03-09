import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import BotAudit from '@/models/BotAudit';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    await connectDB();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalResult, byTypeResult, byStatusResult, errorsResult, lastEntry] = await Promise.all([
      BotAudit.countDocuments(),
      BotAudit.aggregate([{ $group: { _id: '$eventType', count: { $sum: 1 } } }]),
      BotAudit.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      BotAudit.countDocuments({
        status: 'error',
        createdAt: { $gte: yesterday },
      }),
      BotAudit.findOne().sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);

    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row._id] = row.count;
    }

    const byStatus: Record<string, number> = {};
    for (const row of byStatusResult) {
      byStatus[row._id] = row.count;
    }

    return successResponse({
      total_operations: totalResult,
      by_type: byType,
      by_status: byStatus,
      errors_last_24h: errorsResult,
      last_activity: lastEntry?.createdAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[mini-app/stats] Error:', error);
    return Errors.internal('Failed to fetch stats');
  }
}
