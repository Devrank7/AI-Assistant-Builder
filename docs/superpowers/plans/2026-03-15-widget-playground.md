# Widget Playground Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive visual editor where users customize their deployed widget's appearance in real-time on top of their actual website, then save and rebuild with one click.

**Architecture:** Fullscreen split-screen page at `/dashboard/playground/[clientId]` with 350px control panel (left) and iframe preview (right). Control panel sends theme changes via `postMessage` to the widget running inside a sandboxed preview page. The widget's `useChat.js` hook listens for `PLAYGROUND_THEME_UPDATE` messages and applies CSS variable overrides to its Shadow DOM host. Save triggers server-side `generate-single-theme.js` + `build.js` rebuild.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, MongoDB (Mongoose), existing widget build pipeline (Preact + Vite + Tailwind v3)

---

## File Structure

### New Files

| File                                                     | Responsibility                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/playgroundValidation.ts`                        | Shared validation functions for theme fields (hex colors, ranges, string lengths) |
| `src/app/api/user/playground/[clientId]/route.ts`        | GET (load theme+config) and PUT (save+rebuild) endpoints                          |
| `src/app/api/user/playground/check-frame/route.ts`       | GET frameability check via server-side HEAD request                               |
| `src/app/api/user/playground/avatar/[clientId]/route.ts` | POST avatar upload with resize                                                    |
| `src/app/playground-preview/[clientId]/route.ts`         | Route Handler returning raw HTML preview page with widget script                  |
| `src/components/playground/usePlayground.ts`             | Hook: state management, debounced postMessage, save/reset logic                   |
| `src/components/playground/ControlPanel.tsx`             | Left panel with 6 collapsible accordion sections                                  |
| `src/components/playground/PreviewFrame.tsx`             | Right panel with iframe or fallback screenshot                                    |
| `src/components/playground/ColorPicker.tsx`              | Hex input + native color input + optional EyeDropper                              |
| `src/app/dashboard/playground/[clientId]/page.tsx`       | Main playground page (loads data, orchestrates components)                        |
| `src/app/dashboard/playground/[clientId]/layout.tsx`     | Pass-through layout (page uses fixed overlay to go fullscreen)                    |

### Modified Files

| File                                          | Change                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `.claude/widget-builder/src/hooks/useChat.js` | Add ~20-line `PLAYGROUND_THEME_UPDATE` message listener at end of hook init |
| `src/app/dashboard/widgets/page.tsx`          | Add "Customize" button on each widget card                                  |
| `src/components/dashboard/CommandPalette.tsx` | Add per-widget "Customize" actions that navigate to playground              |
| `src/app/dashboard/builder/page.tsx`          | Add "Open Playground" button in deploy stage                                |

---

## Chunk 1: Foundation — Validation, API Routes, Widget Listener

### Task 1: Playground Validation Library

**Files:**

- Create: `src/lib/playgroundValidation.ts`

This module provides server-side + client-side validation for playground theme fields. Both the API route and the control panel import it.

- [ ] **Step 1: Create the validation module**

```typescript
// src/lib/playgroundValidation.ts

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

export function isValidRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

export interface PlaygroundConfig {
  botName?: string;
  greeting?: string;
  quickReplies?: string[];
  tone?: 'friendly' | 'professional' | 'casual';
}

// theme.json color field names that accept hex values
export const COLOR_FIELDS = [
  'headerFrom',
  'headerVia',
  'headerTo',
  'toggleFrom',
  'toggleVia',
  'toggleTo',
  'sendFrom',
  'sendTo',
  'sendHoverFrom',
  'sendHoverTo',
  'userMsgFrom',
  'userMsgTo',
  'avatarFrom',
  'avatarTo',
  'avatarBorder',
  'avatarIcon',
  'linkColor',
  'linkHover',
  'copyHover',
  'copyActive',
  'chipBorder',
  'chipFrom',
  'chipTo',
  'chipText',
  'chipHoverFrom',
  'chipHoverTo',
  'chipHoverBorder',
  'focusBorder',
  'focusRing',
  'cssPrimary',
  'cssAccent',
  'onlineDotBg',
  'onlineDotBorder',
  'typingDot',
  'toggleShadow',
  'userMsgShadow',
  'feedbackActive',
  'feedbackHover',
  'imgActiveBorder',
  'imgActiveBg',
  'imgActiveText',
  'imgHoverText',
  'imgHoverBorder',
  'imgHoverBg',
] as const;

// Fields that map to CSS variables (live-updatable without rebuild)
export const CSS_VARIABLE_FIELDS = [
  'headerFrom',
  'headerTo',
  'toggleFrom',
  'toggleTo',
  'sendFrom',
  'sendTo',
  'userMsgFrom',
  'userMsgTo',
  'avatarFrom',
  'avatarTo',
  'linkColor',
  'chipBorder',
  'chipFrom',
  'focusBorder',
  'cssPrimary',
  'cssAccent',
] as const;

// Fields that require a full rebuild (not CSS-variable-only)
export const REBUILD_ONLY_FIELDS = [
  'font',
  'fontUrl',
  'widgetW',
  'widgetH',
  'toggleSize',
  'toggleRadius',
  'headerPad',
] as const;

