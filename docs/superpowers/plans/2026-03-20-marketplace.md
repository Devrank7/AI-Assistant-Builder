# Marketplace / Template Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Widget Marketplace where users can browse, install, publish, rate, and review widget templates — pre-seeded with 10 Apple-level official templates.

**Architecture:** Two Mongoose models (MarketplaceTemplate + MarketplaceReview), 7 API routes, 3 dashboard pages, and a seed script for 10 official templates. All pages use glassmorphism + framer-motion animations.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB/Mongoose, framer-motion, lucide-react

**What already exists:**

- Auth: `verifyUser(request)` → `{ authenticated, userId, organizationId, orgRole }`
- API pattern: `successResponse(data)`, `Errors.badRequest()` from `@/lib/apiResponse`
- Model pattern: `mongoose.models.X || mongoose.model()` with `Schema<IInterface>`
- Dashboard layout with nav groups (MAIN, BUILD, INSIGHTS, WORKSPACE)
- Widget builder templates system in `src/lib/builder/templates.ts`
- 10 niche categories, existing theme.json structure with 61+ fields

---

## File Structure

| File                                                         | Responsibility                                   |
| ------------------------------------------------------------ | ------------------------------------------------ |
| **Create:** `src/models/MarketplaceTemplate.ts`              | Template model with niche, tier, metrics, status |
| **Create:** `src/models/MarketplaceReview.ts`                | Review model with rating + comment               |
| **Create:** `src/app/api/marketplace/route.ts`               | GET (list/search/filter) + POST (publish)        |
| **Create:** `src/app/api/marketplace/[id]/route.ts`          | GET (detail) + PATCH (update) + DELETE (remove)  |
| **Create:** `src/app/api/marketplace/[id]/install/route.ts`  | POST (fork template to account)                  |
| **Create:** `src/app/api/marketplace/[id]/review/route.ts`   | GET (list reviews) + POST (add review)           |
| **Create:** `src/app/api/marketplace/seed/route.ts`          | POST (seed 10 official templates)                |
| **Create:** `src/app/dashboard/marketplace/page.tsx`         | Browse marketplace page                          |
| **Create:** `src/app/dashboard/marketplace/[id]/page.tsx`    | Template detail page                             |
| **Create:** `src/app/dashboard/marketplace/publish/page.tsx` | Publish template page                            |
| **Modify:** `src/app/dashboard/layout.tsx`                   | Add Marketplace nav item                         |
| **Create:** `src/test/marketplace.test.ts`                   | Tests for models + API                           |

---

### Task 1: Data Models

**Files:**

- Create: `src/models/MarketplaceTemplate.ts`
- Create: `src/models/MarketplaceReview.ts`

- [ ] **Step 1: Create MarketplaceTemplate model**

