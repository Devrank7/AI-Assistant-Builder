/**
 * Trial Reminder Service
 *
 * Checks all trial clients and sends reminders at:
 * - 7 days before trial ends
 * - 3 days before trial ends
 * - 1 day before trial ends
 * - Trial expired → suspend
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { TRIAL_DAYS } from '@/lib/paymentProviders/types';
import { sendEmail, sendTelegram } from '@/lib/notifications';

interface TrialCheckResult {
  totalChecked: number;
  reminders7d: number;
  reminders3d: number;
  reminders1d: number;
  suspended: number;
  errors: string[];
}

/**
 * Check all trial clients and send appropriate reminders
 */
export async function checkTrialReminders(): Promise<TrialCheckResult> {
  await connectDB();

  const result: TrialCheckResult = {
    totalChecked: 0,
    reminders7d: 0,
    reminders3d: 0,
    reminders1d: 0,
    suspended: 0,
    errors: [],
  };

  try {
    const trialClients = await Client.find({
      subscriptionStatus: 'trial',
    }).select('clientId email telegram startDate isActive username');

    result.totalChecked = trialClients.length;

    for (const client of trialClients) {
      try {
        const trialEnd = new Date(client.startDate);
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

        const now = new Date();
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 0) {
          // Trial expired — suspend
          await Client.updateOne({ clientId: client.clientId }, { isActive: false, subscriptionStatus: 'suspended' });
          await sendTrialExpiredEmail(client.email, client.telegram, client.username);
          result.suspended++;
        } else if (daysLeft === 1) {
          await sendTrialReminderEmail(client.email, client.telegram, client.username, 1);
          result.reminders1d++;
        } else if (daysLeft === 3) {
          await sendTrialReminderEmail(client.email, client.telegram, client.username, 3);
          result.reminders3d++;
        } else if (daysLeft === 7) {
          await sendTrialReminderEmail(client.email, client.telegram, client.username, 7);
          result.reminders7d++;
        }
      } catch (err) {
        result.errors.push(`Client ${client.clientId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  } catch (err) {
    result.errors.push(`Global: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Calculate days remaining in trial
 */
export function getTrialDaysLeft(startDate: Date): number {
  const trialEnd = new Date(startDate);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const now = new Date();
  return Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Get trial progress percentage (0-100)
 */
export function getTrialProgress(startDate: Date): number {
  const elapsed = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(100, Math.round((elapsed / TRIAL_DAYS) * 100));
}

// --- Email templates ---

async function sendTrialReminderEmail(
  email: string,
  telegram: string | undefined,
  username: string,
  daysLeft: number
): Promise<void> {
  const subject = `⏰ Ваш trial заканчивается через ${daysLeft} ${getDayWord(daysLeft)}`;
  const urgency = daysLeft === 1 ? 'color: #ef4444;' : daysLeft === 3 ? 'color: #f59e0b;' : 'color: #06b6d4;';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <h2 style="${urgency}">⏰ Trial заканчивается через ${daysLeft} ${getDayWord(daysLeft)}</h2>
      <p style="color: #d1d5db;">Привет, ${username}!</p>
      <p style="color: #d1d5db;">Ваш бесплатный период использования AI Widget заканчивается через <strong style="color: #fff;">${daysLeft} ${getDayWord(daysLeft)}</strong>.</p>
      <p style="color: #d1d5db;">Чтобы продолжить работу вашего AI-виджета, настройте оплату в вашем кабинете.</p>
      <div style="margin: 24px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cabinet"
           style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #a855f7); color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Перейти в кабинет
        </a>
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
      <p style="color: #6b7280; font-size: 12px;">AI Widget Team</p>
    </div>
  `;

  await sendEmail(email, subject, html);

  if (telegram) {
    const msg = `⏰ <b>Trial заканчивается через ${daysLeft} ${getDayWord(daysLeft)}</b>\n\nПривет, ${username}! Настройте оплату, чтобы виджет продолжил работу.`;
    await sendTelegram(telegram, msg);
  }
}

async function sendTrialExpiredEmail(email: string, telegram: string | undefined, username: string): Promise<void> {
  const subject = '🚫 Ваш trial период закончился';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #fff; padding: 32px; border-radius: 16px;">
      <h2 style="color: #ef4444;">🚫 Trial период закончился</h2>
      <p style="color: #d1d5db;">Привет, ${username}!</p>
      <p style="color: #d1d5db;">Ваш бесплатный период использования AI Widget истёк. Виджет был приостановлен.</p>
      <p style="color: #d1d5db;">Настройте оплату, чтобы возобновить работу.</p>
      <div style="margin: 24px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/cabinet"
           style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600;">
          Возобновить подписку
        </a>
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
      <p style="color: #6b7280; font-size: 12px;">AI Widget Team</p>
    </div>
  `;

  await sendEmail(email, subject, html);

  if (telegram) {
    const msg = `🚫 <b>Trial закончился</b>\n\nПривет, ${username}! Ваш виджет приостановлен. Настройте оплату для возобновления.`;
    await sendTelegram(telegram, msg);
  }
}

function getDayWord(days: number): string {
  if (days === 1) return 'день';
  if (days >= 2 && days <= 4) return 'дня';
  return 'дней';
}
