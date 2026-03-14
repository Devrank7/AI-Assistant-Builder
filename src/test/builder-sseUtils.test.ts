// src/test/builder-sseUtils.test.ts
import { describe, it, expect } from 'vitest';
import { formatSSEEvent, createSSEHeaders } from '@/lib/builder/sseUtils';

describe('SSE Utils', () => {
  it('should format an SSE event as data line', () => {
    const event = { type: 'text', content: 'hello' } as const;
    const formatted = formatSSEEvent(event);
    expect(formatted).toBe('data: {"type":"text","content":"hello"}\n\n');
  });

  it('should format a done event', () => {
    const formatted = formatSSEEvent({ type: 'done' });
    expect(formatted).toBe('data: {"type":"done"}\n\n');
  });

  it('should return correct SSE headers', () => {
    const headers = createSSEHeaders();
    expect(headers['Content-Type']).toBe('text/event-stream');
    expect(headers['Cache-Control']).toBe('no-cache');
    expect(headers['Connection']).toBe('keep-alive');
  });
});
