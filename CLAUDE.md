# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Skills (What to do)**

- SOPs written in Markdown, live in `.agent/skills/<skill-name>/SKILL.md`
- Define the goals, inputs, execution steps, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee
- Each skill is a self-contained recipe for a specific task (create widget, mass-build, send messages, etc.)

**Layer 2: Orchestration (Decision making)**

- This is you. Your job: intelligent routing.
- Read skills, call execution scripts in the right order, handle errors, ask for clarification, update skills with learnings
- You're the glue between intent and execution. E.g. you don't manually write JSX/CSS for widgets—you read `.agent/skills/create-quick-widget/SKILL.md`, create `theme.json`, and run `generate-single-theme.js` + `build.js`

**Layer 3: Execution (Doing the work)**

- Deterministic Node.js scripts in `.agent/widget-builder/scripts/`
- Environment variables and API tokens stored in `.env.local`
- Handle widget generation, builds, API calls, data processing
- Reliable, testable, fast. Use scripts instead of manual work.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution: push complexity into deterministic scripts. You focus on decision-making.

---

## Project Overview

**WinBix AI** — a multi-tenant SaaS platform that deploys AI chat widgets for businesses. Clients get a customized chat widget (embedded via `<script>` tag) that answers customer questions using a knowledge base, collects leads, and routes conversations across channels (web chat, Telegram, WhatsApp, Instagram).

**Tech Stack:**

- **App**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB (Mongoose)
- **Widget Builder**: Preact + Vite + Tailwind CSS v3, Shadow DOM isolation
- **AI**: Google Gemini API (`@google/generative-ai`)
- **Payments**: WayForPay, Cryptomus, NowPayments
- **Integrations**: Google Sheets API, Telegram Bot API, WhatsApp (WHAPI), Instagram, ManyChat
- **Deployment**: Docker, production at `https://winbix-ai.pp.ua`

---

## Available Skills

| Skill                           | Location                                               | Purpose                                       |
| ------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| `create-widget`                 | `.agent/skills/create-widget/SKILL.md`                 | Full custom widget with discovery interview   |
| `create-quick-widget`           | `.agent/skills/create-quick-widget/SKILL.md`           | Auto-create demo widget from website analysis |
| `mass-quick-widgets`            | `.agent/skills/mass-quick-widgets/SKILL.md`            | Batch create widgets from Google Sheets leads |
| `create-start-messages`         | `.agent/skills/create-start-messages/SKILL.md`         | Generate personalized outreach messages       |
| `create-telegram-bot-assistant` | `.agent/skills/create-telegram-bot-assistant/SKILL.md` | Set up Telegram bot channel                   |
| `create-whatsapp-assistant`     | `.agent/skills/create-whatsapp-assistant/SKILL.md`     | Set up WhatsApp channel                       |
| `create-instagram-assistant`    | `.agent/skills/create-instagram-assistant/SKILL.md`    | Set up Instagram channel                      |

**Always read the skill file before executing.** Skills contain the exact steps, API calls, constraints, and edge cases.

---

## Execution Scripts

| Script                     | Command                                                                   | Purpose                                               |
| -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `generate-single-theme.js` | `node .agent/widget-builder/scripts/generate-single-theme.js <client_id>` | Generate all 6 source files from `theme.json`         |
| `build.js`                 | `node .agent/widget-builder/scripts/build.js <client_id>`                 | Build widget → `.agent/widget-builder/dist/script.js` |
| `mass-build.js`            | `node .agent/widget-builder/scripts/mass-build.js`                        | Batch build from `mass-build-configs.json`            |

**Critical rule:** Never write JSX or CSS manually for widgets. Always create `theme.json` → run `generate-single-theme.js` → run `build.js`.

---

## Operating Principles

### 1. Check for scripts first

Before writing code, check `.agent/widget-builder/scripts/` per your skill. Only create new scripts if none exist. The theme generator produces all 6 widget source files from a single `theme.json` — don't duplicate this work.

### 2. Self-anneal when things break

- Read error message and stack trace
- Fix the script and test it again (unless it uses paid API credits—check with user first)
- Update the skill with what you learned (API limits, timing, edge cases)
- Example: Google Sheets API rejects range `Sheet1!AA1` because grid only has 26 columns → use `batchUpdate` to expand grid first → update skill to document this.

### 3. Update skills as you learn

Skills are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the skill. But don't create or overwrite skills without asking unless explicitly told to. Skills are your instruction set and must be preserved and improved over time.

### 4. Extract real data, never guess

When creating widgets, every hex color, font family, and design parameter must come from actual site CSS/DOM analysis. Visit the website with WebFetch, extract exact values. The widget must look like it belongs on the client's site.

### 5. Never stop on individual failures in batch operations

When processing multiple leads (mass-quick-widgets, create-start-messages), log the error, add to failures list, and continue to the next lead. Report all results at the end.

---

## Self-Annealing Loop

Errors are learning opportunities. When something breaks:

1. Fix it
2. Update the script
3. Test script, make sure it works
4. Update the skill to include new flow
5. System is now stronger

---

## File Organization

### Directory Structure

