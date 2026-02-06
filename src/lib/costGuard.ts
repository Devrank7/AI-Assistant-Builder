/**
 * Cost Guard
 *
 * Monitors API spending per client and enforces cost limits.
 * - $20/month → warning notification
 * - $40/month → widget disabled
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendEmail } from '@/lib/notifications';

const COST_WARNING_THRESHOLD = 20; // USD per month
const COST_BLOCK_THRESHOLD = 40; // USD per month

export type CostCheckResult = {
  allowed: boolean;
  status: 'ok' | 'warning' | 'blocked';
  monthlyCostUsd: number;
  message?: string;
};

/**
 * Check if client has exceeded cost limits.
 * Call BEFORE processing a chat request.
 */
export async function checkCostLimit(clientId: string): Promise<CostCheckResult> {
  await connectDB();

  const client = await Client.findOne({ clientId }).select(
    'monthlyCostUsd costResetDate costWarningNotified email telegram isActive'
  );

  if (!client) {
    return { allowed: false, status: 'blocked', monthlyCostUsd: 0, message: 'Client not found' };
  }

  // Check if we need to reset monthly counters
  const now = new Date();
  const resetDate = client.costResetDate ? new Date(client.costResetDate) : new Date(0);
  const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30) {
    await Client.updateOne(
      { clientId },
      {
        monthlyTokensInput: 0,
        monthlyTokensOutput: 0,
        monthlyCostUsd: 0,
        costResetDate: now,
        costWarningNotified: false,
      }
    );
    return { allowed: true, status: 'ok', monthlyCostUsd: 0 };
  }

  const cost = client.monthlyCostUsd || 0;

  // BLOCKED: Over $40/month
  if (cost >= COST_BLOCK_THRESHOLD) {
    // Disable widget if not already disabled
    if (client.isActive) {
      await Client.updateOne({ clientId }, { isActive: false });

      // Notify client
      await sendCostBlockedNotification(client.email, client.telegram, cost);
    }

    return {
      allowed: false,
      status: 'blocked',
      monthlyCostUsd: cost,
      message: `Виджет отключен: расходы за месяц $${cost.toFixed(2)} превысили лимит $${COST_BLOCK_THRESHOLD}. Обратитесь к администратору.`,
    };
  }

  // WARNING: Over $20/month
  if (cost >= COST_WARNING_THRESHOLD && !client.costWarningNotified) {
    await Client.updateOne({ clientId }, { costWarningNotified: true });
    await sendCostWarningNotification(client.email, client.telegram, cost);

    return {
      allowed: true,
      status: 'warning',
      monthlyCostUsd: cost,
      message: `Внимание: расходы за месяц $${cost.toFixed(2)}. При превышении $${COST_BLOCK_THRESHOLD} виджет будет отключен.`,
    };
  }

  return {
    allowed: true,
    status: cost >= COST_WARNING_THRESHOLD ? 'warning' : 'ok',
    monthlyCostUsd: cost,
  };
}

/**
 * Update cost tracking after a chat request
 */
export async function trackCost(
  clientId: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  await Client.updateOne(
    { clientId },
    {
      $inc: {
        requests: 1,
        tokens: inputTokens + outputTokens,
        costUsd: costUsd,
        monthlyTokensInput: inputTokens,
        monthlyTokensOutput: outputTokens,
        monthlyCostUsd: costUsd,
      },
    }
  );
}

/**
 * Reset monthly costs for all clients (call from cron)
 */
export async function resetMonthlyCosts(): Promise<number> {
  await connectDB();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Client.updateMany(
    { costResetDate: { $lte: thirtyDaysAgo } },
    {
      monthlyTokensInput: 0,
      monthlyTokensOutput: 0,
      monthlyCostUsd: 0,
      costResetDate: new Date(),
      costWarningNotified: false,
    }
  );

  return result.modifiedCount;
}

// --- Notification helpers ---

async function sendCostWarningNotification(
  email: string,
  telegram: string | undefined,
  currentCost: number
): Promise<void> {
  const subject = `⚠️ Предупреждение: высокие расходы на API — $${currentCost.toFixed(2)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">⚠️ Высокие расходы на API</h2>
      <p>Ваши расходы на AI API за текущий месяц составили <strong>$${currentCost.toFixed(2)}</strong>.</p>
      <p>При превышении <strong>$${COST_BLOCK_THRESHOLD}</strong> ваш виджет будет автоматически отключен.</p>
      <p>Рекомендации:</p>
      <ul>
        <li>Переключитесь на более экономичную модель (Gemini 3 Flash Lite)</li>
        <li>Уменьшите maxTokens в настройках AI</li>
        <li>Оптимизируйте базу знаний</li>
      </ul>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">AI Widget Team</p>
    </div>
  `;

  await sendEmail(email, subject, html);

  if (telegram) {
    const { sendTelegram } = await import('@/lib/notifications');
    await sendTelegram(
      telegram,
      `⚠️ <b>Высокие расходы на API</b>\n\nРасходы: <b>$${currentCost.toFixed(2)}</b> из $${COST_BLOCK_THRESHOLD}\nПри превышении лимита виджет будет отключен.`
    );
  }
}

async function sendCostBlockedNotification(
  email: string,
  telegram: string | undefined,
  currentCost: number
): Promise<void> {
  const subject = `🚫 Виджет отключен: расходы $${currentCost.toFixed(2)} превысили лимит`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">🚫 Виджет отключен</h2>
      <p>Ваши расходы на AI API за текущий месяц составили <strong>$${currentCost.toFixed(2)}</strong>, что превышает лимит <strong>$${COST_BLOCK_THRESHOLD}</strong>.</p>
      <p>Ваш AI-виджет был автоматически отключен. Обратитесь к администратору для возобновления работы.</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">AI Widget Team</p>
    </div>
  `;

  await sendEmail(email, subject, html);

  if (telegram) {
    const { sendTelegram } = await import('@/lib/notifications');
    await sendTelegram(
      telegram,
      `🚫 <b>Виджет отключен</b>\n\nРасходы: <b>$${currentCost.toFixed(2)}</b> — превышен лимит $${COST_BLOCK_THRESHOLD}.\nОбратитесь к администратору.`
    );
  }
}
