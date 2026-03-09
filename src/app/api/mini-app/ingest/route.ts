import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import BotAudit from '@/models/BotAudit';
import BotState from '@/models/BotState';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { events, state } = body;

    await connectDB();

    // Save audit events
    if (Array.isArray(events) && events.length > 0) {
      const docs = events.map((e: Record<string, unknown>) => ({
        eventType: String(e.type || e.eventType || 'unknown'),
        action: String(e.action || ''),
        status: String(e.status || 'info'),
        details: (e.details as Record<string, unknown>) || {},
        createdAt: e.timestamp ? new Date(String(e.timestamp)) : new Date(),
      }));
      await BotAudit.insertMany(docs);
    }

    // Upsert bot state (single document)
    if (state && typeof state === 'object') {
      await BotState.findOneAndUpdate(
        {},
        {
          orchestratorRunning: Boolean(state.orchestrator_running),
          sessionId: String(state.session_id || ''),
          activeStages: (state.active_stages as Record<string, number>) || {},
          lastUpdate: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    return successResponse({ ingested: Array.isArray(events) ? events.length : 0 });
  } catch (error) {
    console.error('[mini-app/ingest] Error:', error);
    return Errors.internal('Failed to ingest events');
  }
}
