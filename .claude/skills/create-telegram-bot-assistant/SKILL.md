---
name: create-telegram-bot-assistant
description: Creates a custom Telegram bot assistant with executable integration script for a specific client.
---

# Telegram Bot Assistant Builder Skill

## 1. CRITICAL PROTOCOL (READ FIRST)

**You MUST NOT start any implementation until ALL mandatory data is collected.**

### 1.1 Prerequisites (HARD BLOCK)

Before proceeding, verify that the client exists:

1. Check that `widgets/<clientId>/` directory exists
2. Check that `widgets/<clientId>/info.json` exists
3. Check that the client has a knowledge base (at least 1 chunk in the DB)

If ANY of these are missing, **STOP** and tell the user:

> "This client doesn't have a widget set up yet. Please run the `create-widget` skill first to create the client's widget, knowledge base, and configuration."

### 1.2 Mandatory Data (Ask user if missing)

1. **Client ID**: The exact folder name in `widgets/` (e.g., `bruno_barber`)
2. **Bot Token**: From @BotFather on Telegram
   - If user doesn't have one, guide them through creation
3. **Integrations**: Ask the user explicitly:

   > "What integrations does the Telegram bot need? For each one, I need to know:
   >
   > - **WHAT** system (CRM name, calendar, payments, etc.)?
   > - **WHAT API** does it use? (URL, REST endpoints)
   > - **WHEN** should it trigger (every message, specific keywords, first contact)?
   > - **WHAT DATA** should be sent?
   > - **API credentials** (tokens, keys) — I'll store them securely in the database, NOT in code."

4. **Bot Personality** (or reuse from widget settings):
   - Name, tone (professional/friendly/casual), greeting message, language

### 1.3 Workflow Enforcement

1. **Check**: Do you have ALL "Mandatory Data"?
   - **NO**: Stop. Ask the user for specific missing fields.
   - **YES**: Confirm summary with user before proceeding.
2. **Start**: Only proceed to Section 2 after user confirmation.

---

## 2. Script Generation

### 2.1 Create Channel Directory

```
widgets/<clientId>/telegram-bot/
```

### 2.2 Write `script.js`

This is the core deliverable. Write a **real executable Node.js script** to `widgets/<clientId>/telegram-bot/script.js`.

The script MUST follow this contract:

```javascript
module.exports = {
  meta: {
    version: '1.0.0',
    channel: 'telegram',
    provider: 'telegram',
    description: '<describe what this script does>',
    createdAt: '<ISO timestamp>',
  },

  // Optional: pre-process message before AI
  async onBeforeAI(ctx) {
    // ctx.rawMessage, ctx.metadata, ctx.secrets, ctx.fetch, ctx.log
    // Return: { skip?: boolean, customResponse?: string, modifiedMessage?: string }
    return {};
  },

  // Main integration hook: runs after AI generates response
  async onAfterAIResponse(ctx) {
    // ctx.clientId, ctx.channel, ctx.userMessage, ctx.aiResponse
    // ctx.customerName, ctx.customerId, ctx.isFirstContact
    // ctx.metadata, ctx.secrets, ctx.fetch, ctx.log, ctx.askAI
    // Return: { appendToResponse?: string, replaceResponse?: string }

    // YOUR CUSTOM INTEGRATION CODE HERE
    // You can call ANY API using ctx.fetch()
    // Access credentials via ctx.secrets.KEY_NAME

    return {};
  },
};
```

**IMPORTANT RULES for writing script.js:**

- **NEVER hardcode API keys or tokens** in the script. Always use `ctx.secrets.KEY_NAME`
- Use `ctx.fetch()` for all HTTP requests
- Use `ctx.log('info'|'warn'|'error', message, data)` for logging
- Use `ctx.askAI(message)` if you need to make additional AI calls
- All handlers must be `async` and return the correct shape
- Keep the code clean and well-commented
- Handle errors with try/catch — script failures must not crash the bot

### 2.3 Optionally write `channel.config.json` for metadata

Write to `widgets/<clientId>/telegram-bot/channel.config.json`:

```json
{
  "clientId": "<clientId>",
  "channel": "telegram",
  "provider": "telegram",
  "isActive": true,
  "createdAt": "<ISO timestamp>",
  "botPersonality": {
    "name": "<bot name>",
    "tone": "<professional_friendly|casual|formal>",
    "greeting": "<greeting message>",
    "language": "<ru|en|auto>"
  }
}
```

---

## 3. Database Registration

Register the channel and store secrets in the database:

```bash
curl -X POST /api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "clientId": "<clientId>",
    "channel": "telegram",
    "config": {
      "token": "<bot_token>",
      "secrets": {
        "CRM_API_KEY": "<key>",
        "CALENDAR_TOKEN": "<token>"
      },
      "scriptEnabled": true
    },
    "isActive": true
  }'
```

