/**
 * Telegram Bot Service
 *
 * Handles Telegram bot interactions:
 * - /start {clientToken} - Auto-link Telegram to client
 * - /status - Get subscription status
 * - /help - Show available commands
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

/**
 * Send a message to Telegram chat
 */
async function sendMessage(chatId: number | string, text: string, parseMode = 'HTML'): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram send error:', error);
    return false;
  }
}

/**
 * Handle /start command
 * Usage: /start clientToken
 * Links the user's Telegram to their AI Widget account
 */
async function handleStartCommand(chatId: number, args: string, firstName: string): Promise<void> {
  if (!args) {
    // No token provided - show welcome message
    await sendMessage(
      chatId,
      `👋 <b>Привет, ${firstName}!</b>\n\n` +
        `Это бот уведомлений AI Widget.\n\n` +
        `Чтобы привязать Telegram к вашему аккаунту:\n` +
        `1. Перейдите в личный кабинет\n` +
        `2. Нажмите "Привязать Telegram"\n` +
        `3. Или используйте: <code>/start ваш_токен</code>\n\n` +
        `Команды:\n` +
        `/status — статус подписки\n` +
        `/help — помощь`
    );
    return;
  }

  await connectDB();

  // Find client by token
  const client = await Client.findOne({ clientToken: args });

  if (!client) {
    await sendMessage(
      chatId,
      `❌ <b>Токен не найден</b>\n\nПроверьте правильность токена или получите новую ссылку в личном кабинете.`
    );
    return;
  }

  // Check if already linked
  if (client.telegram === String(chatId)) {
    await sendMessage(chatId, `✅ Telegram уже привязан к аккаунту <b>${client.username}</b>!`);
    return;
  }

  // Link Telegram
  await Client.updateOne({ clientId: client.clientId }, { telegram: String(chatId) });

  await sendMessage(
    chatId,
    `🎉 <b>Telegram успешно привязан!</b>\n\n` +
      `Аккаунт: <b>${client.username}</b>\n` +
      `Email: ${client.email}\n\n` +
      `Теперь вы будете получать уведомления:\n` +
      `• О расходах на AI API\n` +
      `• О платежах и подписке\n` +
      `• О важных событиях\n\n` +
      `Команды:\n` +
      `/status — статус подписки\n` +
      `/help — помощь`
  );
}

/**
 * Handle /status command
 * Shows subscription status and usage
 */
async function handleStatusCommand(chatId: number): Promise<void> {
  await connectDB();

  const client = await Client.findOne({ telegram: String(chatId) });

  if (!client) {
    await sendMessage(
      chatId,
      `❌ <b>Аккаунт не найден</b>\n\nПривяжите Telegram к аккаунту через личный кабинет или командой /start.`
    );
    return;
  }

  const statusEmoji: Record<string, string> = {
    trial: '🆓',
    active: '✅',
    past_due: '⚠️',
    canceled: '❌',
    suspended: '🚫',
  };

  const statusText: Record<string, string> = {
    trial: 'Пробный период',
    active: 'Активна',
    past_due: 'Ожидает оплаты',
    canceled: 'Отменена',
    suspended: 'Приостановлена',
  };

  const cost = client.monthlyCostUsd || 0;
  const extraCredits = client.extraCreditsUsd || 0;
  const effectiveLimit = 40 + extraCredits;
  const remaining = effectiveLimit - cost;

  let nextPayment = '—';
  if (client.nextPaymentDate) {
    nextPayment = new Date(client.nextPaymentDate).toLocaleDateString('ru-RU');
  }

  await sendMessage(
    chatId,
    `📊 <b>Статус: ${client.username}</b>\n\n` +
      `${statusEmoji[client.subscriptionStatus] || '❓'} Подписка: <b>${statusText[client.subscriptionStatus] || client.subscriptionStatus}</b>\n` +
      `💰 Расходы: <b>$${cost.toFixed(2)}</b> из $${effectiveLimit}\n` +
      `📈 Остаток: <b>$${remaining.toFixed(2)}</b>\n` +
      (extraCredits > 0 ? `🔋 Доп. кредиты: <b>$${extraCredits}</b>\n` : '') +
      `📅 Следующий платёж: ${nextPayment}\n` +
      `\n🔗 Виджет: ${client.isActive ? '✅ Включен' : '🚫 Выключен'}`
  );
}

/**
 * Handle /help command
 */
async function handleHelpCommand(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    `📖 <b>Команды бота AI Widget</b>\n\n` +
      `/start — привязать Telegram\n` +
      `/status — статус подписки и расходов\n` +
      `/help — эта справка\n\n` +
      `<b>Уведомления:</b>\n` +
      `• ⚠️ Предупреждение при достижении $20\n` +
      `• 🚫 Блокировка при $40 (можно докупить кредиты)\n` +
      `• ⏰ Напоминания об оплате\n` +
      `• ✅ Подтверждения платежей\n\n` +
      `Поддержка: @chatbotfusion`
  );
}

/**
 * Process incoming Telegram update
 */
export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const firstName = message.from.first_name;

  // Parse command
  if (text.startsWith('/start')) {
    const args = text.replace('/start', '').trim();
    await handleStartCommand(chatId, args, firstName);
  } else if (text === '/status') {
    await handleStatusCommand(chatId);
  } else if (text === '/help') {
    await handleHelpCommand(chatId);
  } else if (text.startsWith('/')) {
    await sendMessage(chatId, `❓ Неизвестная команда. Используйте /help для списка команд.`);
  }
}

/**
 * Generate Telegram deep link for client
 */
export function generateTelegramLink(clientToken: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'AIWidgetBot';
  return `https://t.me/${botUsername}?start=${clientToken}`;
}
