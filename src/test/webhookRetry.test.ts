import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockWebhookFind = vi.fn();
const mockWebhookUpdateOne = vi.fn();

vi.mock('@/models/Webhook', () => ({
  default: {
    find: (...args: unknown[]) => mockWebhookFind(...args),
    updateOne: (...args: unknown[]) => mockWebhookUpdateOne(...args),
  },
  WEBHOOK_EVENTS: [
    'new_chat',
    'new_lead',
    'widget_error',
    'cost_threshold',
    'payment_success',
    'payment_failed',
    'lead_captured',
    'chat_started',
    'handoff_requested',
    'knowledge_gap_detected',
  ],
}));

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('sends webhook with HMAC signature', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 0,
      },
    ]);
    (global.fetch as any).mockResolvedValue({ ok: true });
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    const result = await triggerWebhooks('client1', 'new_lead', { name: 'Test' });
    expect(result.sent).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('increments failure count on error', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 0,
      },
    ]);
    (global.fetch as any).mockRejectedValue(new Error('timeout'));
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    const result = await triggerWebhooks('client1', 'new_lead', { name: 'Test' });
    expect(result.failed).toBe(1);
    expect(mockWebhookUpdateOne).toHaveBeenCalled();
  });

  it('disables webhook after 10 consecutive failures', async () => {
    mockWebhookFind.mockResolvedValue([
      {
        _id: 'w1',
        url: 'https://example.com/hook',
        secret: 'whsec_test123',
        events: ['new_lead'],
        isActive: true,
        failureCount: 9,
      },
    ]);
    (global.fetch as any).mockRejectedValue(new Error('timeout'));
    mockWebhookUpdateOne.mockResolvedValue({});

    const { triggerWebhooks } = await import('@/lib/webhookService');
    await triggerWebhooks('client1', 'new_lead', { name: 'Test' });

    const updateCall = mockWebhookUpdateOne.mock.calls[0];
    expect(updateCall[1]).toHaveProperty('isActive', false);
  });
});
