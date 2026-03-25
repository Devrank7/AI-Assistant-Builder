// src/lib/builder/tools/dynamicIntegrationTools.ts
import type { ToolDefinition } from '../toolRegistry';
import IntegrationConfig from '@/models/IntegrationConfig';
import AISettings from '@/models/AISettings';
import WidgetIntegration from '@/models/WidgetIntegration';
import { encrypt } from '@/lib/encryption';
import { validateConfig, executeAction } from '@/lib/integrations/engine';
import { loadWidgetTools } from '@/lib/widgetTools';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';
import connectDB from '@/lib/mongodb';

// ── Helper: web search via Gemini Search grounding ──────────────────────

import { geminiSearch } from '../webSearch';

async function fetchPageMarkdown(url: string, maxLen = 30000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WinBixAI-Builder/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return `[Error: HTTP ${res.status}]`;
    const html = await res.text();
    // Simple HTML to text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text.slice(0, maxLen);
  } catch (err) {
    return `[Error: ${(err as Error).message}]`;
  }
}

// ── Helper: Build unified actionsSystemPrompt ────────────────────────────

async function buildUnifiedActionsPrompt(
  clientId: string,
  userId: string
): Promise<{ prompt: string; actionCount: number }> {
  let prompt = '## Available Integration Actions\n\n';
  let actionCount = 0;

  // 1. Plugin-based integrations (from WidgetIntegration)
  const bindings = await WidgetIntegration.find({ widgetId: clientId, enabled: true }).lean();
  for (const binding of bindings) {
    const plugin = pluginRegistry.get(binding.integrationSlug);
    if (!plugin) continue;
    for (const actionId of binding.enabledActions || []) {
      const actionDef = plugin.manifest.actions.find((a: { id: string }) => a.id === actionId);
      if (!actionDef) continue;
      const toolName = `${binding.integrationSlug}_${actionId}`;
      prompt += `- **${toolName}**: ${actionDef.description}\n`;
      actionCount++;
    }
  }

  // 2. Config-driven integrations (from IntegrationConfig)
  const configs = await IntegrationConfig.find({ clientId, status: 'active' }).lean();
  for (const config of configs) {
    for (const action of config.actions) {
      const toolName = `${config.provider}_${action.id}`;
      prompt += `- **${toolName}**: ${action.description}\n`;
      actionCount++;
    }
    if (config.systemPromptAddition) {
      prompt += `\n${config.systemPromptAddition}\n`;
    }
  }

  return { prompt, actionCount };
}

// ── Tools ────────────────────────────────────────────────────────────────

