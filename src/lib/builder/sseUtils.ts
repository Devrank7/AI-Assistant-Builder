// src/lib/builder/sseUtils.ts
import type { SSEEvent } from './types';

export function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

export function createSSEStream(
  handler: (write: (event: SSEEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const write = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(formatSSEEvent(event)));
      };

      try {
        await handler(write);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        try { write({ type: 'error', message, recoverable: false }); } catch { /* controller may be closed */ }
      } finally {
        try {
          write({ type: 'done' });
          controller.close();
        } catch { /* controller may already be closed */ }
      }
    },
  });
}
