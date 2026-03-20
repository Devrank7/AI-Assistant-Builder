import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/notifications', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

const mockUserFind = vi.fn();
vi.mock('@/models/User', () => ({
  default: {
    find: (...args: unknown[]) => mockUserFind(...args),
    findByIdAndUpdate: vi.fn(),
  },
}));

describe('emailSequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSequenceForUser returns correct emails based on days since signup', async () => {
    const { getSequenceForUser, ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: [],
    };
    const due = getSequenceForUser(user as any, ONBOARDING_SEQUENCE);
    expect(due.length).toBeGreaterThan(0);
    expect(due[0].day).toBeLessThanOrEqual(1);
  });

  it('getSequenceForUser skips already-sent emails', async () => {
    const { getSequenceForUser, ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: ['onboarding_day0', 'onboarding_day1'],
    };
    const due = getSequenceForUser(user as any, ONBOARDING_SEQUENCE);
    const ids = due.map((e) => e.id);
    expect(ids).not.toContain('onboarding_day0');
    expect(ids).not.toContain('onboarding_day1');
  });

  it('buildEmailHtml returns valid HTML with user name', async () => {
    const { buildEmailHtml } = await import('@/lib/emailSequences');
    const html = buildEmailHtml('Welcome, {{name}}!', 'Start building', '/dashboard', { name: 'Alex' });
    expect(html).toContain('Alex');
    expect(html).toContain('/dashboard');
  });

  it('ONBOARDING_SEQUENCE has 7 emails over 30 days', async () => {
    const { ONBOARDING_SEQUENCE } = await import('@/lib/emailSequences');
    expect(ONBOARDING_SEQUENCE.length).toBe(7);
    expect(ONBOARDING_SEQUENCE[ONBOARDING_SEQUENCE.length - 1].day).toBe(30);
  });

  it('processSequenceForUser sends due emails and returns sent IDs', async () => {
    const { sendEmail } = await import('@/lib/notifications');
    const { processSequenceForUser } = await import('@/lib/emailSequences');
    const user = {
      _id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      onboardingCompleted: false,
      plan: 'free',
      emailSequencesSent: [],
    };
    const sent = await processSequenceForUser(user as any);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent).toContain('onboarding_day0');
    expect(sendEmail).toHaveBeenCalled();
  });
});
