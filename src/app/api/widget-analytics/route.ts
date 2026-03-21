import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';

// Lightweight analytics endpoint — no auth required (widget calls this)
// Uses batch writes for performance

interface AnalyticsEvent {
  clientId: string;
  event: string; // 'widget_load' | 'widget_open' | 'message_sent' | 'message_received' | 'widget_close' | 'cta_click' | 'voice_used' | 'file_uploaded'
  metadata?: Record<string, unknown>;
  sessionId?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: AnalyticsEvent[] = Array.isArray(body.events) ? body.events : [body];

    if (events.length === 0 || events.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid events' }), { status: 400 });
    }

    // Validate each event has clientId and event type
    const valid = events.filter((e) => e.clientId && e.event && typeof e.event === 'string');
    if (valid.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid events' }), { status: 400 });
    }

    await connectDB();

    // Use dynamic import to avoid model caching issues
    const mongoose = (await import('mongoose')).default;

    const WidgetAnalytics =
      mongoose.models.WidgetAnalytics ||
      mongoose.model(
        'WidgetAnalytics',
        new mongoose.Schema(
          {
            clientId: { type: String, required: true, index: true },
            event: { type: String, required: true, index: true },
            metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
            sessionId: { type: String, default: null },
            url: { type: String, default: null },
            userAgent: { type: String, default: null },
            timestamp: { type: Date, required: true },
          },
          { timestamps: false }
        )
      );

    // Batch insert
    const docs = valid.map((e) => ({
      clientId: e.clientId,
      event: e.event,
      metadata: e.metadata || {},
      sessionId: e.sessionId || null,
      url: e.url || null,
      userAgent: request.headers.get('user-agent')?.slice(0, 200) || null,
      timestamp: new Date(e.timestamp || Date.now()),
    }));

    await WidgetAnalytics.insertMany(docs, { ordered: false });

    return new Response(JSON.stringify({ ok: true, count: docs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('[Widget Analytics]', error);
    return new Response(JSON.stringify({ ok: true }), { status: 200 }); // Don't break widget on error
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
