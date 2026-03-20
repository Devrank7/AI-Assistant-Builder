import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/Client', () => ({
  default: {
    findOne: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  },
}));
vi.mock('@/models/Notification', () => {
  const mockNotificationType = 'new_client';
  return {
    default: { create: vi.fn().mockResolvedValue({ _id: 'notif-1' }) },
    NotificationType: mockNotificationType,
  };
});
vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
  }),
}));

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set SMTP config for email tests
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'password';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  it('should check if email is allowed for a client', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ emailNotifications: true }),
      }),
    });

    const { isEmailAllowed } = await import('@/lib/notifications');
    const allowed = await isEmailAllowed({ email: 'test@example.com' });

    expect(allowed).toBe(true);
  });

  it('should return true when client not found (safety default)', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    const { isEmailAllowed } = await import('@/lib/notifications');
    const allowed = await isEmailAllowed({ clientId: 'unknown' });

    expect(allowed).toBe(true);
  });

  it('should generate unsubscribe footer with token', async () => {
    const { getUnsubscribeFooter } = await import('@/lib/notifications');
    const footer = getUnsubscribeFooter('abc123');

    expect(footer).toContain('abc123');
    expect(footer).toContain('unsubscribe');
  });

  it('should return empty footer without token', async () => {
    const { getUnsubscribeFooter } = await import('@/lib/notifications');
    const footer = getUnsubscribeFooter();

    expect(footer).toBe('');
  });

  it('should skip email when SMTP not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const { sendEmail } = await import('@/lib/notifications');
    const result = await sendEmail('test@example.com', 'Subject', '<p>Body</p>');

    expect(result).toBe(false);
  });

  it('should skip telegram when bot token not configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const { sendTelegram } = await import('@/lib/notifications');
    const result = await sendTelegram('12345', 'Hello');

    expect(result).toBe(false);
  });
});

describe('notificationHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a notification record', async () => {
    const Notification = (await import('@/models/Notification')).default;
    const { createNotification } = await import('@/lib/notificationHelpers');

    await createNotification({
      type: 'new_client' as any,
      title: 'New Client',
      message: 'A new client registered',
      targetId: 'client-1',
    });

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_client',
        title: 'New Client',
        isRead: false,
      })
    );
  });

  it('should create new client notification', async () => {
    const Notification = (await import('@/models/Notification')).default;
    const { notifyNewClient } = await import('@/lib/notificationHelpers');

    await notifyNewClient('client-1', 'testuser', 'test@example.com');

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new_client',
        targetId: 'client-1',
        metadata: { username: 'testuser', email: 'test@example.com' },
      })
    );
  });

  it('should create payment success notification', async () => {
    const Notification = (await import('@/models/Notification')).default;
    const { notifyPaymentSuccess } = await import('@/lib/notificationHelpers');

    await notifyPaymentSuccess('client-1', 79);

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'payment_success',
        metadata: { amount: 79 },
      })
    );
  });

  it('should create cost warning notification', async () => {
    const Notification = (await import('@/models/Notification')).default;
    const { notifyCostWarning } = await import('@/lib/notificationHelpers');

    await notifyCostWarning('client-1', 45.5);

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cost_warning',
        metadata: { currentCost: 45.5 },
      })
    );
  });

  it('should not throw when notification creation fails', async () => {
    const Notification = (await import('@/models/Notification')).default;
    (Notification.create as any).mockRejectedValue(new Error('DB error'));

    const { createNotification } = await import('@/lib/notificationHelpers');

    // Should not throw
    await expect(
      createNotification({
        type: 'system_alert' as any,
        title: 'Test',
        message: 'Test message',
      })
    ).resolves.toBeUndefined();
  });
});
