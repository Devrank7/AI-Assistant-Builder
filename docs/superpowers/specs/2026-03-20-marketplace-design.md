# Widget Marketplace & Template Gallery — Design Spec

**Date:** 2026-03-20
**Feature:** #9 — Marketplace / Template Gallery
**Status:** Approved

---

## Goal

Build an enterprise-grade Widget Marketplace where users can browse, preview, install, and publish widget templates. Pre-seed with 10 Apple-level official templates (one per niche), enable community publishing, and integrate with the existing widget builder for one-click forking and remixing.

---

## Architecture

### 3-Tier Template System

| Tier         | Source                       | Curation                  | Examples                               |
| ------------ | ---------------------------- | ------------------------- | -------------------------------------- |
| Official     | WinBix team (pre-seeded)     | Curated, always published | "Dental AI Chat", "Restaurant Booking" |
| Community    | Users publish their widgets  | Manual review → published | "Fitness Lead Form by @user123"        |
| AI-Generated | Existing widget builder flow | User creates via Builder  | On-demand, not in marketplace          |

### Data Flow

```
Browse Marketplace → Select Template → One-Click Install
  → Clone theme.json + config.json to user's client folder
  → Open Builder with pre-filled config
  → User customizes → Build → Deploy

Publish Flow:
  My Widgets → "Publish to Marketplace" → Fill metadata
  → Status: review → Admin approves → Status: published
  → Appears in marketplace
```

---

## Data Model

### MarketplaceTemplate

```typescript
interface IMarketplaceTemplate {
  // Identity
  name: string; // "Dental AI Assistant"
  slug: string; // "dental-ai-assistant" (unique)
  description: string; // Rich description
  shortDescription: string; // Card subtitle (120 chars)

  // Classification
  niche: MarketplaceNiche; // 'dental' | 'beauty' | 'restaurant' | ...
  widgetType: 'ai_chat' | 'smart_faq' | 'lead_form';
  tags: string[]; // ["booking", "multilingual", "dark-mode"]

  // Widget Configuration (portable)
  themeJson: Record<string, unknown>; // Full theme.json snapshot
  configJson: Record<string, unknown>; // Full widget.config.json snapshot
  knowledgeSample: string; // Sample knowledge/context.md content

  // Author
  authorId: string; // userId (ObjectId ref)
  authorName: string; // Display name
  tier: 'official' | 'community';

  // Metrics
  rating: number; // 0-5, computed average
  reviewCount: number;
  installCount: number;

  // Status
  status: 'draft' | 'review' | 'published' | 'rejected';

  // Media
  screenshots: string[]; // URLs to screenshot images
  previewConfig: {
    // For live iframe preview
    primaryColor: string;
    isDark: boolean;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

### MarketplaceReview

```typescript
interface IMarketplaceReview {
  templateId: string; // ObjectId ref
  userId: string; // ObjectId ref
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}
```

### Niche Enum

```typescript
type MarketplaceNiche =
  | 'dental'
  | 'beauty'
  | 'restaurant'
  | 'real_estate'
  | 'ecommerce'
  | 'saas'
  | 'hotel'
  | 'fitness'
  | 'legal'
  | 'auto';
