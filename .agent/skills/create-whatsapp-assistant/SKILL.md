---
name: create-whatsapp-assistant
description: Creates a custom WhatsApp assistant with an executable script.js that can integrate with ANY external API (CRM, calendar, payments, etc.) for a specific client.
---

# WhatsApp Assistant Builder Skill

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
2. **Provider**: Which platform to use for WhatsApp integration
   - **Whapi.cloud** (Recommended) - Works with a regular WhatsApp account, human + AI share the same number
   - **Meta Business API** (Official) - Requires business verification, separate dedicated number
3. **API Credentials** for chosen provider:
   - Whapi.cloud: API Token, Channel ID
   - Meta Business API: Phone Number ID, Access Token
4. **Phone Number**: The WhatsApp number that will be used (international format, e.g., `+1234567890`)
5. **Human Takeover Mode**: Should the AI pause when a human operator replies manually?
   - If yes: How many minutes before AI resumes? (default: 30)
6. **Integrations Needed**: Ask the user explicitly:

   > "What integrations does the WhatsApp bot need? For each one, I need to know:
   >
   > - **WHAT** system (CRM, calendar, payments, bookings, notifications, other)?
   > - **WHAT API** does it use (REST endpoint, webhook URL, SDK)?
   > - **WHEN** should it trigger (every message, specific keywords, first contact, after AI response)?
   > - **WHAT CREDENTIALS** does it need (API key, token, webhook secret)?
   > - **WHAT DATA** should be sent or received?"

   Common integration types:
   - **CRM**: Bitrix24, AmoCRM, HubSpot, Salesforce (API endpoint + auth token)
   - **Calendar**: Google Calendar, Calendly, Cal.com (API key or booking URL)
   - **Payments**: Stripe, YooKassa, LemonSqueezy (API key + price/product IDs)
   - **Notifications**: Telegram chat ID for admin alerts
   - **Google Sheets**: Spreadsheet ID + Google service account credentials
   - **Custom API**: Any external REST/GraphQL endpoint

7. **Bot Personality** (or reuse from widget settings):
   - Name, tone (professional/friendly/casual), greeting message, language

### 1.3 Workflow Enforcement

1. **Check**: Do you have ALL "Mandatory Data"?
   - **NO**: Stop. Ask the user for specific missing fields.
   - **YES**: Confirm summary with user before proceeding.
2. **Start**: Only proceed to Section 2 after user confirmation.

---

## 2. Script Generation (THE KEY DELIVERABLE)

Instead of a static `integrations.json`, you write an **executable `script.js`** that can call any API, transform data, apply business logic, and control the bot's behavior programmatically.

### 2.1 Create Channel Directory

```
widgets/<clientId>/whatsapp/
```

### 2.2 Write `widgets/<clientId>/whatsapp/script.js`

The script MUST follow the contract defined by `src/lib/scriptRunner.ts`:

