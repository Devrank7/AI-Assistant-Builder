---
name: mass-quick-widgets
description: Mass-create demo Quick Widgets from Google Sheets lead data. Reads leads, builds widgets, updates sheet, sends Telegram report.
---

# Mass Quick Widget Builder Skill

## 1. PURPOSE

Read leads from a Google Sheets spreadsheet and mass-create Quick Widgets for each lead using the `create-quick-widget` skill process. After processing, update the spreadsheet to mark completed leads and send a summary report to Telegram.

**Input**: Optional spreadsheet URL/ID, optional limit
**Output**: Multiple Quick Widgets deployed + sheet updated + Telegram report sent

---

## 2. INPUT PARSING

Extract optional parameters from the user's message:

```
- spreadsheetUrl or spreadsheetId (optional — if not given, auto-search by today's date)
- limit (optional — max number of leads to process, default: all)
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

If no results, try the fallback name:

```bash
# Fallback: search for qualified leads
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Квалифицированные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Response format:

```json
{
  "success": true,
  "spreadsheets": [{ "id": "SPREADSHEET_ID", "name": "09.02.2026 Проверенные лиды" }]
}
```

If neither found → ask the user for the spreadsheet URL.

---

## 4. PHASE 2 — READ LEADS

### 4.1 Read Sheet Data

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Response format:

```json
{
  "success": true,
  "headers": ["email", "website", "username", "hasWidget"],
  "rows": [
    { "email": "info@example.com", "website": "https://example.com", "username": "example", "hasWidget": "" },
    { "email": "test@test.com", "website": "https://test.com", "username": "", "hasWidget": "TRUE" }
  ]
}
```

### 4.2 Filter Leads

From the response, filter leads:

1. **Skip** rows where `email` AND `website` are both empty
2. **Skip** rows where `hasWidget` column value is `TRUE` (case-insensitive) — these leads already have a widget created. Only process leads where `hasWidget` is empty, `FALSE`, or any value other than `TRUE`.
3. **Apply limit** if specified by the user

**Example filtering logic:**

```
for each row:
  if row.hasWidget?.toUpperCase() === 'TRUE' → SKIP (already has widget)
  if row.email is empty AND row.website is empty → SKIP (no data)
  otherwise → PROCESS this lead
```

### 4.3 Derive Username (if missing)

If the `username` column is empty for a row:

- Check if the email domain is generic:
  `gmail.com, outlook.com, yahoo.com, hotmail.com, mail.ru, yandex.ru, ukr.net, icloud.com`
  → Use part before `@` as username
- Otherwise → use email domain without TLD as username
  - Example: `info@dental-smile.com` → `dental-smile`

**Convert username to clientId**: lowercase, replace spaces with hyphens, remove special characters.

---

## 5. PHASE 3 — PROCESS EACH LEAD

For each valid lead, follow the **`create-quick-widget`** skill process (see `.agent/skills/create-quick-widget/SKILL.md`):

### 5.1 Per-Lead Steps

1. **WebFetch homepage** → extract brand, colors, fonts, business type, nav links
2. **Crawl key pages** (up to 5-8 pages) → extract content for knowledge base
3. **Auto-generate config** — bot name, greeting, quick replies, design
4. **Write component files** — `index.css`, `Widget.jsx`, `ChatMessage.jsx`, `QuickReplies.jsx`, `useChat.js`
5. **Build widget**: `node .agent/widget-builder/scripts/build.js <client_id>`
6. **Deploy**: copy to `quickwidgets/<client_id>/script.js`
7. **Write `info.json`** to `quickwidgets/<client_id>/info.json` with `clientType: "quick"`
8. **Upload knowledge** via `POST /api/knowledge`
9. **Set AI settings** via `PUT /api/ai-settings/<client_id>`

### 5.2 After Each Successful Widget

Immediately mark the lead in the tracking list as successful. Track:

- `successes`: array of `{ username, website }`
- `failures`: array of `{ username, website, error }`
- `skipped`: count of skipped rows

### 5.3 Error Handling

If a lead fails (site unreachable, build error, etc.):

- Log the error
- Add to `failures` list
- **Continue to next lead** — do NOT stop on failure

---

## 6. PHASE 4 — UPDATE SPREADSHEET

After ALL leads are processed, batch-update the `hasWidget` column.

### 6.1 Find the hasWidget Column

If `hasWidget` column doesn't exist in headers, it needs to be added. Determine the column letter:

- Count headers to find the index
- If missing, use the next column after the last header

### 6.2 Batch Update

For all successfully processed leads, set `hasWidget` to `TRUE`:

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!D2:D50",
    "values": [["TRUE"], [""], ["TRUE"], ["TRUE"]]
  }'
```

**IMPORTANT**: The values array must align with the actual row positions. Use empty strings `""` for rows that were skipped or failed.

---

## 7. PHASE 5 — TELEGRAM REPORT

Send a summary report via Telegram. The API supports multiple chat IDs — set `TELEGRAM_REPORT_CHAT_ID` as comma-separated values (e.g. `123456,789012`) or pass an array in the body:

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "message": "<report HTML>"
  }'
```

The report will be sent to ALL chat IDs configured in `TELEGRAM_REPORT_CHAT_ID`. You can also override with `"chatId": ["123", "456"]` in the body.

### 7.1 Report Template

```html
📊 <b>Mass Quick Widget Report</b> 📅 Date: DD.MM.YYYY 📋 Sheet:
<spreadsheet name>
  ✅ Created: N widgets ❌ Failed: N leads ⏭ Skipped: N leads

  <b>Results:</b>
  1. username — website ✅ 2. username — website ✅ 3. username — website ❌ (error reason) 🔗
  <a href="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID">Open Sheet</a></spreadsheet
>
```

---

## 8. COMPLETION

After everything is done, output a summary to the user:

```
✅ Mass Quick Widget creation complete!

📊 Results:
- Created: N widgets
- Failed: N leads
- Skipped: N leads (no email/website or already has widget)

📋 Sheet updated: hasWidget column marked for N leads
📨 Telegram report sent

Successful widgets:
1. <username> — <website>
2. <username> — <website>

Failed leads:
1. <username> — <website> (error)
```

---

## 9. API REFERENCE

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

### Search Spreadsheets

```
GET /api/integrations/sheets/search?name=query
Cookie: admin_token=<token>
→ { success, spreadsheets: [{ id, name }] }
```

### Telegram Notify (supports multiple chats)

```
POST /api/telegram/notify
Cookie: admin_token=<token>
Body: { message, chatId?: string | string[], botToken? }
→ { success, sent: number, total: number, failed: string[] }
```

`TELEGRAM_REPORT_CHAT_ID` env var supports comma-separated IDs (e.g. `123456,789012`).

### Knowledge Upload (existing)

```
POST /api/knowledge
Cookie: admin_token=<token>
Body: { clientId, text, source }
→ { success }
```

### AI Settings (existing)

```
PUT /api/ai-settings/<clientId>
Cookie: admin_token=<token>
Body: { systemPrompt, greeting, temperature, maxTokens, topK }
→ { success }
```

---

## 10. KEY CONSTRAINTS

- **DO NOT** ask user for design preferences — auto-detect everything from the site
- **DO NOT** stop processing on individual lead failures — continue to next lead
- **DO** update the spreadsheet even if some leads failed
- **DO** send Telegram report even if all leads failed
- Follow all constraints from `create-quick-widget` skill (Preact, Tailwind v3, Shadow DOM, etc.)
- Deploy to `quickwidgets/` (NOT `widgets/`)
- Use `clientType: "quick"` in `info.json`
