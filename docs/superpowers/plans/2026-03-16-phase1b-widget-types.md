# Phase 1b: Smart FAQ & Lead Form Widget Types

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Smart FAQ and Lead Form widget types to the platform, extending the existing AI Chat pipeline without breaking it. Users can choose a widget type in the builder, and the generator produces type-specific Preact components.

**Architecture:** New `widgetType` field flows through the entire pipeline: `Client` model → `BuilderSession` → `theme.json` → `generate-single-theme.js` → type-specific `.jsx` templates → `build.js` → deployed widget. Existing AI Chat path is untouched — new types add parallel branches.

**Tech Stack:** Preact + Vite + Tailwind CSS v3 (widget), MongoDB/Mongoose + TypeScript (backend), Vitest (tests)

**Spec Reference:** `docs/superpowers/specs/2026-03-16-enterprise-winbix-design.md` — Section 2

---

## File Structure

### New Files

| File                                                     | Responsibility                                     |
| -------------------------------------------------------- | -------------------------------------------------- |
| `.claude/widget-builder/src/src/components/SmartFaq.jsx` | Smart FAQ widget — accordion + AI search           |
| `.claude/widget-builder/src/src/components/LeadForm.jsx` | Lead Form widget — multi-step form with validation |
| `.claude/widget-builder/src/src/hooks/useFaq.js`         | FAQ data fetching + search logic                   |
| `.claude/widget-builder/src/src/hooks/useForm.js`        | Form state, validation, submission logic           |
| `src/app/api/widget/faq/route.ts`                        | API: get FAQ items from knowledge base             |
| `src/app/api/widget/form/route.ts`                       | API: submit lead form data                         |
| `src/lib/builder/widgetTypes.ts`                         | Widget type definitions, configs, required fields  |

### Modified Files

| File                                                      | Change                                        |
| --------------------------------------------------------- | --------------------------------------------- |
| `src/models/Client.ts`                                    | Add `widgetType` field                        |
| `src/models/BuilderSession.ts`                            | Add `widgetType` field                        |
| `.claude/widget-builder/scripts/generate-single-theme.js` | Conditional template generation by widgetType |
| `src/lib/builder/systemPrompt.ts`                         | Orchestrator learns widget type selection     |
| `src/lib/builder/types.ts`                                | Add `WIDGET_TYPES` constant                   |
| `src/components/builder/TemplateSelector.tsx`             | Widget type picker UI                         |
| `src/lib/builder/tools/generateDesign.ts`                 | Accept widgetType parameter                   |

---

## Chunk 1: Schema & Model Changes

### Task 1: Add widgetType to Client model

**Files:**

- Modify: `src/models/Client.ts`
- Test: existing tests should pass

- [ ] **Step 1: Add widgetType type and field**

In `src/models/Client.ts`:

Add type after `ClientType`:

```typescript
export type WidgetType = 'ai_chat' | 'smart_faq' | 'lead_form';
```

Add to `IClient` interface after `clientType`:

```typescript
widgetType: WidgetType;
```

Add to `ClientSchema` after `clientType` field:

```typescript
    widgetType: {
      type: String,
      enum: ['ai_chat', 'smart_faq', 'lead_form'],
      default: 'ai_chat',
    },
```

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All pass (default value prevents breakage)

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/Client.ts && git commit -m "feat: add widgetType field to Client model"
```

---

### Task 2: Add widgetType to BuilderSession model

**Files:**

- Modify: `src/models/BuilderSession.ts`

- [ ] **Step 1: Add widgetType field**

In `src/models/BuilderSession.ts`:

Add to `IBuilderSession` interface:

```typescript
widgetType: string | null;
```

Add to `BuilderSessionSchema`:

```typescript
    widgetType: {
      type: String,
      enum: ['ai_chat', 'smart_faq', 'lead_form'],
      default: null,
    },
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/models/BuilderSession.ts && git commit -m "feat: add widgetType to BuilderSession model"
```

---

### Task 3: Create widget type definitions

**Files:**

- Create: `src/lib/builder/widgetTypes.ts`
- Test: `src/lib/builder/__tests__/widgetTypes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/builder/__tests__/widgetTypes.test.ts
import { describe, it, expect } from 'vitest';
import { WIDGET_TYPES, getWidgetTypeConfig, getRequiredThemeFields } from '../widgetTypes';

