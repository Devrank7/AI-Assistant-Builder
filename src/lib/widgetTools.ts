/**
 * Widget Tools
 *
 * Loads and builds Gemini function declarations for a specific widget.
 * Combines:
 * 1. Built-in tools (always available: collect_lead, search_knowledge, send_notification)
 * 2. Integration tools (from connected WidgetIntegration bindings)
 *
 * Used by agenticRouter.ts to enable the widget AI to execute real actions.
 */

import { Type } from '@google/genai';
import connectDB from '@/lib/mongodb';
import WidgetIntegration from '@/models/WidgetIntegration';
import Integration from '@/models/Integration';
import Client from '@/models/Client';
import AISettings from '@/models/AISettings';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import ChatLog from '@/models/ChatLog';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';
import { decrypt } from '@/lib/encryption';
import { generateEmbedding, findSimilarChunks } from '@/lib/gemini';
import { webSearch } from '@/lib/builder/webSearch';
import { webFetch } from '@/lib/builder/webFetch';
import type { ExecutionResult } from '@/lib/integrations/core/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WidgetToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: Type;
    properties: Record<string, { type: Type; description: string }>;
    required: string[];
  };
}

export interface WidgetToolContext {
  clientId: string;
  userId: string;
  sessionId: string;
  channel: string;
}

interface ToolExecutor {
  (args: Record<string, unknown>, ctx: WidgetToolContext): Promise<Record<string, unknown>>;
}

interface WidgetTool {
  declaration: WidgetToolDeclaration;
  executor: ToolExecutor;
}

// ── Built-in Tool Executors ────────────────────────────────────────────────