**IMPORTANT**: All API keys and tokens go into `config.secrets` in the database. The script reads them via `ctx.secrets.KEY_NAME`.

---

## 4. Bot Setup

### 4.1 Webhook Registration

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<domain>/api/telegram/webhook", "allowed_updates": ["message", "callback_query"]}'
```

### 4.2 Register Bot Commands (Optional)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands": [{"command": "start", "description": "Start the bot"}, {"command": "help", "description": "Get help"}]}'
```

---

## 5. Integration Code Templates

Use these as building blocks when writing the script. Adapt to the specific APIs the user needs.

### 5.1 CRM Lead Capture (Any CRM)

```javascript
// Inside onAfterAIResponse:
if (ctx.isFirstContact) {
  try {
    await ctx.fetch(ctx.secrets.CRM_WEBHOOK_URL || ctx.secrets.CRM_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.secrets.CRM_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: ctx.customerName || 'Telegram User',
        source: 'telegram',
        first_message: ctx.userMessage,
        customer_id: ctx.customerId,
      }),
    });
    ctx.log('info', 'CRM lead created');
  } catch (err) {
    ctx.log('error', 'CRM failed', err.message);
  }
}
```

### 5.2 Calendar / Booking

```javascript
if (/book|schedule|записат|забронировать/i.test(ctx.userMessage)) {
  try {
    const res = await ctx.fetch(ctx.secrets.CALENDAR_API_URL, {
      headers: { Authorization: `Bearer ${ctx.secrets.CALENDAR_TOKEN}` },
    });
    const data = await res.json();
    // Format available slots
    return { appendToResponse: '\n\nAvailable slots:\n' + formatSlots(data) };
  } catch (err) {
    ctx.log('error', 'Calendar fetch failed', err.message);
  }
}
```

### 5.3 Payment Link Generation

```javascript
if (/pay|оплат|invoice/i.test(ctx.userMessage)) {
  try {
    const res = await ctx.fetch(ctx.secrets.PAYMENT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.secrets.PAYMENT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100, // extracted from context or fixed
        currency: 'USD',
        description: `Payment from ${ctx.customerName}`,
      }),
    });
    const data = await res.json();
    if (data.payment_url) {
      return { appendToResponse: `\n\nPayment link: ${data.payment_url}` };
    }
  } catch (err) {
    ctx.log('error', 'Payment failed', err.message);
  }
}
```

### 5.4 Admin Notification via Telegram

```javascript
if (ctx.secrets.ADMIN_CHAT_ID) {
  const botToken = ctx.secrets.NOTIFICATION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    await ctx
      .fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ctx.secrets.ADMIN_CHAT_ID,
          text: `New Telegram msg from ${ctx.customerName}:\n${ctx.userMessage}\n\nAI: ${ctx.aiResponse.slice(0, 200)}`,
        }),
      })
      .catch(() => {});
  }
}
```

### 5.5 Google Sheets Lead Tracking

```javascript
if (ctx.isFirstContact && ctx.secrets.SHEETS_WEBHOOK_URL) {
  await ctx
    .fetch(ctx.secrets.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: ctx.customerName,
        channel: 'telegram',
        message: ctx.userMessage,
        timestamp: new Date().toISOString(),
      }),
    })
    .catch((err) => ctx.log('error', 'Sheets failed', err.message));
}
```

---

## 6. Existing Telegram Bot Architecture

The WinBix platform already has a Telegram bot system. Key files:

- **`src/lib/telegramBot.ts`** - Main bot handler, processes incoming messages, calls script hooks
- **`src/app/api/telegram/webhook/route.ts`** - Webhook endpoint
- **`src/lib/channelRouter.ts`** - Routes messages through AI pipeline
- **`src/lib/scriptRunner.ts`** - Loads and executes channel scripts

The existing bot:

- Handles `/start`, `/status`, `/help` commands
- Routes regular text through `routeMessage()` with RAG context
- Calls `onBeforeAI` hook before AI processing
- Calls `onAfterAIResponse` hook after AI response
- Logs conversations to ChatLog with `metadata.channel = 'telegram'`

---

## 7. Verification Checklist

After setup, verify:

1. [ ] `widgets/<clientId>/telegram-bot/script.js` exists and is valid
2. [ ] `widgets/<clientId>/telegram-bot/channel.config.json` exists
3. [ ] Channel registered in DB via `/api/channels` with secrets
4. [ ] Telegram webhook set via Bot API
5. [ ] Bot commands registered (if any)
6. [ ] Test message: send `/start` and a test question to the bot
7. [ ] Verify AI responds with knowledge base context
8. [ ] Verify integrations fire correctly (check logs)

---

## 8. Security Notes

- **NEVER** expose API keys in script.js code — use `ctx.secrets` only
- Bot token is stored in the **database** (ChannelConfig model)
- Custom integration secrets stored in `config.secrets` Map in DB
- Scripts run server-side only, never exposed to clients
- All script handlers have 10-second timeout protection