Create `src/models/MarketplaceTemplate.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export const MARKETPLACE_NICHES = [
  'dental',
  'beauty',
  'restaurant',
  'real_estate',
  'ecommerce',
  'saas',
  'hotel',
  'fitness',
  'legal',
  'auto',
] as const;

export type MarketplaceNiche = (typeof MARKETPLACE_NICHES)[number];

export const NICHE_LABELS: Record<MarketplaceNiche, string> = {
  dental: 'Dental',
  beauty: 'Beauty & Spa',
  restaurant: 'Restaurant',
  real_estate: 'Real Estate',
  ecommerce: 'E-Commerce',
  saas: 'SaaS & Tech',
  hotel: 'Hotel & Travel',
  fitness: 'Fitness',
  legal: 'Legal',
  auto: 'Automotive',
};

export const NICHE_ICONS: Record<MarketplaceNiche, string> = {
  dental: '🦷',
  beauty: '💅',
  restaurant: '🍕',
  real_estate: '🏠',
  ecommerce: '🛒',
  saas: '💻',
  hotel: '🏨',
  fitness: '💪',
  legal: '⚖️',
  auto: '🚗',
};

export interface IMarketplaceTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  niche: MarketplaceNiche;
  widgetType: 'ai_chat' | 'smart_faq' | 'lead_form';
  tags: string[];
  themeJson: Record<string, unknown>;
  configJson: Record<string, unknown>;
  knowledgeSample: string;
  authorId: string;
  authorName: string;
  tier: 'official' | 'community';
  rating: number;
  reviewCount: number;
  installCount: number;
  status: 'draft' | 'review' | 'published' | 'rejected';
  screenshots: string[];
  previewConfig: { primaryColor: string; isDark: boolean };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const MarketplaceTemplateSchema = new Schema<IMarketplaceTemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 120 },
    niche: { type: String, required: true, enum: MARKETPLACE_NICHES },
    widgetType: { type: String, required: true, enum: ['ai_chat', 'smart_faq', 'lead_form'], default: 'ai_chat' },
    tags: { type: [String], default: [] },
    themeJson: { type: Schema.Types.Mixed, required: true },
    configJson: { type: Schema.Types.Mixed, required: true },
    knowledgeSample: { type: String, default: '' },
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    tier: { type: String, required: true, enum: ['official', 'community'] },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    installCount: { type: Number, default: 0 },
    status: { type: String, required: true, enum: ['draft', 'review', 'published', 'rejected'], default: 'draft' },
    screenshots: { type: [String], default: [] },
    previewConfig: {
      primaryColor: { type: String, default: '#5bbad5' },
      isDark: { type: Boolean, default: true },
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

MarketplaceTemplateSchema.index({ status: 1, niche: 1 });
MarketplaceTemplateSchema.index({ status: 1, installCount: -1 });
MarketplaceTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

const MarketplaceTemplate: Model<IMarketplaceTemplate> =
  mongoose.models.MarketplaceTemplate ||
  mongoose.model<IMarketplaceTemplate>('MarketplaceTemplate', MarketplaceTemplateSchema);

export default MarketplaceTemplate;
```

- [ ] **Step 2: Create MarketplaceReview model**

Create `src/models/MarketplaceReview.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketplaceReview extends Document {
  templateId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

const MarketplaceReviewSchema = new Schema<IMarketplaceReview>(
  {
    templateId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

MarketplaceReviewSchema.index({ templateId: 1, userId: 1 }, { unique: true });

const MarketplaceReview: Model<IMarketplaceReview> =
  mongoose.models.MarketplaceReview || mongoose.model<IMarketplaceReview>('MarketplaceReview', MarketplaceReviewSchema);

export default MarketplaceReview;
```

- [ ] **Step 3: Commit**

```bash
git add src/models/MarketplaceTemplate.ts src/models/MarketplaceReview.ts
git commit -m "feat: add MarketplaceTemplate and MarketplaceReview models"
```

---

### Task 2: Core API Routes

**Files:**

- Create: `src/app/api/marketplace/route.ts`
- Create: `src/app/api/marketplace/[id]/route.ts`

- [ ] **Step 1: Create marketplace list + publish route**

Create `src/app/api/marketplace/route.ts`:

- **GET**: List/search/filter templates. Query params: `niche`, `widgetType`, `tier`, `sort` (popular|newest|top_rated), `search`, `page`, `limit`. Only return `status: 'published'` for non-admin users. Use `$text` search for search param.
- **POST**: Publish a new template. Requires `verifyUser`. Body: `{ name, description, shortDescription, niche, widgetType, tags, themeJson, configJson, knowledgeSample, screenshots }`. Auto-sets `authorId`, `authorName`, `tier: 'community'`, `status: 'review'`. Generate slug from name.

Pattern: Use `verifyUser(request)` from `@/lib/auth`, `successResponse`/`Errors` from `@/lib/apiResponse`, `connectDB` from `@/lib/mongodb`.

- [ ] **Step 2: Create single template CRUD route**

Create `src/app/api/marketplace/[id]/route.ts`:

- **GET**: Get template by ID. Public access for published templates.
- **PATCH**: Update template. Only author or admin can update. Updatable: name, description, shortDescription, tags, screenshots.
- **DELETE**: Delete template. Only author or admin. Sets status to 'rejected' (soft delete).

