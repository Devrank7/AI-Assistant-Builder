/**
 * Cost Guard
 *
 * Monitors API spending per client and enforces cost limits.
 * Thresholds are configurable via admin panel (stored in DB).
 * - Warning threshold → warning notification
 * - Block threshold → widget disabled (unless extra credits purchased)
 * - Clients can top-up $10/$20/$30 to extend limit
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendEmail, sendTelegram, isEmailAllowed, getUnsubscribeFooter } from '@/lib/notifications';
import { getPricingConfig } from '@/lib/pricingConfig';

export const TOP_UP_OPTIONS = [10, 20, 30]; // Available top-up amounts

export type CostCheckResult = {
  allowed: boolean;
  status: 'ok' | 'warning' | 'blocked';
  monthlyCostUsd: number;
  message?: string;
  // Top-up info
  canTopUp: boolean;
  effectiveLimit: number;
  extraCreditsUsd: number;
  remainingCredits: number;
  topUpOptions: number[];
};

/**
 * Check if client has exceeded cost limits.
 * Call BEFORE processing a chat request.
 */
export async function checkCostLimit(clientId: string): Promise<CostCheckResult> {
  await connectDB();

  const config = await getPricingConfig();
  const COST_WARNING_THRESHOLD = config.costWarningThreshold;
  const COST_BLOCK_THRESHOLD = config.costBlockThreshold;

  const client = await Client.findOne({ clientId }).select(
    'monthlyCostUsd costResetDate costWarningNotified email telegram clientToken isActive extraCreditsUsd extraCreditsExpiry'
  );

  if (!client) {
    return {
      allowed: false,
      status: 'blocked',
      monthlyCostUsd: 0,
      message: 'Client not found',
      canTopUp: false,
      effectiveLimit: COST_BLOCK_THRESHOLD,
      extraCreditsUsd: 0,
      remainingCredits: 0,
      topUpOptions: [],
    };
  }

  // Check if we need to reset monthly counters
  const now = new Date();
  const resetDate = client.costResetDate ? new Date(client.costResetDate) : new Date(0);
  const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReset >= 30) {
    // Calculate unused credits to carry over
    const currentCost = client.monthlyCostUsd || 0;
    const currentExtraCredits = client.extraCreditsUsd || 0;

    // Unused credits = extra credits - (cost spent above base limit)
    const creditsUsed = Math.max(0, currentCost - COST_BLOCK_THRESHOLD);
    const unusedCredits = Math.max(0, currentExtraCredits - creditsUsed);

    // Reset monthly counters, but carry over unused credits
    await Client.updateOne(
      { clientId },
      {
        monthlyTokensInput: 0,
        monthlyTokensOutput: 0,
        monthlyCostUsd: 0,
        costResetDate: now,
        costWarningNotified: false,
        extraCreditsUsd: unusedCredits,
        extraCreditsExpiry: unusedCredits > 0 ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      }
    );

    const newEffectiveLimit = COST_BLOCK_THRESHOLD + unusedCredits;

    return {
      allowed: true,
      status: 'ok',
      monthlyCostUsd: 0,
      canTopUp: false,
      effectiveLimit: newEffectiveLimit,
      extraCreditsUsd: unusedCredits,
      remainingCredits: newEffectiveLimit,
      topUpOptions: TOP_UP_OPTIONS,
    };
  }

  const cost = client.monthlyCostUsd || 0;
  const extraCredits = client.extraCreditsUsd || 0;
  const effectiveLimit = COST_BLOCK_THRESHOLD + extraCredits;

  // BLOCKED: Over effective limit (base threshold + extra credits)
  if (cost >= effectiveLimit) {
    // Atomically disable widget only if still active (prevents duplicate notifications)
    const disableResult = await Client.findOneAndUpdate(
      { clientId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (disableResult) {
      await sendCostBlockedNotification(client.email, client.telegram, cost, effectiveLimit, client.clientToken).catch(
        (err) => console.error(`[CostGuard] Failed to send blocked notification for ${clientId}:`, err)
      );
    }

    return {
      allowed: false,
      status: 'blocked',
      monthlyCostUsd: cost,
      message: `Виджет отключен: расходы $${cost.toFixed(2)} превысили лимит $${effectiveLimit}. Докупите кредиты для продолжения.`,
      canTopUp: true,
      effectiveLimit,
      extraCreditsUsd: extraCredits,
      remainingCredits: 0,
      topUpOptions: TOP_UP_OPTIONS,
    };
  }

  // WARNING: Over warning threshold (atomic update to prevent duplicate notifications)
  if (cost >= COST_WARNING_THRESHOLD && !client.costWarningNotified) {
    const warnResult = await Client.findOneAndUpdate(
      { clientId, costWarningNotified: false },
      { costWarningNotified: true },
      { new: true }
    );
    if (warnResult) {
      await sendCostWarningNotification(client.email, client.telegram, cost, effectiveLimit, client.clientToken).catch(
        (err) => console.error(`[CostGuard] Failed to send warning notification for ${clientId}:`, err)
      );
    }

    return {
      allowed: true,
      status: 'warning',
      monthlyCostUsd: cost,
      message: `Внимание: расходы $${cost.toFixed(2)}. При превышении $${effectiveLimit} виджет будет отключен.`,
      canTopUp: false,
      effectiveLimit,
      extraCreditsUsd: extraCredits,
      remainingCredits: effectiveLimit - cost,
      topUpOptions: TOP_UP_OPTIONS,
    };
  }

  return {
    allowed: true,
    status: cost >= COST_WARNING_THRESHOLD ? 'warning' : 'ok',
    monthlyCostUsd: cost,
    canTopUp: false,
    effectiveLimit,
    extraCreditsUsd: extraCredits,
    remainingCredits: effectiveLimit - cost,
    topUpOptions: TOP_UP_OPTIONS,
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
 * Carries over unused extra credits (same logic as checkCostLimit)
 */
export async function resetMonthlyCosts(): Promise<number> {
  await connectDB();

  const config = await getPricingConfig();
  const COST_BLOCK_THRESHOLD = config.costBlockThreshold;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const clientsToReset = await Client.find({ costResetDate: { $lte: thirtyDaysAgo } });
  let resetCount = 0;

  for (const client of clientsToReset) {
    const currentCost = client.monthlyCostUsd || 0;
    const currentExtraCredits = client.extraCreditsUsd || 0;

    // Carry over unused credits (same formula as checkCostLimit)
    const creditsUsed = Math.max(0, currentCost - COST_BLOCK_THRESHOLD);
    const unusedCredits = Math.max(0, currentExtraCredits - creditsUsed);

    const now = new Date();
    await Client.updateOne(
      { _id: client._id },
      {
        monthlyTokensInput: 0,
        monthlyTokensOutput: 0,
        monthlyCostUsd: 0,
        costResetDate: now,
        costWarningNotified: false,
        extraCreditsUsd: unusedCredits,
        extraCreditsExpiry: unusedCredits > 0 ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      }
    );
    resetCount++;
  }

  return resetCount;
}

// --- Notification helpers ---

async function sendCostWarningNotification(
  email: string,
  telegram: string | undefined,
  currentCost: number,
  effectiveLimit: number,
  clientToken?: string
): Promise<void> {
  const subject = `⚠️ Предупреждение: высокие расходы на API — $${currentCost.toFixed(2)}`;

  if (await isEmailAllowed({ email })) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Высокие расходы на API</h2>
        <p>Ваши расходы на AI API за текущий месяц составили <strong>$${currentCost.toFixed(2)}</strong>.</p>
        <p>При превышении <strong>$${effectiveLimit}</strong> ваш виджет будет автоматически отключен.</p>
        <p>Рекомендации:</p>
        <ul>
          <li>Переключитесь на более экономичную модель (Gemini 3 Flash Lite)</li>
          <li>Уменьшите maxTokens в настройках AI</li>
          <li>Оптимизируйте базу знаний</li>
        </ul>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
        ${getUnsubscribeFooter(clientToken)}
      </div>
    `;
    await sendEmail(email, subject, html);
  }

  if (telegram) {
    await sendTelegram(
      telegram,
      `⚠️ <b>Высокие расходы на API</b>\n\nРасходы: <b>$${currentCost.toFixed(2)}</b> из $${effectiveLimit}\nПри превышении лимита виджет будет отключен.`
    );
  }
}

async function sendCostBlockedNotification(
  email: string,
  telegram: string | undefined,
  currentCost: number,
  effectiveLimit: number,
  clientToken?: string
): Promise<void> {
  const topUpUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/cabinet/credits`;
  const subject = `🚫 Виджет отключен: расходы $${currentCost.toFixed(2)} превысили лимит`;

  if (await isEmailAllowed({ email })) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">🚫 Виджет отключен</h2>
        <p>Ваши расходы на AI API за текущий месяц составили <strong>$${currentCost.toFixed(2)}</strong>, что превышает лимит <strong>$${effectiveLimit}</strong>.</p>
        <p>Ваш AI-виджет был автоматически отключен.</p>

        <div style="background: linear-gradient(135deg, #00d9ff 0%, #0066ff 100%); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="color: white; font-size: 16px; margin-bottom: 16px;">Хотите продолжить использование?</p>
          <a href="${topUpUrl}" style="display: inline-block; background: white; color: #0066ff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            💳 Докупить кредиты $10/$20/$30
          </a>
        </div>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">WinBix AI Team</p>
        ${getUnsubscribeFooter(clientToken)}
      </div>
    `;
    await sendEmail(email, subject, html);
  }

  if (telegram) {
    await sendTelegram(
      telegram,
      `🚫 <b>Виджет отключен</b>\n\nРасходы: <b>$${currentCost.toFixed(2)}</b> — превышен лимит $${effectiveLimit}.\n\n💳 Докупите кредиты: ${topUpUrl}`
    );
  }
}

/**
 * Add extra credits to client (after successful payment)
 */
export async function addExtraCredits(clientId: string, amount: number): Promise<boolean> {
  await connectDB();

  // Calculate expiry date (30 days from now or until cost reset)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  const result = await Client.updateOne(
    { clientId },
    {
      $inc: { extraCreditsUsd: amount },
      $set: {
        isActive: true, // Re-enable widget
        extraCreditsExpiry: expiryDate,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Added $${amount} extra credits for client ${clientId}`);
    return true;
  }

  return false;
}
