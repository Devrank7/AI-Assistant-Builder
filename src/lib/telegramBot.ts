/**
 * Telegram Bot Service
 *
 * Handles Telegram bot interactions:
 * - /start {clientToken} - Auto-link Telegram to client
 * - /status - Get subscription status
 * - /help - Show available commands
 * - Regular text messages - Forward to AI chat via channelRouter
 */

import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { routeMessage } from '@/lib/channelRouter';
import { runBeforeAI, runAfterAIResponse, buildScriptContext, buildPreprocessContext } from '@/lib/scriptRunner';

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
 */
async function handleStartCommand(chatId: number, args: string, firstName: string): Promise<void> {
  if (!args) {
    await sendMessage(
      chatId,
      `👋 <b>Привет, ${firstName}!</b>\n\n` +
        `Это бот уведомлений WinBix AI.\n\n` +
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
  const client = await Client.findOne({ clientToken: args });

  if (!client) {
    await sendMessage(
      chatId,
      `❌ <b>Токен не найден</b>\n\nПроверьте правильность токена или получите новую ссылку в личном кабинете.`
    );
    return;
  }

  if (client.telegram === String(chatId)) {
    await sendMessage(chatId, `✅ Telegram уже привязан к аккаунту <b>${client.username}</b>!`);
    return;
  }

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
      `Также вы можете общаться с AI-ботом прямо здесь! Просто напишите любое сообщение.\n\n` +
      `Команды:\n` +
      `/status — статус подписки\n` +
      `/help — помощь`
  );
}

/**
 * Handle /status command
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

  let nextPayment = '—';
  if (client.nextPaymentDate) {
    nextPayment = new Date(client.nextPaymentDate).toLocaleDateString('ru-RU');
  }

  await sendMessage(
    chatId,
    `📊 <b>Статус: ${client.username}</b>\n\n` +
      `${statusEmoji[client.subscriptionStatus] || '❓'} Подписка: <b>${statusText[client.subscriptionStatus] || client.subscriptionStatus}</b>\n` +
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
    `📖 <b>Команды бота WinBix AI</b>\n\n` +
      `/start — привязать Telegram\n` +
      `/status — статус подписки\n` +
      `/help — эта справка\n\n` +
      `<b>AI-чат:</b>\n` +
      `Просто напишите любое сообщение, и AI-ассистент ответит вам.\n\n` +
      `<b>Уведомления:</b>\n` +
      `• ⏰ Напоминания об оплате\n` +
      `• ✅ Подтверждения платежей\n\n` +
      `Поддержка: @chatbotfusion`
  );
}

/**
 * Handle regular text message — forward to AI via channelRouter
 */
async function handleAIMessage(chatId: number, text: string, firstName: string): Promise<void> {
  await connectDB();

  // Find client linked to this Telegram chat
  const client = await Client.findOne({ telegram: String(chatId) });

  if (!client) {
    await sendMessage(chatId, `❌ Telegram не привязан к аккаунту. Используйте /start для привязки.`);
    return;
  }

  // Send "typing" action
  if (BOT_TOKEN) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    }).catch(() => {});
  }

  try {
    const sessionId = `tg_${chatId}_${new Date().toISOString().split('T')[0]}`;
    const metadata = {
      telegramChatId: chatId,
      telegramUsername: firstName,
    };

    // --- Script: onBeforeAI hook ---
    const preCtx = await buildPreprocessContext({
      clientId: client.clientId,
      channel: 'telegram',
      channelFolder: 'telegram-bot',
      rawMessage: text,
      metadata,
    });
    const preResult = await runBeforeAI(client.clientId, 'telegram-bot', preCtx);

    if (preResult.skip) {
      if (preResult.customResponse) await sendMessage(chatId, preResult.customResponse, 'Markdown');
      return;
    }

    const messageToSend = preResult.modifiedMessage || text;

    // --- AI pipeline ---
    const result = await routeMessage({
      channel: 'telegram',
      clientId: client.clientId,
      message: messageToSend,
      sessionId,
      metadata,
    });

    if (!result.success) {
      await sendMessage(chatId, `⚠️ ${result.error || 'Не удалось получить ответ от AI'}`);
      return;
    }

    // --- Script: onAfterAIResponse hook ---
    let response = result.response;
    const scriptCtx = await buildScriptContext({
      clientId: client.clientId,
      channel: 'telegram',
      channelFolder: 'telegram-bot',
      userMessage: messageToSend,
      aiResponse: response,
      sessionId,
      metadata,
      isFirstContact: false,
    });
    const scriptResult = await runAfterAIResponse(client.clientId, 'telegram-bot', scriptCtx);

    if (scriptResult.replaceResponse) {
      response = scriptResult.replaceResponse;
    } else if (scriptResult.appendToResponse) {
      response += scriptResult.appendToResponse;
    }

    // Truncate if too long for Telegram (max 4096 chars)
    if (response.length > 4000) {
      response = response.slice(0, 4000) + '...';
    }

    // Send as plain text (Telegram doesn't support rich blocks)
    await sendMessage(chatId, response, 'Markdown');
  } catch (error) {
    console.error('[TelegramBot] AI message error:', error);
    await sendMessage(chatId, `⚠️ Произошла ошибка. Попробуйте позже.`);
  }
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
  } else {
    // Regular text → AI chat
    await handleAIMessage(chatId, text, firstName);
  }
}

/**
 * Generate Telegram deep link for client
 */
export function generateTelegramLink(clientToken: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'WinBixAIBot';
  return `https://t.me/${botUsername}?start=${clientToken}`;
}