Remember: Next.js 15 route params are `{ params }: { params: Promise<{ id: string }> }` — must `await params`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/marketplace/
git commit -m "feat: add marketplace list, publish, and CRUD API routes"
```

---

### Task 3: Install + Review API Routes

**Files:**

- Create: `src/app/api/marketplace/[id]/install/route.ts`
- Create: `src/app/api/marketplace/[id]/review/route.ts`

- [ ] **Step 1: Create install route**

Create `src/app/api/marketplace/[id]/install/route.ts`:

- **POST**: Fork template to user's account. Requires `verifyUser`.
  1. Find template by ID (must be published)
  2. Create a new Client record: `clientType: 'full'`, copy themeJson as widget config basis
  3. Increment `installCount` on template
  4. Return `{ clientId }` for redirect to Builder

- [ ] **Step 2: Create review route**

Create `src/app/api/marketplace/[id]/review/route.ts`:

- **GET**: List reviews for template. Public. Sorted by newest. Paginated.
- **POST**: Add review. Requires `verifyUser`. Body: `{ rating, comment }`. One review per user per template (upsert). After saving, recalculate template's `rating` (average) and `reviewCount`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/marketplace/[id]/install/ src/app/api/marketplace/[id]/review/
git commit -m "feat: add marketplace install and review API routes"
```

---

### Task 4: Official Templates Seed

**Files:**

- Create: `src/app/api/marketplace/seed/route.ts`

- [ ] **Step 1: Create seed route with 10 official templates**

Create `src/app/api/marketplace/seed/route.ts`:

- **POST**: Admin-only route. Seeds 10 official templates if they don't already exist (check by slug).
- Each template has a complete theme.json (61+ fields), widget.config.json, and sample knowledge content.
- Use the existing color palettes from `src/lib/builder/templates.ts` as starting points, but create full Apple-level theme.json configs for each.

The 10 templates (each with full theme.json, configJson, knowledgeSample):

1. **dental-ai-assistant** — Teal/cyan dark theme, appointment booking, insurance FAQ
2. **beauty-studio-chat** — Rose/pink light theme, service booking, portfolio
3. **restaurant-concierge** — Red/orange dark theme, menu, reservations
4. **property-advisor** — Emerald/green light theme, listings, viewings
5. **shop-assistant** — Violet/purple dark theme, product search, orders
6. **saas-support-bot** — Indigo/blue dark theme, pricing, demo booking
7. **hotel-concierge** — Amber/gold dark theme, room booking, amenities
8. **fitness-coach** — Orange/red light theme, classes, membership
9. **legal-advisor** — Navy/slate dark theme, consultation booking
10. **auto-service-hub** — Charcoal/silver light theme, service booking

Each theme.json must include all required fields: label, domain, fontUrl, font, isDark, widgetW, widgetH, toggleSize, toggleRadius, headerPad, nameSize, all gradient fields (headerFrom/Via/To, toggleFrom/Via/To), all message colors, chip colors, avatar colors, surface colors, etc.

Each configJson must include: botName, welcomeMessage, inputPlaceholder, quickReplies (4-5 niche-relevant), avatar (emoji type), features (sound, voiceInput, feedback, streaming, tts, autoLang, richCards, memory, proactive with delay and message).

Each knowledgeSample: 200-400 chars of niche-relevant knowledge.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/marketplace/seed/route.ts
git commit -m "feat: add marketplace seed route with 10 official templates"
```

---

### Task 5: Marketplace Browse Page

**Files:**

- Create: `src/app/dashboard/marketplace/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add Marketplace to dashboard nav**

In `src/app/dashboard/layout.tsx`:

- Add `Store` to lucide-react imports
- Add `{ label: 'Marketplace', href: '/dashboard/marketplace', icon: Store }` to the BUILD nav group (after Flows)

- [ ] **Step 2: Create marketplace browse page**

Create `src/app/dashboard/marketplace/page.tsx` — Apple Enterprise 2026 quality.

Sections:

