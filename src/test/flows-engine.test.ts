// src/test/flows-engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/Flow', () => ({
  default: { find: vi.fn(), findOneAndUpdate: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/models/FlowExecution', () => ({
  default: { create: vi.fn() },
}));
vi.mock('@/models/Contact', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('@/models/Conversation', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));
vi.mock('@/models/Client', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));
vi.mock('@/lib/flows/actionExecutor', () => ({
  executeAction: vi.fn().mockResolvedValue({ success: true, result: 'ok' }),
}));
vi.mock('@/lib/events', () => ({
  emitEvent: vi.fn(),
}));

describe('Flow Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find and execute matching flow', async () => {
    const Flow = (await import('@/models/Flow')).default;
    const FlowExecution = (await import('@/models/FlowExecution')).default;
    const Contact = (await import('@/models/Contact')).default;
    const { executeAction } = await import('@/lib/flows/actionExecutor');

    (Flow.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          flowId: 'flow-1',
          clientId: 'client-1',
          trigger: { type: 'message:received', conditions: [] },
          steps: [{ type: 'action', action: 'add_tag', config: { tag: 'engaged' } }],
          stats: { timesTriggered: 0 },
        },
      ]),
    });

    (Contact.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        contactId: 'contact-1',
        name: 'Test',
        leadScore: 50,
        leadTemp: 'warm',
        channel: 'web',
      }),
    });

    (FlowExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { processEvent } = await import('@/lib/flows/engine');
    await processEvent({
      eventType: 'message:received',
      clientId: 'client-1',
      payload: { contactId: 'contact-1', text: 'Hello' },
      createdAt: new Date(),
    });

    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(FlowExecution.create).toHaveBeenCalled();
  });

  it('should skip flow when conditions do not match', async () => {
    const Flow = (await import('@/models/Flow')).default;
    const Contact = (await import('@/models/Contact')).default;
    const { executeAction } = await import('@/lib/flows/actionExecutor');

    (Flow.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          flowId: 'flow-2',
          clientId: 'client-1',
          trigger: {
            type: 'message:received',
            conditions: [{ field: 'contact.leadScore', operator: 'gt', value: 90 }],
          },
          steps: [{ type: 'action', action: 'add_tag', config: { tag: 'vip' } }],
          stats: { timesTriggered: 0 },
        },
      ]),
    });

    (Contact.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        contactId: 'contact-1',
        leadScore: 50,
        leadTemp: 'warm',
        channel: 'web',
      }),
    });

    const { processEvent } = await import('@/lib/flows/engine');
    await processEvent({
      eventType: 'message:received',
      clientId: 'client-1',
      payload: { contactId: 'contact-1', text: 'Hello' },
      createdAt: new Date(),
    });

    expect(executeAction).not.toHaveBeenCalled();
  });

  it('should create pending execution for delay steps', async () => {
    const Flow = (await import('@/models/Flow')).default;
    const FlowExecution = (await import('@/models/FlowExecution')).default;
    const Contact = (await import('@/models/Contact')).default;
    const { executeAction } = await import('@/lib/flows/actionExecutor');

    (Flow.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          flowId: 'flow-3',
          clientId: 'client-1',
          trigger: { type: 'contact:created', conditions: [] },
          steps: [
            { type: 'action', action: 'add_tag', config: { tag: 'new' } },
            { type: 'delay', config: {}, delayMinutes: 60 },
            { type: 'action', action: 'send_message', config: { message: 'Welcome!' } },
          ],
          stats: { timesTriggered: 0 },
        },
      ]),
    });

    (Contact.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        contactId: 'contact-1',
        name: 'Test',
        leadScore: 0,
        leadTemp: 'cold',
        channel: 'web',
      }),
    });

    (FlowExecution.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { processEvent } = await import('@/lib/flows/engine');
    await processEvent({
      eventType: 'contact:created',
      clientId: 'client-1',
      payload: { contactId: 'contact-1' },
      createdAt: new Date(),
    });

    // First action should execute
    expect(executeAction).toHaveBeenCalledTimes(1);

    // Pending execution should be created for remaining steps after delay
    const createCalls = (FlowExecution.create as ReturnType<typeof vi.fn>).mock.calls;
    const pendingCall = createCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).status === 'pending'
    );
    expect(pendingCall).toBeDefined();
  });
});