```js
/**
 * WhatsApp channel script for <clientId>
 * Generated: <ISO timestamp>
 *
 * This script is loaded by scriptRunner.ts and executed as hooks
 * around the AI pipeline in whatsappService.ts.
 *
 * Available context (ctx):
 *   ctx.clientId       - Client identifier
 *   ctx.channel        - Always 'whatsapp'
 *   ctx.secrets.KEY    - Credentials from DB (NEVER hardcode secrets here)
 *   ctx.fetch(url, opts) - HTTP client for external API calls
 *   ctx.log(level, msg, data?) - Structured logging ('info'|'warn'|'error')
 *
 * onBeforeAI(ctx) also has:
 *   ctx.rawMessage      - The incoming message text
 *   ctx.metadata        - WhatsApp metadata (whatsappFrom, whatsappChatId, etc.)
 *
 * onAfterAIResponse(ctx) also has:
 *   ctx.userMessage     - The user's message (possibly modified by onBeforeAI)
 *   ctx.aiResponse      - The AI-generated response text
 *   ctx.sessionId       - Session identifier
 *   ctx.customerName    - Customer's WhatsApp name (from_name)
 *   ctx.customerId      - Customer's phone number (from)
 *   ctx.isFirstContact  - Whether this is the first message from this customer
 *   ctx.askAI(msg)      - Call the AI pipeline again with a different prompt
 */

module.exports = {
  meta: {
    version: '1.0.0',
    channel: 'whatsapp',
    provider: '<whapi|meta>',
    description: '<Short description of what this script does>',
    createdAt: '<ISO timestamp>',
  },

  /**
   * Hook: runs BEFORE the message is sent to the AI.
   * Use cases: keyword routing, spam filtering, modifying the message,
   *            short-circuiting with a custom response (skip AI entirely).
   *
   * Return value:
   *   {}                              - proceed normally
   *   { modifiedMessage: 'new text' } - change what the AI sees
   *   { skip: true, customResponse: 'text' } - skip AI, send this instead
   *   { skip: true }                  - skip AI, send nothing
   */
  async onBeforeAI(ctx) {
    // Example: detect a keyword and skip AI
    // if (ctx.rawMessage.toLowerCase().includes('human')) {
    //   return { skip: true, customResponse: 'Connecting you to a human operator...' };
    // }
    return {};
  },

  /**
   * Hook: runs AFTER the AI generates a response, BEFORE it is sent to the user.
   * Use cases: CRM logging, calendar booking, payment links, admin notifications,
   *            appending/replacing the AI response, Google Sheets export.
   *
   * Return value:
   *   {}                                  - send AI response as-is
   *   { appendToResponse: '\n\nExtra' }   - add text after AI response
   *   { replaceResponse: 'New response' } - replace AI response entirely
   */
  async onAfterAIResponse(ctx) {
    // Integration logic goes here (see Section 7 for templates)
    return {};
  },
};
```

### 2.3 Script Contract Rules

1. **`module.exports`** must export an object with `meta` (required), `onBeforeAI` (optional), `onAfterAIResponse` (optional)
2. **`meta`** must contain: `version` (string), `channel` (string), `description` (string), `createdAt` (ISO string). `provider` is optional.
3. **NEVER hardcode secrets** (API keys, tokens, passwords) in the script file. Always use `ctx.secrets.KEY_NAME` which reads from the database.
4. **Use `ctx.fetch()`** for all HTTP requests to external APIs. Do NOT use `require('axios')` or other libraries.
5. **Use `ctx.log()`** for all logging. Do NOT use `console.log()` directly.
6. Both hooks have a **10-second timeout** enforced by the script runner. Keep API calls fast.
7. Scripts are **CommonJS** (`module.exports`), NOT ES modules. Do NOT use `import`/`export`.
8. Scripts are **cached for 60 seconds** and then reloaded from disk. Changes take effect within 1 minute.
9. **Error isolation**: if a script throws, the error is caught by `scriptRunner.ts` and the AI pipeline continues normally. Scripts cannot crash the server.

---

## 3. Database Registration

After creating the script file, register the channel in the database via `POST /api/channels`. This stores the provider credentials that `scriptRunner.ts` will inject as `ctx.secrets`.

### 3.1 Whapi.cloud Registration

```bash
curl -X POST https://<domain>/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "clientId": "<clientId>",
    "channel": "whatsapp",
    "provider": "whapi",
    "config": {
      "whapiToken": "<whapi_api_token>",
      "whapiChannelId": "<whapi_channel_id>",
      "humanTakeover": true,
      "humanTimeoutMinutes": 30,
      "scriptEnabled": true,
      "secrets": {
        "CRM_API_KEY": "<crm_api_key_if_needed>",
        "TELEGRAM_ADMIN_CHAT_ID": "<chat_id_if_needed>",
        "SHEETS_WEBHOOK_URL": "<sheets_webhook_if_needed>"
      }
    },
    "isActive": true
  }'
```

