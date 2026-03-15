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
