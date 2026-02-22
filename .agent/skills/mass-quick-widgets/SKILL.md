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

Track: `successes: [{username, website}]`, `failures: [{username, website, error}]`, `skipped: count`.

**On failure**: log error, add to failures, continue to next lead immediately.

---

## Phase 4 — Update Spreadsheet

### 4A. Mark `hasWidget` in source sheet

Find `hasWidget` column index from headers. Batch update via `POST /api/integrations/sheets/update`:

- `"TRUE"` for successful leads
- `""` for skipped/failed
- Range format: no sheet name prefix (`D2:D50`, not `Sheet1!D2:D50`)

### 4B. Add to "Проверенные лиды" (if source is a different sheet)

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
📋 Source sheet: hasWidget updated
📨 Telegram report sent
Successful: 1. username — website  2. username — website
Failed: 1. username — website (error)
```

Always send report and update sheet, even if all leads failed.

---

## Critical Notes

These notes apply to all widgets built via this skill. See also [create-quick-widget/SKILL.md — Critical Notes](../create-quick-widget/SKILL.md#critical-notes).

1. **Demo links must include `type=quick`** — without it, the demo page loads from `/widgets/` instead of `/quickwidgets/`, causing 404s or wrong widget
2. **Never edit `main.jsx` for init code** — Prettier auto-format strips changes; API base URL detection is handled by Rollup `banner` in `vite.config.js`
3. **Always set AI system prompt with company name** — default prompt is generic; without a company-specific prompt, the AI responds as "WinBix AI" instead of the client's company
4. **Builds are sequential** — the build pipeline shares source files, parallel builds will corrupt each other
