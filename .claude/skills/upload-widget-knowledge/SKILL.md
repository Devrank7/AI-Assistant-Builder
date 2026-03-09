---
name: upload-widget-knowledge
description: Crawl a client's website and populate their AI knowledge base + system prompt. Works for both single clients and batch operations.
---

# Upload Widget Knowledge Skill

## 1. PURPOSE

Deep-crawl a client's website (ALL pages, not just a few), upload all extracted content as knowledge base chunks, and configure the AI system prompt. This ensures the widget's AI chatbot can answer questions about the business accurately.

**Input**: `clientId` + `website URL` (single client or list of clients)
**Output**: Knowledge base populated + system prompt configured

**When to use:**

- After building a quick widget (steps 8-9 of the widget pipeline)
- To fix widgets that have empty knowledge bases
- To refresh/update knowledge for existing widgets

---

## 2. PHASE 1 — DEEP CRAWL & UPLOAD KNOWLEDGE

### 2.1 One-Command Deep Crawl

Use the deep-crawl API endpoint. It automatically:

- Parses robots.txt and sitemap.xml
- Tries WordPress REST API (`/wp-json/wp/v2/pages` + `/posts`)
- BFS-crawls all discovered links (up to 50 pages, 800K chars)
- Deduplicates boilerplate (nav, footer, sidebar)
- Extracts JSON-LD structured data (for SPA sites)
- Chunks text into 500-char pieces with Gemini embeddings
- Replaces existing knowledge by default

```bash
curl -s -X POST "http://localhost:3000/api/knowledge/deep-crawl" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "clientId": "<clientId>",
    "websiteUrl": "<website URL>",
    "brandName": "<Brand Name>",
    "replace": true
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Crawled 28 pages, created 145 knowledge chunks",
  "crawl": {
    "totalPages": 28,
    "totalChars": 342000,
    "durationMs": 45000,
    "strategies": ["sitemap", "html-crawl"],
    "pageUrls": ["https://example.com", "https://example.com/about", "..."]
  },
  "knowledge": {
    "totalChunks": 145,
    "savedChunks": 145,
    "failedChunks": 0,
    "replaced": true
  }
}
```

### 2.2 Verify Upload

```bash
curl -s "http://localhost:3000/api/knowledge?clientId=<clientId>" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Check that chunks were created (should be > 0).

### 2.3 Homepage Analysis (for system prompt)

Use WebFetch to load the homepage **only** to gather info for the system prompt:

```
Analyze this website. Extract:
1. Company/brand name
2. Business type (dental, auto, hotel, restaurant, etc.)
3. Language of the site (uk, ru, en, etc.)
4. Brief company description (1-2 sentences)
5. Key services offered
6. Phone, email, address, working hours
```

This is a quick read — the deep crawl already handled the full content extraction.

---

## 3. PHASE 2 — SET AI SYSTEM PROMPT

### 3.1 Compose System Prompt

Build a system prompt from the homepage analysis. Keep it concise — the AI will find details in the knowledge base via RAG.

**Template:**

```
You are an AI assistant for <Brand Name> — <brief description of the business>.

Key services: <main services>

Contact information:
- Phone: <phone(s)>
- Email: <email(s)>
- Address: <address(es)>
- Working hours: <schedule>

Instructions:
- Answer questions based on the knowledge base provided via RAG
- Be helpful, professional, and friendly
- If you don't know the answer, suggest contacting the company directly
- Respond in <detected language of the site>
- Keep answers concise (2-4 sentences) unless more detail is specifically requested
- When asked about prices, provide exact numbers if available, otherwise say to contact for a quote
- When asked to book/schedule, collect the person's name, phone, and preferred time, then confirm you'll pass it to the team
```

### 3.2 Upload System Prompt

```bash
curl -s -X PUT "http://localhost:3000/api/ai-settings/<clientId>" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "systemPrompt": "<composed system prompt>",
    "greeting": "<greeting from widget.config.json>",
    "temperature": 0.7,
    "maxTokens": 1024,
    "topK": 5
  }'
```

**Note:** Read the greeting from the existing `widget.config.json` at `.claude/widget-builder/clients/<clientId>/widget.config.json` to keep it consistent.

---

## 4. BATCH MODE

When processing multiple clients at once:

### 4.1 Input

A list of `{ clientId, website }` pairs. Can come from:

- Direct user input
- Google Sheets (clients with `hasWidget=TRUE`)
- The `quickwidgets/` directory (scan for existing widgets)

### 4.2 Processing

For each client, call the deep-crawl endpoint. Process sequentially (the endpoint handles concurrency internally) or in batches of 2-3 clients.

```bash
# For each client:
curl -s -X POST "http://localhost:3000/api/knowledge/deep-crawl" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"clientId":"<clientId>","websiteUrl":"<website>","brandName":"<name>","replace":true}'
```

### 4.3 Error Handling

- If a site is unreachable → the API returns status 422 with error details, skip to next
- If knowledge upload partially fails → check `failedChunks` in response
- **Never stop the batch** — continue to next client on failure

### 4.4 Tracking

Track results:

- `successes`: array of `{ clientId, website, totalPages, savedChunks }`
- `failures`: array of `{ clientId, website, error }`

---

## 5. COMPLETION

### 5.1 Verify All Clients

After processing, verify each client has:

- Knowledge chunks > 0
- System prompt length > 100 characters

### 5.2 Report

Output summary:

```
Knowledge Upload Complete!

Results:
- Uploaded: N clients
- Failed: N clients

Successful:
1. <clientId> — <website> (N pages crawled, N chunks)
2. ...

Failed:
1. <clientId> — <website> (error)
```

---

## 6. API REFERENCE

### Deep Crawl & Upload Knowledge (PRIMARY METHOD)

```
POST /api/knowledge/deep-crawl
Cookie: admin_token=<token>
Body: { clientId, websiteUrl, brandName?, replace? }
→ { success, message, crawl: { totalPages, totalChars, strategies, pageUrls }, knowledge: { savedChunks, failedChunks } }
```

Automatically crawls ALL pages (sitemap + WP API + BFS), chunks text, generates embeddings, and uploads to DB.

### Manual Upload Knowledge (fallback)

```
POST /api/knowledge
Cookie: admin_token=<token>
Body: { clientId, text, source }
→ { success, message, chunks[] }
```

Use only if deep-crawl fails and you need to upload manually scraped content.

### Read Knowledge

```
GET /api/knowledge?clientId=<clientId>
Cookie: admin_token=<token>
→ { success, chunks[] }
```

### Set AI Settings

```
PUT /api/ai-settings/<clientId>
Cookie: admin_token=<token>
Body: { systemPrompt, greeting, temperature, maxTokens, topK }
→ { success, settings }
```

---

## 7. KEY CONSTRAINTS

- **DO NOT** invent or guess business information — only use content extracted from the actual website
- **DO NOT** skip the knowledge upload step — the AI is useless without it
- **DO** use the deep-crawl endpoint as the primary method — it gets ALL pages automatically
- **DO** use the same language as the website for the system prompt
- **DO** read the existing `widget.config.json` to get the greeting for AI settings
- Maximum system prompt size: keep under 8000 characters (Gemini context limit considerations)
- Knowledge text has no hard limit — the deep-crawl endpoint auto-chunks it
- The deep-crawl endpoint crawls up to 50 pages and 800K chars with a 3-minute timeout