// Google Fonts supported in the playground
export const GOOGLE_FONTS = [
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { name: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'Raleway', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap' },
  { name: 'Rubik', url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap' },
  {
    name: 'Source Sans 3',
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  { name: 'Work Sans', url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap' },
  { name: 'DM Sans', url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Manrope', url: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap' },
  {
    name: 'Plus Jakarta Sans',
    url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  },
  { name: 'Outfit', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
] as const;

export const TONE_DIRECTIVES: Record<string, string> = {
  friendly: 'Respond in a warm, friendly tone. Use casual language and be approachable.',
  professional: 'Respond in a professional, formal tone. Be precise and business-like.',
  casual: 'Respond in a relaxed, casual tone. Keep it short and conversational.',
};

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTheme(theme: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate color fields
  for (const field of COLOR_FIELDS) {
    const val = theme[field];
    if (val !== undefined && typeof val === 'string' && !isValidHex(val)) {
      errors.push({ field, message: `Invalid hex color: ${val}` });
    }
  }

  return errors;
}

export function validateConfig(config: PlaygroundConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (config.botName !== undefined) {
    if (typeof config.botName !== 'string' || config.botName.trim().length > 30) {
      errors.push({ field: 'botName', message: 'Bot name must be max 30 characters' });
    }
  }
  if (config.greeting !== undefined) {
    if (typeof config.greeting !== 'string' || config.greeting.length > 200) {
      errors.push({ field: 'greeting', message: 'Greeting must be max 200 characters' });
    }
  }
  if (config.quickReplies !== undefined) {
    if (!Array.isArray(config.quickReplies) || config.quickReplies.length > 5) {
      errors.push({ field: 'quickReplies', message: 'Max 5 quick replies allowed' });
    } else {
      config.quickReplies.forEach((qr, i) => {
        if (typeof qr !== 'string' || qr.length > 80) {
          errors.push({ field: `quickReplies[${i}]`, message: 'Each quick reply max 80 chars' });
        }
      });
    }
  }
  if (config.tone !== undefined) {
    if (!['friendly', 'professional', 'casual'].includes(config.tone)) {
      errors.push({ field: 'tone', message: 'Tone must be friendly, professional, or casual' });
    }
  }

  return errors;
}

// Default theme for widgets that don't have one yet
export const DEFAULT_THEME: Record<string, unknown> = {
  label: 'Default Theme',
  domain: '',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  isDark: false,
  widgetW: '370px',
  widgetH: '540px',
  widgetMaxW: '370px',
  widgetMaxH: '540px',
  toggleSize: 'w-[58px] h-[58px]',
  toggleRadius: 'rounded-full',
  headerPad: 'px-6 py-5',
  nameSize: 'text-[15px]',
  headerAccent: '',
  avatarHeaderRound: 'rounded-lg',
  chatAvatarRound: 'rounded-lg',
  hasShine: false,
  headerFrom: '#1a1a2e',
  headerVia: '#16213e',
  headerTo: '#16213e',
  toggleFrom: '#1a1a2e',
  toggleVia: '#16213e',
  toggleTo: '#16213e',
  toggleShadow: '#1a1a2e',
  toggleHoverRgb: '26, 26, 46',
  sendFrom: '#0f3460',
  sendTo: '#533483',
  sendHoverFrom: '#0d2d55',
  sendHoverTo: '#472d72',
  onlineDotBg: '#10b981',
  onlineDotBorder: '#059669',
  typingDot: '#10b981',
  userMsgFrom: '#0f3460',
  userMsgTo: '#533483',
  userMsgShadow: '#0f3460',
  avatarFrom: '#e8e0f0',
  avatarTo: '#d4c8e2',
  avatarBorder: '#c0b0d4',
  avatarIcon: '#1a1a2e',
  linkColor: '#0f3460',
  linkHover: '#0d2d55',
  copyHover: '#0f3460',
  copyActive: '#0f3460',
  chipBorder: '#d4c8e2',
  chipFrom: '#f5f0fa',
  chipTo: '#e8e0f0',
  chipText: '#1a1a2e',
  chipHoverFrom: '#e8e0f0',
  chipHoverTo: '#d4c8e2',
  chipHoverBorder: '#533483',
  focusBorder: '#533483',
  focusRing: '#f5f0fa',
  imgActiveBorder: '#533483',
  imgActiveBg: '#f5f0fa',
  imgActiveText: '#1a1a2e',
  imgHoverText: '#1a1a2e',
  imgHoverBorder: '#d4c8e2',
  imgHoverBg: '#f5f0fa',
  cssPrimary: '#0f3460',
  cssAccent: '#533483',
  focusRgb: '15, 52, 96',
  feedbackActive: '#0f3460',
  feedbackHover: '#533483',
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit src/lib/playgroundValidation.ts 2>&1 | head -20`
Expected: No errors (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add src/lib/playgroundValidation.ts
git commit -m "feat(playground): add shared validation library for theme fields and config"
```

---

### Task 2: GET/PUT Playground API Route

**Files:**

- Create: `src/app/api/user/playground/[clientId]/route.ts`
- Reference: `src/app/api/user/knowledge/route.ts` (auth pattern), `src/models/AISettings.ts`, `src/models/Client.ts`

This endpoint loads theme+config (GET) and saves+rebuilds (PUT). Follow the exact auth pattern from `/api/user/knowledge/route.ts`: `verifyUser()` → `connectDB()` → ownership check via `Client.findOne({ clientId, userId })`.

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/user/playground/[clientId]/route.ts

import { NextRequest } from 'next/server';
import { readFile, writeFile, mkdir, copyFile, access } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import AISettings from '@/models/AISettings';
import BuilderSession from '@/models/BuilderSession';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import {
  validateTheme,
  validateConfig,
  TONE_DIRECTIVES,
  DEFAULT_THEME,
  PlaygroundConfig,
} from '@/lib/playgroundValidation';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();
const WIDGET_BUILDER = path.join(PROJECT_ROOT, '.claude', 'widget-builder');

// In-memory concurrency guard: one build per clientId at a time
const buildInProgress = new Map<string, boolean>();

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function verifyOwnership(userId: string, clientId: string) {
  const client = await Client.findOne({ clientId, userId }).lean();
  return client;
}

// GET — Load current theme.json, widget config, frameability, siteProfile
export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { clientId } = await params;

    const client = await verifyOwnership(auth.userId, clientId);
    if (!client) return Errors.forbidden('Not your widget');

    // Read theme.json
    const themePath = path.join(WIDGET_BUILDER, 'clients', clientId, 'theme.json');
    let theme: Record<string, unknown>;
    if (await fileExists(themePath)) {
      theme = JSON.parse(await readFile(themePath, 'utf-8'));
    } else {
      theme = { ...DEFAULT_THEME, domain: client.website || '' };
    }

    // Read AI settings for greeting + system prompt
    const aiSettings = await AISettings.findOne({ clientId }).lean();

    // Check if built script.js exists
    const quickPath = path.join(PROJECT_ROOT, 'quickwidgets', clientId, 'script.js');
    const prodPath = path.join(PROJECT_ROOT, 'widgets', clientId, 'script.js');
    const hasQuickBuild = await fileExists(quickPath);
    const hasProdBuild = await fileExists(prodPath);
    const needsBuild = !hasQuickBuild && !hasProdBuild;
    const widgetDir = hasProdBuild ? 'widgets' : 'quickwidgets';

    // Get siteProfile from BuilderSession if available
    const session = await BuilderSession.findOne({ clientId }).select('siteProfile').lean();

    // Detect current tone from system prompt
    let currentTone: string | null = null;
    if (aiSettings?.systemPrompt) {
      for (const [tone, directive] of Object.entries(TONE_DIRECTIVES)) {
        if (aiSettings.systemPrompt.startsWith(directive)) {
          currentTone = tone;
          break;
        }
      }
    }

    // Pre-check frameability
    let frameable = false;
    if (client.website) {
      try {
        const headRes = await fetch(client.website, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        const xfo = headRes.headers.get('x-frame-options')?.toLowerCase();
        const csp = headRes.headers.get('content-security-policy')?.toLowerCase();
        frameable = true;
        if (xfo === 'deny' || xfo === 'sameorigin') frameable = false;
        if (csp) {
          const fa = csp.match(/frame-ancestors\s+([^;]+)/);
          if (fa && (fa[1].trim() === "'none'" || fa[1].trim() === "'self'")) frameable = false;
        }
      } catch {
        frameable = false;
      }
    }

    return successResponse({
      theme,
      config: {
        botName: client.username || '',
        greeting: aiSettings?.greeting || '',
        quickReplies: [],
        tone: currentTone,
      },
      website: client.website || '',
      frameable,
      needsBuild,
      widgetDir,
      siteProfile: session?.siteProfile || null,
    });
  } catch (error) {
    console.error('Playground GET error:', error);
    return Errors.internal('Failed to load playground data');
  }
}

// PUT — Save theme + config, trigger rebuild
export async function PUT(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { clientId } = await params;

    const client = await verifyOwnership(auth.userId, clientId);
    if (!client) return Errors.forbidden('Not your widget');

    // Concurrency guard
    if (buildInProgress.get(clientId)) {
      return new Response(JSON.stringify({ success: false, message: 'Build already in progress for this widget' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { theme: themeUpdates, config } = body as {
      theme?: Record<string, unknown>;
      config?: PlaygroundConfig;
    };

    // Validate theme
    if (themeUpdates) {
      const themeErrors = validateTheme(themeUpdates);
      if (themeErrors.length > 0) {
        return Errors.badRequest(`Validation errors: ${themeErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`);
      }
    }

    // Validate config
    if (config) {
      const configErrors = validateConfig(config);
      if (configErrors.length > 0) {
        return Errors.badRequest(
          `Validation errors: ${configErrors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
        );
      }
    }

    // Read existing theme.json or use defaults
    const clientDir = path.join(WIDGET_BUILDER, 'clients', clientId);
    const themePath = path.join(clientDir, 'theme.json');
    await mkdir(clientDir, { recursive: true });

    let currentTheme: Record<string, unknown>;
    if (await fileExists(themePath)) {
      currentTheme = JSON.parse(await readFile(themePath, 'utf-8'));
    } else {
      currentTheme = { ...DEFAULT_THEME, domain: client.website || '' };
    }

    // Merge theme updates
    if (themeUpdates) {
      Object.assign(currentTheme, themeUpdates);
    }

    // Write updated theme.json
    await writeFile(themePath, JSON.stringify(currentTheme, null, 2));

    // Update AI settings if config changes provided
    if (config) {
      const updates: Record<string, unknown> = {};

      if (config.botName !== undefined) {
        await Client.updateOne({ clientId }, { username: config.botName.trim() });
      }

      if (config.greeting !== undefined) {
        updates.greeting = config.greeting;
      }

      if (config.tone !== undefined) {
        const directive = TONE_DIRECTIVES[config.tone];
        const existing = await AISettings.findOne({ clientId });
        if (existing) {
          // Remove old tone directive if present, then prepend new one
          let prompt = existing.systemPrompt;
          for (const d of Object.values(TONE_DIRECTIVES)) {
            if (prompt.startsWith(d)) {
              prompt = prompt.slice(d.length).trimStart();
              break;
            }
          }
          updates.systemPrompt = `${directive}\n${prompt}`;
        }
      }

      if (Object.keys(updates).length > 0) {
        await AISettings.findOneAndUpdate({ clientId }, { $set: updates }, { upsert: true });
      }
    }

    // Run build pipeline
    buildInProgress.set(clientId, true);
    const startTime = Date.now();

    try {
      // Step 1: Generate source files from theme.json
      await execAsync(`node ${path.join(WIDGET_BUILDER, 'scripts', 'generate-single-theme.js')} ${clientId}`, {
        cwd: PROJECT_ROOT,
        timeout: 30000,
      });

      // Step 2: Build widget
      await execAsync(`node ${path.join(WIDGET_BUILDER, 'scripts', 'build.js')} ${clientId}`, {
        cwd: PROJECT_ROOT,
        timeout: 30000,
      });

      // Step 3: Copy built script.js to deployment directory
      const distScript = path.join(WIDGET_BUILDER, 'dist', 'script.js');
      const prodPath = path.join(PROJECT_ROOT, 'widgets', clientId, 'script.js');
      const quickPath = path.join(PROJECT_ROOT, 'quickwidgets', clientId, 'script.js');

      // Deploy to whichever directory already exists, preferring widgets/
      const hasProd = await fileExists(path.join(PROJECT_ROOT, 'widgets', clientId));
      const targetDir = hasProd
        ? path.join(PROJECT_ROOT, 'widgets', clientId)
        : path.join(PROJECT_ROOT, 'quickwidgets', clientId);

      await mkdir(targetDir, { recursive: true });
      await copyFile(distScript, path.join(targetDir, 'script.js'));

      const buildTime = Date.now() - startTime;
      return successResponse({ buildTime }, 'Widget rebuilt successfully');
    } catch (buildError: unknown) {
      const msg = buildError instanceof Error ? buildError.message : 'Unknown build error';
      console.error('Playground build error:', msg);
      return Errors.internal(`Build failed: ${msg}`);
    } finally {
      buildInProgress.delete(clientId);
    }
  } catch (error) {
    console.error('Playground PUT error:', error);
    return Errors.internal('Failed to save playground changes');
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit 2>&1 | grep -i "playground" | head -20`
Expected: No errors related to the new playground route

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/playground/[clientId]/route.ts
git commit -m "feat(playground): add GET/PUT API route for loading and saving widget theme"
```

---

### Task 3: Frameability Check API Route

**Files:**

- Create: `src/app/api/user/playground/check-frame/route.ts`

Server-side HEAD request to check if a URL can be embedded in an iframe.

- [ ] **Step 1: Create the check-frame route**

```typescript
// src/app/api/user/playground/check-frame/route.ts

import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const url = request.nextUrl.searchParams.get('url');
    if (!url) return Errors.badRequest('url parameter required');

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return Errors.badRequest('URL must be http or https');
      }
    } catch {
      return Errors.badRequest('Invalid URL format');
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });

      const xFrameOptions = response.headers.get('x-frame-options')?.toLowerCase();
      const csp = response.headers.get('content-security-policy')?.toLowerCase();

      let frameable = true;

      if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
        frameable = false;
      }

      if (csp) {
        const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/);
        if (frameAncestors) {
          const value = frameAncestors[1].trim();
          if (value === "'none'" || value === "'self'") {
            frameable = false;
          }
        }
      }

      return successResponse({ frameable });
    } catch {
      // If request fails (timeout, DNS error, etc.), assume not frameable
      return successResponse({ frameable: false });
    }
  } catch (error) {
    console.error('Check-frame error:', error);
    return Errors.internal('Failed to check frameability');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user/playground/check-frame/route.ts
git commit -m "feat(playground): add frameability check API endpoint"
```

---

### Task 4: Avatar Upload API Route

**Files:**

- Create: `src/app/api/user/playground/avatar/[clientId]/route.ts`

Handles multipart avatar upload. Saves to `public/avatars/<clientId>.png`.

- [ ] **Step 1: Create the avatar upload route**

```typescript
// src/app/api/user/playground/avatar/[clientId]/route.ts

import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { clientId } = await params;

    const client = await Client.findOne({ clientId, userId: auth.userId }).lean();
    if (!client) return Errors.forbidden('Not your widget');

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) return Errors.badRequest('No avatar file provided');
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Errors.badRequest('File must be PNG, JPEG, or WebP');
    }
    if (file.size > MAX_SIZE) {
      return Errors.badRequest('File must be under 2MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize to 128x128 and convert to PNG using sharp
    const sharp = (await import('sharp')).default;
    const resized = await sharp(buffer).resize(128, 128, { fit: 'cover' }).png().toBuffer();

    const avatarDir = path.join(process.cwd(), 'public', 'avatars');
    await mkdir(avatarDir, { recursive: true });
    const avatarPath = path.join(avatarDir, `${clientId}.png`);
    await writeFile(avatarPath, resized);

    return successResponse({ url: `/avatars/${clientId}.png` });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return Errors.internal('Failed to upload avatar');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/user/playground/avatar/[clientId]/route.ts
git commit -m "feat(playground): add avatar upload API endpoint"
```

---

### Task 5: Widget useChat.js Playground Listener

**Files:**

- Modify: `.claude/widget-builder/src/hooks/useChat.js` (add ~20 lines before the `return` statement at line 284)

**IMPORTANT**: This file is a shared hook. Do NOT place it in any client directory. The listener is a no-op in production (no playground messages are ever sent).

- [ ] **Step 1: Add the playground theme listener**

Insert the following code block **before** the `return {` statement at line 284 in `useChat.js`:

```javascript
// ── Playground live-preview listener ────────────────────────────
// Listens for PLAYGROUND_THEME_UPDATE messages from the playground
// control panel and applies CSS variable overrides to the Shadow DOM
// host element. No-op in production (no messages are sent).
useEffect(() => {
  const handler = (event) => {
    if (!event.data || event.data.type !== 'PLAYGROUND_THEME_UPDATE') return;
    const themeUpdates = event.data.theme;
    if (!themeUpdates || typeof themeUpdates !== 'object') return;

    // Find the Shadow DOM host element (ai-chat-widget custom element)
    const host = document.querySelector('ai-chat-widget');
    if (!host || !host.shadowRoot) return;

    // Apply each theme field as a CSS custom property
    const kebab = (key) => key.replace(/([A-Z])/g, '-$1').toLowerCase();
    for (const [key, value] of Object.entries(themeUpdates)) {
      if (typeof value === 'string') {
        host.style.setProperty(`--widget-${kebab(key)}`, value);
      }
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

- [ ] **Step 2: Verify the hook still works**

Open the file and confirm the `return {` block follows immediately after the new `useEffect`.

- [ ] **Step 3: Commit**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform
git add .claude/widget-builder/src/hooks/useChat.js
git commit -m "feat(playground): add postMessage listener for live theme preview in useChat hook"
```

---

### Task 6: Preview Page (Route Handler — raw HTML)

**Files:**

- Create: `src/app/playground-preview/[clientId]/route.ts`

This is a **Route Handler** (not a page component) that returns raw HTML. It is embedded in an iframe by the playground. It loads the widget script and renders it. Background is either the client's website (nested iframe if frameable) or a thum.io screenshot.

Using a Route Handler avoids the App Router layout chain, which would wrap the output in a duplicate `<html>` element. The route returns a complete standalone HTML document.

- [ ] **Step 1: Create the preview route handler**

```typescript
// src/app/playground-preview/[clientId]/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { searchParams } = request.nextUrl;
  const website = searchParams.get('website') || '';
  const dir = searchParams.get('dir') || 'quickwidgets';
  const frameable = searchParams.get('frameable') === 'true';
  const scriptUrl = `/${dir}/${clientId}/script.js`;
  const screenshotUrl = website ? `https://image.thum.io/get/width/1200/${website}` : '';

  let bgHtml: string;
  if (frameable && website) {
    bgHtml = `<iframe class="bg-frame" src="${website}" title="Website background"></iframe>`;
  } else if (screenshotUrl) {
    bgHtml = `<div class="bg-screenshot" style="background-image:url(${screenshotUrl})"></div>`;
  } else {
    bgHtml = `<div class="bg-gradient"></div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Widget Preview</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:100vw;height:100vh;overflow:hidden;position:relative}
    .bg-frame{position:absolute;inset:0;width:100%;height:100%;border:none;z-index:0}
    .bg-screenshot{position:absolute;inset:0;width:100%;height:100%;background-size:cover;background-position:top center;z-index:0}
    .bg-gradient{position:absolute;inset:0;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#0a0a0f 100%);z-index:0}
  </style>
</head>
<body>
  ${bgHtml}
  <script src="${scriptUrl}" defer><\/script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
```

**Note:** The `PLAYGROUND_THEME_UPDATE` postMessage is received by the widget's `useChat.js` listener directly — the widget runs in the same window context. The parent playground page sends `postMessage` to `iframe.contentWindow`, and the widget's `window.addEventListener('message', ...)` catches it. No relay script is needed.

- [ ] **Step 2: Commit**

```bash
git add src/app/playground-preview/[clientId]/route.ts
git commit -m "feat(playground): add sandboxed preview route handler for widget rendering"
```

---

## Chunk 2: UI Components — usePlayground Hook, ColorPicker, ControlPanel, PreviewFrame

### Task 7: usePlayground Hook

**Files:**

- Create: `src/components/playground/usePlayground.ts`

Central state management for the playground. Manages theme state, debounced postMessage to preview iframe, save/reset, dirty tracking.

- [ ] **Step 1: Create the hook**

```typescript
// src/components/playground/usePlayground.ts

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CSS_VARIABLE_FIELDS, REBUILD_ONLY_FIELDS, PlaygroundConfig } from '@/lib/playgroundValidation';

type ThemeJson = Record<string, unknown>;

interface PlaygroundData {
  theme: ThemeJson;
  config: {
    botName: string;
    greeting: string;
    quickReplies: string[];
    tone: string | null;
  };
  website: string;
  needsBuild: boolean;
  widgetDir: string;
  siteProfile: Record<string, unknown> | null;
}

interface UsePlaygroundReturn {
  theme: ThemeJson;
  config: PlaygroundData['config'];
  website: string;
  needsBuild: boolean;
  widgetDir: string;
  siteProfile: Record<string, unknown> | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  rebuildRequired: boolean;
  error: string | null;
  updateThemeField: (key: string, value: unknown) => void;
  updateConfig: (updates: Partial<PlaygroundConfig>) => void;
  save: () => Promise<{ buildTime?: number } | null>;
  reset: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function usePlayground(clientId: string): UsePlaygroundReturn {
  const [data, setData] = useState<PlaygroundData | null>(null);
  const [theme, setTheme] = useState<ThemeJson>({});
  const [config, setConfig] = useState<PlaygroundData['config']>({
    botName: '',
    greeting: '',
    quickReplies: [],
    tone: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [rebuildRequired, setRebuildRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedThemeRef = useRef<ThemeJson>({});
  const savedConfigRef = useRef<PlaygroundData['config']>({
    botName: '',
    greeting: '',
    quickReplies: [],
    tone: null,
  });

  // Load playground data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/user/playground/${clientId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data as PlaygroundData;
          setData(d);
          setTheme(d.theme);
          setConfig(d.config);
          savedThemeRef.current = { ...d.theme };
          savedConfigRef.current = { ...d.config };
        } else {
          setError(json.message || 'Failed to load');
        }
      } catch {
        setError('Failed to load playground data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId]);

  // Send debounced postMessage to preview iframe
  const sendToPreview = useCallback((updates: Record<string, unknown>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'PLAYGROUND_THEME_UPDATE', theme: updates }, '*');
    }, 150);
  }, []);

  const updateThemeField = useCallback(
    (key: string, value: unknown) => {
      setTheme((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      setDirty(true);

      // Check if this field requires rebuild
      if ((REBUILD_ONLY_FIELDS as readonly string[]).includes(key)) {
        setRebuildRequired(true);
      }

      // Send live update for CSS-variable-compatible fields
      if ((CSS_VARIABLE_FIELDS as readonly string[]).includes(key)) {
        sendToPreview({ [key]: value });
      }
    },
    [sendToPreview]
  );

  const updateConfig = useCallback((updates: Partial<PlaygroundConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setDirty(true);
    setRebuildRequired(true); // Config changes always require rebuild
  }, []);

  const save = useCallback(async (): Promise<{ buildTime?: number } | null> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/playground/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, config }),
      });
      const json = await res.json();
      if (json.success) {
        setDirty(false);
        setRebuildRequired(false);
        savedThemeRef.current = { ...theme };
        savedConfigRef.current = { ...config };
        return json.data;
      } else {
        setError(json.message || 'Save failed');
        return null;
      }
    } catch {
      setError('Network error during save');
      return null;
    } finally {
      setSaving(false);
    }
  }, [clientId, theme, config]);

  const reset = useCallback(() => {
    setTheme({ ...savedThemeRef.current });
    setConfig({ ...savedConfigRef.current });
    setDirty(false);
    setRebuildRequired(false);

    // Send full theme to preview to revert visuals
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PLAYGROUND_THEME_UPDATE', theme: savedThemeRef.current },
      '*'
    );
  }, []);

  return {
    theme,
    config,
    website: data?.website || '',
    needsBuild: data?.needsBuild || false,
    widgetDir: data?.widgetDir || 'quickwidgets',
    siteProfile: data?.siteProfile || null,
    loading,
    saving,
    dirty,
    rebuildRequired,
    error,
    updateThemeField,
    updateConfig,
    save,
    reset,
    iframeRef,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit 2>&1 | grep -i "usePlayground" | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/usePlayground.ts
git commit -m "feat(playground): add usePlayground hook for state management and live preview"
```

---

### Task 8: ColorPicker Component

**Files:**

- Create: `src/components/playground/ColorPicker.tsx`

Reusable color picker: hex text input + native `<input type="color">` + optional EyeDropper API button.

- [ ] **Step 1: Create the component**

```tsx
// src/components/playground/ColorPicker.tsx

'use client';

import { useState, useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [text, setText] = useState(value);
  const [eyeDropperSupported] = useState(() => typeof window !== 'undefined' && 'EyeDropper' in window);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      if (HEX_RE.test(v)) onChange(v);
    },
    [onChange]
  );

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setText(v);
      onChange(v);
    },
    [onChange]
  );

  const handleEyeDropper = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex;
      setText(hex);
      onChange(hex);
    } catch {
      // User cancelled or API error — ignore
    }
  }, [onChange]);

  // Sync when parent value changes (e.g., reset, "Auto from site")
  // Using useEffect avoids render-loop issues
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (HEX_RE.test(value)) setText(value);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="w-24 shrink-0 truncate text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={HEX_RE.test(text) ? text : '#000000'}
          onChange={handleNativeChange}
          className="h-8 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
        />
      </div>
      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder="#000000"
        maxLength={7}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-500/50 focus:outline-none"
      />
      {eyeDropperSupported && (
        <button
          type="button"
          onClick={handleEyeDropper}
          title="Pick color from screen"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11.25l1.5-1.5a3.354 3.354 0 10-4.743-4.743L10.5 6.5m4.5 4.75l-7.5 7.5-3 1 1-3 7.5-7.5m1.5-1.5L15 11.25"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playground/ColorPicker.tsx
git commit -m "feat(playground): add ColorPicker component with hex input and EyeDropper support"
```

---

### Task 9: ControlPanel Component

**Files:**

- Create: `src/components/playground/ControlPanel.tsx`
- Reference: `src/lib/playgroundValidation.ts` (GOOGLE_FONTS, REBUILD_ONLY_FIELDS)

6 collapsible accordion sections: Colors, Typography, Layout, Bot Identity, Theme, Quick Replies.

- [ ] **Step 1: Create the ControlPanel component**

```tsx
// src/components/playground/ControlPanel.tsx

'use client';

import { useState, useCallback } from 'react';
import ColorPicker from './ColorPicker';
import { GOOGLE_FONTS, REBUILD_ONLY_FIELDS, PlaygroundConfig } from '@/lib/playgroundValidation';

interface ControlPanelProps {
  theme: Record<string, unknown>;
  config: {
    botName: string;
    greeting: string;
    quickReplies: string[];
    tone: string | null;
  };
  clientId: string;
  siteProfile: Record<string, unknown> | null;
  rebuildRequired: boolean;
  onThemeChange: (key: string, value: unknown) => void;
  onConfigChange: (updates: Partial<PlaygroundConfig>) => void;
}

// Accordion section wrapper
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
      >
        {title}
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function RebuildBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
      Rebuild required
    </span>
  );
}

export default function ControlPanel({
  theme,
  config,
  clientId,
  siteProfile,
  rebuildRequired,
  onThemeChange,
  onConfigChange,
}: ControlPanelProps) {
  // Avatar upload handler
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await fetch(`/api/user/playground/avatar/${clientId}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) setAvatarUrl(data.data.url);
      } catch {
        /* ignore */
      }
      setUploadingAvatar(false);
    },
    [clientId]
  );

  // "Auto from site" — restore original colors from siteProfile
  const restoreFromSite = useCallback(() => {
    if (!siteProfile) return;
    const colorKeys = [
      'headerFrom',
      'headerTo',
      'toggleFrom',
      'toggleTo',
      'sendFrom',
      'sendTo',
      'userMsgFrom',
      'userMsgTo',
    ];
    for (const key of colorKeys) {
      if (siteProfile[key]) onThemeChange(key, siteProfile[key]);
    }
  }, [siteProfile, onThemeChange]);
  // --- Colors Section ---
  const colorGroups = [
    { label: 'Header', fields: ['headerFrom', 'headerTo'] },
    { label: 'Toggle Button', fields: ['toggleFrom', 'toggleTo'] },
    { label: 'Send Button', fields: ['sendFrom', 'sendTo'] },
    { label: 'User Message', fields: ['userMsgFrom', 'userMsgTo'] },
  ];

  // --- Quick Replies ---
  const quickReplies = config.quickReplies || [];

  const addQuickReply = useCallback(() => {
    if (quickReplies.length >= 5) return;
    onConfigChange({ quickReplies: [...quickReplies, ''] });
  }, [quickReplies, onConfigChange]);

  const updateQuickReply = useCallback(
    (index: number, value: string) => {
      const updated = [...quickReplies];
      updated[index] = value;
      onConfigChange({ quickReplies: updated });
    },
    [quickReplies, onConfigChange]
  );

  const removeQuickReply = useCallback(
    (index: number) => {
      onConfigChange({ quickReplies: quickReplies.filter((_, i) => i !== index) });
    },
    [quickReplies, onConfigChange]
  );

  // Current font name from font stack
  const currentFontName = GOOGLE_FONTS.find((f) => (theme.font as string)?.includes(f.name))?.name || 'Custom';

  return (
    <div className="h-full overflow-y-auto">
      {/* 1. Colors */}
      <Section title="Colors" defaultOpen>
        {colorGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-medium text-gray-300">{group.label}</p>
            {group.fields.map((field) => (
              <ColorPicker
                key={field}
                label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                value={(theme[field] as string) || '#000000'}
                onChange={(hex) => onThemeChange(field, hex)}
              />
            ))}
          </div>
        ))}
        {siteProfile && (
          <button
            type="button"
            onClick={restoreFromSite}
            className="w-full rounded-lg border border-dashed border-cyan-500/30 py-1.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-500/10"
          >
            Auto from site
          </button>
        )}
      </Section>

      {/* 2. Typography */}
      <Section title="Typography">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Font Family
            {(REBUILD_ONLY_FIELDS as readonly string[]).includes('font') && <RebuildBadge />}
          </label>
          <select
            value={currentFontName}
            onChange={(e) => {
              const selected = GOOGLE_FONTS.find((f) => f.name === e.target.value);
              if (selected) {
                onThemeChange(
                  'font',
                  `'${selected.name}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
                );
                onThemeChange('fontUrl', selected.url);
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          >
            {currentFontName === 'Custom' && (
              <option value="Custom">Custom ({(theme.font as string)?.split(',')[0]})</option>
            )}
            {GOOGLE_FONTS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* 3. Layout */}
      <Section title="Layout">
        {/* Width slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Width: {parseInt(theme.widgetW as string) || 370}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={300}
            max={500}
            step={10}
            value={parseInt(theme.widgetW as string) || 370}
            onChange={(e) => {
              const v = `${e.target.value}px`;
              onThemeChange('widgetW', v);
              onThemeChange('widgetMaxW', v);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Height slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Height: {parseInt(theme.widgetH as string) || 540}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={400}
            max={700}
            step={10}
            value={parseInt(theme.widgetH as string) || 540}
            onChange={(e) => {
              const v = `${e.target.value}px`;
              onThemeChange('widgetH', v);
              onThemeChange('widgetMaxH', v);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Toggle size slider */}
        <div>
          <label className="mb-1 flex items-center text-xs text-gray-400">
            Toggle Size: {(theme.toggleSize as string)?.match(/\d+/)?.[0] || '58'}px
            <RebuildBadge />
          </label>
          <input
            type="range"
            min={44}
            max={72}
            step={2}
            value={parseInt((theme.toggleSize as string)?.match(/\d+/)?.[0] || '58')}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onThemeChange('toggleSize', `w-[${v}px] h-[${v}px]`);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Toggle radius preset buttons */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Toggle Shape
            <RebuildBadge />
          </label>
          <div className="flex gap-2">
            {[
              { label: 'Circle', value: 'rounded-full' },
              { label: 'Rounded', value: 'rounded-[10px]' },
              { label: 'Square', value: 'rounded-md' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange('toggleRadius', opt.value)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme.toggleRadius === opt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Position */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Position
            <RebuildBadge />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Bottom Right', value: 'bottom-right' },
              { label: 'Bottom Left', value: 'bottom-left' },
              { label: 'Top Right', value: 'top-right' },
              { label: 'Top Left', value: 'top-left' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onThemeChange('position', opt.value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                  (theme.position || 'bottom-right') === opt.value
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* 4. Bot Identity */}
      <Section title="Bot Identity">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Bot Name (max 30 chars)
            <RebuildBadge />
          </label>
          <input
            type="text"
            value={config.botName}
            maxLength={30}
            onChange={(e) => onConfigChange({ botName: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        {/* Avatar upload */}
        <div>
          <label className="mb-1 block text-xs text-gray-400">Avatar</label>
          <div className="flex items-center gap-3">
            {avatarUrl && <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-lg object-cover" />}
            <label
              className={`flex-1 cursor-pointer rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-xs text-gray-400 transition-colors hover:border-cyan-500/30 hover:text-cyan-400 ${uploadingAvatar ? 'pointer-events-none opacity-50' : ''}`}
            >
              {uploadingAvatar ? 'Uploading...' : 'Upload image (PNG, JPEG, WebP, max 2MB)'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Greeting (max 200 chars)
            <RebuildBadge />
          </label>
          <textarea
            value={config.greeting}
            maxLength={200}
            rows={3}
            onChange={(e) => onConfigChange({ greeting: e.target.value })}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Tone
            <RebuildBadge />
          </label>
          <select
            value={config.tone || ''}
            onChange={(e) =>
              onConfigChange({
                tone: (e.target.value || undefined) as PlaygroundConfig['tone'],
              })
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">No tone directive</option>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
          </select>
        </div>
      </Section>

      {/* 5. Theme */}
      <Section title="Theme">
        <div>
          <label className="mb-2 block text-xs text-gray-400">Mode</label>
          <div className="flex gap-2">
            {[
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
              { label: 'Auto', value: 'auto' },
            ].map((opt) => {
              const currentMode = theme.isDark === true ? 'dark' : theme.isDark === 'auto' ? 'auto' : 'light';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onThemeChange('isDark', opt.value === 'dark' ? true : opt.value === 'auto' ? 'auto' : false)
                  }
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    currentMode === opt.value
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 6. Quick Replies */}
      <Section title="Quick Replies">
        <div className="space-y-2">
          {quickReplies.map((qr, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={qr}
                maxLength={80}
                onChange={(e) => updateQuickReply(i, e.target.value)}
                placeholder={`Quick reply ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeQuickReply(i)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {quickReplies.length < 5 && (
            <button
              type="button"
              onClick={addQuickReply}
              className="w-full rounded-lg border border-dashed border-white/10 py-1.5 text-xs text-gray-500 transition-colors hover:border-cyan-500/30 hover:text-cyan-400"
            >
              + Add Quick Reply
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playground/ControlPanel.tsx
git commit -m "feat(playground): add ControlPanel with 6 accordion sections for theme editing"
```

---

### Task 10: PreviewFrame Component

**Files:**

- Create: `src/components/playground/PreviewFrame.tsx`

Right panel: loads the sandboxed preview page in an iframe, or shows a fallback.

- [ ] **Step 1: Create the component**

```tsx
// src/components/playground/PreviewFrame.tsx

'use client';

import { useEffect, useState, forwardRef } from 'react';

interface PreviewFrameProps {
  clientId: string;
  website: string;
  widgetDir: string;
  needsBuild: boolean;
  onBuildClick?: () => void;
}

const PreviewFrame = forwardRef<HTMLIFrameElement, PreviewFrameProps>(function PreviewFrame(
  { clientId, website, widgetDir, needsBuild, onBuildClick },
  ref
) {
  const [frameable, setFrameable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // Check frameability on mount
  useEffect(() => {
    if (!website) {
      setFrameable(false);
      return;
    }
    setChecking(true);
    fetch(`/api/user/playground/check-frame?url=${encodeURIComponent(website)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFrameable(d.data.frameable);
        else setFrameable(false);
      })
      .catch(() => setFrameable(false))
      .finally(() => setChecking(false));
  }, [website]);

  if (needsBuild) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <svg
              className="h-8 w-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17l-5.58 3.23V6.97l5.58 3.23m0 4.97l5.58 3.23V6.97l-5.58 3.23m0 4.97V6.97"
              />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-semibold text-white">Widget not built yet</h3>
          <p className="mb-4 text-sm text-gray-400">
            Click &quot;Save &amp; Rebuild&quot; to create your widget first.
          </p>
          {onBuildClick && (
            <button
              onClick={onBuildClick}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Build Now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-500" />
      </div>
    );
  }

  const previewUrl = `/playground-preview/${clientId}?dir=${widgetDir}&website=${encodeURIComponent(website)}&frameable=${frameable}`;

  return (
    <iframe
      ref={ref}
      src={previewUrl}
      className="h-full w-full border-none"
      sandbox="allow-scripts allow-same-origin"
      title="Widget preview"
    />
  );
});

export default PreviewFrame;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playground/PreviewFrame.tsx
git commit -m "feat(playground): add PreviewFrame component with frameability check and fallback"
```

---

## Chunk 3: Playground Page, Layout, Entry Points

### Task 11: Playground Layout (Fullscreen via Overlay)

**Files:**

- Create: `src/app/dashboard/playground/[clientId]/layout.tsx`

In Next.js App Router, nested layouts inherit from parents — so `/dashboard/playground/*` inherits the sidebar from `/dashboard/layout.tsx`. Since we can't break out of the parent layout, the playground page renders a `fixed inset-0 z-[100]` overlay that covers the entire viewport including the sidebar. This layout file is a simple pass-through.

- [ ] **Step 1: Create the layout**

```tsx
// src/app/dashboard/playground/[clientId]/layout.tsx

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  // Pass-through: the page component renders a fixed overlay that covers the sidebar
  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/app/dashboard/playground/\[clientId\]
git add src/app/dashboard/playground/[clientId]/layout.tsx
git commit -m "feat(playground): add pass-through layout for playground route"
```

---

### Task 12: Main Playground Page

**Files:**

- Create: `src/app/dashboard/playground/[clientId]/page.tsx`

The main playground page. Renders fullscreen (covering sidebar) with top bar + split-screen layout.

- [ ] **Step 1: Create the playground page**

```tsx
// src/app/dashboard/playground/[clientId]/page.tsx

'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlayground } from '@/components/playground/usePlayground';
import ControlPanel from '@/components/playground/ControlPanel';
import PreviewFrame from '@/components/playground/PreviewFrame';

export default function PlaygroundPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const pg = usePlayground(clientId);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Warn on browser navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pg.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pg.dirty]);

  // Desktop-only gate
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] p-8">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
            />
          </svg>
          <h2 className="mb-2 text-lg font-semibold text-white">Desktop Only</h2>
          <p className="mb-4 text-sm text-gray-400">
            The Widget Playground requires a larger screen. Please open this page on a desktop browser.
          </p>
          <Link href="/dashboard/widgets" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Back to Widgets
          </Link>
        </div>
      </div>
    );
  }

  if (pg.loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-500" />
      </div>
    );
  }

  if (pg.error && !pg.theme) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <p className="mb-4 text-sm text-red-400">{pg.error}</p>
          <Link href="/dashboard/widgets" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Back to Widgets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen overlay covering the dashboard sidebar */}
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0f]">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/dashboard/widgets"
            onClick={(e) => {
              if (pg.dirty) {
                e.preventDefault();
                setShowUnsavedDialog(true);
              }
            }}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Widgets
          </Link>

          <span className="text-sm font-medium text-white">{pg.config.botName || clientId}</span>

          <div className="flex items-center gap-2">
            {pg.error && <span className="text-xs text-red-400">{pg.error}</span>}

            <button
              onClick={pg.reset}
              disabled={!pg.dirty}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reset
            </button>

            <button
              onClick={async () => {
                const result = await pg.save();
                if (result?.buildTime) {
                  // Reload the preview iframe to show rebuilt widget
                  const iframe = pg.iframeRef.current;
                  if (iframe) iframe.src = iframe.src;
                }
              }}
              disabled={pg.saving || !pg.dirty}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pg.saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Building...
                </>
              ) : (
                'Save & Rebuild'
              )}
            </button>
          </div>
        </header>

        {/* Split-screen */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Control Panel */}
          <div className="w-[350px] shrink-0 border-r border-white/10 bg-[#0d0d14]">
            <ControlPanel
              theme={pg.theme}
              config={pg.config}
              clientId={clientId}
              siteProfile={pg.siteProfile}
              rebuildRequired={pg.rebuildRequired}
              onThemeChange={pg.updateThemeField}
              onConfigChange={pg.updateConfig}
            />
          </div>

          {/* Right: Preview */}
          <div className="flex-1">
            <PreviewFrame
              ref={pg.iframeRef}
              clientId={clientId}
              website={pg.website}
              widgetDir={pg.widgetDir}
              needsBuild={pg.needsBuild}
              onBuildClick={() => pg.save()}
            />
          </div>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-xl border border-white/10 bg-[#12121a] p-6">
            <h3 className="mb-2 text-base font-semibold text-white">Unsaved Changes</h3>
            <p className="mb-4 text-sm text-gray-400">You have unsaved changes. Leave without saving?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/5"
              >
                Stay
              </button>
              <Link
                href="/dashboard/widgets"
                className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-center text-sm text-red-400 hover:bg-red-500/30"
              >
                Leave
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit 2>&1 | grep -i "playground" | head -20`
Expected: No errors related to playground files

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/playground/
git commit -m "feat(playground): add main playground page with fullscreen split-screen layout"
```

---

### Task 13: Entry Point — "Customize" Button on Widgets Page

**Files:**

- Modify: `src/app/dashboard/widgets/page.tsx` (lines 133-147, the action buttons area)

Add a "Customize" link button between the existing "Preview" and "Delete" buttons.

- [ ] **Step 1: Add the Customize button**

In `src/app/dashboard/widgets/page.tsx`, find the action buttons `<div>`:

```tsx
<div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
```

Replace the entire `<div>` block with:

```tsx
<div className="mt-auto flex items-center gap-2 border-t border-white/5 pt-3">
  <Link
    href={`/demo/client-website?client=${widget.clientId}`}
    className="flex-1 rounded-lg px-3 py-1.5 text-center text-sm text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
  >
    Preview
  </Link>
  <Link
    href={`/dashboard/playground/${widget.clientId}`}
    className="flex-1 rounded-lg px-3 py-1.5 text-center text-sm text-cyan-400 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
  >
    Customize
  </Link>
  <button
    onClick={() => handleDelete(widget.clientId)}
    disabled={deletingId === widget.clientId}
    className="flex-1 rounded-lg px-3 py-1.5 text-center text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
  >
    {deletingId === widget.clientId ? 'Deleting...' : 'Delete'}
  </button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/widgets/page.tsx
git commit -m "feat(playground): add Customize button to widget cards on My Widgets page"
```

---

### Task 14: Entry Point — Command Palette "Customize Widget" Action

**Files:**

- Modify: `src/components/dashboard/CommandPalette.tsx` (line ~121, the `actions` array)

Add a "Customize Widget" action and per-widget "Customize <name>" items.

- [ ] **Step 1: Add the customize action**

In `src/components/dashboard/CommandPalette.tsx`, find the `actions` array:

```typescript
    const actions: CommandItem[] = [
      { id: 'act-new-widget', label: 'Create New Widget', ... },
      { id: 'act-billing', label: 'Manage Billing', ... },
    ];
```

Add after the existing two actions:

```typescript
// Note: Per-widget 'Customize <name>' items below provide direct access to each widget's playground
```

Also update the `widgetItems` mapping (line 125-132) to add a playground action per widget:

Replace:

```typescript
const widgetItems: CommandItem[] = widgets.map((w) => ({
  id: `widget-${w.clientId}`,
  label: w.widgetName,
  description: w.clientId,
  icon: NAV_ICONS.widgets,
  category: 'widget',
  action: () => router.push(`/dashboard/widgets?selected=${w.clientId}`),
}));
```

With:

```typescript
const widgetItems: CommandItem[] = widgets.flatMap((w) => [
  {
    id: `widget-${w.clientId}`,
    label: w.widgetName,
    description: w.clientId,
    icon: NAV_ICONS.widgets,
    category: 'widget',
    action: () => router.push(`/dashboard/widgets?selected=${w.clientId}`),
  },
  {
    id: `customize-${w.clientId}`,
    label: `Customize ${w.widgetName}`,
    description: 'Open in playground',
    icon: NAV_ICONS.action,
    category: 'widget',
    action: () => router.push(`/dashboard/playground/${w.clientId}`),
  },
]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/CommandPalette.tsx
git commit -m "feat(playground): add Customize Widget action to Command Palette"
```

---

### Task 15: Entry Point — AI Builder "Open Playground" Button

**Files:**

- Modify: `src/app/dashboard/builder/page.tsx`

The spec defines 3 entry points. The AI Builder should show an "Open Playground" link after a widget has been deployed.

- [ ] **Step 1: Add Playground button to the builder's deploy stage**

In `src/app/dashboard/builder/page.tsx`, find the deploy stage UI (the section that shows after a widget has been built). Add a link button:

```tsx
{
  /* After the deploy/preview buttons, add: */
}
<Link
  href={`/dashboard/playground/${session.clientId}`}
  className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-4 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/10"
>
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
    />
  </svg>
  Open Playground
</Link>;
```

The exact insertion point depends on the current builder UI for the deploy stage. Look for the section where `currentStage === 'deploy'` or the ContextPanel showing after deployment. The implementer should find the appropriate location based on the current builder page structure.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/builder/page.tsx
git commit -m "feat(playground): add Open Playground button to AI Builder deploy stage"
```

---

### Task 16: Final TypeScript Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit 2>&1 | tail -30`
Expected: Only pre-existing errors (test files, AuthModal, change-password), no new errors from playground files.

- [ ] **Step 2: Verify all files exist**

Run: `find src/app/api/user/playground src/components/playground src/app/dashboard/playground src/app/playground-preview src/lib/playgroundValidation.ts -type f 2>/dev/null | sort`

Expected output:

```
src/app/api/user/playground/[clientId]/route.ts
src/app/api/user/playground/avatar/[clientId]/route.ts
src/app/api/user/playground/check-frame/route.ts
src/app/dashboard/playground/[clientId]/layout.tsx
src/app/dashboard/playground/[clientId]/page.tsx
src/app/playground-preview/[clientId]/route.ts
src/components/playground/ColorPicker.tsx
src/components/playground/ControlPanel.tsx
src/components/playground/PreviewFrame.tsx
src/components/playground/usePlayground.ts
src/lib/playgroundValidation.ts
```

- [ ] **Step 3: Final commit if needed**

If any fixes were required, commit them:

```bash
git add src/lib/playgroundValidation.ts src/app/api/user/playground/ src/components/playground/ src/app/dashboard/playground/ src/app/playground-preview/ src/app/dashboard/widgets/page.tsx src/components/dashboard/CommandPalette.tsx .claude/widget-builder/src/hooks/useChat.js
git commit -m "fix(playground): address TypeScript compilation issues"
```
