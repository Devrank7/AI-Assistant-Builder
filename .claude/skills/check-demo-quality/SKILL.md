---
name: check-demo-quality
description: Check if demo widgets work correctly by verifying iframe compatibility for all leads in a spreadsheet. Writes "Work Demo" column with TRUE/FALSE.
---

# Check Demo Quality

**Input**: Google Sheets URL or spreadsheet ID
**Output**: "Work Demo" column added/updated with TRUE (iframe works) or FALSE (blocked)

---

## Phase 1 — Validate Spreadsheet

Extract spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

Read the spreadsheet and verify required columns exist:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

**Required columns** (case-insensitive):

- `hasWidget` — must exist, rows with TRUE/YES are checked
- `Demo` — must exist, rows with a demo link are checked
- `Website` — must exist, the actual URL to check for iframe compatibility

If any column is missing, inform the user and stop.

---

## Phase 2 — Run Check Script

```bash
node scripts/check-demo-quality.js SPREADSHEET_ID
```

The script:

1. Reads the spreadsheet via local API
2. Filters rows: `hasWidget = TRUE` AND `Demo` is non-empty
3. For each qualifying row, makes a GET request to the `Website` URL
4. Checks `X-Frame-Options` and `Content-Security-Policy: frame-ancestors` headers
5. Creates/updates "Work Demo" column:
   - `TRUE` — site can be embedded in iframe (demo works perfectly)
   - `FALSE` — site blocks iframes (demo shows screenshot fallback)
6. Runs 5 concurrent requests — finishes ~110 sites in 3-5 minutes

---

## Phase 3 — Report

Report the script output to the user:

```
Check Demo Quality complete!
Total checked: N
Work Demo TRUE (frameable): N
Work Demo FALSE (blocked): N
Skipped: N

Blocked sites:
1. website.com — X-Frame-Options: sameorigin
2. website.com — unreachable
```

---

## Notes

- The script reuses the same frameability check as `scripts/batch-check-frameable.js`
- "Work Demo" column is created automatically if it doesn't exist
- Empty values are written for rows that don't have hasWidget=TRUE or no Demo link
- The check uses GET (not HEAD) because many servers omit framing headers on HEAD requests
- 15-second timeout per request to handle slow/unresponsive sites