```
.agent/
  skills/                     # Layer 1: Skill definitions (SOPs)
    create-quick-widget/SKILL.md
    mass-quick-widgets/SKILL.md
    create-start-messages/SKILL.md
    create-widget/SKILL.md
    create-telegram-bot-assistant/SKILL.md
    create-whatsapp-assistant/SKILL.md
    create-instagram-assistant/SKILL.md
  widget-builder/
    scripts/                  # Layer 3: Execution scripts
    clients/<clientId>/       # Per-client configs (theme.json, widget.config.json, knowledge/)
    src/                      # Widget source code (Preact)
    dist/                     # Build output
  prompts/                    # System prompts for AI agents
    outreach_agent_system_prompt.md
    niche_dental_addon.md
    niche_beauty_salon_addon.md
  workflows/                  # High-level workflow guides

src/                          # Next.js application
  app/api/                    # API routes (auth, chat, payments, integrations, webhooks)
  app/admin/                  # Admin panel
  app/demo/[template]/        # Demo pages (Dental, Construction, Hotel, ClientWebsite)
  app/cabinet/                # Client self-service portal
  lib/                        # Core libraries (MongoDB, AI, payments, integrations)
  components/                 # React components

quickwidgets/<clientId>/      # Deployed quick/demo widgets (script.js + info.json)
widgets/<clientId>/           # Deployed production widgets
```

### Deliverables vs Intermediates

- **Deliverables**: Built widgets in `quickwidgets/` and `widgets/`, Google Sheets updates, Telegram reports
- **Intermediates**: `theme.json`, `widget.config.json`, build artifacts in `.agent/widget-builder/dist/`

### Key Principle

Widget source files are generated, not hand-written. `theme.json` → `generate-single-theme.js` → 6 source files → `build.js` → `script.js`. The final `script.js` gets copied to `quickwidgets/<clientId>/` or `widgets/<clientId>/`.

---

## Widget Build Pipeline

```
1. Analyze website (WebFetch → extract colors, fonts, content)
2. Create .agent/widget-builder/clients/<clientId>/theme.json
3. Create .agent/widget-builder/clients/<clientId>/widget.config.json
4. Run: node .agent/widget-builder/scripts/generate-single-theme.js <clientId>
5. Run: node .agent/widget-builder/scripts/build.js <clientId>
6. Copy: .agent/widget-builder/dist/script.js → quickwidgets/<clientId>/script.js
7. Write: quickwidgets/<clientId>/info.json  (clientType: "quick")
8. Upload knowledge: POST /api/knowledge
9. Set AI settings: PUT /api/ai-settings/<clientId>
```

**Critical constraints:**

- Widget uses Tailwind CSS **v3** (not v4) — the widget builder has its own `postcss.config.cjs` and `tailwind.config.js`
- CSS is injected via `window.__WIDGET_CSS__` into Shadow DOM — never use raw `@tailwind` directives
- Quick widgets deploy to `quickwidgets/`, production widgets to `widgets/`

---

## API Reference (Internal)

All API calls require `Cookie: admin_token=${ADMIN_SECRET_TOKEN}` from `.env.local`.

| Endpoint                                         | Method   | Purpose                                                 |
| ------------------------------------------------ | -------- | ------------------------------------------------------- |
| `/api/integrations/sheets/read?spreadsheetId=ID` | GET      | Read spreadsheet data                                   |
| `/api/integrations/sheets/update`                | POST     | Update spreadsheet cells                                |
| `/api/integrations/sheets/search?name=query`     | GET      | Search spreadsheets by name                             |
| `/api/telegram/notify`                           | POST     | Send Telegram notification (supports multiple chat IDs) |
| `/api/knowledge`                                 | POST     | Upload knowledge base content                           |
| `/api/ai-settings/<clientId>`                    | PUT      | Configure AI system prompt and params                   |
| `/api/chat/stream`                               | POST     | Stream AI chat response                                 |
| `/api/clients`                                   | GET/POST | List/create clients                                     |

**Google Sheets API notes:**

- Uses service account auth (`service_account.json` at project root)
- Range format: **no sheet name prefix** (use `Z1:Z58`, not `Sheet1!Z1:Z58`)
- Grid has max 26 columns by default — use Sheets `batchUpdate` API to expand if needed
- The internal API wraps Google Sheets REST API v4 with JWT auth

---

## Environment

- **Local dev**: `http://localhost:3000` (Next.js dev server)
- **Production**: `https://winbix-ai.pp.ua`
- **Demo links**: `https://winbix-ai.pp.ua/demo/client-website?client=<clientId>&website=<encoded_url>`
- **Widget embed**: `<script src="https://winbix-ai.pp.ua/quickwidgets/<clientId>/script.js"></script>`

---

## Common Gotchas

1. **Tailwind v3 vs v4**: The main Next.js app uses Tailwind v4, but the widget builder uses Tailwind v3. Don't mix configs.
2. **Shadow DOM CSS**: Widget CSS must be processed by PostCSS/Tailwind before injection. Raw `@tailwind` directives don't work in Shadow DOM.
3. **Google Sheets grid limits**: Default grid is 26 columns (A-Z). Adding column AA+ requires expanding the grid via `batchUpdate` API first.
4. **Sheet range prefix**: The internal API doesn't use sheet name prefixes. `Z1` works, `Sheet1!Z1` fails.
5. **WebFetch on Ukrainian sites**: Many are WordPress/Elementor/React SPAs — JS-rendered content may not appear. Try WP REST API (`/wp-json/wp/v2/pages`), sitemaps (`/sitemap.xml`), or alternative URL patterns.
6. **Demo link encoding**: Website URLs in demo links must be `encodeURIComponent()`-encoded.
7. **Service account**: `service_account.json` must be in project root and the spreadsheet must be shared with the service account email.

---

## Summary

You sit between human intent (skills) and deterministic execution (Node.js scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.
