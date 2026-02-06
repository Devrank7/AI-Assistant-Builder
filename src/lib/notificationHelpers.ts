/**
 * Notification Helpers
 *
 * Functions for creating admin notifications.
 */

import connectDB from '@/lib/mongodb';
import Notification, { NotificationType } from '@/models/Notification';

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new notification for admin
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { type, title, message, targetId, metadata = {} } = params;

  try {
    await connectDB();
    await Notification.create({
      type,
      title,
      message,
      targetId,
      metadata,
      isRead: false,
    });
  } catch (error) {
    // Don't throw — notifications should never break main flow
    console.error('Failed to create notification:', error);
  }
}

/**
 * Create notification for new client
 */
export async function notifyNewClient(clientId: string, username: string, email: string): Promise<void> {
  return createNotification({
    type: 'new_client',
    title: '🆕 Новый клиент',
    message: `Зарегистрирован клиент "${username}" (${email})`,
    targetId: clientId,
    metadata: { username, email },
  });
}

/**
 * Create notification for payment success
 */
export async function notifyPaymentSuccess(clientId: string, amount: number): Promise<void> {
  return createNotification({
    type: 'payment_success',
    title: '✅ Оплата получена',
    message: `Клиент ${clientId} оплатил $${amount.toFixed(2)}`,
    targetId: clientId,
    metadata: { amount },
  });
}

/**
 * Create notification for payment failure
 */
export async function notifyPaymentFailed(clientId: string, reason?: string): Promise<void> {
  return createNotification({
    type: 'payment_failed',
    title: '❌ Ошибка оплаты',
    message: `Не удалось обработать платеж для ${clientId}. ${reason || ''}`,
    targetId: clientId,
    metadata: { reason },
  });
}

/**
 * Create notification for cost warning
 */
export async function notifyCostWarning(clientId: string, currentCost: number): Promise<void> {
  return createNotification({
    type: 'cost_warning',
    title: '⚠️ Высокие расходы',
    message: `Клиент ${clientId} потратил $${currentCost.toFixed(2)} на API`,
    targetId: clientId,
    metadata: { currentCost },
  });
}

/**
 * Create notification for widget blocked (cost limit)
 */
export async function notifyCostBlocked(clientId: string, currentCost: number): Promise<void> {
  return createNotification({
    type: 'cost_blocked',
    title: '🚫 Виджет отключен (лимит)',
    message: `Виджет ${clientId} отключен из-за превышения лимита расходов: $${currentCost.toFixed(2)}`,
    targetId: clientId,
    metadata: { currentCost },
  });
}

/**
 * Create notification for trial ending
 */
export async function notifyTrialEnding(clientId: string, daysLeft: number): Promise<void> {
  return createNotification({
    type: 'trial_ending',
    title: '⏰ Trial заканчивается',
    message: `Trial клиента ${clientId} заканчивается через ${daysLeft} дней`,
    targetId: clientId,
    metadata: { daysLeft },
  });
}

/**
 * Create notification for trial expired
 */
export async function notifyTrialExpired(clientId: string): Promise<void> {
  return createNotification({
    type: 'trial_expired',
    title: '🚫 Trial истёк',
    message: `Trial клиента ${clientId} истёк, виджет приостановлен`,
    targetId: clientId,
  });
}

/**
 * Create notification for system alert
 */
export async function notifySystemAlert(
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return createNotification({
    type: 'system_alert',
    title: `🔔 ${title}`,
    message,
    metadata,
  });
}
