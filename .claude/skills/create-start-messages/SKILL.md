---
name: create-start-messages
description: Generate personalized first outreach messages for leads that already have a widget. Analyzes each lead's website via browser, determines niche, crafts a message using sales prompt templates, and writes results to Google Sheets.
---

# Create Start Messages Skill

## 1. PURPOSE

Read leads from a Google Sheets spreadsheet (today's "DD.MM.YYYY Проверенные лиды"), filter leads that **already have a widget** (`hasWidget = TRUE`), visit each lead's website to analyze their business niche, and generate a personalized first outreach message based on the prompt templates in `.claude/prompts/`.

After generating messages, write them to a new **"start message"** column in the sheet and send a Telegram summary report.

**Input**: Optional spreadsheet URL/ID, optional limit (number of leads to process)
**Output**: Google Sheet updated with personalized start messages + Telegram report

---

## 2. INPUT PARSING

Extract optional parameters from the user's message:

```
- spreadsheetUrl or spreadsheetId (optional — if not given, auto-search by today's date)
- limit (optional — max number of leads to process, e.g. "first 10", "5 leads". Default: ALL leads with hasWidget=TRUE)
- sheetName (optional — tab name, default: first sheet)
```

---

## 3. PHASE 1 — FIND SPREADSHEET

### 3.1 If URL/ID Provided

Extract the spreadsheet ID from the URL:

- Full URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
- Or just the ID string directly

### 3.2 If No URL/ID Provided — Auto-Search

Get today's date in DD.MM.YYYY format. Then search using the API:

```bash
# Search for today's verified leads spreadsheet
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

If no results, try the fallback:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Квалифицированные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Response format:

```json
{
  "success": true,
  "spreadsheets": [{ "id": "SPREADSHEET_ID", "name": "11.02.2026 Проверенные лиды" }]
}
```

If neither found → ask the user for the spreadsheet URL.

---

## 4. PHASE 2 — READ LEADS & FILTER

### 4.1 Read Sheet Data

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Response format:

```json
{
  "success": true,
  "headers": ["email", "website", "username", "hasWidget", "start message"],
  "rows": [
    {
      "email": "info@example.com",
      "website": "https://example.com",
      "username": "example",
      "hasWidget": "TRUE",
      "start message": ""
    }
  ]
}
```

### 4.2 Filter Leads

Filter leads for processing — the OPPOSITE of mass-quick-widgets:

1. **ONLY process** rows where `hasWidget` column value is `TRUE` (case-insensitive) — these leads already have a widget
2. **Skip** rows where `hasWidget` is empty, `FALSE`, or anything other than `TRUE`
3. **Skip** rows where `start message` column already has content (don't overwrite existing messages)
4. **Skip** rows where `website` is empty (need a website to analyze)
5. **Apply limit** if specified by the user

**Filtering logic:**

```
for each row:
  if row.hasWidget?.toUpperCase() !== 'TRUE' → SKIP (no widget yet)
  if row['start message'] is not empty → SKIP (already has a message)
  if row.website is empty → SKIP (can't analyze without website)
  otherwise → PROCESS this lead
```

### 4.3 Collect Lead Data

For each lead to process, collect all available columns:

```
- website (REQUIRED)
- email
- username / clientId
- phone
- instagram
- city / location
- google_rating
- review_count
- owner_name / contact_name
- any other columns present in the sheet
```

---

## 5. PHASE 3 — ANALYZE WEBSITE & GENERATE MESSAGE (per lead)

This is the core phase. For EACH lead, perform these steps:

### 5.1 CRITICAL: Launch Browser — Visit the Website

**You MUST use WebFetch** to visit the lead's website. This is mandatory — do NOT skip this step or guess the niche.

```
Step 1: WebFetch the homepage
  → Extract: business name, tagline, primary services, location, languages, contact info

Step 2: WebFetch 2-3 key inner pages (About, Services, Contact)
  → Extract: detailed services, pricing (if available), team info, working hours
```

**What to extract from the website:**

- `business_name` — exact name of the business
- `niche` — dental clinic, beauty salon, construction, hotel, restaurant, medical clinic, law firm, auto repair, real estate agency, fitness/gym, veterinary clinic, etc.
- `city` / `country` — location (from contact page, footer, or address)
- `language` — primary language of the site (English, Arabic, Russian, Ukrainian, Polish, etc.)
- `services` — list of main services offered
- `prices` — any prices shown on the site
- `working_hours` — business hours if found
- `team_info` — owner/doctor/stylist names if visible
- `instagram` — Instagram handle if linked
- `phone` — phone number if found
- `unique_details` — anything specific that stands out (specialization, awards, new location, etc.)

### 5.2 Determine the Niche

Based on website analysis, classify the business into one of these niches:

| Niche          | Keywords to look for                                          |
| -------------- | ------------------------------------------------------------- |
| `dental`       | dentist, dental, teeth, implant, orthodontics, стоматология   |
| `beauty_salon` | salon, beauty, hair, nails, spa, makeup, салон красоты        |
| `medical`      | clinic, doctor, medical, healthcare, hospital, клиника        |
| `construction` | construction, building, renovation, contractor, строительство |
| `hotel`        | hotel, resort, rooms, booking, accommodation, гостиница       |
| `restaurant`   | restaurant, cafe, menu, food, delivery, ресторан              |
| `fitness`      | gym, fitness, yoga, CrossFit, фитнес                          |
| `auto`         | auto, car, repair, service, СТО, автосервис                   |
| `real_estate`  | real estate, property, apartments, недвижимость               |
| `legal`        | lawyer, law firm, legal, юрист, адвокат                       |
| `education`    | school, courses, training, education, обучение                |
| `other`        | anything that doesn't fit above                               |

### 5.3 Load Prompt Templates

Based on the determined niche, reference the appropriate materials:

1. **ALWAYS use**: `.claude/prompts/outreach_agent_system_prompt.md` — the master sales prompt (Phase 1: OPENER section)
2. **If niche is `dental`**: Also reference `.claude/prompts/niche_dental_addon.md`
3. **If niche is `beauty_salon`**: Also reference `.claude/prompts/niche_beauty_salon_addon.md`
4. **For other niches**: Use the general OPENER patterns from the master prompt, adapted to the niche

### 5.4 Construct the Demo Link

Each lead already has a widget (hasWidget=TRUE). Construct the demo link:

```
Demo URL format:
{BASE_URL}/demo/client-website?client={clientId}&website={encoded_website_url}
```

Where:

- `{BASE_URL}` = value of `NEXT_PUBLIC_BASE_URL` environment variable (default: `https://winbix-ai.pp.ua`)
- `{clientId}` = the lead's username/clientId from the sheet
- `{encoded_website_url}` = URL-encoded website address

**Example:**

```
https://winbix-ai.pp.ua/demo/client-website?client=smile-dental&website=https%3A%2F%2Fsmile-dental.com
```

### 5.5 Generate the First Message

Using the extracted website data, niche, and prompt templates, generate a personalized first outreach message.

**Message Structure:**

The message must follow Phase 1 (OPENER) rules from `outreach_agent_system_prompt.md`:

1. **Reference something SPECIFIC about their business** (not generic) — use data from WebFetch
2. **Ask a genuine question** (not rhetorical) — related to their niche pain points
3. **Be SHORT** — 4-6 lines max for the main opener
4. **NO pitch in the opener part** — just observation + question
5. **THEN add a bridge line** — transition to the demo
6. **Include the demo link** — show that you already built something for them
7. **End with a soft CTA** — "take a look when you have a minute"

**Message Template (adapt to niche and language):**

```
Привет, {owner_name or business_name}! 👋

{PERSONALIZED OBSERVATION about their business from website analysis — 1-2 sentences referencing something SPECIFIC you saw on their site}

{GENUINE QUESTION about a pain point relevant to their niche — 1 sentence}

Кстати, мы уже набросали, как мог бы выглядеть ИИ-ассистент прямо на вашем сайте — он умеет отвечать на вопросы клиентов о ваших услугах 24/7.

Вот демо: {DEMO_LINK}

Посмотрите, когда будет минутка — буду рад услышать ваше мнение! 🙏
```

**IMPORTANT MESSAGE RULES:**

- **Language**: Write the message in the SAME language as the lead's website. If the site is in Russian → message in Russian. If in English → English. If Arabic → Arabic with English greeting.
- **Tone**: Friendly, casual, like a real person texts on WhatsApp. NOT corporate.
- **Length**: Total message should be 6-10 lines maximum (fits on one phone screen)
- **Emojis**: Maximum 2-3 emojis in the whole message
- **NO jargon**: Never say "AI-powered", "cutting-edge", "innovative solution"
- **DO reference specifics**: Mention their actual business name, services you saw, location, etc.
- **ALWAYS include the demo link**: This is the key differentiator — we already built something for them
- **The demo link is a DRAFT/MOCKUP**: Frame it as "we sketched out how it could look" not "we built your product"

**Examples by niche:**

**Dental clinic (Russian site):**

```
Привет! 👋

Зашёл на сайт {business_name} — впечатляет, особенно раздел с имплантацией. Заметил, что у вас нет онлайн-чата на сайте — пациенты могут только звонить. А если кто-то заходит на сайт вечером с острой болью — он найдёт тот номер телефона?

Мы как раз набросали демо, как мог бы выглядеть ИИ-ассистент на вашем сайте — он отвечает на вопросы о ваших услугах, ценах и может записать на приём 24/7:

{DEMO_LINK}

Посмотрите, когда будет минутка! 🙏
```

**Beauty salon (English site, Dubai):**

```
Hi! 👋

I was just looking at {business_name}'s website — your portfolio is stunning, especially the {specific_service} work.

Quick question — when someone DMs you at 10pm asking about prices or availability, how quickly does someone usually reply?

We actually put together a quick demo of an assistant that could handle those questions 24/7 right on your website:

{DEMO_LINK}

Take a look when you get a chance — would love your thoughts! 🙏
```

**Construction (Ukrainian site):**

```
Привіт! 👋

Подивився сайт {business_name} — класні проєкти, особливо {specific_project_or_service}. Помітив, що заявки можна залишити тільки через форму.

А якщо клієнт зайшов ввечері і хоче одразу дізнатись приблизну вартість {service} — він чекає до ранку?

Ми зробили набросок, як на вашому сайті міг би працювати ІІ-помічник — він відповідає на питання про ваші послуги та збирає заявки 24/7:

{DEMO_LINK}

Подивіться, коли буде хвилинка! 🙏
```

### 5.6 Track Results

After generating each message, track:

- `successes`: array of `{ username, website, niche, messagePreview }` (first 50 chars of message)
- `failures`: array of `{ username, website, error }` (site unreachable, couldn't determine niche, etc.)
- `skipped`: count of skipped rows

### 5.7 Error Handling

If a lead fails (site unreachable, can't determine niche, etc.):

- Log the error
- Add to `failures` list
- **Continue to next lead** — do NOT stop on failure

---

## 6. PHASE 4 — UPDATE SPREADSHEET

After ALL leads are processed, batch-update the "start message" column.

### 6.1 Find or Create the "start message" Column

Check if `start message` column exists in headers:

- If YES: use that column letter
- If NO: add it as the next column after the last header

To add a new header:

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!X1",
    "values": [["start message"]]
  }'
```

(Replace `X` with the actual column letter)

### 6.2 Batch Update Messages

For all successfully processed leads, write the generated message to the "start message" column:

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!X2:X50",
    "values": [["message for lead 1"], [""], ["message for lead 3"], ["message for lead 4"]]
  }'
```

**IMPORTANT**: The values array must align with the actual row positions. Use empty strings `""` for rows that were skipped or failed.

---

## 7. PHASE 5 — TELEGRAM REPORT

Send a summary report via Telegram:

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "message": "<report HTML>"
  }'
```

### 7.1 Report Template

```html
📝 <b>Start Messages Report</b>

📅 Date: DD.MM.YYYY 📋 Sheet:
<spreadsheet name>
  ✅ Messages generated: N ❌ Failed: N leads ⏭ Skipped: N leads (no widget / already has message / no website)

  <b>Results:</b>
  1. username — niche — ✅ message written 2. username — niche — ✅ message written 3. username — niche — ❌ (site
  unreachable) 🔗 <a href="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID">Open Sheet</a></spreadsheet
>
```

---

## 8. COMPLETION

After everything is done, output a summary to the user:

```
✅ Start messages generation complete!

📊 Results:
- Messages generated: N
- Failed: N leads (couldn't analyze website)
- Skipped: N leads (no widget / already has message / no website)

📋 Sheet updated: "start message" column filled for N leads
📨 Telegram report sent

Generated messages:
1. <username> — <niche> — "first 80 chars of message..."
2. <username> — <niche> — "first 80 chars of message..."

Failed leads:
1. <username> — <website> (error reason)
```

---

## 9. API REFERENCE

### Search Spreadsheets

```
GET /api/integrations/sheets/search?name=query
Cookie: admin_token=<token>
→ { success, spreadsheets: [{ id, name }] }
```

### Read Sheet

```
GET /api/integrations/sheets/read?spreadsheetId=ID&range=A:Z
Cookie: admin_token=<token>
→ { success, headers: string[], rows: object[] }
```

### Update Sheet

```
POST /api/integrations/sheets/update
Cookie: admin_token=<token>
Body: { spreadsheetId, range, values: string[][] }
→ { success, updatedCells }
```

### Telegram Notify

```
POST /api/telegram/notify
Cookie: admin_token=<token>
Body: { message, chatId?: string | string[], botToken? }
→ { success, sent: number, total: number, failed: string[] }
```

---

## 10. KEY CONSTRAINTS

- **MUST use WebFetch** to visit and analyze each lead's website — do NOT guess the niche or skip website analysis
- **MUST include a demo link** in every generated message — this is the key differentiator
- **MUST write the message in the same language** as the lead's website
- **DO NOT** overwrite existing messages — skip leads that already have a "start message"
- **DO NOT** stop processing on individual lead failures — continue to next lead
- **DO** update the spreadsheet even if some leads failed
- **DO** send Telegram report even if all leads failed
- **DO** follow the OPENER rules from `outreach_agent_system_prompt.md`: specific, short, no pitch, genuine question
- **DO** reference niche addon prompts (`.claude/prompts/niche_dental_addon.md`, `.claude/prompts/niche_beauty_salon_addon.md`) when the niche matches
- **DO** adapt message tone and language to match the lead's market (Ukraine → Russian/Ukrainian, UAE → English/Arabic, Poland → Polish/English)
- Messages should be 6-10 lines max — must fit on one phone screen
- Maximum 2-3 emojis per message
- The demo is framed as a "draft/mockup" — NOT a finished product