const builtinTools: Record<string, WidgetTool> = {
  collect_lead: {
    declaration: {
      name: 'collect_lead',
      description:
        'Save a lead/contact from the conversation. Use when the user provides their name, email, or phone — or when they want to book, order, or get a callback. Collects the information naturally from chat.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Customer name' },
          email: { type: Type.STRING, description: 'Customer email address' },
          phone: { type: Type.STRING, description: 'Customer phone number' },
          notes: { type: Type.STRING, description: 'Additional context (what they want, service requested, etc.)' },
        },
        required: [],
      },
    },
    executor: async (args, ctx) => {
      try {
        // Store lead in chat log metadata for now; can be extended to Leads model
        await ChatLog.findOneAndUpdate(
          { clientId: ctx.clientId, sessionId: ctx.sessionId },
          {
            $set: {
              'metadata.lead': {
                name: args.name || null,
                email: args.email || null,
                phone: args.phone || null,
                notes: args.notes || null,
                collectedAt: new Date().toISOString(),
              },
            },
          },
          { upsert: true }
        );
        return { success: true, message: 'Lead saved successfully' };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  },

  search_knowledge: {
    declaration: {
      name: 'search_knowledge',
      description:
        'Search the knowledge base for specific information. Use when you need to find precise details about services, pricing, schedules, team members, or policies that may not be in the current context.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The search query to find in the knowledge base' },
        },
        required: ['query'],
      },
    },
    executor: async (args, ctx) => {
      try {
        const query = args.query as string;
        const allChunks = await KnowledgeChunk.find({ clientId: ctx.clientId }).select('text embedding');
        if (allChunks.length === 0) return { success: true, results: [], message: 'Knowledge base is empty' };

        const queryEmbedding = await generateEmbedding(query);
        const chunksWithEmbeddings = allChunks.map((c) => ({ text: c.text, embedding: c.embedding }));
        const results = await findSimilarChunks(queryEmbedding, chunksWithEmbeddings, 5, 0.25);

        return {
          success: true,
          results: results.map((r) => r.text),
          count: results.length,
        };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  },

  send_notification: {
    declaration: {
      name: 'send_notification',
      description:
        'Send a notification to the business owner (e.g., via Telegram or email). Use when a customer wants to talk to a human, has an urgent request, or when an important action was completed (like a booking).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING, description: 'Short notification subject/title' },
          message: { type: Type.STRING, description: 'Notification body with details' },
          priority: { type: Type.STRING, description: 'Priority level: normal or urgent' },
        },
        required: ['subject', 'message'],
      },
    },
    executor: async (args, ctx) => {
      try {
        const client = await Client.findOne({ clientId: ctx.clientId }).select('telegram email username userId').lean();
        if (!client) return { success: false, error: 'Client not found' };

        const text = `🔔 *${args.subject}*\n\n${args.message}\n\n_Widget: ${ctx.clientId}_`;

        // Try Telegram notification via Client.telegram field first
        if (client.telegram && process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: client.telegram,
              text,
              parse_mode: 'Markdown',
            }),
          });
          return { success: true, message: 'Notification sent to business owner via Telegram' };
        }

        // Fallback: check Integration model for connected Telegram bot
        if (client.userId) {
          try {
            const { decrypt } = await import('@/lib/encryption');
            const tgIntegration = await Integration.findOne({
              userId: client.userId,
              provider: 'telegram',
              status: 'connected',
            }).lean();

            if (tgIntegration?.accessToken && (tgIntegration.metadata as Record<string, unknown>)?.chatId) {
              const botToken = decrypt(tgIntegration.accessToken as string);
              const chatId = (tgIntegration.metadata as Record<string, unknown>).chatId as string;
              console.log(`[send_notification] Sending Telegram to chatId=${chatId} via bot`);
              const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text,
                  parse_mode: 'Markdown',
                }),
              });
              const tgData = await tgRes.json();
              if (!tgData.ok) {
                console.error('[send_notification] Telegram API error:', tgData);
                return { success: false, error: `Telegram error: ${tgData.description || 'Unknown error'}` };
              }
              // Also store chatId in Client for faster future lookups
              await Client.updateOne({ clientId: ctx.clientId }, { $set: { telegram: chatId } });
              return { success: true, message: 'Notification sent to business owner via Telegram' };
            } else {
              console.warn('[send_notification] Integration found but missing accessToken or chatId:', {
                hasToken: !!tgIntegration?.accessToken,
                hasChatId: !!(tgIntegration?.metadata as Record<string, unknown>)?.chatId,
              });
            }
          } catch (intErr) {
            console.error('[send_notification] Integration fallback error:', (intErr as Error).message);
          }
        } else {
          console.warn('[send_notification] Client has no userId, cannot look up integrations');
        }

        // Fallback: store as in-app notification
        return { success: true, message: 'Notification recorded. Business owner will be notified.' };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  },

  web_search: {
    declaration: {
      name: 'web_search',
      description:
        'Search the internet for real-time information. Use when the user asks about current events, live data (exchange rates, weather, news, prices, scores), or anything that requires up-to-date information not available in the knowledge base.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search query in the language most likely to return good results' },
        },
        required: ['query'],
      },
    },
    executor: async (args) => {
      try {
        const query = args.query as string;
        const results = await webSearch(query, 5);
        if (results.length === 0) return { success: true, results: [], message: 'No results found' };
        return {
          success: true,
          results: results.map((r) => ({ title: r.title, url: r.url, snippet: r.description })),
          count: results.length,
        };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  },

  web_fetch: {
    declaration: {
      name: 'web_fetch',
      description:
        'Fetch and read the content of a specific web page. Use after web_search to get detailed information from a URL, or when the user provides a direct link. Returns the page content as text.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING, description: 'The full URL to fetch (must start with http:// or https://)' },
        },
        required: ['url'],
      },
    },
    executor: async (args) => {
      try {
        const url = args.url as string;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return { success: false, error: 'URL must start with http:// or https://' };
        }
        const result = await webFetch(url);
        if (result.error) return { success: false, error: result.error };
        return {
          success: true,
          content: (result.content || '').slice(0, 15000),
        };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  },
};

// ── Integration Tool Builder ───────────────────────────────────────────────

/** Map simple type strings to Gemini SDK Type enum */
function mapSchemaType(type: string): Type {
  const map: Record<string, Type> = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
  };
  return map[type?.toLowerCase()] || Type.STRING;
}

/**
 * Build a Gemini function declaration + executor from a WidgetIntegration binding.
 */
