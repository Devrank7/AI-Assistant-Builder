---
name: mass-quick-widgets
description: Batch-create demo widgets from Google Sheets leads. Reads leads, builds widgets sequentially, updates sheet, sends Telegram report. Use this skill whenever the user wants to create widgets for multiple leads at once, even if they don't say "mass" — any request involving a spreadsheet of leads and widget creation triggers this skill.
---

# Mass Quick Widget Builder

**Input**: Optional spreadsheet URL/ID, optional limit
**Output**: Multiple deployed widgets + sheet updated (hasWidget, Demo, JavaScript, Work Demo) + Telegram report

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

**Deduplicate**: If multiple rows share the same website URL (after normalizing to base domain), keep only the first occurrence. Mark duplicates as skipped.

**Derive username** (if missing): generic email domains (gmail, outlook, yahoo, hotmail, mail.ru, yandex.ru, ukr.net, icloud) → use part before `@`. Otherwise → use email domain without TLD. Convert to clientId: lowercase, hyphens, no special chars.

---

## Phase 3 — Process Leads (ONE AT A TIME)

For each lead, run create-quick-widget phases 1-4 (analyze → configs → generate/build/deploy → knowledge/AI).

Track: `successes: [{username, website, shortCode}]`, `failures: [{username, website, error}]`, `skipped: count`.

For each successful widget, create a ShortLink record in MongoDB (6-char alphanumeric code, `widgetType: 'quick'`). Store the code in the success record for the Demo column update in Phase 4B.

**On failure**: log error, add to failures, continue to next lead immediately.

**For large batches (20+ leads)**: consider writing a Node.js batch script (like `scripts/analyze-and-build-batch.js`) that fetches each website via HTTP, extracts colors/fonts/content from HTML, creates configs, and builds sequentially. This is much faster than doing each lead manually with WebFetch. The script should:

- Fetch homepage HTML, extract hex colors from CSS, detect Google Fonts, parse nav links
- Crawl 4-5 subpages for deeper knowledge content
- Fall back to default colors (#2563eb / #1e40af) if the site can't be fetched (403, timeout, etc.)
- Save results to `mass-build-results.json` for the spreadsheet update phase

---

## Phase 4 — Update Spreadsheet

All four columns (hasWidget, Demo, JavaScript, Work Demo) are **mandatory** — every mass build must write all of them. This ensures the spreadsheet is a complete, self-contained record of what was built and whether each demo will display correctly.

### 4A. Mark `hasWidget` in source sheet

1. Read the spreadsheet headers to find the `hasWidget` column index.
2. **If `hasWidget` column does NOT exist**: create it by writing the header `"hasWidget"` to the next empty column in row 1, then use that column for values.
3. Batch update via `POST /api/integrations/sheets/update`:
   - `"TRUE"` for successful leads
   - `""` for skipped/failed
   - Range format: no sheet name prefix (`K2:K50`, not `Sheet1!K2:K50`)

### 4B. Write `Demo` column

1. For each successful widget, generate the demo page URL:
   ```
   https://winbixai.com/demo/client-website?client=CLIENT_ID&website=ENCODED_WEBSITE_URL
   ```
   Use `encodeURIComponent()` for the website URL parameter.
2. Read the spreadsheet headers to find the `Demo` column index.
3. **If `Demo` column does NOT exist**: create it by writing the header `"Demo"` to the next empty column in row 1 (after `hasWidget`), then use that column for values.
4. Batch update the `Demo` column:
   - Demo page URL for successful leads
   - `""` for skipped/failed

**Optional (if short links are needed)**: Also create ShortLink records in MongoDB (6-char code) and use `https://winbixai.com/d/{code}` format instead. Re-export knowledge seeds afterward.

### 4C. Write `JavaScript` console snippet column

This column gives the sales team a one-line script they can paste into a browser console on the lead's website to instantly preview the widget in action — no deployment needed.

1. Read the spreadsheet headers to find the `JavaScript` column index.
2. **If `JavaScript` column does NOT exist**: create it by writing the header `"JavaScript"` to the next empty column in row 1 (after `Demo`), then use that column for values.
3. For each successful widget, generate a console-executable snippet:
   ```
   (function(){var s=document.createElement('script');s.src='https://winbixai.com/quickwidgets/CLIENT_ID/script.js';document.head.appendChild(s)})()
   ```
4. Batch update the `JavaScript` column:
   - Console snippet for successful leads
   - `""` for skipped/failed

### 4D. Check iframe compatibility & write `Work Demo` column

The demo page embeds the lead's website in an iframe alongside the widget. Many sites block iframes via `X-Frame-Options` or `Content-Security-Policy` headers — for those, the demo shows a screenshot fallback instead. This column tells the sales team which demos will look perfect (TRUE) and which will show the fallback (FALSE).

**Run the check-demo-quality script:**

```bash
node scripts/check-demo-quality.js SPREADSHEET_ID
```

The script:

1. Reads the spreadsheet, filters rows with `hasWidget = TRUE` and a Demo link
2. Makes GET requests to each lead's website (5 concurrent)
3. Checks `X-Frame-Options` and `Content-Security-Policy: frame-ancestors` response headers
4. Creates/updates a `Work Demo` column in the spreadsheet:
   - `TRUE` — site can be embedded in iframe (demo page works perfectly)
   - `FALSE` — site blocks iframes (demo page shows screenshot fallback)

If the script doesn't exist or fails, you can check frameability manually by making HTTP requests and inspecting headers — but the script is strongly preferred because it handles concurrency, timeouts, and column creation automatically.

### 4E. Add to "Проверенные лиды" (if source is a different sheet)

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
  ✅ Created: N widgets ❌ Failed: N leads ⏭ Skipped: N leads 📝 <b>Spreadsheet Updated:</b> • hasWidget (N × TRUE) •
  Demo links (N URLs) • JavaScript snippets (N embed codes) • Work Demo (N TRUE / N FALSE) 🖼
  <b>iFrame Compatibility:</b> ✅ N sites — iframe works perfectly ❌ N sites — blocked (X-Frame-Options) 🔗
  <a href="https://docs.google.com/spreadsheets/d/ID">Open Sheet</a></name
>
```

### Output to user

```
✅ Mass Quick Widget creation complete!
📊 Results: Created: N | Failed: N | Skipped: N
📋 Spreadsheet columns updated:
  • hasWidget — N rows marked TRUE
  • Demo — N demo page URLs
  • JavaScript — N console embed snippets
  • Work Demo — N TRUE (frameable) / N FALSE (blocked)
📨 Telegram report sent
🔗 Knowledge seeds re-exported
```

Always send report and update sheet, even if all leads failed.
