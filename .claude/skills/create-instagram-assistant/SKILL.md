---
name: create-instagram-assistant
description: Creates a custom Instagram DM assistant with an executable script.js that can integrate with ANY API (CRM, calendar, payments, etc.) for a specific client.
---

# Instagram Assistant Builder Skill

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
2. **Provider**: Which platform to use for Instagram integration
   - **ManyChat** (Recommended) - No App Review needed, free plan available
   - **Meta Graph API** (Direct) - Requires App Review with `instagram_manage_messages` permission (1-4 weeks)
3. **API Credentials** for chosen provider:
   - ManyChat: No API keys needed (webhook-based)
   - Meta Graph API: Page ID, Access Token
4. **Integrations**: Ask the user explicitly:

   > "What integrations does the Instagram bot need? For each one, I need to know:
   >
   > - **WHAT** system (CRM, calendar, payments, bookings, notifications, other)?
   > - **WHICH** specific service (Bitrix24, Google Calendar, Stripe, Telegram, Google Sheets, custom API)?
   > - **WHEN** should it trigger (every message, specific keywords, first contact, after AI response)?
   > - **HOW** does it connect (webhook URL, API key, token)?
   > - **WHAT CREDENTIALS** are needed (API keys, tokens, webhook URLs, chat IDs)?"

   Common integration types:
   - **CRM**: Bitrix24, AmoCRM, HubSpot (webhook URL + field mapping)
   - **Calendar**: Google Calendar, Calendly (booking URL or API)
   - **Payments**: Stripe, YooKassa (payment links or API)
   - **Notifications**: Telegram chat ID for admin alerts
   - **Google Sheets**: Spreadsheet ID for lead tracking
   - **Custom Webhook**: Any external URL

5. **Bot Personality** (or reuse from widget settings):
   - Name, tone (professional/friendly/casual), greeting message, language

### 1.3 Workflow Enforcement

1. **Check**: Do you have ALL "Mandatory Data"?
   - **NO**: Stop. Ask the user for specific missing fields.
   - **YES**: Confirm summary with user before proceeding.
2. **Start**: Only proceed to Section 2 after user confirmation.

---

## 2. Script Generation

This is the KEY difference from other channel skills. Instead of a static `integrations.json`, the AI agent writes an **executable `script.js`** that can integrate with ANY API using arbitrary logic.

### 2.1 Create Channel Directory

```
widgets/<clientId>/instagram/
```

### 2.2 Create `script.js`

Write to `widgets/<clientId>/instagram/script.js`.

**The script MUST follow this contract:**

```js
module.exports = {
  meta: {
    version: '1.0.0',
    channel: 'instagram',
    provider: 'manychat', // or 'meta'
    description: 'Instagram DM assistant for <clientId> — <brief description of what it does>',
    createdAt: '<ISO timestamp>',
  },

  /**
   * Called BEFORE the AI generates a response.
   * Use this to enrich context, block messages, or trigger pre-processing integrations.
   *
   * @param {object} ctx
   * @param {string} ctx.clientId - The client identifier
   * @param {string} ctx.channel - Always 'instagram'
   * @param {string} ctx.customerName - Customer name from Instagram profile
   * @param {string} ctx.message - The incoming message text
   * @param {string} ctx.sessionId - Unique session identifier
   * @param {string} ctx.igUserId - Instagram user ID of the sender
   * @param {object} ctx.secrets - Key-value secrets from DB (ctx.secrets.KEY)
   * @param {function} ctx.fetch - Sandboxed fetch for HTTP requests (ctx.fetch(url, options))
   * @param {function} ctx.log - Logging function (ctx.log('info', 'message'))
   * @returns {object} { extraContext?: string, skipAI?: boolean, directReply?: string }
   */
  async onBeforeAI(ctx) {
    // Example: Log every incoming message
    ctx.log('info', `Incoming DM from ${ctx.customerName}: ${ctx.message}`);

    // Return empty object to proceed normally to AI
    return {};
  },

  /**
   * Called AFTER the AI generates a response, before it is sent back.
   * Use this to fire integrations, modify the response, or trigger side effects.
   *
   * @param {object} ctx - Same as onBeforeAI, plus:
   * @param {string} ctx.aiResponse - The AI-generated response text
   * @returns {object} { modifiedResponse?: string }
   */
  async onAfterAIResponse(ctx) {
    // Integration logic goes here (CRM, notifications, etc.)

    return {};
  },
};
```

