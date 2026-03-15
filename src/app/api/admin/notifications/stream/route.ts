import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import User from '@/models/User';
import { buildAlerts } from '@/lib/adminAlerts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  await connectDB();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendAlerts = async () => {
        try {
          const now = new Date();
          const threeDaysFromNow = new Date(now);
          threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

          const [pastDueUsers, expiringTrials] = await Promise.all([
            User.find({ subscriptionStatus: 'past_due' }).select('email name').limit(20).lean(),
            User.find({
              subscriptionStatus: 'trial',
              trialEndsAt: { $lte: threeDaysFromNow, $gte: now },
            })
              .select('email name trialEndsAt')
              .limit(20)
              .lean(),
          ]);

          const alerts = buildAlerts(pastDueUsers, expiringTrials);

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(alerts)}\n\n`));
        } catch {
          // Don't close stream on transient errors
        }
      };

      // Send immediately
      await sendAlerts();

      // Then every 30 seconds
      const interval = setInterval(sendAlerts, 30_000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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
