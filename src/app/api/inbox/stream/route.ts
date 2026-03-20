// src/app/api/inbox/stream/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { onEvent, offEvent, type EventPayload } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  // Get user's allowed clientIds
  const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
  const userClients = await Client.find(ownerQuery).select('clientId');
  const allowedClientIds = new Set(userClients.map((c) => c.clientId));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send keepalive comment immediately
      controller.enqueue(encoder.encode(': connected\n\n'));

      const handler = (event: EventPayload) => {
        // Only send events for user's clients
        if (!allowedClientIds.has(event.clientId)) return;

        const sseData = JSON.stringify({
          type: event.eventType,
          clientId: event.clientId,
          payload: event.payload,
          timestamp: event.createdAt,
        });

        try {
          controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
        } catch {
          // Stream closed
        }
      };

      // Listen to all events via wildcard
      onEvent('*', handler);

      // Keepalive ping every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(keepalive);
        }
      }, 30_000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        offEvent('*', handler);
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
