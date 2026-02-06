import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

/**
 * GET /api/audit-log?page=1&limit=50&action=xxx&actor=xxx
 * Get paginated audit logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action');
    const actor = searchParams.get('actor');
    const targetId = searchParams.get('targetId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter
    const filter: Record<string, unknown> = {};

    if (action) {
      filter.action = action;
    }
    if (actor) {
      filter.actor = actor;
    }
    if (targetId) {
      filter.targetId = targetId;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
