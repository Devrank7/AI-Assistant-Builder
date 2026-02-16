# Validation Checklist

Run through these checks after every widget build. Each check catches a specific bug that has caused production issues.

---

## Pre-Build Validation

### widget.config.json

Check these fields exist before running the build:

| Check                                         | Why                                                  |
| --------------------------------------------- | ---------------------------------------------------- |
| `clientId` is present and matches folder name | Build script uses this to locate files               |
| `botName` is a non-empty string               | Widget header shows this — undefined crashes the UI  |
| `welcomeMessage` is a non-empty string        | First message shown — undefined shows blank greeting |
| `quickReplies` is an array with 2-4 strings   | Quick reply buttons — missing = no buttons shown     |
| `features` object exists                      | Feature flags — missing = defaults apply             |

**Common mistake**: Using nested format (`bot.name`) instead of flat format (`botName`). The template has fallback support, but always use flat format for new widgets.

### theme.json

The `generate-single-theme.js` script validates required fields automatically. But double-check:

| Check                                                  | Why                                          |
| ------------------------------------------------------ | -------------------------------------------- |
| All hex colors are valid 7-char hex (`#xxxxxx`)        | Invalid hex = broken CSS                     |
| `isDark` is boolean, not string                        | `"true"` ≠ `true` — dark fields won't load   |
| `toggleHoverRgb` and `focusRgb` are `"R, G, B"` format | Used in `rgba()` — wrong format = broken CSS |
| If `isDark: true`, all 8 surface/text fields present   | Generator exits with error if missing        |
| `font` is a valid CSS font-family string               | Quoted font names need escaped quotes        |

---

## Post-Build Validation

### Build Output

```bash
ls -la .agent/widget-builder/dist/script.js
```

| Check                                | Expected      | Problem if wrong                                     |
| ------------------------------------ | ------------- | ---------------------------------------------------- |
| File exists                          | YES           | Build failed silently                                |
| File size                            | 200KB - 600KB | <200KB = missing CSS/hooks; >600KB = something wrong |
| Build log has `✅ Build successful!` | YES           | Build errors = broken widget                         |

### Deployed Files

```bash
ls -la quickwidgets/<clientId>/script.js
ls -la quickwidgets/<clientId>/info.json
```

| Check                                                  | Why                                     |
| ------------------------------------------------------ | --------------------------------------- |
| `script.js` exists in `quickwidgets/` (not `widgets/`) | Quick widgets deploy to quickwidgets/   |
| `script.js` size matches dist output                   | Incomplete copy = broken widget         |
| `info.json` exists                                     | Admin panel needs it to list the client |

### info.json Content

| Check                                              | Why                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `username` field is present and non-empty          | **CRITICAL**: Missing username crashes admin panel with 500 error |
| `clientType` is `"quick"`                          | Admin panel uses this to categorize clients                       |
| `email` is string (empty string OK, not undefined) | Type mismatch causes issues                                       |

---

## API Validation

### Knowledge Upload

After `POST /api/knowledge`:

- Response should include `"success": true`
- If it fails, the widget still works — it just won't have AI context

### AI Settings

After `PUT /api/ai-settings/<clientId>`:

- Response should include `"success": true`
- The `greeting` field should match `welcomeMessage` from widget.config.json

---

## Quick Self-Test

After deploying, you can verify the widget renders by checking the demo URL:

```
http://localhost:3000/demo/client-website?client=<clientId>&website=<encoded_website_url>
```

The widget should:

1. Show the toggle button in bottom-right corner
2. Open when clicked
3. Display the bot name in the header
4. Show the welcome message
5. Display quick reply buttons
6. Accept text input

---

## Known Failure Modes

| Symptom                                        | Root Cause                                         | Fix                                                    |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| Widget button appears but chat crashes on open | `config.bot.name` or `config.botName` is undefined | Check widget.config.json has `botName` field           |
| Admin panel 500 error after widget deploy      | info.json missing `username` field                 | Add `username` to info.json                            |
| Widget has no CSS (unstyled HTML)              | CSS not injected into Shadow DOM                   | Rebuild — check `window.__WIDGET_CSS__`                |
| Build output is tiny (<100KB)                  | Hooks not found or CSS pipeline broken             | Check shared `src/hooks/` directory wasn't overwritten |
| Quick replies don't appear                     | `quickReplies` field missing or wrong path         | Use flat format: `quickReplies: [...]` not nested      |
| Dark theme but light colors                    | `isDark: false` when should be `true`              | Check body background color of site                    |
| Multiple builds corrupt each other             | Parallel builds sharing same src/ directory        | **Always build sequentially, one at a time**           |