### 2.3 Script Contract Rules

1. **Exports**: `module.exports = { meta, onBeforeAI, onAfterAIResponse }`
2. **meta** (required):
   - `version` (string) - Semver, start at `'1.0.0'`
   - `channel` (string) - Always `'instagram'`
   - `provider` (string) - `'manychat'` or `'meta'`
   - `description` (string) - Human-readable summary
   - `createdAt` (string) - ISO 8601 timestamp
3. **onBeforeAI(ctx)** (async, required):
   - Runs before AI pipeline
   - Return `{ extraContext: "string" }` to inject extra context into the AI prompt
   - Return `{ skipAI: true, directReply: "string" }` to bypass AI entirely and send a direct reply
   - Return `{}` for default behavior
4. **onAfterAIResponse(ctx)** (async, required):
   - Runs after AI response is generated
   - Return `{ modifiedResponse: "string" }` to replace the AI response before sending
   - Return `{}` to send the AI response as-is
5. **ctx.secrets.KEY** - Read credentials from the database. NEVER hardcode secrets in the script.
6. **ctx.fetch(url, options)** - Sandboxed HTTP client for external API calls. Same API as Node `fetch`.
7. **ctx.log(level, message)** - Structured logging. Levels: `'info'`, `'warn'`, `'error'`.
8. **Instagram DM limit**: Responses MUST stay under **1000 characters**. The script should truncate or split if needed.

### 2.4 Create `channel.config.json`

Write to `widgets/<clientId>/instagram/channel.config.json`:

```json
{
  "clientId": "<clientId>",
  "channel": "instagram",
  "provider": "manychat|meta",
  "isActive": true,
  "createdAt": "<ISO timestamp>",
  "botPersonality": {
    "name": "<bot name>",
    "tone": "<professional_friendly|casual|formal>",
    "greeting": "<greeting message>",
    "language": "<ru|en|auto>",
    "maxResponseLength": 1000
  },
  "providerConfig": {
    "webhookUrl": "/api/webhooks/manychat"
  },
  "autoResponseRules": {
    "respondToStories": false,
    "respondToReels": false,
    "onlyDirectMessages": true
  }
}
```

**Note on `autoResponseRules`:**

- `respondToStories` - If `true`, the bot replies when someone mentions the account in a Story reply. Default `false` (noisy, usually not desired).
- `respondToReels` - If `true`, the bot replies to comments triggered via Reels. Default `false`.
- `onlyDirectMessages` - If `true`, the bot only responds to direct DM conversations. Default `true`.

---

## 3. Database Registration

After creating the files, register the channel in the database. **Secrets go in the DB, not in files.**

### 3.1 ManyChat Provider

```bash
curl -X POST /api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "clientId": "<clientId>",
    "channel": "instagram",
    "provider": "manychat",
    "config": {
      "secrets": {
        "BITRIX_WEBHOOK_URL": "<if CRM integration>",
        "TELEGRAM_BOT_TOKEN": "<if admin notification>",
        "TELEGRAM_CHAT_ID": "<if admin notification>",
        "GOOGLE_SHEETS_WEBHOOK": "<if sheets integration>",
        "STRIPE_API_KEY": "<if payments integration>"
      },
      "scriptEnabled": true
    },
    "isActive": true
  }'
```

### 3.2 Meta Graph API Provider

```bash
curl -X POST /api/channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "clientId": "<clientId>",
    "channel": "instagram",
    "provider": "meta",
    "config": {
      "secrets": {
        "META_PAGE_ID": "<page_id>",
        "META_ACCESS_TOKEN": "<access_token>",
        "BITRIX_WEBHOOK_URL": "<if CRM integration>",
        "TELEGRAM_BOT_TOKEN": "<if admin notification>",
        "TELEGRAM_CHAT_ID": "<if admin notification>"
      },
      "scriptEnabled": true
    },
    "isActive": true
  }'
```

**Important**: Only include the secret keys that the client actually needs. The `secrets` object is passed to the script at runtime via `ctx.secrets`.

---

## 4. Provider Setup Instructions

### 4.1 ManyChat Setup (Recommended)

Provide these instructions to the user:

