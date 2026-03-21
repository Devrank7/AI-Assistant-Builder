/**
 * Script Runner
 *
 * Loads and executes channel scripts from widgets/<clientId>/<channel>/script.js
 * Scripts are CommonJS modules that export hooks: onBeforeAI, onAfterAIResponse
 * They can integrate with ANY external API (CRM, calendar, payments, etc.)
 *
 * Scripts receive a context object with:
 * - Message data (userMessage, aiResponse, sessionId)
 * - Customer info (customerName, customerId, isFirstContact)
 * - Secrets from DB (API keys, tokens - never hardcoded in scripts)
 * - fetch() for HTTP requests
 * - log() for structured logging
 * - askAI() to call our AI API
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';

const WIDGETS_DIR = path.join(process.cwd(), 'widgets');

// ─── Type Definitions ────────────────────────────────────────────────

export interface ChannelScriptMeta {
  version: string;
  channel: string;
  provider?: string;
  description: string;
  createdAt: string;
}

export interface ScriptContext {
  clientId: string;
  channel: 'telegram' | 'whatsapp' | 'instagram';
  userMessage: string;
  aiResponse: string;
  sessionId: string;
  customerName?: string;
  customerId?: string;
  isFirstContact: boolean;
  metadata: Record<string, unknown>;
  secrets: Record<string, string>;
  fetch: typeof globalThis.fetch;
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
  askAI: (message: string, overrides?: { sessionId?: string }) => Promise<string>;
}

export interface PreprocessContext {
  clientId: string;
  channel: 'telegram' | 'whatsapp' | 'instagram';
  rawMessage: string;
  metadata: Record<string, unknown>;
  secrets: Record<string, string>;
  fetch: typeof globalThis.fetch;
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

export interface ScriptResult {
  appendToResponse?: string;
  replaceResponse?: string;
}

export interface PreprocessResult {
  skip?: boolean;
  customResponse?: string;
  modifiedMessage?: string;
}

export interface ChannelScript {
  meta: ChannelScriptMeta;
  onBeforeAI?: (ctx: PreprocessContext) => Promise<PreprocessResult>;
  onAfterAIResponse?: (ctx: ScriptContext) => Promise<ScriptResult>;
}

// ─── Cache ───────────────────────────────────────────────────────────

const SCRIPT_CACHE = new Map<string, { script: ChannelScript; loadedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute
const SCRIPT_TIMEOUT_MS = 10_000; // 10 seconds

// ─── Script Loader ───────────────────────────────────────────────────

/**
 * Load a channel script from the filesystem.
 * Returns null if no script exists or loading fails.
 */
export function loadChannelScript(clientId: string, channelFolder: string): ChannelScript | null {
  const cacheKey = `${clientId}/${channelFolder}`;
  const cached = SCRIPT_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.script;
  }

  const scriptPath = path.join(WIDGETS_DIR, clientId, channelFolder, 'script.js');

  // Security: ensure path doesn't escape widgets dir
  const resolved = path.resolve(scriptPath);
  if (!resolved.startsWith(path.resolve(WIDGETS_DIR))) {
    console.error(`[ScriptRunner] Path traversal attempt: ${scriptPath}`);
    return null;
  }

  if (!fs.existsSync(scriptPath)) return null;

  try {
    const code = fs.readFileSync(scriptPath, 'utf-8');

    // Use vm.runInNewContext to evaluate the script without webpack interference
    const moduleExports: Record<string, unknown> = {};
    const moduleObj = { exports: moduleExports };
    const sandbox = {
      module: moduleObj,
      exports: moduleExports,
      require: (id: string) => {
        // Allow basic requires that scripts might need
        if (id === 'path') return path;
        if (id === 'fs') return fs;
        throw new Error(`require('${id}') is not allowed in channel scripts`);
      },
      console,
      process: { env: process.env },
      fetch: globalThis.fetch,
      setTimeout,
      clearTimeout,
      Buffer,
      URL,
      URLSearchParams,
      JSON,
      Date,
      Math,
      RegExp,
      Promise,
      Error,
    };

    vm.runInNewContext(code, sandbox, { filename: scriptPath, timeout: 5000 });

    const script = moduleObj.exports as unknown as ChannelScript;

    if (!script.meta || typeof script.meta !== 'object') {
      console.error(`[ScriptRunner] Invalid script at ${scriptPath}: missing meta`);
      return null;
    }

    SCRIPT_CACHE.set(cacheKey, { script, loadedAt: Date.now() });
    return script;
  } catch (err) {
    console.error(`[ScriptRunner] Failed to load script ${scriptPath}:`, err);
    return null;
  }
}

