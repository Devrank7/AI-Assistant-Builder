import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/ChatLog', () => ({
  default: {
    find: vi.fn().mockReturnThis(),
    lean: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock('@/models/Feedback', () => ({
  default: {
    countDocuments: vi.fn(),
  },
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero stats when no chat logs exist', async () => {
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    const Feedback = (await import('@/models/Feedback')).default;
    (Feedback.countDocuments as any).mockResolvedValue(0);

    const { getAnalytics } = await import('@/lib/analytics');
    const result = await getAnalytics('client-1', 7);

    expect(result.totalChats).toBe(0);
    expect(result.totalMessages).toBe(0);
    expect(result.avgMessagesPerChat).toBe(0);
    expect(result.satisfactionPercent).toBe(0);
    expect(result.dailyStats.length).toBe(7);
  });

  it('should calculate correct totals and averages', async () => {
    const now = new Date();
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          createdAt: now,
          messages: [
            { role: 'user', content: 'Hello', timestamp: new Date(now.getTime()) },
            { role: 'assistant', content: 'Hi there!', timestamp: new Date(now.getTime() + 2000) },
            { role: 'user', content: 'How are you?', timestamp: new Date(now.getTime() + 5000) },
            { role: 'assistant', content: 'I am fine', timestamp: new Date(now.getTime() + 7000) },
          ],
          metadata: { channel: 'website' },
        },
        {
          createdAt: now,
          messages: [
            { role: 'user', content: 'Pricing info', timestamp: new Date(now.getTime()) },
            { role: 'assistant', content: '$79/month', timestamp: new Date(now.getTime() + 1500) },
          ],
          metadata: { channel: 'telegram' },
        },
      ]),
    });
    const Feedback = (await import('@/models/Feedback')).default;
    (Feedback.countDocuments as any)
      .mockResolvedValueOnce(8) // up
      .mockResolvedValueOnce(2); // down

    const { getAnalytics } = await import('@/lib/analytics');
    const result = await getAnalytics('client-1', 30);

    expect(result.totalChats).toBe(2);
    expect(result.totalMessages).toBe(6);
    expect(result.avgMessagesPerChat).toBe(3);
    expect(result.satisfactionPercent).toBe(80);
    expect(result.feedbackCount).toBe(10);
    expect(result.avgResponseTimeMs).toBeGreaterThan(0);
  });

  it('should compute channel breakdown percentages', async () => {
    const now = new Date();
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { createdAt: now, messages: [{ role: 'user', content: 'Hi' }], metadata: { channel: 'website' } },
        { createdAt: now, messages: [{ role: 'user', content: 'Hi' }], metadata: { channel: 'website' } },
        { createdAt: now, messages: [{ role: 'user', content: 'Hi' }], metadata: { channel: 'telegram' } },
      ]),
    });
    const Feedback = (await import('@/models/Feedback')).default;
    (Feedback.countDocuments as any).mockResolvedValue(0);

    const { getAnalytics } = await import('@/lib/analytics');
    const result = await getAnalytics('client-1', 30);

    const websiteStats = result.channelStats.find((c) => c.channel === 'website');
    const telegramStats = result.channelStats.find((c) => c.channel === 'telegram');

    expect(websiteStats?.count).toBe(2);
    expect(websiteStats?.percentage).toBe(67);
    expect(telegramStats?.count).toBe(1);
    expect(telegramStats?.percentage).toBe(33);
  });

  it('should extract top questions from first user messages', async () => {
    const now = new Date();
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { createdAt: now, messages: [{ role: 'user', content: 'What are your prices?' }], metadata: {} },
        { createdAt: now, messages: [{ role: 'user', content: 'What are your prices?' }], metadata: {} },
        { createdAt: now, messages: [{ role: 'user', content: 'How to contact you?' }], metadata: {} },
      ]),
    });
    const Feedback = (await import('@/models/Feedback')).default;
    (Feedback.countDocuments as any).mockResolvedValue(0);

    const { getAnalytics } = await import('@/lib/analytics');
    const result = await getAnalytics('client-1', 30);

    expect(result.topQuestions[0].text).toBe('what are your prices?');
    expect(result.topQuestions[0].count).toBe(2);
    expect(result.topQuestions.length).toBe(2);
  });

  it('should get quick stats for dashboard', async () => {
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.countDocuments as any)
      .mockResolvedValueOnce(5) // today
      .mockResolvedValueOnce(30) // week
      .mockResolvedValueOnce(120); // month

    const { getQuickStats } = await import('@/lib/analytics');
    const stats = await getQuickStats('client-1');

    expect(stats.today).toBe(5);
    expect(stats.week).toBe(30);
    expect(stats.month).toBe(120);
  });
});