1. Register at [manychat.com](https://manychat.com) (free plan works)
2. Connect Instagram account (must be **Business** or **Creator** account linked to a Facebook Page)
3. In ManyChat, create a new Flow:
   - Add trigger: **"Default Reply"** (catches all unhandled DMs)
   - Add action: **"External Request"**
     - URL: `https://<domain>/api/webhooks/manychat`
     - Method: POST
     - Body (JSON):
       ```json
       {
         "subscriber_id": "{{subscriber_id}}",
         "first_name": "{{first_name}}",
         "last_name": "{{last_name}}",
         "ig_id": "{{ig_id}}",
         "last_input_text": "{{last_input_text}}",
         "clientId": "<clientId>"
       }
       ```
   - Connect the External Request response to a **"Send Message"** block
   - Use `{{response.text}}` as the message content
4. Publish the Flow
5. Test by sending a DM to the Instagram account

**How it works**: ManyChat receives the DM, forwards it to our webhook. Our `manychatService.ts` loads `widgets/<clientId>/instagram/script.js`, calls `onBeforeAI`, runs the AI pipeline, calls `onAfterAIResponse`, and returns the response to ManyChat.

### 4.2 Meta Graph API Setup

Provide these instructions to the user:

1. Create an app at [developers.facebook.com](https://developers.facebook.com)
2. Add the "Instagram" product
3. Submit for App Review with `instagram_manage_messages` permission (takes 1-4 weeks)
4. After approval, configure Webhook:
   - URL: `https://<domain>/api/webhooks/instagram`
   - Subscribe to `messages` event
5. Get Page ID and Access Token from the API setup page
6. Store them in the DB registration (Section 3.2) as `META_PAGE_ID` and `META_ACCESS_TOKEN`
7. Test by sending a DM

**How it works**: Meta sends the webhook directly to our `instagramService.ts`, which loads the script, runs the hooks, and sends the reply back via the Graph API.

---

## 5. Integration Code Templates

When writing `script.js`, use these templates as building blocks. Combine as many as the client needs inside `onBeforeAI` and `onAfterAIResponse`.

### 5.1 CRM - Bitrix24 (Create Lead)

```js
// Inside onAfterAIResponse:
async onAfterAIResponse(ctx) {
  // Create lead in Bitrix24 on first contact or keyword trigger
  const keywords = ['записаться', 'book', 'appointment', 'запись'];
  const hasKeyword = keywords.some(k => ctx.message.toLowerCase().includes(k));

  if (hasKeyword) {
    try {
      const url = ctx.secrets.BITRIX_WEBHOOK_URL; // e.g. https://domain.bitrix24.ru/rest/1/abc123/crm.lead.add.json
      await ctx.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            TITLE: `Instagram Lead: ${ctx.customerName}`,
            NAME: ctx.customerName,
            SOURCE_ID: 'INSTAGRAM',
            SOURCE_DESCRIPTION: `DM via Instagram`,
            COMMENTS: ctx.message
          }
        })
      });
      ctx.log('info', `Bitrix24 lead created for ${ctx.customerName}`);
    } catch (err) {
      ctx.log('error', `Bitrix24 failed: ${err.message}`);
    }
  }

  return {};
}
```

### 5.2 Calendar - Google Calendar (via Zapier/Make webhook)

```js
// Inside onAfterAIResponse:
const bookingKeywords = ['забронировать', 'записаться', 'book', 'schedule'];
const wantsBooking = bookingKeywords.some((k) => ctx.message.toLowerCase().includes(k));

if (wantsBooking) {
  try {
    await ctx.fetch(ctx.secrets.CALENDAR_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: ctx.customerName,
        message: ctx.message,
        channel: 'instagram',
        sessionId: ctx.sessionId,
      }),
    });
    ctx.log('info', `Calendar booking request sent for ${ctx.customerName}`);
  } catch (err) {
    ctx.log('error', `Calendar webhook failed: ${err.message}`);
  }
}
```

### 5.3 Payments - Stripe (Generate Payment Link)

```js
// Inside onAfterAIResponse:
const payKeywords = ['оплатить', 'pay', 'payment', 'invoice', 'оплата'];
const wantsPayment = payKeywords.some((k) => ctx.message.toLowerCase().includes(k));

if (wantsPayment) {
  try {
    const res = await ctx.fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.secrets.STRIPE_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price]': ctx.secrets.STRIPE_PRICE_ID,
        'line_items[0][quantity]': '1',
      }).toString(),
    });
    const data = await res.json();
    if (data.url) {
      // Append payment link to AI response
      return { modifiedResponse: `${ctx.aiResponse}\n\nPayment link: ${data.url}` };
    }
  } catch (err) {
    ctx.log('error', `Stripe payment link failed: ${err.message}`);
  }
}
```

### 5.4 Admin Telegram Notification

```js
// Inside onAfterAIResponse:
try {
  const token = ctx.secrets.TELEGRAM_BOT_TOKEN;
  const chatId = ctx.secrets.TELEGRAM_CHAT_ID;
  const text = `New Instagram DM from ${ctx.customerName}:\n${ctx.message}\n\nAI replied:\n${ctx.aiResponse}`;

  await ctx.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  ctx.log('info', `Telegram notification sent for ${ctx.customerName}`);
} catch (err) {
  ctx.log('error', `Telegram notification failed: ${err.message}`);
}
```

### 5.5 Google Sheets (Lead Tracking via Apps Script Web App)

```js
// Inside onAfterAIResponse:
try {
  await ctx.fetch(ctx.secrets.GOOGLE_SHEETS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: ctx.customerName,
      message: ctx.message,
      aiResponse: ctx.aiResponse,
      channel: 'instagram',
      sessionId: ctx.sessionId,
      timestamp: new Date().toISOString(),
    }),
  });
  ctx.log('info', `Google Sheets row added for ${ctx.customerName}`);
} catch (err) {
  ctx.log('error', `Google Sheets export failed: ${err.message}`);
}
```

### 5.6 Full Combined Example

Here is a complete `script.js` combining multiple integrations:

```js
module.exports = {
  meta: {
    version: '1.0.0',
    channel: 'instagram',
    provider: 'manychat',
    description:
      'Instagram assistant for bruno_barber — books appointments, tracks leads in Bitrix24, notifies admin via Telegram',
    createdAt: '2026-02-08T12:00:00.000Z',
  },

  async onBeforeAI(ctx) {
    ctx.log('info', `[${ctx.clientId}] DM from ${ctx.customerName}: ${ctx.message}`);
    return {};
  },

  async onAfterAIResponse(ctx) {
    // --- 1. Bitrix24 CRM: create lead on booking keywords ---
    const crmKeywords = ['записаться', 'book', 'appointment'];
    if (crmKeywords.some((k) => ctx.message.toLowerCase().includes(k))) {
      try {
        await ctx.fetch(ctx.secrets.BITRIX_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              TITLE: `Instagram Lead: ${ctx.customerName}`,
              NAME: ctx.customerName,
              SOURCE_ID: 'INSTAGRAM',
              COMMENTS: ctx.message,
            },
          }),
        });
        ctx.log('info', `CRM lead created for ${ctx.customerName}`);
      } catch (err) {
        ctx.log('error', `CRM failed: ${err.message}`);
      }
    }

    // --- 2. Admin Telegram notification on every message ---
    try {
      const text = `Instagram DM from ${ctx.customerName}:\n${ctx.message}\n\nAI:\n${ctx.aiResponse}`;
      await ctx.fetch(`https://api.telegram.org/bot${ctx.secrets.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ctx.secrets.TELEGRAM_CHAT_ID,
          text: text,
        }),
      });
    } catch (err) {
      ctx.log('error', `Telegram notify failed: ${err.message}`);
    }

    // --- 3. Google Sheets lead tracking on first contact ---
    if (ctx.secrets.GOOGLE_SHEETS_WEBHOOK) {
      try {
        await ctx.fetch(ctx.secrets.GOOGLE_SHEETS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: ctx.customerName,
            message: ctx.message,
            aiResponse: ctx.aiResponse,
            channel: 'instagram',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        ctx.log('error', `Sheets failed: ${err.message}`);
      }
    }

    // Ensure response stays under Instagram's 1000-char DM limit
    if (ctx.aiResponse && ctx.aiResponse.length > 1000) {
      return { modifiedResponse: ctx.aiResponse.substring(0, 997) + '...' };
    }

    return {};
  },
};
```

---

## 6. Architecture Note

### 6.1 ManyChat Flow (Recommended)

```
Instagram DM
  -> ManyChat "Default Reply" trigger
    -> External Request to POST /api/webhooks/manychat
      -> manychatService.ts
        -> loads widgets/<clientId>/instagram/script.js
        -> calls script.onBeforeAI(ctx)
        -> runs AI pipeline (RAG + knowledge base)
        -> calls script.onAfterAIResponse(ctx)
        -> returns { text: "<response>" } to ManyChat
      -> ManyChat "Send Message" block sends response back to user