export const dynamicIntegrationTools: ToolDefinition[] = [
  // ─── 1. research_api ───────────────────────────────────────────────────
  {
    name: 'research_api',
    description:
      'Research an API documentation to understand endpoints, authentication, and parameters. Use before creating an integration config. Returns raw documentation text.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'API provider name (e.g., "telegram", "hubspot", "stripe")' },
        topic: { type: 'string', description: 'Specific topic to research (e.g., "send message", "create contact")' },
      },
      required: ['provider', 'topic'],
    },
    category: 'integration',
    async executor(args) {
      const provider = args.provider as string;
      const topic = args.topic as string;

      const searchResult = await geminiSearch(`${provider} API documentation ${topic}`);
      if (searchResult.sources.length === 0 && !searchResult.text) {
        return {
          success: false,
          error: 'No documentation found. Ask the user for the API base URL and endpoint details.',
        };
      }

      // Fetch top 2 source pages for detailed docs
      const docs: string[] = [];
      for (const src of searchResult.sources.slice(0, 2)) {
        if (src.url) {
          const content = await fetchPageMarkdown(src.url, 15000);
          docs.push(`## ${src.title}\nURL: ${src.url}\n\n${content}`);
        }
      }

      // Include Gemini's grounded summary
      if (searchResult.text) {
        docs.unshift(`## Gemini Search Summary\n\n${searchResult.text}`);
      }

      return {
        success: true,
        searchResults: searchResult.sources.map((r) => ({ title: r.title, url: r.url, snippet: r.description })),
        documentation: docs.join('\n\n---\n\n'),
      };
    },
  },

  // ─── 2. create_integration ─────────────────────────────────────────────
  {
    name: 'create_integration',
    description:
      'Create a new integration config for a widget. Validates the config structure, encrypts credentials, and saves as draft. Must call test_integration_config after to verify it works.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Integration provider slug (e.g., "telegram", "hubspot")' },
        displayName: { type: 'string', description: 'Human-readable name (e.g., "Telegram Notifications")' },
        authType: {
          type: 'string',
          description: 'Auth type: "api_key", "bearer", "basic", "none", or "oauth2_service_account"',
        },
        credentials: { type: 'string', description: 'JSON string with auth credentials (e.g., {"token": "abc123"})' },
        authValueField: {
          type: 'string',
          description: 'Which credential field to use for auth header (e.g., "token", "apiKey")',
        },
        headerName: {
          type: 'string',
          description: 'Auth header name (default: "Authorization" for bearer, "X-API-Key" for api_key)',
        },
        headerPrefix: {
          type: 'string',
          description: 'Auth header value prefix (default: "Bearer " for bearer, "" for api_key)',
        },
        baseUrl: {
          type: 'string',
          description:
            'Base URL with optional {{auth.X}} templates (e.g., "https://api.telegram.org/bot{{auth.token}}")',
        },
        actions: {
          type: 'string',
          description:
            'JSON array of action definitions with id, name, description, method, path, bodyTemplate, inputSchema',
        },
        config: { type: 'string', description: 'JSON object with static config values (e.g., {"chat_id": "123456"})' },
        scopes: {
          type: 'string',
          description:
            'JSON array of OAuth2 scopes (required for oauth2_service_account, e.g., ["https://www.googleapis.com/auth/calendar"])',
        },
        tokenUrl: {
          type: 'string',
          description:
            'Token endpoint URL for OAuth2 flows (required for oauth2_auth_code and oauth2_client_credentials)',
        },
        systemPromptAddition: {
          type: 'string',
          description: 'Extra instructions for the widget AI about this integration',
        },
      },
      required: ['provider', 'displayName', 'authType', 'credentials', 'baseUrl', 'actions'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      // Parse JSON params
      let credentials: Record<string, unknown>;
      let actions: Array<Record<string, unknown>>;
      let config: Record<string, unknown>;
      try {
        credentials = JSON.parse(args.credentials as string);
      } catch {
        return { success: false, error: 'Invalid JSON in credentials parameter' };
      }
      try {
        actions = JSON.parse(args.actions as string);
      } catch {
        return { success: false, error: 'Invalid JSON in actions parameter' };
      }
      try {
        config = args.config ? JSON.parse(args.config as string) : {};
      } catch {
        return { success: false, error: 'Invalid JSON in config parameter' };
      }

      if (!ctx.clientId) {
        return { success: false, error: 'No widget built yet. Build a widget first before adding integrations.' };
      }

      // Validate
      const validation = validateConfig({
        authType: args.authType as string,
        authValueField: args.authValueField as string | undefined,
        credentials,
        baseUrl: args.baseUrl as string,
        actions: actions as any[],
        config,
        tokenUrl: args.tokenUrl as string | undefined,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: `Config validation failed:\n${validation.errors.join('\n')}`,
          errors: validation.errors,
        };
      }

      // Encrypt credentials
      const encryptedCreds = encrypt(JSON.stringify(credentials));

      // Upsert (allows fixing a broken draft)
      const doc = await IntegrationConfig.findOneAndUpdate(
        { userId: ctx.userId, clientId: ctx.clientId, provider: args.provider as string },
        {
          displayName: args.displayName as string,
          auth: {
            type: args.authType as string,
            credentials: encryptedCreds,
            headerName: (args.headerName as string) || undefined,
            headerPrefix: (args.headerPrefix as string) || undefined,
            authValueField: args.authValueField as string | undefined,
            ...(args.scopes ? { scopes: JSON.parse(args.scopes as string) } : {}),
            ...(args.tokenUrl ? { tokenUrl: args.tokenUrl as string } : {}),
          },
          baseUrl: args.baseUrl as string,
          actions,
          config,
          systemPromptAddition: (args.systemPromptAddition as string) || undefined,
          status: 'draft',
          consecutiveFailures: 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return {
        success: true,
        configId: doc._id.toString(),
        provider: args.provider,
        actionsCreated: actions.map((a: any) => a.id),
        message: `Integration config created as draft. Now call test_integration_config to verify it works.`,
      };
    },
  },

  // ─── 3. test_integration_config ────────────────────────────────────────
  {
    name: 'test_integration_config',
    description:
      'Test an integration config by executing a real API call. Use after create_integration to verify the config works. Updates status to "tested" on success.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId returned by create_integration' },
        actionId: { type: 'string', description: 'Which action to test (e.g., "send_message")' },
        testInputs: {
          type: 'string',
          description: 'JSON with test input values (e.g., {"message": "Test from WinBix"})',
        },
      },
      required: ['configId', 'actionId', 'testInputs'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }

      let testInputs: Record<string, unknown>;
      try {
        testInputs = JSON.parse(args.testInputs as string);
      } catch {
        return { success: false, error: 'Invalid JSON in testInputs parameter' };
      }

      ctx.write({ type: 'progress', message: `Testing ${configDoc.provider} integration...` });

      const result = await executeAction(configDoc, args.actionId as string, testInputs);

      // Update test result
      configDoc.lastTestResult = {
        success: result.success,
        response: result.data,
        error: result.error,
        timestamp: new Date(),
      };

      if (result.success) {
        configDoc.status = 'tested';
        configDoc.consecutiveFailures = 0;
      }

      await configDoc.save();

      if (result.success) {
        return {
          success: true,
          message: `Test passed! Action "${args.actionId}" executed successfully. Call activate_integration to make it live.`,
          response: result.data,
        };
      } else {
        return {
          success: false,
          error: `Test failed: ${result.error}. Fix the config with create_integration and test again.`,
          details: result.data,
        };
      }
    },
  },

  // ─── 4. activate_integration ───────────────────────────────────────────
  {
    name: 'activate_integration',
    description:
      'Activate a tested integration on the widget. Makes its actions available to the widget AI as callable tools. Must call test_integration_config first.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId to activate' },
      },
      required: ['configId'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }
      if (configDoc.status === 'draft') {
        return {
          success: false,
          error: 'Integration must be tested first. Call test_integration_config before activating.',
        };
      }

      // Set active
      configDoc.status = 'active';
      await configDoc.save();

      // Build unified actionsSystemPrompt
      const { prompt, actionCount } = await buildUnifiedActionsPrompt(configDoc.clientId, ctx.userId);

      // Update AISettings
      await AISettings.findOneAndUpdate(
        { clientId: configDoc.clientId },
        {
          actionsEnabled: true,
          actionsSystemPrompt: prompt,
        },
        { upsert: true }
      );

      // Verify tools load
      const tools = await loadWidgetTools(configDoc.clientId);
      const expectedToolNames = configDoc.actions.map((a: { id: string }) => `${configDoc.provider}_${a.id}`);
      const loadedNames = tools.declarations.map((d: { name: string }) => d.name);
      const allLoaded = expectedToolNames.every((n: string) => loadedNames.includes(n));

      return {
        success: true,
        activeActions: expectedToolNames,
        totalActions: actionCount,
        widgetToolsVerified: allLoaded,
        message: allLoaded
          ? `Integration activated! Widget now has ${expectedToolNames.length} new tool(s): ${expectedToolNames.join(', ')}`
          : `Integration activated but some tools failed to load. Check the config.`,
      };
    },
  },

  // ─── 5. deactivate_integration ─────────────────────────────────────────
  {
    name: 'deactivate_integration',
    description:
      'Deactivate an integration, removing its tools from the widget. The config is preserved and can be reactivated later.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'The configId to deactivate' },
      },
      required: ['configId'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();

      const configDoc = await IntegrationConfig.findById(args.configId as string);
      if (!configDoc) {
        return { success: false, error: `Integration config not found: ${args.configId}` };
      }
      if (configDoc.userId !== ctx.userId) {
        return { success: false, error: 'Integration config belongs to a different user' };
      }

      configDoc.status = 'inactive';
      await configDoc.save();

      // Rebuild prompt without this integration
      const { prompt, actionCount } = await buildUnifiedActionsPrompt(configDoc.clientId, ctx.userId);

      if (actionCount === 0) {
        await AISettings.findOneAndUpdate(
          { clientId: configDoc.clientId },
          { actionsEnabled: false, actionsSystemPrompt: '' }
        );
      } else {
        await AISettings.findOneAndUpdate({ clientId: configDoc.clientId }, { actionsSystemPrompt: prompt });
      }

      return {
        success: true,
        message: `Integration "${configDoc.displayName}" deactivated. ${actionCount} actions remain active.`,
      };
    },
  },

  // ─── 6. list_integrations ──────────────────────────────────────────────
  {
    name: 'list_integrations',
    description:
      'List all integrations for the current widget (both marketplace plugins and config-driven integrations).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    category: 'integration',
    async executor(args, ctx) {
      if (!ctx.clientId) {
        return { success: false, error: 'No widget built yet.' };
      }

      await connectDB();
      const integrations: Array<{
        provider: string;
        displayName: string;
        status: string;
        type: 'plugin' | 'config';
        actions: string[];
      }> = [];

      // Plugin-based
      const bindings = await WidgetIntegration.find({ widgetId: ctx.clientId, enabled: true }).lean();
      for (const binding of bindings) {
        const plugin = pluginRegistry.get(binding.integrationSlug);
        integrations.push({
          provider: binding.integrationSlug,
          displayName: plugin?.manifest.name || binding.integrationSlug,
          status: 'active',
          type: 'plugin',
          actions: (binding.enabledActions || []) as string[],
        });
      }

      // Config-driven
      const configs = await IntegrationConfig.find({ clientId: ctx.clientId }).lean();
      for (const config of configs) {
        integrations.push({
          provider: config.provider,
          displayName: config.displayName,
          status: config.status,
          type: 'config',
          actions: config.actions.map((a: { id: string }) => a.id),
        });
      }

      return {
        success: true,
        integrations,
        total: integrations.length,
      };
    },
  },

  // ─── 7. start_oauth_flow ──────────────────────────────────────────────
  {
    name: 'start_oauth_flow',
    description:
      'Start OAuth2 Authorization Code flow. Generates a secure authorization URL with PKCE that the user must visit to grant access. Only use for oauth2_auth_code integrations.',
    parameters: {
      type: 'object',
      properties: {
        configId: { type: 'string', description: 'ID of the IntegrationConfig (from create_integration)' },
        authorizationUrl: {
          type: 'string',
          description: 'Provider authorization endpoint (e.g., "https://accounts.google.com/o/oauth2/v2/auth")',
        },
        scopes: {
          type: 'string',
          description: 'JSON array of OAuth2 scopes (e.g., ["https://www.googleapis.com/auth/calendar"])',
        },
        extraParams: {
          type: 'string',
          description:
            'Optional JSON object of extra query params (e.g., {"access_type": "offline"} for Google refresh tokens)',
        },
      },
      required: ['configId', 'authorizationUrl', 'scopes'],
    },
    category: 'integration',
    async executor(args, ctx) {
      await connectDB();
      const crypto = await import('crypto');
      const { validateUrl } = await import('@/lib/integrations/engine');
      const { decrypt } = await import('@/lib/encryption');
      const OAuthState = (await import('@/models/OAuthState')).default;

      // Validate authorizationUrl
      const authUrl = args.authorizationUrl as string;
      const urlCheck = validateUrl(authUrl);
      if (!urlCheck.valid) {
        return { success: false, error: `Invalid authorization URL: ${urlCheck.error}` };
      }

      // Load integration config
      const config = await IntegrationConfig.findOne({
        _id: args.configId as string,
        userId: ctx.userId,
      });
      if (!config) {
        return { success: false, error: 'Integration config not found' };
      }
      if (config.auth.type !== 'oauth2_auth_code') {
        return { success: false, error: `Auth type is "${config.auth.type}", expected "oauth2_auth_code"` };
      }

      // Get client_id from encrypted credentials
      let decrypted: Record<string, unknown>;
      try {
        decrypted = JSON.parse(decrypt(config.auth.credentials));
      } catch {
        return { success: false, error: 'Failed to decrypt credentials' };
      }
      const clientId = decrypted.client_id as string;
      if (!clientId) {
        return { success: false, error: 'No client_id in credentials' };
      }

      // Parse scopes
      let scopes: string[];
      try {
        scopes = JSON.parse(args.scopes as string);
      } catch {
        return { success: false, error: 'Invalid JSON in scopes parameter' };
      }

      // Parse extraParams
      let extraParams: Record<string, string> = {};
      if (args.extraParams) {
        try {
          extraParams = JSON.parse(args.extraParams as string);
        } catch {
          return { success: false, error: 'Invalid JSON in extraParams parameter' };
        }
      }

      // Generate PKCE code_verifier (64 bytes → base64url) and code_challenge (SHA-256)
      const codeVerifier = crypto.randomBytes(64).toString('base64url');
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

      // Generate state (32 bytes → hex)
      const state = crypto.randomBytes(32).toString('hex');

      // Save OAuthState to MongoDB (TTL: 15 minutes)
      await OAuthState.create({
        state,
        configId: config._id.toString(),
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        codeVerifier,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Build authorization URL
      const redirectUri =
        process.env.NODE_ENV === 'production'
          ? 'https://winbixai.com/api/oauth/callback'
          : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/oauth/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...extraParams,
      });

      const fullAuthUrl = `${authUrl}?${params.toString()}`;

      return {
        success: true,
        authorizationUrl: fullAuthUrl,
        message: `Send this link to the user so they can authorize the integration. The link expires in 15 minutes.`,
        expiresIn: '15 minutes',
      };
    },
  },
];
