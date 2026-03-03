---
name: mass-quick-widgets
description: Batch-create demo widgets from Google Sheets leads. Reads leads, builds widgets sequentially, updates sheet, sends Telegram report.
---

# Mass Quick Widget Builder

**Input**: Optional spreadsheet URL/ID, optional limit
**Output**: Multiple deployed widgets + sheet updated + Telegram report

Each widget follows [create-quick-widget/SKILL.md](../create-quick-widget/SKILL.md) phases 1-4.
**Builds must be SEQUENTIAL** — one at a time, never parallel.

---

## Phase 1 — Find Spreadsheet

If URL/ID provided, extract ID from `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

If not provided, search for today's date:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Fallback: `Квалифицированные лиды`. If neither found, ask user.

---

## Phase 2 — Read & Filter Leads

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

**Filter**: Skip rows where `hasWidget === 'TRUE'` or both email and website are empty. Apply user limit if specified.

**Derive username** (if missing): generic email domains (gmail, outlook, yahoo, hotmail, mail.ru, yandex.ru, ukr.net, icloud) → use part before `@`. Otherwise → use email domain without TLD. Convert to clientId: lowercase, hyphens, no special chars.

---

## Phase 3 — Process Leads (ONE AT A TIME)

For each lead, run create-quick-widget phases 1-4 (analyze → configs → generate/build/deploy → knowledge/AI).

Track: `successes: [{username, website, shortCode}]`, `failures: [{username, website, error}]`, `skipped: count`.

For each successful widget, create a ShortLink record in MongoDB (6-char alphanumeric code, `widgetType: 'quick'`). Store the code in the success record for the Demo column update in Phase 4B.

**On failure**: log error, add to failures, continue to next lead immediately.

---

## Phase 4 — Update Spreadsheet

### 4A. Mark `hasWidget` in source sheet

1. Read the spreadsheet headers to find the `hasWidget` column index.
2. **If `hasWidget` column does NOT exist**: create it by writing the header `"hasWidget"` to the next empty column in row 1, then use that column for values.
3. Batch update via `POST /api/integrations/sheets/update`:
   - `"TRUE"` for successful leads
   - `""` for skipped/failed
   - Range format: no sheet name prefix (`K2:K50`, not `Sheet1!K2:K50`)

### 4B. Write `Demo` short links column

1. For each successful widget, create a short link via the ShortLink model (6-char code, stored in MongoDB). The short link URL format is `https://winbix-ai.xyz/d/{code}`.
2. Read the spreadsheet headers to find the `Demo` column index.
3. **If `Demo` column does NOT exist**: create it by writing the header `"Demo"` to the next empty column in row 1 (after `hasWidget`), then use that column for values.
4. Batch update the `Demo` column:
   - Short link URL (`https://winbix-ai.xyz/d/{code}`) for successful leads
   - `""` for skipped/failed
   - Range format: no sheet name prefix

**Important**: After creating short links, re-export knowledge seeds (`node scripts/export-knowledge-seeds.js`) so short link codes are included in seed files and will work on production after deployment.

### 4C. Write `JavaScript` console snippet column

1. Read the spreadsheet headers to find the `JavaScript` column index.
2. **If `JavaScript` column does NOT exist**: create it by writing the header `"JavaScript"` to the next empty column in row 1 (after `Demo`), then use that column for values.
3. For each successful widget, generate a console-executable snippet:
   ```
   (function(){var s=document.createElement('script');s.src='https://winbix-ai.xyz/quickwidgets/CLIENT_ID/script.js';document.head.appendChild(s)})()
   ```
4. Batch update the `JavaScript` column:
   - Console snippet for successful leads
   - `""` for skipped/failed
   - Range format: no sheet name prefix

### 4D. Add to "Проверенные лиды" (if source is a different sheet)

Search for today's sheet, read current data, find next empty row, batch append successful leads as `[email, website, username, "TRUE"]`. Don't duplicate existing entries.

---

## Phase 5 — Report

### Telegram

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"message":"<report>"}'
```

Report format:

```html
📊 <b>Mass Quick Widget Report</b> 📅 Date: DD.MM.YYYY 📋 Sheet:
<name>
  ✅ Created: N widgets ❌ Failed: N leads ⏭ Skipped: N leads

  <b>Results:</b>
  1. username — website ✅ 2. username — website ❌ (error) 🔗
  <a href="https://docs.google.com/spreadsheets/d/ID">Open Sheet</a></name
>
```

### Output to user

```
✅ Mass Quick Widget creation complete!
📊 Results: Created: N | Failed: N | Skipped: N
📋 Source sheet: hasWidget + Demo columns updated
📨 Telegram report sent
🔗 Knowledge seeds re-exported (short links included)
Successful: 1. username — website (winbix-ai.xyz/d/AbC123)  2. username — website (winbix-ai.xyz/d/XyZ789)
Failed: 1. username — website (error)
```

Always send report and update sheet, even if all leads failed.