```

### 6.2 Meta Graph API Flow (Direct)

```
Instagram DM
  -> Meta Webhook to POST /api/webhooks/instagram
    -> instagramService.ts
      -> loads widgets/<clientId>/instagram/script.js
      -> calls script.onBeforeAI(ctx)
      -> runs AI pipeline (RAG + knowledge base)
      -> calls script.onAfterAIResponse(ctx)
      -> sends reply via Graph API POST /<PAGE_ID>/messages
```

### 6.3 Script Runner

Both services use a shared `scriptRunner` utility that:

1. Reads `widgets/<clientId>/instagram/script.js` from disk
2. Creates a sandboxed context with `ctx.secrets`, `ctx.fetch`, `ctx.log`
3. Calls hooks in order: `onBeforeAI` -> AI pipeline -> `onAfterAIResponse`
4. Catches and logs any script errors without crashing the main service

---

## 7. Instagram-Specific Constraints

### 7.1 Message Length Limit

Instagram DMs have a **1000-character limit** per message. The script and AI pipeline must enforce this:

- `channel.config.json` sets `"maxResponseLength": 1000` in `botPersonality`
- The AI system prompt should include: "Keep responses under 1000 characters."
- As a safety net, `onAfterAIResponse` should truncate if needed (see Section 5.6)

### 7.2 Auto-Response Rules

The `autoResponseRules` in `channel.config.json` control which Instagram interactions trigger the bot:

| Rule                 | Default | Description                                              |
| -------------------- | ------- | -------------------------------------------------------- |
| `respondToStories`   | `false` | Reply when someone mentions the account in a Story reply |
| `respondToReels`     | `false` | Reply to Reel comment interactions forwarded to DM       |
| `onlyDirectMessages` | `true`  | Only respond to direct DM conversations                  |

These are evaluated by the service layer before loading the script. If a message type is disabled, the script is never called.

### 7.3 Instagram Account Requirements

- The Instagram account **must** be a **Business** or **Creator** account
- It **must** be linked to a **Facebook Page**
- For ManyChat: The Facebook Page must be connected in ManyChat settings
- For Meta Graph API: The app must have `instagram_manage_messages` permission approved

---

## 8. Verification Checklist

After setup, verify:

1. [ ] `widgets/<clientId>/instagram/` directory exists
2. [ ] `widgets/<clientId>/instagram/script.js` exists and exports `{ meta, onBeforeAI, onAfterAIResponse }`
3. [ ] `widgets/<clientId>/instagram/channel.config.json` exists and is valid JSON
4. [ ] `script.js` does NOT contain any hardcoded secrets (search for API keys, tokens, passwords)
5. [ ] `script.js` uses only `ctx.secrets.KEY` for credentials
6. [ ] `script.js` uses only `ctx.fetch()` for HTTP requests (not bare `fetch` or `require('axios')`)
7. [ ] Channel registered in DB via `POST /api/channels` with `config.secrets` and `scriptEnabled: true`
8. [ ] All required secret keys are present in the DB `config.secrets` object
9. [ ] Admin panel shows "Instagram" tab for this client
10. [ ] Provider setup instructions provided to user (ManyChat or Meta Graph API)
11. [ ] AI response respects the 1000-character DM limit
12. [ ] Test message flow described to user

---

## 9. Security Notes

- **NEVER** hardcode API keys, tokens, webhook URLs with tokens, or any credentials in `script.js`
- All secrets are stored in the **database** (`ChannelConfig.config.secrets`) and injected at runtime via `ctx.secrets`
- `script.js` files live in `widgets/` which is served by the API route, but the `scriptRunner` only executes them server-side. The API route should NOT serve `.js` files from channel subdirectories to the public.
- `ctx.fetch()` is a sandboxed wrapper - it logs all outbound requests and can be rate-limited
- `ctx.log()` output goes to structured server logs, never exposed to the end user
- Always confirm with the user before storing any credentials in the database
- Recommend the user rotate API keys periodically
- The script runs in a limited sandbox: no filesystem access, no `require()`, no `process.env` - only the `ctx` object is available