### 3.2 Meta Business API Registration

```bash
curl -X POST https://<domain>/api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "clientId": "<clientId>",
    "channel": "whatsapp",
    "provider": "meta",
    "config": {
      "phoneNumberId": "<phone_number_id>",
      "apiKey": "<access_token>",
      "scriptEnabled": true,
      "secrets": {
        "CRM_API_KEY": "<crm_api_key_if_needed>",
        "TELEGRAM_ADMIN_CHAT_ID": "<chat_id_if_needed>",
        "SHEETS_WEBHOOK_URL": "<sheets_webhook_if_needed>"
      }
    },
    "isActive": true
  }'
```

**Important**: The `config.secrets` object is the dedicated map for integration credentials. The `scriptRunner.ts` `getSecrets()` function extracts both top-level string values from `config` (like `whapiToken`) AND everything inside `config.secrets`. Inside the script, all of these are accessible via `ctx.secrets.KEY`.

---

## 4. Provider Setup Instructions

### 4.1 Whapi.cloud Setup (Recommended)

Provide these instructions to the user:

1. Register at [whapi.cloud](https://whapi.cloud)
2. Create a new channel
3. Scan QR code with WhatsApp on your phone to link the account
4. Copy **API Token** and **Channel ID** from the dashboard
5. In Whapi.cloud channel settings, configure Webhook:
   - URL: `https://<domain>/api/webhooks/whapi`
   - Events: Enable `messages.post` (incoming messages)
6. Test by sending a WhatsApp message to the linked number

**Why Whapi.cloud is recommended:**

- Works with a regular WhatsApp account (no Meta business verification)
- Human and AI share the same phone number seamlessly
- Detects `from_me` messages for human takeover logic
- Fast setup (minutes, not days)
- Free tier available for testing

### 4.2 Meta Business API Setup

Provide these instructions to the user:

1. Create a Meta Business account at [business.facebook.com](https://business.facebook.com)
2. Create an app at [developers.facebook.com](https://developers.facebook.com)
3. Add "WhatsApp" product to your app
4. Complete business verification (may take 1-5 business days)
5. Get a phone number assigned in WhatsApp Business settings
6. Configure Webhook:
   - URL: `https://<domain>/api/webhooks/whatsapp`
   - Verify token: Use a secure random string
   - Subscribe to `messages` webhook field
7. Copy **Phone Number ID** and **Access Token**
8. Test by sending a message to the business number

**Note**: Meta API does not have built-in `from_me` detection like Whapi. Human takeover with Meta requires additional implementation on the admin side.

---

## 5. Human Takeover (Built-In)

Human takeover is already implemented in `src/lib/whatsappService.ts`. No script code is needed for this feature.

### How It Works

1. **Detection**: When Whapi sends a webhook with `from_me: true`, `whatsappService.ts` calls `markHumanTakeover(clientId, chatId)` which stores a timestamp in an in-memory map.
2. **Bot Pause**: Before processing any incoming message, `isBotPaused(clientId, chatId, timeoutMinutes)` checks if the human recently replied. If yes, the bot skips the message silently.
3. **Auto-Resume**: After `humanTimeoutMinutes` of inactivity from the human, the bot automatically resumes responding.
4. **Configuration**: Controlled by two fields in the DB channel config:
   - `config.humanTakeover` (boolean, default: true)
   - `config.humanTimeoutMinutes` (number, default: 30)

### Typical Use Case

A customer asks a question the AI cannot answer. The business owner opens WhatsApp on their phone and replies directly. The bot immediately stops responding to that chat. After 30 minutes (configurable) of no human replies, the bot resumes.

---

## 6. Architecture: How Scripts Fit Into the Pipeline

The message flow in `src/lib/whatsappService.ts`:

```
Webhook received (Whapi or Meta)
  |
  v
[Human takeover check] --> paused? --> SKIP (no response)
  |
  v (not paused)
[scriptRunner.buildPreprocessContext()]
  |
  v
[scriptRunner.runBeforeAI()] --> script.onBeforeAI(ctx)
  |                                  |
  |            skip:true? ---------> Send customResponse (if any), STOP
  |
  v (proceed)
[channelRouter.routeMessage()] --> AI pipeline (RAG + knowledge base)
  |
  v
[scriptRunner.buildScriptContext()]
  |
  v
[scriptRunner.runAfterAIResponse()] --> script.onAfterAIResponse(ctx)
  |                                       |
  |            replaceResponse? -------> Use replacement text
  |            appendToResponse? ------> Append to AI response
  |
  v
[Send final message to customer via Whapi/Meta API]
```

**Key files:**

- `src/lib/whatsappService.ts` - Processes webhooks, calls script hooks, sends responses
- `src/lib/scriptRunner.ts` - Loads, caches, and executes `script.js` files with sandboxed context
- `src/lib/channelRouter.ts` - Routes messages through the AI pipeline with RAG context
- `widgets/<clientId>/whatsapp/script.js` - The per-client executable script (this is what you create)

---

## 7. Integration Code Templates

Use these as building blocks when writing `script.js`. Combine multiple integrations in a single script.

### 7.1 CRM (Any REST API -- HubSpot, AmoCRM, Bitrix24, Salesforce, etc.)

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  // Send new lead to CRM on first contact
  if (ctx.isFirstContact) {
    try {
      const res = await ctx.fetch(ctx.secrets.CRM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.secrets.CRM_API_KEY}`,
        },
        body: JSON.stringify({
          name: ctx.customerName || 'WhatsApp Lead',
          phone: ctx.customerId,
          source: 'whatsapp',
          firstMessage: ctx.userMessage,
          aiResponse: ctx.aiResponse,
          sessionId: ctx.sessionId,
        }),
      });

      if (!res.ok) {
        ctx.log('error', 'CRM lead creation failed', { status: res.status });
      } else {
        ctx.log('info', 'CRM lead created', { customer: ctx.customerId });
      }
    } catch (err) {
      ctx.log('error', 'CRM integration error', { error: err.message });
    }
  }

  return {};
},
```

**Secrets needed in DB**: `CRM_API_URL`, `CRM_API_KEY`

### 7.2 Calendar Booking (Google Calendar, Calendly, Cal.com)

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  const bookingKeywords = ['book', 'schedule', 'appointment', 'reserve',
                           'записаться', 'забронировать', 'запись'];
  const wantsBooking = bookingKeywords.some(kw =>
    ctx.userMessage.toLowerCase().includes(kw)
  );

  if (wantsBooking) {
    try {
      // Option A: Return a booking link
      const bookingUrl = ctx.secrets.BOOKING_URL; // e.g., Calendly or Cal.com link
      return {
        appendToResponse: `\n\nBook your appointment here: ${bookingUrl}`,
      };

      // Option B: Create event via API (e.g., Google Calendar)
      // const res = await ctx.fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${ctx.secrets.GOOGLE_CALENDAR_TOKEN}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     summary: `WhatsApp Booking: ${ctx.customerName}`,
      //     description: ctx.userMessage,
      //     start: { dateTime: extractedDateTime },
      //     end: { dateTime: extractedEndTime },
      //   }),
      // });
    } catch (err) {
      ctx.log('error', 'Calendar integration error', { error: err.message });
    }
  }

  return {};
},
```

**Secrets needed in DB**: `BOOKING_URL` or `GOOGLE_CALENDAR_TOKEN`

### 7.3 Payments (Stripe, YooKassa, LemonSqueezy)

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  const paymentKeywords = ['pay', 'payment', 'invoice', 'buy', 'purchase',
                           'оплатить', 'оплата', 'купить', 'счёт'];
  const wantsPayment = paymentKeywords.some(kw =>
    ctx.userMessage.toLowerCase().includes(kw)
  );

  if (wantsPayment) {
    try {
      // Create a Stripe payment link
      const res = await ctx.fetch('https://api.stripe.com/v1/payment_links', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(ctx.secrets.STRIPE_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'line_items[0][price]': ctx.secrets.STRIPE_PRICE_ID,
          'line_items[0][quantity]': '1',
        }).toString(),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          appendToResponse: `\n\nPay here: ${data.url}`,
        };
      } else {
        ctx.log('error', 'Stripe payment link creation failed', { status: res.status });
      }
    } catch (err) {
      ctx.log('error', 'Payment integration error', { error: err.message });
    }
  }

  return {};
},
```

**Secrets needed in DB**: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`

### 7.4 Admin Telegram Notification

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  // Notify admin on first contact via Telegram
  if (ctx.isFirstContact && ctx.secrets.TELEGRAM_BOT_TOKEN && ctx.secrets.TELEGRAM_ADMIN_CHAT_ID) {
    try {
      const text = [
        '📱 New WhatsApp lead!',
        `Name: ${ctx.customerName || 'Unknown'}`,
        `Phone: ${ctx.customerId}`,
        `Message: ${ctx.userMessage}`,
        `AI Response: ${ctx.aiResponse.slice(0, 200)}...`,
      ].join('\n');

      await ctx.fetch(
        `https://api.telegram.org/bot${ctx.secrets.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ctx.secrets.TELEGRAM_ADMIN_CHAT_ID,
            text,
            parse_mode: 'HTML',
          }),
        }
      );

      ctx.log('info', 'Admin notified via Telegram');
    } catch (err) {
      ctx.log('error', 'Telegram notification failed', { error: err.message });
    }
  }

  return {};
},
```

**Secrets needed in DB**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`

