/**
 * Webhook Service
 *
 * Sends signed webhook notifications to client endpoints.
 * Uses HMAC-SHA256 for signature verification.
 */

import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Webhook, { WebhookEvent } from '@/models/Webhook';

interface WebhookPayload {
  event: WebhookEvent;
  clientId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  clientId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  await connectDB();

  const webhooks = await Webhook.find({
    clientId,
    isActive: true,
    events: event,
  });

  let sent = 0;
  let failed = 0;

  for (const webhook of webhooks) {
    try {
      const payload: WebhookPayload = {
        event,
        clientId,
        timestamp: new Date().toISOString(),
        data,
      };

      const body = JSON.stringify(payload);
      const signature = generateSignature(body, webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (response.ok) {
        sent++;
        await Webhook.updateOne({ _id: webhook._id }, { lastTriggered: new Date(), failureCount: 0 });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      failed++;
      const newFailCount = (webhook.failureCount || 0) + 1;

      // Disable webhook after 10 consecutive failures
      await Webhook.updateOne(
        { _id: webhook._id },
        {
          failureCount: newFailCount,
          ...(newFailCount >= 10 ? { isActive: false } : {}),
        }
      );

      console.error(
        `Webhook failed for ${webhook.url} (${event}):`,
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }

  return { sent, failed };
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature (for client-side verification)
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = generateSignature(payload, secret);
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}
