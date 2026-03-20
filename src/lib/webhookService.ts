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

/** Retry delays in milliseconds: 5s, 30s, 5min */
export const RETRY_DELAYS = [5000, 30000, 300000];

/** In-memory deduplication set: eventId → expiry timestamp */
const seenEvents = new Map<string, number>();

function getEventId(clientId: string, event: WebhookEvent, timestamp: string): string {
  return `${clientId}:${event}:${timestamp}`;
}

function cleanExpiredEventIds(): void {
  const now = Date.now();
  for (const [key, expiry] of seenEvents.entries()) {
    if (now > expiry) seenEvents.delete(key);
  }
}

/**
 * Attempt delivery of a webhook with retry on failure using exponential backoff.
 */
async function attemptDelivery(
  webhookId: string,
  url: string,
  secret: string,
  body: string,
  headers: Record<string, string>,
  currentFailureCount: number,
  retryIndex: number
): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      await Webhook.updateOne({ _id: webhookId }, { lastTriggered: new Date(), failureCount: 0 });
      return;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    const newFailCount = currentFailureCount + 1;

    if (retryIndex < RETRY_DELAYS.length) {
      // More retries available — schedule next attempt
      setTimeout(() => {
        attemptDelivery(webhookId, url, secret, body, headers, newFailCount, retryIndex + 1).catch((e) =>
          console.error(
            `Webhook retry ${retryIndex + 1} failed for ${url}:`,
            e instanceof Error ? e.message : 'Unknown error'
          )
        );
      }, RETRY_DELAYS[retryIndex]);
    } else {
      // All retries exhausted — persist failure and possibly disable
      await Webhook.updateOne(
        { _id: webhookId },
        {
          failureCount: newFailCount,
          ...(newFailCount >= 10 ? { isActive: false } : {}),
        }
      );
      console.error(`Webhook all retries exhausted for ${url}:`, err instanceof Error ? err.message : 'Unknown error');
    }
  }
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

  const timestamp = new Date().toISOString();
  cleanExpiredEventIds();

  // Deduplication check
  const eventId = getEventId(clientId, event, timestamp);
  if (seenEvents.has(eventId)) {
    return { sent, failed };
  }
  seenEvents.set(eventId, Date.now() + 60000);

  for (const webhook of webhooks) {
    try {
      const payload: WebhookPayload = {
        event,
        clientId,
        timestamp,
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
      const currentFailureCount = webhook.failureCount || 0;
      const newFailCount = currentFailureCount + 1;

      // Persist initial failure
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

      // Schedule retry if webhook not disabled
      if (newFailCount < 10) {
        const payload: WebhookPayload = { event, clientId, timestamp, data };
        const body = JSON.stringify(payload);
        const signature = generateSignature(body, webhook.secret);
        const headers: Record<string, string> = {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp,
        };

        setTimeout(() => {
          attemptDelivery(String(webhook._id), webhook.url, webhook.secret, body, headers, newFailCount, 1).catch((e) =>
            console.error(
              `Webhook retry scheduling failed for ${webhook.url}:`,
              e instanceof Error ? e.message : 'Unknown error'
            )
          );
        }, RETRY_DELAYS[0]);
      }
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
