# WinBix AI — Enterprise Roadmap

**Created:** 2026-03-20
**Status:** Active

---

## Completed Features (1-9)

| #   | Feature                                                                    | Status  | Commit |
| --- | -------------------------------------------------------------------------- | ------- | ------ |
| 1   | Contacts CRM (lead scoring, tags, timeline)                                | ✅ Done | main   |
| 2   | Unified Inbox (all channels, AI-suggested replies)                         | ✅ Done | main   |
| 3   | Flow Builder (visual trigger-action automations)                           | ✅ Done | main   |
| 4   | Enterprise Dashboard (A/B stats, AI quality, white-label, audit log)       | ✅ Done | main   |
| 5   | Integration Hub v2 (webhooks, 12 events, HMAC, retry, widget bindings)     | ✅ Done | main   |
| 6   | Landing & Marketing (Features, Customers, Enterprise, Agency, Changelog)   | ✅ Done | main   |
| 7   | Developer API Platform (REST API v1, API keys, interactive docs)           | ✅ Done | main   |
| 8   | Onboarding & Growth (referral, email sequences, notifications, wizard)     | ✅ Done | main   |
| 9   | Widget Marketplace (10 official templates, browse/install/publish/reviews) | ✅ Done | main   |

---

## Tier 1 — "Must Have" for Enterprise Sales

| #   | Feature                         | Description                                                                                                                         | Competitors                     |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 10  | **Enterprise SSO (SAML/OIDC)**  | Microsoft Entra, Okta, OneLogin. Required for enterprise compliance.                                                                | Intercom ✅, Drift ✅, Tidio ❌ |
| 11  | **Full Plugin Implementations** | 9 stubs → real HTTP calls. Salesforce, Calendly, Stripe, Google Calendar, Pipedrive, etc.                                           | Intercom ✅, Tidio partial      |
| 12  | **Advanced AI Agents**          | Per-niche AI personality (Sales/Support/Booking Agent). Multi-model fallback (Gemini → Claude → GPT). Agent memory across sessions. | ChatBot ❌, Intercom partial    |
| 13  | **Real-Time Voice Agent**       | WebRTC voice conversation with AI in widget. Voice-first UX. 2026 = voice agents.                                                   | Nobody ❌                       |
| 14  | **Auto-Evolving Knowledge**     | Cron re-crawl every 7 days → diff → auto-update knowledge base. Zero maintenance for client.                                        | Nobody ❌                       |

---

## Tier 2 — "Competitive Edge" (outpace everyone)

| #   | Feature                       | Description                                                                                                 |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 15  | **Conversation Intelligence** | NLP analysis: buying signals, churn risk, competitor mentions, sentiment trends. Insights dashboard.        |
| 16  | **Multi-Agent Orchestration** | Multiple AI agents per widget. Sales → Support → Billing. Auto-switch by intent detection.                  |
| 17  | **Custom Domain + SSL**       | Real DNS validation, Let's Encrypt auto-cert, reverse proxy. Widget served from `chat.clientdomain.com`.    |
| 18  | **Advanced Analytics v2**     | Funnel analysis, cohort retention, revenue attribution, predictive churn score. Grafana-level dashboards.   |
| 19  | **AI Training Studio**        | UI for fine-tuning: upload "ideal" chats → AI learns response style. Human-in-the-loop correction workflow. |

---

## Tier 3 — "Wow Factor" (nobody does this)

| #   | Feature                    | Description                                                                                          |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| 20  | **Widget Co-Browsing**     | Agent sees client's screen in real-time. Can highlight elements, guide through site.                 |
| 21  | **AI Video Avatar**        | Widget with video avatar (HeyGen/D-ID style). AI speaks with a face. Wow-effect for landing pages.   |
| 22  | **Predictive Engagement**  | ML model predicts when visitor will leave → proactively starts chat at optimal moment.               |
| 23  | **Multi-Brand Management** | One account → 50 brands, each with own domain, logo, widgets. For agencies with hundreds of clients. |
| 24  | **Compliance Suite**       | SOC2 audit log export, HIPAA mode (PHI encryption), GDPR DPA generator, data residency (EU/US).      |

---

## Tier 4 — "Platform Play" (become an ecosystem)

| #   | Feature                           | Description                                                                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 25  | **Premium Marketplace**           | Paid templates ($19-99), 70/30 revenue sharing with creators. AppStore for chat widgets.                               |
| 26  | **Public API v2 (GraphQL)**       | GraphQL API, WebSocket subscriptions, SDK packages (npm/pip). Developers build on our platform.                        |
| 27  | **Widget Builder v2**             | Component-based architecture. Drag-and-drop UI. CSS variables. Deterministic edits without rebuild.                    |
| 28  | **Reseller / White-Label Portal** | Separate portal for resellers: sub-account creation, billing override, branded login.                                  |
| 29  | **AI Agent Store**                | Marketplace for AI agents (not widgets, but logic). "Sales Agent for Dental", "Support Agent for SaaS". Plug-and-play. |

---

## Pricing Impact

| Tier            | Features                                                        | Product Value     | Target Audience       |
| --------------- | --------------------------------------------------------------- | ----------------- | --------------------- |
| Tier 1 (#10-14) | SSO, plugins, AI agents, voice, auto-knowledge                  | $999 → $2,499     | Enterprise buyers     |
| Tier 2 (#15-19) | Intelligence, multi-agent, custom domain, analytics, training   | $2,499 → $4,999   | Agencies, mid-market  |
| Tier 3 (#20-24) | Co-browse, video avatar, predictive, multi-brand, compliance    | $4,999 → $9,999   | Unique selling points |
| Tier 4 (#25-29) | Premium marketplace, GraphQL, builder v2, reseller, agent store | $9,999 → platform | Ecosystem play        |

---

## Current Gaps (to close before selling)

| Gap               | Current State             | Required                           |
| ----------------- | ------------------------- | ---------------------------------- |
| SSO/SAML/OIDC     | Google OAuth only         | Microsoft Entra, Okta, SAML 2.0    |
| 9 plugins = stubs | Only HubSpot works        | Real HTTP implementations          |
| Custom Domain     | DB field only             | DNS validation, SSL, reverse proxy |
| Monitoring/APM    | console.error + audit log | Sentry, metrics, alerting          |
| Agentic Router    | Code written, untested    | Real Gemini API tests              |
| Job Queue         | Cron endpoints only       | Bull/Agenda for reliability        |
| Compliance        | GDPR basic                | SOC2, HIPAA, DPA                   |
