/**
 * Notification Service
 *
 * Handles Email and Telegram notifications for payment reminders.
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * Check if client has email notifications enabled.
 * Returns true if client allows emails (or if client not found — send anyway for safety).
 */
export async function isEmailAllowed(clientIdentifier: { email?: string; clientId?: string }): Promise<boolean> {
  try {
    await connectDB();
    const query = clientIdentifier.clientId
      ? { clientId: clientIdentifier.clientId }
      : { email: clientIdentifier.email };
    const client = await Client.findOne(query).select('emailNotifications').lean();
    // If client not found or field not set, default to allowing emails
    if (!client) return true;
    return client.emailNotifications !== false;
  } catch {
    return true; // On error, don't block important emails
  }
}

/**
 * Generate unsubscribe footer HTML for emails.
 */
export function getUnsubscribeFooter(clientToken?: string): string {
  if (!clientToken) return '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #999; font-size: 11px;">
        <a href="${baseUrl}/api/unsubscribe?token=${clientToken}" style="color: #999; text-decoration: underline;">Отписаться от уведомлений</a>
        &nbsp;|&nbsp;
        <a href="${baseUrl}/cabinet" style="color: #999; text-decoration: underline;">Настройки уведомлений</a>
      </p>
    </div>
  `;
}

/**
 * Send email notification
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'winbix.ai@gmail.com';

  if (!host || !user || !pass) {
    console.warn('SMTP not configured, skipping email');
    return false;
  }

  try {
    // Dynamic import to avoid issues if nodemailer not installed
    // @ts-expect-error - nodemailer types are optional
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send Telegram notification
 */
export async function sendTelegram(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('Telegram bot not configured, skipping notification');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    console.log(`Telegram sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error('Failed to send Telegram:', error);
    return false;
  }
}

/**
 * Send payment reminder (3 days before)
 */
export async function sendPaymentReminder(
  email: string,
  telegram: string | undefined,
  daysUntilPayment: number,
  paymentUrl: string,
  clientToken?: string
): Promise<void> {
  const subject =
    daysUntilPayment > 0
      ? `⏰ Payment Reminder - ${daysUntilPayment} days left`
      : `⏰ Payment Required - Subscription Expired`;

  const daysText =
    daysUntilPayment > 0 ? `is due in <strong>${daysUntilPayment} days</strong>` : `is <strong>due now</strong>`;

  if (await isEmailAllowed({ email })) {
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Reminder</h2>
            <p>Your WinBix AI subscription payment ${daysText}.</p>
            <p>Please complete your payment:</p>
            <a href="${paymentUrl}" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Pay Now
            </a>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
            ${getUnsubscribeFooter(clientToken)}
        </div>
    `;
    await sendEmail(email, subject, emailHtml);
  }

  if (telegram) {
    const daysTelegramText = daysUntilPayment > 0 ? `is due in <b>${daysUntilPayment} days</b>` : `is <b>due now</b>`;

    const telegramMsg = `
⏰ <b>Payment Reminder</b>

Your WinBix AI subscription ${daysTelegramText}.

Pay now: ${paymentUrl}
        `.trim();

    await sendTelegram(telegram, telegramMsg);
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedNotice(
  email: string,
  telegram: string | undefined,
  gracePeriodDays: number,
  paymentUrl: string,
  amount: number = 50,
  clientToken?: string
): Promise<void> {
  const subject = `❌ Payment Failed - Action Required`;

  if (await isEmailAllowed({ email })) {
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Payment Failed</h2>
            <p>We were unable to process your WinBix AI subscription payment.</p>
            <p><strong>Your service will be suspended in ${gracePeriodDays} days</strong> unless payment is received.</p>
            <a href="${paymentUrl}" style="display: inline-block; background: #e74c3c; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Pay Now - $${amount}
            </a>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
            ${getUnsubscribeFooter(clientToken)}
        </div>
    `;
    await sendEmail(email, subject, emailHtml);
  }

  if (telegram) {
    const telegramMsg = `
❌ <b>Payment Failed</b>

We couldn't process your $${amount} subscription payment.

⚠️ Your widget will be <b>suspended in ${gracePeriodDays} days</b>.

👉 ${paymentUrl}
        `.trim();

    await sendTelegram(telegram, telegramMsg);
  }
}

/**
 * Send suspension notice
 */
export async function sendSuspensionNotice(
  email: string,
  telegram: string | undefined,
  reactivateUrl: string,
  amount: number = 50,
  clientToken?: string
): Promise<void> {
  const subject = `🚫 Service Suspended`;

  if (await isEmailAllowed({ email })) {
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Service Suspended</h2>
            <p>Your WinBix AI service has been suspended due to non-payment.</p>
            <p>To reactivate your widget, please complete the outstanding payment:</p>
            <a href="${reactivateUrl}" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Reactivate - Pay $${amount}
            </a>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
            ${getUnsubscribeFooter(clientToken)}
        </div>
    `;
    await sendEmail(email, subject, emailHtml);
  }

  if (telegram) {
    const telegramMsg = `
🚫 <b>Service Suspended</b>

Your WinBix AI widget has been suspended due to non-payment.

To reactivate: ${reactivateUrl}
        `.trim();

    await sendTelegram(telegram, telegramMsg);
  }
}

/**
 * Send payment success confirmation
 */
export async function sendPaymentSuccessNotice(
  email: string,
  telegram: string | undefined,
  nextPaymentDate: Date,
  amount: number = 50,
  clientToken?: string
): Promise<void> {
  const subject = `✅ Payment Successful`;

  const formattedDate = nextPaymentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (await isEmailAllowed({ email })) {
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Payment Successful!</h2>
            <p>Thank you! Your WinBix AI subscription payment of <strong>$${amount}</strong> has been processed.</p>
            <p>Next payment date: <strong>${formattedDate}</strong></p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
            ${getUnsubscribeFooter(clientToken)}
        </div>
    `;
    await sendEmail(email, subject, emailHtml);
  }

  if (telegram) {
    const telegramMsg = `
✅ <b>Payment Successful!</b>

Your $${amount} subscription payment is confirmed.
Next payment: ${formattedDate}
        `.trim();

    await sendTelegram(telegram, telegramMsg);
  }
}