1. **Hero**: "Widget Marketplace" — gradient text, subtitle "Discover ready-to-deploy AI chat templates for every industry"
2. **Filter bar**: Niche chips (All + 10 niches with emoji icons), widget type filter, sort dropdown (Popular/Newest/Top Rated), search input
3. **Template grid** (3 cols desktop, 2 tablet, 1 mobile): Each card has:
   - Color preview strip at top (using previewConfig.primaryColor)
   - Niche emoji + badge
   - Template name, short description
   - Rating stars (filled/empty) + review count
   - Install count with Download icon
   - Author name + tier badge (Official = gold, Community = blue)
   - "Use Template" button + "Preview" button
4. **Empty state**: "No templates found" with illustration
5. **Pagination**: Page numbers at bottom

Use `'use client'`, fetch from `/api/marketplace` with query params.
framer-motion stagger on cards, glassmorphism card styling.
Link each card to `/dashboard/marketplace/[id]`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/marketplace/ src/app/dashboard/layout.tsx
git commit -m "feat: add marketplace browse page with filters and template grid"
```

---

### Task 6: Template Detail Page

**Files:**

- Create: `src/app/dashboard/marketplace/[id]/page.tsx`

- [ ] **Step 1: Create template detail page**

Create `src/app/dashboard/marketplace/[id]/page.tsx` — Apple Enterprise 2026 quality.

Sections:

1. **Back link**: "← Back to Marketplace"
2. **Header**: Template name, author + tier badge, niche badge with emoji, rating stars, install count, created date
3. **Action buttons**: "Use This Template" (primary gradient CTA, calls install API, redirects to Builder), "Remix in Builder" (secondary), share button
4. **Description card**: Full description, tags as colored pills, widget type badge, features list extracted from configJson
5. **Preview card**: Color palette visualization (show key colors from themeJson), widget type indicator, dark/light mode indicator
6. **Reviews section**:
   - Rating summary: average rating (large number), star distribution bars (5★ to 1★)
   - "Write a Review" form: star selector (clickable stars), comment textarea, submit button
   - Review list: each review shows userName, rating stars, comment, date
   - Paginated (load more button)
7. **Related templates**: 3 cards from same niche (fetched from API)

Remember: Next.js 15 params: `{ params }: { params: Promise<{ id: string }> }` — must `await params`.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/marketplace/[id]/
git commit -m "feat: add marketplace template detail page with reviews"
```

---

### Task 7: Publish Page

**Files:**

- Create: `src/app/dashboard/marketplace/publish/page.tsx`

- [ ] **Step 1: Create publish template page**

Create `src/app/dashboard/marketplace/publish/page.tsx`:

1. **Header**: "Publish to Marketplace" — subtitle "Share your widget template with the community"
2. **Widget selector**: Dropdown/grid of user's widgets (fetch from `/api/clients` or user's widgets). Each shows widget name + preview.
3. **Form fields**:
   - Template name (text input)
   - Short description (text input, 120 char limit with counter)
   - Full description (textarea, markdown supported)
   - Niche selector (dropdown with emoji labels)
   - Tags (multi-input with tag pills, add on Enter)
   - Screenshots (placeholder — "Upload screenshots coming soon", for now just info text)
4. **Preview card**: Shows how the template card will look in marketplace
5. **Submit button**: "Submit for Review" — calls POST /api/marketplace
6. **Success state**: "Template submitted for review! We'll notify you when it's published."

'use client', glassmorphism form styling, framer-motion transitions.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/marketplace/publish/
git commit -m "feat: add marketplace publish page for community templates"
```

---

### Task 8: Tests + Seed + Push

- [ ] **Step 1: Create marketplace tests**

Create `src/test/marketplace.test.ts`:

```typescript
// Test 1: MarketplaceTemplate model — create and query
// Test 2: MarketplaceReview model — create with rating validation
// Test 3: GET /api/marketplace — returns published templates
```

Use existing test patterns: `vi.mock('@/lib/mongodb')`, mock models, dynamic imports.

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/test/marketplace.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Seed official templates**

Call `POST /api/marketplace/seed` to populate the 10 official templates.

- [ ] **Step 4: Commit and push**

```bash
git add src/test/marketplace.test.ts
git commit -m "feat: add marketplace tests"
git push origin main
```

---
