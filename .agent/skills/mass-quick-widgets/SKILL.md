---
name: mass-quick-widgets
description: Batch-create demo widgets from Google Sheets leads. Reads leads, builds widgets sequentially, updates sheet, sends Telegram report.
---

# Mass Quick Widget Builder

## Purpose

Read leads from a Google Sheets spreadsheet and create a Quick Widget for each lead. After processing, update the spreadsheet and send a Telegram report.

**Input**: Optional spreadsheet URL/ID, optional limit
**Output**: Multiple deployed widgets + sheet updated + Telegram report

Each widget is built using the `create-quick-widget` skill process (see `.agent/skills/create-quick-widget/SKILL.md`).

---

## CRITICAL RULES

1. **SEQUENTIAL BUILDS ONLY** — The build script copies client source to a shared directory. Running two builds in parallel corrupts both widgets. Process leads ONE AT A TIME: analyze → config → generate → build → deploy → next lead.

2. **Never guess colors** — Every hex code in theme.json must come from actual site CSS.

3. **Never stop on failure** — If a lead fails, log it and continue to the next one.

4. **Use flat config format** — widget.config.json uses `botName`, `welcomeMessage`, `quickReplies` (NOT nested `bot.name`). See `create-quick-widget/CONFIG_REFERENCE.md`.

5. **info.json MUST have `username`** — Without it, the admin panel crashes. See `create-quick-widget/CONFIG_REFERENCE.md#infojson-schema`.

---

## Phase 1 — Find Spreadsheet

### If URL/ID provided

Extract spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### If not provided — auto-search

Get today's date in `DD.MM.YYYY` format:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Fallback: try `Квалифицированные лиды`. If neither found, ask user for the URL.

---

## Phase 2 — Read & Filter Leads

### Read sheet data

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

### Filter leads

```
for each row:
  if row.hasWidget?.toUpperCase() === 'TRUE' → SKIP (already done)
  if row.email is empty AND row.website is empty → SKIP (no data)
  otherwise → PROCESS
```

Apply user's limit if specified.

### Derive username (if missing)

If `username` column is empty:

- Generic email domains (gmail.com, outlook.com, yahoo.com, hotmail.com, mail.ru, yandex.ru, ukr.net, icloud.com) → use part before `@`
- Otherwise → use email domain without TLD (e.g., `info@dental-smile.com` → `dental-smile`)
- Convert to clientId: lowercase, hyphens instead of spaces, remove special chars

---

## Phase 3 — Process Each Lead (SEQUENTIAL)

**Process ONE lead at a time.** Complete the full cycle before starting the next.

### Per-lead workflow

For each lead, follow `create-quick-widget` skill phases 1-4:

1. **Analyze site** — WebFetch homepage, extract colors/fonts/content
2. **Crawl pages** — Visit 5-8 pages for knowledge base
3. **Write configs**:
   - `widget.config.json` — **flat format** with `botName`, `welcomeMessage`, `quickReplies`
   - `theme.json` — 50+ color/layout fields from actual site CSS
4. **Generate** — `node .agent/widget-builder/scripts/generate-single-theme.js <clientId>`
5. **Build** — `node .agent/widget-builder/scripts/build.js <clientId>`
6. **Validate** — Check `dist/script.js` exists and is 200-600KB
7. **Deploy** — Copy to `quickwidgets/<clientId>/script.js`
8. **Write info.json** — `quickwidgets/<clientId>/info.json` with `username` field
9. **Upload knowledge** — `POST /api/knowledge`
10. **Set AI settings** — `PUT /api/ai-settings/<clientId>`

### After each lead

Track results:

- `successes`: `[{ username, website }]`
- `failures`: `[{ username, website, error }]`
- `skipped`: count

### Error handling

If any step fails for a lead:

- Log the error with details
- Add to `failures` list
- **Continue to next lead immediately**

---

## Phase 4 — Update Source Spreadsheet

After ALL leads are processed, update the `hasWidget` column.

### Find hasWidget column

Count headers to find the column index. If missing, use next column after last header.

### Batch update

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "D2:D50",
    "values": [["TRUE"], [""], ["TRUE"], ["TRUE"]]
  }'
```

Values array must align with actual row positions. Use empty strings `""` for skipped/failed rows.

**Sheets API note**: Range format uses NO sheet name prefix (`D2:D50`, not `Sheet1!D2:D50`).

---

## Phase 4B — Add to "Проверенные лиды" Spreadsheet

If the source spreadsheet is NOT already the "Проверенные лиды" sheet, add successful leads there too.

### Find today's spreadsheet

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

If not found → skip but warn user.

### Read current data, find next empty row, batch append

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "VERIFIED_ID",
    "range": "A<ROW>:D<LAST>",
    "values": [
      ["email1", "https://site1.com", "username1", "TRUE"],
      ["email2", "https://site2.com", "username2", "TRUE"]
    ]
  }'
```

Only add **successful** leads. Don't duplicate existing entries.

---

## Phase 5 — Telegram Report

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"message": "<report HTML>"}'
```

### Report template

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

## Completion Output

```
✅ Mass Quick Widget creation complete!

📊 Results:
- Created: N widgets
- Failed: N leads
- Skipped: N (no data or already has widget)

📋 Source sheet: hasWidget updated for N leads
📋 "Проверенные лиды": N leads added
📨 Telegram report sent

Successful: 1. username — website  2. username — website
Failed: 1. username — website (error)
```

---

## Validation Per Widget

Before deploying each widget, verify (see `create-quick-widget/VALIDATION.md`):

- [ ] widget.config.json has `clientId`, `botName`, `welcomeMessage`, `quickReplies`
- [ ] theme.json passed generator validation
- [ ] Build completed without errors
- [ ] `dist/script.js` is 200-600KB
- [ ] info.json has `username` field
- [ ] Knowledge upload returned success
- [ ] AI settings returned success

---

## API Reference

| Endpoint                                         | Method | Purpose                                                                        |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| `/api/integrations/sheets/search?name=query`     | GET    | Find spreadsheet by name                                                       |
| `/api/integrations/sheets/read?spreadsheetId=ID` | GET    | Read sheet data                                                                |
| `/api/integrations/sheets/update`                | POST   | Update cells (body: `{spreadsheetId, range, values}`)                          |
| `/api/telegram/notify`                           | POST   | Send report (body: `{message}`)                                                |
| `/api/knowledge`                                 | POST   | Upload knowledge (body: `{clientId, text, source}`)                            |
| `/api/ai-settings/<clientId>`                    | PUT    | Set AI config (body: `{systemPrompt, greeting, temperature, maxTokens, topK}`) |

All requests need `Cookie: admin_token=${ADMIN_SECRET_TOKEN}`.

**Sheets API notes**:

- Range format: no sheet name prefix (`D2:D50`, not `Sheet1!D2:D50`)
- Default grid is 26 columns (A-Z). Column AA+ needs grid expansion via batchUpdate first.

---

## Key Constraints

- **Sequential builds** — ONE build at a time, never parallel
- **Deploy to `quickwidgets/`** — not `widgets/`
- **Flat config format** — `botName`, not `bot.name`
- **info.json needs `username`** — or admin panel breaks
- **Never stop on failure** — log error, continue to next lead
- **Always send Telegram report** — even if all leads failed
- **Always update spreadsheet** — even if some leads failed
