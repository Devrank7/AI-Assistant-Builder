import { EventEmitter } from 'events';
import Event from '@/models/Event';
import type { WebhookEvent } from '@/models/Webhook';

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export interface EventPayload {
  eventType: string;
  clientId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Emit an event: persists to MongoDB and notifies in-process listeners.
 */
export async function emitEvent(type: string, clientId: string, payload: Record<string, unknown>): Promise<void> {
  const event: EventPayload = {
    eventType: type,
    clientId,
    payload,
    createdAt: new Date(),
  };

  // 1. Persist to MongoDB (fire-and-forget for performance, log errors)
  Event.create({
    eventType: type,
    clientId,
    payload,
  }).catch((err) => console.error('Failed to persist event:', err));

  // 2. Emit to in-process listeners (for SSE, contact updater, flow engine)
  emitter.emit(type, event);
  emitter.emit('*', event); // wildcard for listeners that want all events
}

/**
 * Subscribe to events by type. Use '*' to listen to all events.
 */
export function onEvent(type: string, handler: (event: EventPayload) => void): void {
  emitter.on(type, handler);
}

/**
 * Unsubscribe from events.
 */
export function offEvent(type: string, handler: (event: EventPayload) => void): void {
  emitter.off(type, handler);
}

// Auto-register flow engine listener (lazy, non-blocking)
if (typeof globalThis !== 'undefined') {
  import('./flows/engine')
    .then(({ processEvent }) => {
      emitter.on('*', (event: EventPayload) => {
        processEvent(event).catch((err) => console.error('Flow engine error:', err));
      });
    })
    .catch(() => {
      // Flow engine not available yet (during build or test)
    });
}

// Auto-register webhook trigger listener (lazy, non-blocking)
if (typeof globalThis !== 'undefined') {
  import('./webhookService')
    .then(({ triggerWebhooks }) => {
      emitter.on('*', (event: EventPayload) => {
        triggerWebhooks(event.clientId, event.eventType as WebhookEvent, event.payload).catch((err) =>
          console.error('Webhook trigger error:', err)
        );
      });
    })
    .catch(() => {
      // Webhook service not available
    });
}
