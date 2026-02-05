/**
 * Notification Service
 * 
 * Handles Email and Telegram notifications for payment reminders.
 */

interface NotificationConfig {
    email?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    };
    telegram?: {
        botToken: string;
    };
}

/**
 * Send email notification
 */
async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'noreply@aiwidget.com';

    if (!host || !user || !pass) {
        console.warn('SMTP not configured, skipping email');
        return false;
    }

    try {
        // Dynamic import to avoid issues if nodemailer not installed
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
async function sendTelegram(chatId: string, message: string): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        console.warn('Telegram bot not configured, skipping notification');
        return false;
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                }),
            }
        );

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
    paymentSetupUrl: string
): Promise<void> {
    const subject = `⏰ Payment Reminder - ${daysUntilPayment} days left`;

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Reminder</h2>
            <p>Your AI Widget subscription payment of <strong>$50</strong> is due in <strong>${daysUntilPayment} days</strong>.</p>
            ${!paymentSetupUrl.includes('already') ? `
                <p>Please ensure your payment method is set up:</p>
                <a href="${paymentSetupUrl}" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Setup Payment Method
                </a>
            ` : '<p>Your payment method is already configured. Payment will be processed automatically.</p>'}
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">AI Widget Team</p>
        </div>
    `;

    // Send email
    await sendEmail(email, subject, emailHtml);

    // Send Telegram if configured
    if (telegram) {
        const telegramMsg = `
⏰ <b>Payment Reminder</b>

Your AI Widget subscription ($50) is due in <b>${daysUntilPayment} days</b>.

${!paymentSetupUrl.includes('already') ? `Set up payment: ${paymentSetupUrl}` : 'Payment will be processed automatically.'}
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
    paymentUrl: string
): Promise<void> {
    const subject = `❌ Payment Failed - Action Required`;

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Payment Failed</h2>
            <p>We were unable to process your AI Widget subscription payment.</p>
            <p><strong>Your service will be suspended in ${gracePeriodDays} days</strong> unless payment is received.</p>
            <a href="${paymentUrl}" style="display: inline-block; background: #e74c3c; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Pay Now - $50
            </a>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">AI Widget Team</p>
        </div>
    `;

    await sendEmail(email, subject, emailHtml);

    if (telegram) {
        const telegramMsg = `
❌ <b>Payment Failed</b>

We couldn't process your $50 subscription payment.

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
    reactivateUrl: string
): Promise<void> {
    const subject = `🚫 Service Suspended`;

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Service Suspended</h2>
            <p>Your AI Widget service has been suspended due to non-payment.</p>
            <p>To reactivate your widget, please complete the outstanding payment:</p>
            <a href="${reactivateUrl}" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Reactivate - Pay $50
            </a>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">AI Widget Team</p>
        </div>
    `;

    await sendEmail(email, subject, emailHtml);

    if (telegram) {
        const telegramMsg = `
🚫 <b>Service Suspended</b>

Your AI Widget has been suspended due to non-payment.

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
    nextPaymentDate: Date
): Promise<void> {
    const subject = `✅ Payment Successful`;

    const formattedDate = nextPaymentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Payment Successful!</h2>
            <p>Thank you! Your AI Widget subscription payment of <strong>$50</strong> has been processed.</p>
            <p>Next payment date: <strong>${formattedDate}</strong></p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">AI Widget Team</p>
        </div>
    `;

    await sendEmail(email, subject, emailHtml);

    if (telegram) {
        const telegramMsg = `
✅ <b>Payment Successful!</b>

Your $50 subscription payment is confirmed.
Next payment: ${formattedDate}
        `.trim();

        await sendTelegram(telegram, telegramMsg);
    }
}
