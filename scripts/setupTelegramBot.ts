/**
 * Telegram Bot Setup Script
 *
 * Run this script to set up the Telegram webhook:
 * npx ts-node scripts/setupTelegramBot.ts
 *
 * Or with environment variables:
 * TELEGRAM_BOT_TOKEN=xxx WEBHOOK_URL=https://your-domain.com npx ts-node scripts/setupTelegramBot.ts
 */

import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.WEBHOOK_URL;

async function main() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set');
    process.exit(1);
  }

  if (!BASE_URL) {
    console.error('❌ NEXT_PUBLIC_BASE_URL or WEBHOOK_URL not set');
    process.exit(1);
  }

  const webhookUrl = `${BASE_URL}/api/telegram/webhook`;

  console.log('🤖 Setting up Telegram Bot...\n');

  // 1. Get bot info
  const meResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const meData = await meResponse.json();

  if (!meData.ok) {
    console.error('❌ Invalid bot token:', meData.description);
    process.exit(1);
  }

  console.log(`✅ Bot: @${meData.result.username} (${meData.result.first_name})`);
  console.log(`   ID: ${meData.result.id}\n`);

  // 2. Set webhook
  console.log(`📡 Setting webhook to: ${webhookUrl}`);

  const webhookResponse = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
  );
  const webhookData = await webhookResponse.json();

  if (!webhookData.ok) {
    console.error('❌ Failed to set webhook:', webhookData.description);
    process.exit(1);
  }

  console.log('✅ Webhook set successfully!\n');

  // 3. Get webhook info
  const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const infoData = await infoResponse.json();

  console.log('📋 Webhook Info:');
  console.log(`   URL: ${infoData.result.url}`);
  console.log(`   Pending updates: ${infoData.result.pending_update_count}`);
  console.log(`   Last error: ${infoData.result.last_error_message || 'None'}\n`);

  // 4. Set commands
  console.log('📝 Setting bot commands...');

  const commandsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'Привязать Telegram к аккаунту' },
        { command: 'status', description: 'Статус подписки и расходов' },
        { command: 'help', description: 'Справка по командам' },
      ],
    }),
  });
  const commandsData = await commandsResponse.json();

  if (commandsData.ok) {
    console.log('✅ Commands set successfully!\n');
  }

  // Done
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉 Telegram Bot is ready!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nTo link Telegram, clients use:`);
  console.log(`  https://t.me/${meData.result.username}?start=CLIENT_TOKEN\n`);
  console.log('Add TELEGRAM_BOT_USERNAME to .env.local:');
  console.log(`  TELEGRAM_BOT_USERNAME=${meData.result.username}\n`);
}

main().catch(console.error);