```

---

## API Routes

| Route                           | Method | Auth         | Purpose                      |
| ------------------------------- | ------ | ------------ | ---------------------------- |
| `/api/marketplace`              | GET    | No           | List/search/filter templates |
| `/api/marketplace`              | POST   | User         | Publish new template         |
| `/api/marketplace/[id]`         | GET    | No           | Get template details         |
| `/api/marketplace/[id]`         | PATCH  | Author/Admin | Update template              |
| `/api/marketplace/[id]`         | DELETE | Author/Admin | Remove template              |
| `/api/marketplace/[id]/install` | POST   | User         | Fork template to account     |
| `/api/marketplace/[id]/review`  | POST   | User         | Add rating & review          |
| `/api/marketplace/seed`         | POST   | Admin        | Seed official templates      |

### Query Parameters (GET /api/marketplace)

- `niche` — filter by niche
- `widgetType` — filter by widget type
- `tier` — filter by tier (official/community)
- `sort` — `popular` | `newest` | `top_rated` (default: popular)
- `search` — full-text search on name, description, tags
- `page`, `limit` — pagination (default: 20 per page)

### Install Flow (POST /api/marketplace/[id]/install)

1. Verify user auth
2. Read template's themeJson + configJson
3. Create new Client record with `clientType: 'full'`
4. Write theme.json + widget.config.json to client folder
5. Increment template's installCount
6. Return new clientId for Builder redirect

---

## Pages

### 1. `/dashboard/marketplace` — Browse Page

**Layout:** MarketingNav-style header with search bar, niche filter chips, sort dropdown.

**Content:**

- Hero section: "Widget Marketplace" — "Discover ready-to-deploy AI chat templates"
- Filter bar: niche chips (All, Dental, Beauty, ...) + widget type filter + sort
- Template grid (3 cols desktop, 2 tablet, 1 mobile):
  - Each card: screenshot/preview, name, short description, niche badge, rating stars, install count, author name, tier badge (Official/Community)
  - Hover: subtle scale + shadow
- Pagination at bottom
- framer-motion stagger on scroll

### 2. `/dashboard/marketplace/[id]` — Template Detail Page

**Layout:** Full-width detail page.

**Sections:**

1. **Header**: Template name, author, tier badge, niche badge, rating, install count
2. **Preview area**: Large screenshot gallery + live preview button (opens iframe modal)
3. **Action buttons**: "Use This Template" (primary CTA) + "Remix in Builder" + "Share"
4. **Description**: Full description, tags, widget type, features list
5. **Reviews section**: Star distribution bar, individual reviews with rating + comment
6. **"Write a Review" form**: Star selector + text input (auth required)
7. **Related templates**: 3 cards from same niche

### 3. `/dashboard/marketplace/publish` — Publish Page

**Form fields:**

- Select widget (dropdown of user's widgets)
- Template name, short description, full description
- Niche selector (dropdown)
- Tags (multi-input)
- Screenshots (file upload, max 3)
- Preview button (see how it will look)
- Submit for review button

**Flow:** Submit → status: review → admin approves in admin panel → published

---

## 10 Official Templates

Each template includes a complete theme.json with 61+ color fields, widget.config.json with niche-appropriate settings, and sample knowledge content.

| #   | Niche       | Name                 | Colors                 | Widget Type | Key Features                                         |
| --- | ----------- | -------------------- | ---------------------- | ----------- | ---------------------------------------------------- |
| 1   | Dental      | Dental AI Assistant  | Teal/cyan, dark        | ai_chat     | Appointment booking, insurance FAQ, emergency triage |
| 2   | Beauty      | Beauty Studio Chat   | Rose/pink, light       | ai_chat     | Service booking, pricing, portfolio showcase         |
| 3   | Restaurant  | Restaurant Concierge | Red/orange, dark       | ai_chat     | Menu, reservations, hours, dietary info              |
| 4   | Real Estate | Property Advisor     | Emerald/green, light   | ai_chat     | Listing search, viewing scheduler, mortgage info     |
| 5   | E-Commerce  | Shop Assistant       | Violet/purple, dark    | ai_chat     | Product search, order tracking, returns              |
| 6   | SaaS        | SaaS Support Bot     | Indigo/blue, dark      | ai_chat     | Pricing, demo booking, API docs, onboarding          |
| 7   | Hotel       | Hotel Concierge      | Amber/gold, dark       | ai_chat     | Room booking, amenities, local recommendations       |
| 8   | Fitness     | Fitness Coach        | Orange/red, light      | ai_chat     | Class schedule, membership plans, trainer booking    |
| 9   | Legal       | Legal Advisor        | Navy/slate, dark       | ai_chat     | Consultation booking, practice areas, FAQ            |
| 10  | Auto        | Auto Service Hub     | Charcoal/silver, light | ai_chat     | Service booking, parts inquiry, financing            |

---

## Integration Points

- **Widget Builder**: "Remix in Builder" opens builder with cloned template
- **My Widgets page**: "Publish to Marketplace" button on each widget card
- **Dashboard nav**: New "Marketplace" nav item with Store icon
- **TemplateSelector**: Not modified (marketplace is a separate, richer experience)

---

## What's NOT Included (Deferred)

- **Monetization**: No paid templates, no revenue sharing (future feature)
- **AI moderation**: Manual review only for community submissions
- **Featured/trending algorithms**: Simple sort by install count
- **Public SEO page**: Marketplace is dashboard-only (auth required for install, browsing is public API)
- **Screenshot auto-generation**: Manual upload only
- **Template versioning**: No version history, latest only

---

## Success Criteria

1. 10 official templates seeded and browsable
2. Users can install any template with one click and open in Builder
3. Users can publish their own widgets to marketplace
4. Ratings and reviews functional
5. Search, filter by niche, sort by popular/newest/top-rated all work
6. All pages have Apple-level glassmorphism UI with framer-motion animations
7. Mobile responsive (1-column grid on mobile)
