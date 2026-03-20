import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockCreate = vi.fn();
vi.mock('@/models/Notification', () => ({
  default: { create: (...args: unknown[]) => mockCreate(...args) },
}));

describe('notificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ _id: 'n1' });
  });

  it('notify creates notification with correct fields', async () => {
    const { notify } = await import('@/lib/notificationTriggers');
    await notify({
      type: 'widget_deployed',
      userId: 'u1',
      title: 'Widget deployed',
      message: 'Your widget is live',
      targetId: 'client1',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'widget_deployed',
        userId: 'u1',
        title: 'Widget deployed',
        message: 'Your widget is live',
        targetId: 'client1',
      })
    );
  });

  it('notifyWidgetDeployed creates correct notification', async () => {
    const { notifyWidgetDeployed } = await import('@/lib/notificationTriggers');
    await notifyWidgetDeployed('u1', 'client1', 'My Widget');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'widget_deployed',
        title: 'Widget deployed',
      })
    );
  });

  it('notifyKnowledgeGap creates correct notification', async () => {
    const { notifyKnowledgeGap } = await import('@/lib/notificationTriggers');
    await notifyKnowledgeGap('u1', 'client1', 'What are your hours?');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'knowledge_gap',
      })
    );
  });

  it('notifyTeamInvite creates correct notification', async () => {
    const { notifyTeamInvite } = await import('@/lib/notificationTriggers');
    await notifyTeamInvite('u1', 'Org Name', 'admin');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'team_invite',
      })
    );
  });

  it('notifyABTestResult creates correct notification', async () => {
    const { notifyABTestResult } = await import('@/lib/notificationTriggers');
    await notifyABTestResult('u1', 'test1', 'Variant B won');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ab_test_result',
      })
    );
  });
});