// ─── Script Executors ────────────────────────────────────────────────

/**
 * Execute the onBeforeAI hook if the script has one.
 * Returns empty result if no script or hook.
 */
export async function runBeforeAI(
  clientId: string,
  channelFolder: string,
  ctx: PreprocessContext
): Promise<PreprocessResult> {
  const script = loadChannelScript(clientId, channelFolder);
  if (!script?.onBeforeAI) return {};

  try {
    return await Promise.race([
      script.onBeforeAI(ctx),
      new Promise<PreprocessResult>((_, reject) =>
        setTimeout(() => reject(new Error('Script onBeforeAI timeout (10s)')), SCRIPT_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.error(`[ScriptRunner] onBeforeAI error for ${clientId}/${channelFolder}:`, err);
    return {};
  }
}

/**
 * Execute the onAfterAIResponse hook if the script has one.
 * Returns empty result if no script or hook.
 */
export async function runAfterAIResponse(
  clientId: string,
  channelFolder: string,
  ctx: ScriptContext
): Promise<ScriptResult> {
  const script = loadChannelScript(clientId, channelFolder);
  if (!script?.onAfterAIResponse) return {};

  try {
    return await Promise.race([
      script.onAfterAIResponse(ctx),
      new Promise<ScriptResult>((_, reject) =>
        setTimeout(() => reject(new Error('Script onAfterAIResponse timeout (10s)')), SCRIPT_TIMEOUT_MS)
      ),
    ]);
  } catch (err) {
    console.error(`[ScriptRunner] onAfterAIResponse error for ${clientId}/${channelFolder}:`, err);
    return {};
  }
}

// ─── Context Builders ────────────────────────────────────────────────

/**
 * Fetch secrets from ChannelConfig in DB.
 */
async function getSecrets(clientId: string, channel: string): Promise<Record<string, string>> {
  try {
    await connectDB();
    const dbChannel = channel === 'telegram-bot' ? 'telegram' : channel;
    const channelConfig = await ChannelConfig.findOne({
      clientId,
      channel: dbChannel,
      isActive: true,
    });

    if (!channelConfig?.config) return {};

    const secrets: Record<string, string> = {};
    const rawConfig = channelConfig.config as Record<string, unknown> & {
      toObject?: () => Record<string, unknown>;
      secrets?: Record<string, unknown>;
    };
    const configObj = rawConfig.toObject ? rawConfig.toObject() : rawConfig;

    for (const [key, value] of Object.entries(configObj)) {
      if (typeof value === 'string' && value.length > 0) {
        secrets[key] = value;
      }
    }

    // Extract dedicated secrets map if present
    if (configObj.secrets && typeof configObj.secrets === 'object') {
      for (const [key, value] of Object.entries(configObj.secrets as Record<string, unknown>)) {
        if (typeof value === 'string') {
          secrets[key] = value;
        }
      }
    }

    return secrets;
  } catch (err) {
    console.error(`[ScriptRunner] Failed to get secrets for ${clientId}/${channel}:`, err);
    return {};
  }
}

function createLogger(clientId: string, channel: string) {
  return (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => {
    const prefix = `[Script:${clientId}/${channel}]`;
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }
  };
}

function createAskAI(clientId: string, sessionId: string, metadata: Record<string, unknown>) {
  return async (message: string, overrides?: { sessionId?: string }): Promise<string> => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          message,
          sessionId: overrides?.sessionId || sessionId,
          metadata: { ...metadata, scriptGenerated: true },
        }),
      });
      const data = await res.json();
      return data.response || '';
    } catch (err) {
      console.error(`[ScriptRunner] askAI failed:`, err);
      return '';
    }
  };
}

