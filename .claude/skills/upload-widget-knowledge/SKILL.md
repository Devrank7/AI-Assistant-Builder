---
name: upload-widget-knowledge
description: Crawl a client's website and populate their AI knowledge base + system prompt. Works for both single clients and batch operations.
---

# Upload Widget Knowledge Skill

## 1. PURPOSE

Visit a client's website, crawl key pages, extract all business content, then upload it as knowledge base chunks and configure the AI system prompt. This ensures the widget's AI chatbot can answer questions about the business accurately.

**Input**: `clientId` + `website URL` (single client or list of clients)
**Output**: Knowledge base populated + system prompt configured

**When to use:**

- After building a quick widget (steps 8-9 of the widget pipeline)
- To fix widgets that have empty knowledge bases
- To refresh/update knowledge for existing widgets

---

## 2. PHASE 1 — CRAWL WEBSITE

### 2.1 Homepage Analysis

Use WebFetch to load the client's website homepage. Extract:

```
Analyze this website thoroughly. Extract ALL business information:

1. Company/brand name
2. What type of business (dental, auto, hotel, restaurant, etc.)
3. Language of the site (uk, ru, en, etc.)
4. Full tagline or slogan
5. ALL services listed (with descriptions and prices if visible)
6. Phone number(s)
7. Email address(es)
8. Physical address(es)
9. Working hours / schedule
10. Team members / doctors / specialists (names, titles, experience)
11. About the company (history, mission, values)
12. Any guarantees, certifications, or achievements
13. List ALL navigation links with full URLs for further crawling
```

### 2.2 Crawl Key Pages (5-8 pages)

From the homepage navigation, visit these pages in priority order:

1. **About / О нас / Про нас** — company history, team, mission
2. **Services / Услуги / Послуги** — full service list with details
3. **Pricing / Цены / Ціни** — prices for services
4. **FAQ / Вопросы / Запитання** — frequently asked questions
5. **Contact / Контакти** — detailed contact info, map, hours
6. **Team / Команда** — doctor/specialist profiles
7. **Gallery / Portfolio** — examples of work (if relevant)
8. **Reviews / Отзывы** — testimonials (summary only)

For each page, extract with this prompt:

```
Extract ALL useful business information from this page:
- Headings and subheadings
- Service descriptions with prices if available
- FAQ questions and answers
- Contact information (phone, email, address, hours)
- Team member names, titles, and specializations
- Any key facts, guarantees, achievements, or unique selling points
- Any specific procedures, technologies, or brands mentioned
Format as clean structured text. Include ALL details — prices, durations, specifics.
```

### 2.3 WordPress Fallback

Many Ukrainian sites use WordPress. If WebFetch returns mostly CSS/scripts instead of content:

1. Try WP REST API: `<website>/wp-json/wp/v2/pages?per_page=20`
2. Try sitemap: `<website>/sitemap.xml`
3. Try individual page URLs found in navigation

### 2.4 Compile All Content

After crawling all pages, compile a single comprehensive text document:

```
=== ABOUT <BRAND NAME> ===
<Company description, history, mission>

=== SERVICES ===
<All services with descriptions and prices>

=== TEAM ===
<All team members with titles and specializations>

=== PRICING ===
<All prices and packages>

=== FAQ ===
<All frequently asked questions and answers>

=== CONTACT INFORMATION ===
Phone: <phones>
Email: <emails>
Address: <addresses>
Working hours: <schedule>
Website: <url>

=== ADDITIONAL INFORMATION ===
<Guarantees, certifications, technologies, brands, etc.>
```

**Important:**

- Include ALL specific details (exact prices, exact hours, exact addresses)
- Include brand/product names mentioned (implant systems, equipment brands, etc.)
- Include team member names and their specializations
- Content should be in the SAME LANGUAGE as the website

---

## 3. PHASE 2 — UPLOAD KNOWLEDGE

### 3.1 Upload via API

Send ALL compiled content as a single POST to the knowledge endpoint. The API automatically splits text into 500-character chunks and generates embeddings.