describe('widgetTypes', () => {
  it('has all three widget types', () => {
    expect(WIDGET_TYPES).toHaveLength(3);
    expect(WIDGET_TYPES.map((t) => t.id)).toEqual(['ai_chat', 'smart_faq', 'lead_form']);
  });

  it('getWidgetTypeConfig returns correct config', () => {
    const faq = getWidgetTypeConfig('smart_faq');
    expect(faq).toBeDefined();
    expect(faq!.label).toBe('Smart FAQ');
    expect(faq!.components).toContain('SmartFaq.jsx');
  });

  it('getWidgetTypeConfig returns null for unknown type', () => {
    expect(getWidgetTypeConfig('unknown' as any)).toBeNull();
  });

  it('getRequiredThemeFields includes base fields for all types', () => {
    const chatFields = getRequiredThemeFields('ai_chat');
    expect(chatFields).toContain('domain');
    expect(chatFields).toContain('font');
  });

  it('smart_faq has faq-specific theme fields', () => {
    const faqFields = getRequiredThemeFields('smart_faq');
    expect(faqFields).toContain('faqAccordionBg');
    expect(faqFields).toContain('faqSearchBg');
  });

  it('lead_form has form-specific theme fields', () => {
    const formFields = getRequiredThemeFields('lead_form');
    expect(formFields).toContain('formInputBg');
    expect(formFields).toContain('formSubmitFrom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/widgetTypes.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the widgetTypes module**

```typescript
// src/lib/builder/widgetTypes.ts

export type WidgetTypeId = 'ai_chat' | 'smart_faq' | 'lead_form';

export interface WidgetTypeConfig {
  id: WidgetTypeId;
  label: string;
  description: string;
  icon: string;
  components: string[];
  hooks: string[];
  themeFields: string[];
}

const BASE_THEME_FIELDS = [
  'domain',
  'font',
  'isDark',
  'widgetW',
  'widgetH',
  'widgetMaxW',
  'widgetMaxH',
  'toggleSize',
  'toggleRadius',
  'headerPad',
  'nameSize',
  'headerFrom',
  'headerVia',
  'headerTo',
  'toggleFrom',
  'toggleVia',
  'toggleTo',
  'toggleShadow',
  'toggleHoverRgb',
  'cssPrimary',
  'cssAccent',
  'focusRgb',
];

const FAQ_THEME_FIELDS = [
  'faqAccordionBg',
  'faqAccordionBorder',
  'faqAccordionText',
  'faqAccordionHover',
  'faqAccordionActive',
  'faqAccordionIcon',
  'faqSearchBg',
  'faqSearchBorder',
  'faqSearchText',
  'faqSearchPlaceholder',
  'faqHighlight',
  'faqCategoryBg',
  'faqCategoryText',
];

const FORM_THEME_FIELDS = [
  'formInputBg',
  'formInputBorder',
  'formInputText',
  'formInputFocus',
  'formLabelText',
  'formErrorText',
  'formErrorBorder',
  'formSubmitFrom',
  'formSubmitTo',
  'formSubmitText',
  'formSubmitHover',
  'formProgressBg',
  'formProgressFill',
  'formStepActive',
  'formStepInactive',
  'formSuccessBg',
  'formSuccessText',
  'formSuccessIcon',
];

export const WIDGET_TYPES: WidgetTypeConfig[] = [
  {
    id: 'ai_chat',
    label: 'AI Chat',
    description: 'RAG chatbot with knowledge base, streaming responses, and voice input',
    icon: '💬',
    components: ['Widget.jsx', 'ChatMessage.jsx', 'QuickReplies.jsx', 'MessageFeedback.jsx', 'RichBlocks.jsx'],
    hooks: ['useChat.js', 'useDrag.js', 'useLanguage.js', 'useVoice.js', 'useTTS.js', 'useProactive.js'],
    themeFields: [],
  },
  {
    id: 'smart_faq',
    label: 'Smart FAQ',
    description: 'Accordion with AI search, auto-generated from knowledge base',
    icon: '❓',
    components: ['SmartFaq.jsx'],
    hooks: ['useFaq.js', 'useDrag.js', 'useLanguage.js'],
    themeFields: FAQ_THEME_FIELDS,
  },
  {
    id: 'lead_form',
    label: 'Lead Form',
    description: 'Multi-step form with conditional logic and validation',
    icon: '📋',
    components: ['LeadForm.jsx'],
    hooks: ['useForm.js', 'useDrag.js', 'useLanguage.js'],
    themeFields: FORM_THEME_FIELDS,
  },
];

export function getWidgetTypeConfig(id: WidgetTypeId): WidgetTypeConfig | null {
  return WIDGET_TYPES.find((t) => t.id === id) || null;
}

export function getRequiredThemeFields(id: WidgetTypeId): string[] {
  const config = getWidgetTypeConfig(id);
  if (!config) return BASE_THEME_FIELDS;
  return [...BASE_THEME_FIELDS, ...config.themeFields];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/widgetTypes.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/builder/widgetTypes.ts src/lib/builder/__tests__/widgetTypes.test.ts && git commit -m "feat: add widget type definitions and config"
```

---

## Chunk 2: Smart FAQ Widget Component

### Task 4: Create useFaq hook

**Files:**

- Create: `.claude/widget-builder/src/src/hooks/useFaq.js`

- [ ] **Step 1: Write the useFaq hook**

```javascript
// .claude/widget-builder/src/src/hooks/useFaq.js
import { useState, useEffect, useCallback } from 'preact/hooks';

/**
 * Hook for Smart FAQ widget — fetches FAQ items from knowledge base
 * and provides search/filter functionality.
 *
 * @param {string} clientId - The widget client ID
 * @param {string} apiBase - Base URL for API calls
 */
export function useFaq(clientId, apiBase) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch FAQ items on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchFaq() {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/api/widget/faq?clientId=${clientId}`);
        if (!res.ok) throw new Error('Failed to fetch FAQ');
        const data = await res.json();
        if (!cancelled) {
          const faqItems = data.data || [];
          setItems(faqItems);
          setFilteredItems(faqItems);
          // Extract unique categories
          const cats = [...new Set(faqItems.map((i) => i.category).filter(Boolean))];
          setCategories(cats);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFaq();
    return () => {
      cancelled = true;
    };
  }, [clientId, apiBase]);

  // Filter items by search query and category
  useEffect(() => {
    let result = items;
    if (activeCategory) {
      result = result.filter((i) => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q));
    }
    setFilteredItems(result);
  }, [items, searchQuery, activeCategory]);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const search = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const filterByCategory = useCallback((cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  }, []);

  return {
    items: filteredItems,
    categories,
    searchQuery,
    activeCategory,
    expandedId,
    loading,
    error,
    search,
    filterByCategory,
    toggleExpanded,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add .claude/widget-builder/src/src/hooks/useFaq.js && git commit -m "feat: add useFaq hook for Smart FAQ widget"
```

---

### Task 5: Create SmartFaq.jsx component

**Files:**

- Create: `.claude/widget-builder/src/src/components/SmartFaq.jsx`

This is a **template** that `generate-single-theme.js` will generate per-client. For now, create the shared base version.

- [ ] **Step 1: Write the SmartFaq component**

```jsx
// .claude/widget-builder/src/src/components/SmartFaq.jsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useFaq } from '../hooks/useFaq';
import { useDrag } from '../hooks/useDrag';
import { useLanguage } from '../hooks/useLanguage';

const CFG = typeof window !== 'undefined' && window.__WIDGET_CFG__ ? window.__WIDGET_CFG__ : {};
const API_BASE = CFG.apiBase || '';
const CLIENT_ID = CFG.clientId || '';

export default function SmartFaq() {
  const [isOpen, setIsOpen] = useState(false);
  const { position, onPointerDown } = useDrag();
  const { t } = useLanguage();
  const {
    items,
    categories,
    searchQuery,
    activeCategory,
    expandedId,
    loading,
    error,
    search,
    filterByCategory,
    toggleExpanded,
  } = useFaq(CLIENT_ID, API_BASE);

  return (
    <div class="wbx-faq-root">
      {/* Toggle Button */}
      <button
        class="wbx-faq-toggle"
        onClick={() => setIsOpen(!isOpen)}
        onPointerDown={onPointerDown}
        style={{ bottom: position.y + 'px', right: position.x + 'px' }}
        aria-label={isOpen ? 'Close FAQ' : 'Open FAQ'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </button>

      {/* FAQ Panel */}
      {isOpen && (
        <div class="wbx-faq-panel">
          {/* Header */}
          <div class="wbx-faq-header">
            <h2 class="wbx-faq-title">{t('faq_title', 'Frequently Asked Questions')}</h2>
            <button class="wbx-faq-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div class="wbx-faq-search">
            <input
              type="text"
              class="wbx-faq-search-input"
              placeholder={t('faq_search', 'Search questions...')}
              value={searchQuery}
              onInput={(e) => search(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div class="wbx-faq-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  class={`wbx-faq-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => filterByCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div class="wbx-faq-content">
            {loading && <div class="wbx-faq-loading">{t('loading', 'Loading...')}</div>}
            {error && <div class="wbx-faq-error">{error}</div>}
            {!loading && !error && items.length === 0 && (
              <div class="wbx-faq-empty">{t('faq_empty', 'No questions found')}</div>
            )}
            {items.map((item) => (
              <div key={item.id} class={`wbx-faq-item ${expandedId === item.id ? 'expanded' : ''}`}>
                <button
                  class="wbx-faq-question"
                  onClick={() => toggleExpanded(item.id)}
                  aria-expanded={expandedId === item.id}
                >
                  <span>{item.question}</span>
                  <svg
                    class={`wbx-faq-chevron ${expandedId === item.id ? 'rotated' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedId === item.id && <div class="wbx-faq-answer">{item.answer}</div>}
              </div>
            ))}
          </div>

          {/* AI Fallback */}
          <div class="wbx-faq-footer">
            <p class="wbx-faq-footer-text">{t('faq_fallback', "Didn't find your answer?")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add .claude/widget-builder/src/src/components/SmartFaq.jsx && git commit -m "feat: add SmartFaq widget component"
```

---

### Task 6: Create FAQ API endpoint

**Files:**

- Create: `src/app/api/widget/faq/route.ts`
- Test: `src/app/api/widget/faq/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/widget/faq/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockConnectDB, mockKnowledgeFind } = vi.hoisted(() => ({
  mockConnectDB: vi.fn(),
  mockKnowledgeFind: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/KnowledgeChunk', () => ({
  default: { find: mockKnowledgeFind },
}));

import { GET } from './route';

describe('GET /api/widget/faq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 400 without clientId', async () => {
    const req = new NextRequest('http://localhost/api/widget/faq');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns FAQ items from knowledge chunks', async () => {
    mockKnowledgeFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { _id: '1', content: 'Q: What is X?\nA: X is a thing.', category: 'General' },
            { _id: '2', content: 'Q: How to Y?\nA: Do Y like this.', category: 'How-to' },
          ]),
        }),
      }),
    });

    const req = new NextRequest('http://localhost/api/widget/faq?clientId=test123');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].question).toBeDefined();
    expect(json.data[0].answer).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/widget/faq/route.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the FAQ API route**

```typescript
// src/app/api/widget/faq/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { successResponse, Errors } from '@/lib/apiResponse';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

/**
 * Parses knowledge chunks into FAQ items.
 * Looks for Q:/A: patterns, or treats first sentence as question.
 */
function parseChunksToFaq(chunks: { _id: string; content: string; category?: string }[]): FaqItem[] {
  return chunks
    .map((chunk) => {
      const content = chunk.content.trim();
      let question = '';
      let answer = '';

      // Try Q: / A: pattern
      const qaMatch = content.match(/^Q:\s*(.+?)\n+A:\s*([\s\S]+)/i);
      if (qaMatch) {
        question = qaMatch[1].trim();
        answer = qaMatch[2].trim();
      } else {
        // Use first sentence as question, rest as answer
        const firstPeriod = content.indexOf('.');
        if (firstPeriod > 0 && firstPeriod < 200) {
          question = content.slice(0, firstPeriod + 1);
          answer = content.slice(firstPeriod + 1).trim();
        } else {
          question = content.slice(0, 100) + (content.length > 100 ? '...' : '');
          answer = content;
        }
      }

      return {
        id: chunk._id.toString(),
        question,
        answer,
        category: chunk.category || 'General',
      };
    })
    .filter((item) => item.question && item.answer);
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) return Errors.badRequest('clientId is required');

  await connectDB();

  const chunks = await KnowledgeChunk.find({ clientId }).select('content category').sort({ order: 1 }).limit(100);

  const faqItems = parseChunksToFaq(chunks);

  return successResponse(faqItems);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/app/api/widget/faq/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/widget/faq/route.ts src/app/api/widget/faq/route.test.ts && git commit -m "feat: add FAQ API endpoint for Smart FAQ widget"
```

---

## Chunk 3: Lead Form Widget Component

### Task 7: Create useForm hook

**Files:**

- Create: `.claude/widget-builder/src/src/hooks/useForm.js`

- [ ] **Step 1: Write the useForm hook**

```javascript
// .claude/widget-builder/src/src/hooks/useForm.js
import { useState, useCallback } from 'preact/hooks';

/**
 * Hook for Lead Form widget — manages multi-step form state,
 * validation, and submission.
 *
 * @param {Object} config - Form configuration
 * @param {Array} config.steps - Array of form steps
 * @param {string} config.clientId - Widget client ID
 * @param {string} config.apiBase - Base URL for API
 */
export function useForm({ steps = [], clientId, apiBase }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const currentFields = steps[currentStep]?.fields || [];
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const validateField = useCallback((field, value) => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return field.errorMessage || `${field.label} is required`;
    }
    if (field.type === 'email' && value) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value)) return 'Invalid email address';
    }
    if (field.type === 'phone' && value) {
      const phoneRe = /^[+]?[\d\s()-]{7,20}$/;
      if (!phoneRe.test(value)) return 'Invalid phone number';
    }
    if (field.minLength && value && value.length < field.minLength) {
      return `Minimum ${field.minLength} characters`;
    }
    if (field.pattern && value) {
      const re = new RegExp(field.pattern);
      if (!re.test(value)) return field.errorMessage || 'Invalid format';
    }
    return null;
  }, []);

  const validateCurrentStep = useCallback(() => {
    const newErrors = {};
    let valid = true;
    for (const field of currentFields) {
      const err = validateField(field, values[field.name]);
      if (err) {
        newErrors[field.name] = err;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [currentFields, values, validateField]);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    if (validateCurrentStep() && !isLastStep) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [validateCurrentStep, isLastStep]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const submit = useCallback(async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${apiBase}/api/widget/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, data: values }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [apiBase, clientId, values, validateCurrentStep]);

  return {
    currentStep,
    totalSteps,
    currentFields,
    values,
    errors,
    submitting,
    submitted,
    submitError,
    isFirstStep,
    isLastStep,
    setValue,
    nextStep,
    prevStep,
    submit,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add .claude/widget-builder/src/src/hooks/useForm.js && git commit -m "feat: add useForm hook for Lead Form widget"
```

---

### Task 8: Create LeadForm.jsx component

**Files:**

- Create: `.claude/widget-builder/src/src/components/LeadForm.jsx`

- [ ] **Step 1: Write the LeadForm component**

```jsx
// .claude/widget-builder/src/src/components/LeadForm.jsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useForm } from '../hooks/useForm';
import { useDrag } from '../hooks/useDrag';
import { useLanguage } from '../hooks/useLanguage';

const CFG = typeof window !== 'undefined' && window.__WIDGET_CFG__ ? window.__WIDGET_CFG__ : {};
const API_BASE = CFG.apiBase || '';
const CLIENT_ID = CFG.clientId || '';
const FORM_CONFIG = CFG.formConfig || { steps: [{ fields: [] }] };

export default function LeadForm() {
  const [isOpen, setIsOpen] = useState(false);
  const { position, onPointerDown } = useDrag();
  const { t } = useLanguage();
  const {
    currentStep,
    totalSteps,
    currentFields,
    values,
    errors,
    submitting,
    submitted,
    submitError,
    isFirstStep,
    isLastStep,
    setValue,
    nextStep,
    prevStep,
    submit,
  } = useForm({ steps: FORM_CONFIG.steps, clientId: CLIENT_ID, apiBase: API_BASE });

  const renderField = (field) => {
    const val = values[field.name] || '';
    const err = errors[field.name];

    switch (field.type) {
      case 'select':
        return (
          <select
            class={`wbx-form-input ${err ? 'wbx-form-input-error' : ''}`}
            value={val}
            onChange={(e) => setValue(field.name, e.target.value)}
          >
            <option value="">{field.placeholder || t('select', 'Select...')}</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            class={`wbx-form-input wbx-form-textarea ${err ? 'wbx-form-input-error' : ''}`}
            placeholder={field.placeholder || ''}
            value={val}
            onInput={(e) => setValue(field.name, e.target.value)}
            rows={field.rows || 3}
          />
        );
      default:
        return (
          <input
            class={`wbx-form-input ${err ? 'wbx-form-input-error' : ''}`}
            type={field.type || 'text'}
            placeholder={field.placeholder || ''}
            value={val}
            onInput={(e) => setValue(field.name, e.target.value)}
          />
        );
    }
  };

  return (
    <div class="wbx-form-root">
      {/* Toggle Button */}
      <button
        class="wbx-form-toggle"
        onClick={() => setIsOpen(!isOpen)}
        onPointerDown={onPointerDown}
        style={{ bottom: position.y + 'px', right: position.x + 'px' }}
        aria-label={isOpen ? 'Close form' : 'Open form'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="14" y2="13" />
            <line x1="8" y1="17" x2="12" y2="17" />
          </svg>
        )}
      </button>

      {/* Form Panel */}
      {isOpen && (
        <div class="wbx-form-panel">
          {/* Header */}
          <div class="wbx-form-header">
            <h2 class="wbx-form-title">{FORM_CONFIG.title || t('form_title', 'Get in Touch')}</h2>
            <button class="wbx-form-close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {submitted ? (
            /* Success State */
            <div class="wbx-form-success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 12 15 16 10" />
              </svg>
              <h3>{FORM_CONFIG.successTitle || t('form_success', 'Thank you!')}</h3>
              <p>{FORM_CONFIG.successMessage || t('form_success_msg', "We'll be in touch soon.")}</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              {totalSteps > 1 && (
                <div class="wbx-form-progress">
                  <div class="wbx-form-progress-bar">
                    <div
                      class="wbx-form-progress-fill"
                      style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                  </div>
                  <span class="wbx-form-progress-text">
                    {t('step', 'Step')} {currentStep + 1}/{totalSteps}
                  </span>
                </div>
              )}

              {/* Step Title */}
              {FORM_CONFIG.steps[currentStep]?.title && (
                <h3 class="wbx-form-step-title">{FORM_CONFIG.steps[currentStep].title}</h3>
              )}

              {/* Fields */}
              <div class="wbx-form-fields">
                {currentFields.map((field) => (
                  <div key={field.name} class="wbx-form-field">
                    <label class="wbx-form-label">
                      {field.label}
                      {field.required && <span class="wbx-form-required">*</span>}
                    </label>
                    {renderField(field)}
                    {errors[field.name] && <span class="wbx-form-error">{errors[field.name]}</span>}
                  </div>
                ))}
              </div>

              {/* Submit Error */}
              {submitError && <div class="wbx-form-submit-error">{submitError}</div>}

              {/* Navigation */}
              <div class="wbx-form-nav">
                {!isFirstStep && (
                  <button class="wbx-form-btn-back" onClick={prevStep}>
                    {t('back', 'Back')}
                  </button>
                )}
                {isLastStep ? (
                  <button class="wbx-form-btn-submit" onClick={submit} disabled={submitting}>
                    {submitting ? t('submitting', 'Sending...') : FORM_CONFIG.submitLabel || t('submit', 'Submit')}
                  </button>
                ) : (
                  <button class="wbx-form-btn-next" onClick={nextStep}>
                    {t('next', 'Next')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add .claude/widget-builder/src/src/components/LeadForm.jsx && git commit -m "feat: add LeadForm widget component"
```

---

### Task 9: Create Form submission API endpoint

**Files:**

- Create: `src/app/api/widget/form/route.ts`

- [ ] **Step 1: Write the form submission API**

```typescript
// src/app/api/widget/form/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, data } = body;

    if (!clientId) return Errors.badRequest('clientId is required');
    if (!data || typeof data !== 'object') return Errors.badRequest('form data is required');

    await connectDB();

    // Verify client exists
    const client = await Client.findOne({ clientId }).select('clientId username organizationId');
    if (!client) return Errors.notFound('Widget not found');

    // Store form submission
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) return Errors.internal('Database connection error');

    await db.collection('formsubmissions').insertOne({
      clientId,
      organizationId: client.organizationId || null,
      data,
      submittedAt: new Date(),
      source: 'widget',
    });

    return successResponse({ received: true }, 'Form submitted successfully');
  } catch (error) {
    console.error('Form submission error:', error);
    return Errors.internal('Failed to submit form');
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/widget/form/route.ts && git commit -m "feat: add form submission API for Lead Form widget"
```

---

## Chunk 4: Generator & Build Pipeline

### Task 10: Update generate-single-theme.js to support widget types

**Files:**

- Modify: `.claude/widget-builder/scripts/generate-single-theme.js`

This is the most critical change — the generator needs to read `widgetType` from `theme.json` and produce different templates based on it.

- [ ] **Step 1: Read the generator's current structure**

Read the full `generate-single-theme.js` to understand all generator functions (genCSS, genMainJSX, genWidget, genChatMessage, genQuickReplies, genMessageFeedback, genRichBlocks).

- [ ] **Step 2: Add widgetType detection at the top (after field validation)**

After the validation block (~line 80), add:

```javascript
// ── Widget type detection ───────────────────────────────────────────
const widgetType = c.widgetType || 'ai_chat';
const SUPPORTED_TYPES = ['ai_chat', 'smart_faq', 'lead_form'];
if (!SUPPORTED_TYPES.includes(widgetType)) {
  console.error(`❌ Unsupported widgetType: ${widgetType}. Supported: ${SUPPORTED_TYPES.join(', ')}`);
  process.exit(1);
}
console.log(`📦 Widget type: ${widgetType}`);
```

- [ ] **Step 3: Add Smart FAQ CSS generator function**

Add a new function `genFaqCSS(c)` that generates FAQ-specific styles (accordion, search, categories).

- [ ] **Step 4: Add Lead Form CSS generator function**

Add a new function `genFormCSS(c)` that generates form-specific styles (inputs, progress bar, steps, submit button).

- [ ] **Step 5: Add Smart FAQ main.jsx generator**

Add `genFaqMainJSX(c)` — imports SmartFaq component instead of Widget.

- [ ] **Step 6: Add Lead Form main.jsx generator**

Add `genFormMainJSX(c)` — imports LeadForm component instead of Widget.

- [ ] **Step 7: Update the file writing logic at the bottom**

Change the file writing block to be conditional based on `widgetType`:

```javascript
// ── Write files ─────────────────────────────────────────────────────
if (widgetType === 'ai_chat') {
  // Existing behavior — write all 7 chat widget files
  writeFile('src/index.css', genCSS(c));
  writeFile('src/main.jsx', genMainJSX(c));
  writeFile('src/components/Widget.jsx', genWidget(c));
  writeFile('src/components/ChatMessage.jsx', genChatMessage(c));
  writeFile('src/components/QuickReplies.jsx', genQuickReplies(c));
  writeFile('src/components/MessageFeedback.jsx', genMessageFeedback(c));
  writeFile('src/components/RichBlocks.jsx', genRichBlocks(c));
} else if (widgetType === 'smart_faq') {
  writeFile('src/index.css', genFaqCSS(c));
  writeFile('src/main.jsx', genFaqMainJSX(c));
  // SmartFaq.jsx is shared — no need to generate per-client
} else if (widgetType === 'lead_form') {
  writeFile('src/index.css', genFormCSS(c));
  writeFile('src/main.jsx', genFormMainJSX(c));
  // LeadForm.jsx is shared — no need to generate per-client
}
```

- [ ] **Step 8: Test with a mock FAQ theme.json**

Create a temporary test theme: `.claude/widget-builder/clients/_test_faq/theme.json` with `widgetType: "smart_faq"` and run the generator:

```bash
node .claude/widget-builder/scripts/generate-single-theme.js _test_faq
```

Expected: Generates FAQ-specific files without errors.
Then clean up: `rm -rf .claude/widget-builder/clients/_test_faq`

- [ ] **Step 9: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add .claude/widget-builder/scripts/generate-single-theme.js && git commit -m "feat: extend generator to support smart_faq and lead_form widget types"
```

---

## Chunk 5: Builder Integration

### Task 11: Update TemplateSelector with widget type picker

**Files:**

- Modify: `src/components/builder/TemplateSelector.tsx`

- [ ] **Step 1: Read the current TemplateSelector**

Read `src/components/builder/TemplateSelector.tsx` to understand structure.

- [ ] **Step 2: Add widget type selection UI**

Before the URL input, add a widget type selector:

```tsx
{
  /* Widget Type Selector */
}
<div className="mb-4">
  <p className="mb-2 text-sm text-gray-500">What would you like to create?</p>
  <div className="grid grid-cols-3 gap-2">
    {WIDGET_TYPES.map((type) => (
      <button
        key={type.id}
        onClick={() => setSelectedType(type.id)}
        className={`rounded-lg border p-3 text-center transition-all ${
          selectedType === type.id
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className="mb-1 block text-2xl">{type.icon}</span>
        <span className="text-sm font-medium">{type.label}</span>
      </button>
    ))}
  </div>
</div>;
```

- [ ] **Step 3: Pass widgetType to session creation**

When creating a new builder session, include the selected widgetType.

- [ ] **Step 4: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/components/builder/TemplateSelector.tsx && git commit -m "feat: add widget type picker to TemplateSelector"
```

---

### Task 12: Update systemPrompt to handle widget types

**Files:**

- Modify: `src/lib/builder/systemPrompt.ts`

- [ ] **Step 1: Read the current systemPrompt.ts**

Read the full file to understand the prompt structure.

- [ ] **Step 2: Add widget type awareness**

In the system prompt, add instructions for the orchestrator to:

- Recognize the selected widget type from session
- Adjust `generate_design` to create type-appropriate themes
- For Smart FAQ: auto-generate FAQ from knowledge base after crawl
- For Lead Form: ask user for form fields and generate form config

Add to the Phase 1 section of the prompt:

```
## Widget Types
The user has selected a widget type: {widgetType}. Build accordingly:
- ai_chat: Standard RAG chatbot (existing behavior)
- smart_faq: Accordion FAQ with AI search. After crawling knowledge, generate FAQ items.
- lead_form: Multi-step form. Ask user what information to collect, then generate form config.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/lib/builder/systemPrompt.ts && git commit -m "feat: add widget type awareness to builder system prompt"
```

---

### Task 13: Update My Widgets to show widget type

**Files:**

- Modify: `src/app/api/user/widgets/route.ts`

- [ ] **Step 1: Add widgetType to the widgets response**

In the GET handler, add `widgetType` to the select and response:

```typescript
// Change:
.select('clientId username clientType createdAt')

// To:
.select('clientId username clientType widgetType createdAt')
```

And in the map:

```typescript
const widgets = clients.map((c) => ({
  clientId: c.clientId,
  widgetName: c.username,
  clientType: c.clientType,
  widgetType: c.widgetType || 'ai_chat',
  createdAt: c.createdAt,
}));
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && git add src/app/api/user/widgets/route.ts && git commit -m "feat: include widgetType in My Widgets API response"
```

---

## Chunk 6: Final Integration & Verification

### Task 14: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`
Expected: All PASS (or same pre-existing failures only)

- [ ] **Step 2: Run type check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit`
Expected: No new type errors

- [ ] **Step 3: Test the generator manually**

Create a test FAQ theme, run generator, verify output:

```bash
mkdir -p .claude/widget-builder/clients/_test_faq
echo '{"widgetType":"smart_faq","domain":"test.com","font":"Arial","isDark":false,"widgetW":"370px","widgetH":"540px","widgetMaxW":"400px","widgetMaxH":"600px","toggleSize":"56px","toggleRadius":"28px","headerPad":"16px","nameSize":"16px","avatarHeaderRound":"50%","chatAvatarRound":"50%","headerFrom":"#2563eb","headerVia":"#3b82f6","headerTo":"#60a5fa","toggleFrom":"#2563eb","toggleVia":"#3b82f6","toggleTo":"#60a5fa","toggleShadow":"rgba(37,99,235,0.3)","toggleHoverRgb":"37,99,235","sendFrom":"#2563eb","sendHoverFrom":"#1d4ed8","onlineDotBg":"#22c55e","onlineDotBorder":"#ffffff","typingDot":"#2563eb","userMsgFrom":"#2563eb","userMsgTo":"#3b82f6","userMsgShadow":"rgba(37,99,235,0.1)","avatarFrom":"#2563eb","avatarTo":"#60a5fa","avatarBorder":"#e5e7eb","avatarIcon":"#ffffff","linkColor":"#2563eb","linkHover":"#1d4ed8","copyHover":"#dbeafe","copyActive":"#bfdbfe","chipBorder":"#e5e7eb","chipFrom":"#f9fafb","chipTo":"#ffffff","chipText":"#374151","chipHoverFrom":"#eff6ff","chipHoverTo":"#dbeafe","chipHoverBorder":"#93c5fd","focusBorder":"#93c5fd","focusRing":"rgba(37,99,235,0.2)","imgActiveBorder":"#2563eb","imgActiveBg":"#eff6ff","imgActiveText":"#1d4ed8","imgHoverText":"#2563eb","imgHoverBorder":"#93c5fd","imgHoverBg":"#f0f9ff","cssPrimary":"#2563eb","cssAccent":"#3b82f6","focusRgb":"37,99,235","feedbackActive":"#2563eb","feedbackHover":"#dbeafe","faqAccordionBg":"#ffffff","faqAccordionBorder":"#e5e7eb","faqAccordionText":"#111827","faqAccordionHover":"#f3f4f6","faqAccordionActive":"#eff6ff","faqAccordionIcon":"#6b7280","faqSearchBg":"#f9fafb","faqSearchBorder":"#e5e7eb","faqSearchText":"#111827","faqSearchPlaceholder":"#9ca3af","faqHighlight":"#fef3c7","faqCategoryBg":"#f3f4f6","faqCategoryText":"#374151"}' > .claude/widget-builder/clients/_test_faq/theme.json
node .claude/widget-builder/scripts/generate-single-theme.js _test_faq
ls .claude/widget-builder/clients/_test_faq/src/
rm -rf .claude/widget-builder/clients/_test_faq
```

### Task 15: Commit all remaining changes and push

- [ ] **Step 1: Review all changes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git status && git log --oneline -15`

- [ ] **Step 2: Push to remote**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && git push origin main`
Expected: Push succeeds