### 7.5 Google Sheets Lead Tracking

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  // Log every conversation to Google Sheets via Apps Script webhook
  if (ctx.secrets.SHEETS_WEBHOOK_URL) {
    try {
      await ctx.fetch(ctx.secrets.SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          customerName: ctx.customerName || 'Unknown',
          customerPhone: ctx.customerId,
          message: ctx.userMessage,
          aiResponse: ctx.aiResponse,
          channel: 'whatsapp',
          sessionId: ctx.sessionId,
          isFirstContact: ctx.isFirstContact,
        }),
      });

      ctx.log('info', 'Lead logged to Google Sheets');
    } catch (err) {
      ctx.log('error', 'Google Sheets logging failed', { error: err.message });
    }
  }

  return {};
},
```

**Secrets needed in DB**: `SHEETS_WEBHOOK_URL` (Google Apps Script web app URL or Zapier/Make webhook)

### 7.6 Combining Multiple Integrations

A real script typically combines several integrations. Here is a full example:

```js
module.exports = {
  meta: {
    version: '1.0.0',
    channel: 'whatsapp',
    provider: 'whapi',
    description: 'Barber shop bot: CRM + Telegram alerts + booking link',
    createdAt: '2026-02-08T12:00:00.000Z',
  },

  async onBeforeAI(ctx) {
    // Keyword shortcut: skip AI for simple questions
    const msg = ctx.rawMessage.toLowerCase().trim();

    if (msg === 'hours' || msg === 'часы работы') {
      return { skip: true, customResponse: 'We are open Mon-Sat, 9:00-20:00.' };
    }

    if (msg === 'address' || msg === 'адрес') {
      return { skip: true, customResponse: '123 Main Street, Suite 4. Google Maps: https://maps.app.goo.gl/xxx' };
    }

    return {};
  },

  async onAfterAIResponse(ctx) {
    const results = {};

    // 1. CRM: create lead on first contact
    if (ctx.isFirstContact && ctx.secrets.CRM_API_URL) {
      try {
        await ctx.fetch(ctx.secrets.CRM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.secrets.CRM_API_KEY}`,
          },
          body: JSON.stringify({
            name: ctx.customerName || 'WhatsApp Lead',
            phone: ctx.customerId,
            source: 'whatsapp',
            firstMessage: ctx.userMessage,
          }),
        });
        ctx.log('info', 'CRM lead created');
      } catch (err) {
        ctx.log('error', 'CRM error', { error: err.message });
      }
    }

    // 2. Telegram: notify admin on first contact
    if (ctx.isFirstContact && ctx.secrets.TELEGRAM_BOT_TOKEN) {
      try {
        await ctx.fetch(`https://api.telegram.org/bot${ctx.secrets.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ctx.secrets.TELEGRAM_ADMIN_CHAT_ID,
            text: `New WhatsApp lead!\nName: ${ctx.customerName}\nPhone: ${ctx.customerId}\nMsg: ${ctx.userMessage}`,
          }),
        });
      } catch (err) {
        ctx.log('error', 'Telegram notify error', { error: err.message });
      }
    }

    // 3. Booking: append link when keywords detected
    const bookingKeywords = ['book', 'appointment', 'schedule', 'записаться', 'запись'];
    if (bookingKeywords.some((kw) => ctx.userMessage.toLowerCase().includes(kw))) {
      results.appendToResponse = `\n\nBook online: ${ctx.secrets.BOOKING_URL || 'https://calendly.com/example'}`;
    }

    return results;
  },
};
```

---

## 8. Verification Checklist

After setup, verify:

1. [ ] `widgets/<clientId>/whatsapp/` directory exists
2. [ ] `widgets/<clientId>/whatsapp/script.js` exists and is valid CommonJS
3. [ ] `script.js` has a `meta` object with `version`, `channel`, `description`, `createdAt`
4. [ ] `script.js` does NOT contain any hardcoded API keys, tokens, or passwords
5. [ ] All integration credentials are stored in DB via `POST /api/channels` under `config.secrets`
6. [ ] Channel registered in DB with correct `provider` (`whapi` or `meta`) and `isActive: true`
7. [ ] Provider webhook URL configured:
   - Whapi.cloud: `https://<domain>/api/webhooks/whapi`
   - Meta: `https://<domain>/api/webhooks/whatsapp`