```bash
curl -s -X POST "http://localhost:3000/api/knowledge" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "clientId": "<clientId>",
    "text": "<all compiled content>",
    "source": "website"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Created N knowledge chunks",
  "chunks": [...]
}
```

### 3.2 Verify Upload

```bash
curl -s "http://localhost:3000/api/knowledge?clientId=<clientId>" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Check that chunks were created (should be > 0).

---

## 4. PHASE 3 — SET AI SYSTEM PROMPT

### 4.1 Compose System Prompt

Build a system prompt from all gathered content. The prompt defines who the AI is and what it knows.

**Template:**

```
You are an AI assistant for <Brand Name> — <brief description of the business>.

<IMPORTANT CONTEXT FROM WEBSITE — include everything relevant:>

Company information:
<All extracted text from About page>

Services:
<All services with descriptions and prices>

Team:
<Key team members and their specializations>

FAQ:
<All FAQ content>

Contact information:
- Phone: <phone(s)>
- Email: <email(s)>
- Address: <address(es)>
- Working hours: <schedule>

Instructions:
- Answer questions based ONLY on the information above
- Be helpful, professional, and friendly
- If you don't know the answer, suggest contacting the company directly
- Respond in <detected language of the site>
- Keep answers concise (2-4 sentences) unless more detail is specifically requested
- When asked about prices, provide exact numbers if available, otherwise say to contact for a quote
- When asked to book/schedule, collect the person's name, phone, and preferred time, then confirm you'll pass it to the team
```

### 4.2 Upload System Prompt

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

### 4.3 Save Knowledge Locally

Save the compiled knowledge to the client's directory for reference:

```bash
mkdir -p .claude/widget-builder/clients/<clientId>/knowledge/
```

Write the compiled content to `.claude/widget-builder/clients/<clientId>/knowledge/context.md`.

---

## 5. BATCH MODE

When processing multiple clients at once:

### 5.1 Input

A list of `{ clientId, website }` pairs. Can come from:

- Direct user input
- Google Sheets (clients with `hasWidget=TRUE`)
- The `quickwidgets/` directory (scan for existing widgets)

### 5.2 Parallel Processing

For efficiency, process clients in parallel batches of 4-5 using subagents. Each subagent handles the full crawl → upload → configure flow for its assigned clients.

### 5.3 Error Handling

- If a site is unreachable → log failure, skip to next
- If WebFetch returns no content → try WordPress fallback
- If knowledge upload fails → retry once, then log failure
- **Never stop the batch** — continue to next client on failure

### 5.4 Tracking

Track results:

- `successes`: array of `{ clientId, website, chunksCreated, promptLength }`
- `failures`: array of `{ clientId, website, error }`

---

## 6. COMPLETION

### 6.1 Verify All Clients

After processing, verify each client has:

- Knowledge chunks > 0
- System prompt length > 100 characters

### 6.2 Report

Output summary:

```
Knowledge Upload Complete!

Results:
- Uploaded: N clients
- Failed: N clients

Successful:
1. <clientId> — <website> (N chunks, prompt N chars)
2. ...

Failed:
1. <clientId> — <website> (error)
```

---

## 7. API REFERENCE

### Upload Knowledge

```
POST /api/knowledge
Cookie: admin_token=<token>
Body: { clientId, text, source }
→ { success, message, chunks[] }
```

Text is automatically split into 500-char chunks with Gemini embeddings.

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

### Read Widget Config (local file)

```
.claude/widget-builder/clients/<clientId>/widget.config.json
→ { clientId, bot: { name, greeting, tone }, design, features }
```

---

## 8. KEY CONSTRAINTS

- **DO NOT** invent or guess business information — only use content extracted from the actual website
- **DO NOT** skip the knowledge upload step — the AI is useless without it
- **DO** save knowledge locally to `knowledge/context.md` for future reference
- **DO** use the same language as the website for the system prompt
- **DO** include ALL specific details (prices, hours, addresses, team names)
- **DO** read the existing `widget.config.json` to get the greeting for AI settings
- Maximum system prompt size: keep under 8000 characters (Gemini context limit considerations)
- Knowledge text has no hard limit — the API auto-chunks it