/**
 * Build context for onAfterAIResponse hook.
 */
export async function buildScriptContext(params: {
  clientId: string;
  channel: string;
  channelFolder: string;
  userMessage: string;
  aiResponse: string;
  sessionId: string;
  metadata: Record<string, unknown>;
  isFirstContact: boolean;
}): Promise<ScriptContext> {
  const secrets = await getSecrets(params.clientId, params.channelFolder);
  const resolvedChannel = (params.channel === 'telegram-bot' ? 'telegram' : params.channel) as
    | 'telegram'
    | 'whatsapp'
    | 'instagram';

  return {
    clientId: params.clientId,
    channel: resolvedChannel,
    userMessage: params.userMessage,
    aiResponse: params.aiResponse,
    sessionId: params.sessionId,
    customerName:
      (params.metadata.whatsappFromName as string) ||
      (params.metadata.telegramUsername as string) ||
      (params.metadata.customerName as string) ||
      (params.metadata.first_name as string),
    customerId:
      (params.metadata.whatsappFrom as string) ||
      (params.metadata.telegramChatId as string) ||
      (params.metadata.instagramSenderId as string) ||
      (params.metadata.manychatSubscriberId as string),
    isFirstContact: params.isFirstContact,
    metadata: params.metadata,
    secrets,
    fetch: globalThis.fetch,
    log: createLogger(params.clientId, params.channelFolder),
    askAI: createAskAI(params.clientId, params.sessionId, params.metadata),
  };
}

/**
 * Build context for onBeforeAI hook.
 */
export async function buildPreprocessContext(params: {
  clientId: string;
  channel: string;
  channelFolder: string;
  rawMessage: string;
  metadata: Record<string, unknown>;
}): Promise<PreprocessContext> {
  const secrets = await getSecrets(params.clientId, params.channelFolder);
  const resolvedChannel = (params.channel === 'telegram-bot' ? 'telegram' : params.channel) as
    | 'telegram'
    | 'whatsapp'
    | 'instagram';

  return {
    clientId: params.clientId,
    channel: resolvedChannel,
    rawMessage: params.rawMessage,
    metadata: params.metadata,
    secrets,
    fetch: globalThis.fetch,
    log: createLogger(params.clientId, params.channelFolder),
  };
}

// ─── Cache Management ────────────────────────────────────────────────

/**
 * Invalidate the script cache for a specific client/channel or all scripts for a client.
 */
export function invalidateScriptCache(clientId: string, channelFolder?: string): void {
  if (channelFolder) {
    SCRIPT_CACHE.delete(`${clientId}/${channelFolder}`);
  } else {
    for (const key of SCRIPT_CACHE.keys()) {
      if (key.startsWith(`${clientId}/`)) {
        SCRIPT_CACHE.delete(key);
      }
    }
  }
}

/**
 * Check if a channel script exists on the filesystem.
 */
export function hasChannelScript(clientId: string, channelFolder: string): boolean {
  const scriptPath = path.join(WIDGETS_DIR, clientId, channelFolder, 'script.js');
  return fs.existsSync(scriptPath);
}

/**
 * Read the raw source code of a channel script.
 */
export function readScriptSource(clientId: string, channelFolder: string): string | null {
  const scriptPath = path.join(WIDGETS_DIR, clientId, channelFolder, 'script.js');
  const resolved = path.resolve(scriptPath);
  if (!resolved.startsWith(path.resolve(WIDGETS_DIR))) return null;

  try {
    if (fs.existsSync(scriptPath)) {
      return fs.readFileSync(scriptPath, 'utf-8');
    }
  } catch {
    // ignore
  }
  return null;
}