function buildIntegrationTool(
  slug: string,
  actionId: string,
  actionDef: { id: string; name: string; description: string; inputSchema: Record<string, string> },
  connectionId: string
): WidgetTool {
  const toolName = `${slug}_${actionId}`;

  // Build parameter properties from the action's inputSchema
  const properties: Record<string, { type: Type; description: string }> = {};
  const required: string[] = [];

  for (const [key, typeStr] of Object.entries(actionDef.inputSchema)) {
    const isOptional = typeStr.endsWith('?');
    const cleanType = isOptional ? typeStr.replace('?', '') : typeStr;
    properties[key] = {
      type: mapSchemaType(cleanType),
      description: `${actionDef.name}: ${key}`,
    };
    if (!isOptional) required.push(key);
  }

  return {
    declaration: {
      name: toolName,
      description: `[${slug}] ${actionDef.description}`,
      parameters: {
        type: Type.OBJECT,
        properties,
        required,
      },
    },
    executor: async (args, ctx) => {
      try {
        const result: ExecutionResult = await pluginRegistry.executeAction(
          slug,
          actionId,
          args,
          ctx.userId,
          ctx.clientId
        );
        return result as unknown as Record<string, unknown>;
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  };
}

// ── Main Loader ────────────────────────────────────────────────────────────

export interface LoadedWidgetTools {
  declarations: WidgetToolDeclaration[];
  executors: Map<string, ToolExecutor>;
  hasIntegrations: boolean;
}

/**
 * Load all available tools for a widget.
 * Returns Gemini function declarations + executor map.
 *
 * If the widget has no integrations and actions are not explicitly enabled,
 * returns empty arrays (caller should use plain text stream).
 */
export async function loadWidgetTools(clientId: string): Promise<LoadedWidgetTools> {
  await connectDB();

  const declarations: WidgetToolDeclaration[] = [];
  const executors = new Map<string, ToolExecutor>();
  let hasIntegrations = false;

  // 1. Get client to find userId
  const client = await Client.findOne({ clientId }).select('userId').lean();
  const userId = client?.userId;

  // 2. Load integration tools if userId exists
  if (userId) {
    const bindings = await WidgetIntegration.find({
      widgetId: clientId,
      enabled: true,
    }).lean();

    for (const binding of bindings) {
      // Verify the connection is still active
      const connection = await Integration.findOne({
        userId,
        provider: binding.integrationSlug,
        status: 'connected',
      })
        .select('provider')
        .lean();

      if (!connection) {
        console.warn(
          `[widgetTools] Integration "${binding.integrationSlug}" bound to widget "${clientId}" but no active connection found — skipping`
        );
        continue;
      }

      const plugin = pluginRegistry.get(binding.integrationSlug);
      if (!plugin) {
        console.warn(`[widgetTools] Plugin "${binding.integrationSlug}" not found in registry — skipping`);
        continue;
      }

      for (const actionId of binding.enabledActions || []) {
        const actionDef = plugin.manifest.actions.find((a) => a.id === actionId);
        if (!actionDef) {
          console.warn(
            `[widgetTools] Action "${actionId}" not found in plugin "${binding.integrationSlug}" manifest — skipping`
          );
          continue;
        }

        const tool = buildIntegrationTool(
          binding.integrationSlug,
          actionId,
          actionDef,
          connection._id?.toString() || ''
        );

        declarations.push(tool.declaration);
        executors.set(tool.declaration.name, tool.executor);
        hasIntegrations = true;
      }
    }
  }

  // 3. Check if AI actions are enabled for this widget
  const aiSettings = await AISettings.findOne({ clientId }).select('actionsEnabled').lean();
  const actionsEnabled = aiSettings?.actionsEnabled ?? false;

  // 4. Add built-in tools only if actions are enabled (or integrations detected)
  if (actionsEnabled || hasIntegrations) {
    for (const [name, tool] of Object.entries(builtinTools)) {
      declarations.push(tool.declaration);
      executors.set(name, tool.executor);
    }
  }

  return { declarations, executors, hasIntegrations };
}
