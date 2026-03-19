import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose to avoid real DB in unit tests
vi.mock('@/models/Event', () => ({
  default: { create: vi.fn().mockResolvedValue({}) },
}));

describe('Event Bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit event and call listeners', async () => {
    const { emitEvent, onEvent, offEvent } = await import('@/lib/events');
    const handler = vi.fn();

    onEvent('test:event', handler);
    await emitEvent('test:event', 'client-1', { foo: 'bar' });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'test:event',
        clientId: 'client-1',
        payload: { foo: 'bar' },
      })
    );

    offEvent('test:event', handler);
  });

  it('should not call removed listeners', async () => {
    const { emitEvent, onEvent, offEvent } = await import('@/lib/events');
    const handler = vi.fn();

    onEvent('test:remove', handler);
    offEvent('test:remove', handler);
    await emitEvent('test:remove', 'client-1', {});

    expect(handler).not.toHaveBeenCalled();
  });

  it('should persist event to MongoDB', async () => {
    const EventModel = (await import('@/models/Event')).default;
    const { emitEvent } = await import('@/lib/events');

    await emitEvent('message:received', 'client-1', { text: 'hello' });

    expect(EventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'message:received',
        clientId: 'client-1',
        payload: { text: 'hello' },
      })
    );
  });
});