8. [ ] Human takeover settings match user requirements (`humanTakeover`, `humanTimeoutMinutes`)
9. [ ] Admin panel shows "WhatsApp" channel for this client
10. [ ] Test message: send a WhatsApp message and confirm AI responds
11. [ ] Test integrations: trigger each integration (CRM, calendar, etc.) and verify external API calls succeed
12. [ ] Check logs for `[Script:<clientId>/whatsapp]` entries to confirm script execution

---

## 9. Security Notes

- **NEVER hardcode secrets in `script.js`**. All API keys, tokens, and passwords MUST be stored in the database via `POST /api/channels` in `config.secrets` and accessed as `ctx.secrets.KEY_NAME` at runtime.
- **Script files live on the server filesystem** at `widgets/<clientId>/whatsapp/script.js`. They are NOT served to browsers. The API route at `src/app/widgets/[...path]/route.ts` serves widget assets but the `whatsapp/` subfolder contains server-side scripts only.
- **Provider tokens** (`whapiToken`, `apiKey`) are stored in `ChannelConfig.config` in MongoDB and are excluded from GET responses by the channels API (see `.select('-config.token -config.apiKey -config.webhookSecret -config.whapiToken')` in `src/app/api/channels/route.ts`).
- **Script sandboxing**: Scripts run in the Node.js process but are isolated by `scriptRunner.ts` which catches all errors and enforces a 10-second timeout. A broken script cannot crash the server or affect other clients.
- **Path traversal protection**: `scriptRunner.ts` verifies that the resolved script path stays within the `widgets/` directory before loading.
- **Do not expose webhook URLs publicly** -- the Whapi/Meta webhook endpoints should only be called by the respective providers. Consider adding signature verification for production deployments.
- Always confirm with the user before storing any credentials in the database.
