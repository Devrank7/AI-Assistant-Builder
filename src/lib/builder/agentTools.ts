// src/lib/builder/agentTools.ts
import type { SSEEvent, AgentToolName, PanelMode, SiteProfile } from './types';
import { analyzeSite } from './siteAnalyzer';
import { uploadKnowledge, setAIPrompt } from './knowledgeCrawler';
import { getCRMSetup } from './crmSetup';
import { readWidgetCode, validateFilePath, writeWidgetFile, saveVersion, rollbackToVersion } from './widgetCodeManager';
import { CODEGEN_SYSTEM_PROMPT, buildCodegenUserPrompt } from './codegenPrompt';
import path from 'path';
import fs from 'fs';

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[]; items?: { type: string } }>;
    required: string[];
  };
}

export const GEMINI_TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    name: 'analyze_site',
    description: 'Crawl a website URL, extract colors, fonts, business name, type, and page content',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL to analyze' },
      },
      required: ['url'],
    },
  },
  {
    name: 'generate_themes',
    description: 'Generate 3 theme.json variants based on site profile and user preferences',
    parameters: {
      type: 'object',
      properties: {
        siteProfile: { type: 'string', description: 'JSON stringified SiteProfile object' },
        preferences: { type: 'string', description: 'JSON stringified user preferences' },
      },
      required: ['siteProfile'],
    },
  },
  {
    name: 'select_theme',
    description: 'Apply the selected theme variant (0, 1, or 2)',
    parameters: {
      type: 'object',
      properties: {
        variantIndex: { type: 'string', description: 'Index of the selected variant (0, 1, or 2)' },
      },
      required: ['variantIndex'],
    },
  },
  {
    name: 'build_widget',
    description: 'Run the build pipeline: generate source files, build, and deploy the widget',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID for the widget' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'crawl_knowledge',
    description: 'Upload website content to the knowledge base for the widget AI',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL (site must have been analyzed first)' },
        clientId: { type: 'string', description: 'The client ID to upload knowledge for' },
      },
      required: ['url', 'clientId'],
    },
  },
  {
    name: 'connect_crm',
    description: 'Validate a CRM API key and activate the integration',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'CRM provider name (e.g., hubspot)' },
        apiKey: { type: 'string', description: 'The API key or access token' },
      },
      required: ['provider', 'apiKey'],
    },
  },
  {
    name: 'set_panel_mode',
    description: 'Switch the right panel context to show a different view',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Panel mode to switch to',
          enum: ['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status'],
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'read_widget_code',
    description:
      'Read the current widget source code files for a client. Call this before modifying code to understand the current structure.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to read (e.g. ["components/Widget.jsx"]). If omitted, reads all source files.',
        },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'modify_widget_code',
    description:
      'Modify widget source code based on instructions. Reads the current file, generates updated code via AI, rebuilds and deploys the widget automatically. Use for UI changes, adding features, changing layout, etc.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        file: { type: 'string', description: 'File to modify, e.g. "components/Widget.jsx". Cannot modify hooks/.' },
        instruction: { type: 'string', description: 'What to change, in natural language' },
      },
      required: ['clientId', 'file', 'instruction'],
    },
  },
  {
    name: 'rollback_widget',
    description:
      'Revert widget to a previous version. Use when user says "undo", "revert", or "go back to previous version".',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        version: { type: 'string', description: 'Version number (e.g. "2") or "previous" for the last version' },
      },
      required: ['clientId', 'version'],
    },
  },
  {
    name: 'add_integration',
    description:
      'Connect the widget to an external API (e.g., Google Calendar, Stripe, custom CRM). Fetches API documentation, generates server-side handler and client-side UI code. Requires Pro plan.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        provider: { type: 'string', description: 'Integration name (e.g., "Google Calendar", "Stripe")' },
        apiDocUrl: { type: 'string', description: 'URL to the API documentation' },
        apiKey: { type: 'string', description: 'API key or token for the service' },
        description: { type: 'string', description: 'What the integration should do' },
      },
      required: ['clientId', 'provider', 'description'],
    },
  },
];

export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
  userPlan?: string;
}

type ToolExecutor = (args: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>;

const executors: Record<AgentToolName, ToolExecutor> = {
  async analyze_site(args, ctx) {
    const url = args.url as string;
    const profile = await analyzeSite(url);
    ctx.write({ type: 'panel_mode', mode: 'live_preview' });
    ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
    return { success: true, profile };
  },

  async generate_themes(args, ctx) {
    ctx.write({ type: 'panel_mode', mode: 'ab_compare' });
    ctx.write({ type: 'progress', stage: 'design', status: 'active' });
    return { success: true, message: 'Generate 3 theme variants in your response as JSON' };
  },

  async select_theme(args, ctx) {
    const variantIndex = parseInt(args.variantIndex as string, 10);
    ctx.write({ type: 'panel_mode', mode: 'live_preview' });
    ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
    return { success: true, selectedVariant: variantIndex };
  },

  async build_widget(args, ctx) {
    const clientId = args.clientId as string;
    ctx.write({ type: 'progress', stage: 'deploy', status: 'active' });

    const res = await fetch(`${ctx.baseUrl}/api/builder/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: ctx.cookie,
      },
      body: JSON.stringify({ sessionId: ctx.sessionId }),
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Build failed' };
    }

    ctx.write({ type: 'progress', stage: 'deploy', status: 'complete' });
    ctx.write({ type: 'panel_mode', mode: 'test_sandbox' });
    return { success: true, clientId, previewUrl: data.data?.previewUrl };
  },

  async crawl_knowledge(args, ctx) {
    const clientId = args.clientId as string;
    ctx.write({ type: 'progress', stage: 'knowledge', status: 'active' });

    const BuilderSession = (await import('@/models/BuilderSession')).default;
    const session = await BuilderSession.findById(ctx.sessionId);
    const siteProfile = session?.siteProfile as SiteProfile | null;

    if (!siteProfile?.pages?.length) {
      return { success: false, error: 'No site profile found. Run analyze_site first.' };
    }

    const result = await uploadKnowledge(siteProfile.pages, clientId, ctx.baseUrl, ctx.cookie, (uploaded, total) => {
      ctx.write({ type: 'knowledge_progress', uploaded, total });
    });

    await setAIPrompt(clientId, siteProfile.businessType, siteProfile.businessName, ctx.baseUrl, ctx.cookie);

    ctx.write({ type: 'progress', stage: 'knowledge', status: 'complete' });
    return { success: true, ...result };
  },

  async connect_crm(args, ctx) {
    const provider = args.provider as string;
    const apiKey = args.apiKey as string;

    const setup = getCRMSetup(provider);
    if (!setup) {
      return { success: false, error: `Unsupported CRM provider: ${provider}` };
    }

    const validation = await setup.validateKey(apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid API key' };
    }

    try {
      const testContact = await setup.createTestContact(apiKey);
      ctx.write({ type: 'panel_mode', mode: 'crm_status' });
      return { success: true, provider, testContactId: testContact.id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  async set_panel_mode(args, ctx) {
    const mode = args.mode as PanelMode;
    ctx.write({ type: 'panel_mode', mode });
    return { success: true, mode };
  },

  async read_widget_code(args, ctx) {
    const clientId = args.clientId as string;
    const files = args.files as string[] | undefined;
    ctx.write({ type: 'progress', message: 'Reading widget source code...' });

    const bundle = readWidgetCode(clientId, files);
    const fileCount = Object.keys(bundle).length;

    if (fileCount === 0) {
      return { error: `No widget source found for client "${clientId}".` };
    }

    ctx.write({ type: 'progress', message: `Read ${fileCount} source files.` });
    return { files: bundle };
  },

  async modify_widget_code(args, ctx) {
    const clientId = args.clientId as string;
    const file = args.file as string;
    const instruction = args.instruction as string;

    // 1. Validate file path
    const validation = validateFilePath(file);
    if (!validation.valid) {
      return { error: validation.error };
    }

    ctx.write({ type: 'progress', message: `Reading current ${file}...` });

    // 2. Read current code from disk
    const bundle = readWidgetCode(clientId, [file]);
    const currentCode = bundle[file];
    if (!currentCode) {
      return { error: `File "${file}" not found for client "${clientId}".` };
    }

    // 3. Read theme.json for context
    const fullBundle = readWidgetCode(clientId);
    const themeJson = fullBundle['theme.json'];
    const widgetConfig = fullBundle['widget.config.json'];

    // 4. Generate new code via Gemini 3.1 Pro
    ctx.write({ type: 'progress', message: 'Generating modified code...' });

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

    const userPrompt = buildCodegenUserPrompt({
      currentCode,
      instruction,
      themeJson,
      widgetConfig,
    });

    let generatedCode: string;
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: CODEGEN_SYSTEM_PROMPT,
      });
      generatedCode = result.response.text().trim();
    } catch (err) {
      return { error: `Code generation failed: ${(err as Error).message}` };
    }

    // Strip markdown fences if present
    generatedCode = generatedCode
      .replace(/^```(?:jsx|javascript|js)?\n/m, '')
      .replace(/\n```$/m, '')
      .trim();

    // 5. Write file
    ctx.write({ type: 'progress', message: 'Writing modified code...' });
    writeWidgetFile(clientId, file, generatedCode);

    // 6. Build
    ctx.write({ type: 'progress', message: 'Building widget...' });
    const { execSync } = await import('child_process');
    const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

    let buildSuccess = false;
    let buildError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        execSync(`node "${buildScript}" "${clientId}"`, {
          cwd: process.cwd(),
          timeout: 60000,
          stdio: 'pipe',
        });
        buildSuccess = true;
        break;
      } catch (err) {
        buildError = (err as Error).message || 'Build failed';
        if (attempt === 0) {
          // Retry: feed error back to Gemini for fix
          ctx.write({ type: 'progress', message: 'Build failed, retrying with fix...' });
          try {
            const retryPrompt = buildCodegenUserPrompt({
              currentCode: generatedCode,
              instruction: `The previous code had a build error. Fix it:\n${buildError}\n\nOriginal instruction was: ${instruction}`,
              themeJson,
              widgetConfig,
            });
            const retryResult = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
              systemInstruction: CODEGEN_SYSTEM_PROMPT,
            });
            generatedCode = retryResult.response
              .text()
              .trim()
              .replace(/^```(?:jsx|javascript|js)?\n/m, '')
              .replace(/\n```$/m, '')
              .trim();
            writeWidgetFile(clientId, file, generatedCode);
          } catch {
            // If retry generation fails, break
            break;
          }
        }
      }
    }

    if (!buildSuccess) {
      return { error: `Build failed after retry: ${buildError}` };
    }

    // 7. Deploy: copy dist/script.js to quickwidgets/
    const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
    const deployDir = path.join(process.cwd(), 'quickwidgets', clientId);
    const deployScript = path.join(deployDir, 'script.js');

    if (fs.existsSync(distScript) && fs.existsSync(deployDir)) {
      // Save version before overwriting
      saveVersion(clientId, instruction.slice(0, 100), 'modify_widget_code');
      fs.copyFileSync(distScript, deployScript);
    }

    // 8. Notify frontend
    ctx.write({ type: 'widget_ready', clientId });

    return {
      success: true,
      message: `Widget code modified and deployed. File: ${file}`,
    };
  },

  async rollback_widget(args, ctx) {
    const clientId = args.clientId as string;
    const versionArg = args.version as string;

    const version = versionArg === 'previous' ? 'previous' : parseInt(versionArg, 10);
    if (typeof version === 'number' && isNaN(version)) {
      return { error: `Invalid version: "${versionArg}". Use a number or "previous".` };
    }

    ctx.write({ type: 'progress', message: 'Rolling back widget...' });

    const result = rollbackToVersion(clientId, version);
    if (!result.success) {
      return { error: result.error };
    }

    ctx.write({ type: 'widget_ready', clientId });

    return {
      success: true,
      message: `Widget rolled back to version ${result.version}.`,
    };
  },

  async add_integration(args, ctx) {
    const clientId = args.clientId as string;
    const provider = args.provider as string;
    const apiDocUrl = args.apiDocUrl as string | undefined;
    const apiKey = args.apiKey as string | undefined;
    const description = args.description as string;

    // 1. Tariff check (uses ctx.userPlan — set in chat/route.ts, no extra DB lookup)
    if (ctx.userPlan !== 'pro') {
      return {
        error: 'Custom integrations require the Pro plan. Please upgrade at Settings → Billing to unlock this feature.',
      };
    }

    ctx.write({ type: 'progress', message: `Setting up ${provider} integration...` });

    // 2. Fetch API docs if URL provided
    let apiDocs = '';
    if (apiDocUrl) {
      ctx.write({ type: 'progress', message: 'Fetching API documentation...' });
      try {
        const resp = await fetch(apiDocUrl);
        apiDocs = await resp.text();
        // Truncate to 10K chars to fit context
        if (apiDocs.length > 10000) {
          apiDocs = apiDocs.slice(0, 10000) + '\n... (truncated)';
        }
      } catch {
        apiDocs = `Could not fetch docs from ${apiDocUrl}`;
      }
    }

    // 3. Generate server-side handler
    ctx.write({ type: 'progress', message: 'Generating integration handler...' });

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

    const providerSlug = provider.toLowerCase().replace(/\s+/g, '-');

    const handlerPrompt = `Generate a Next.js API route handler (TypeScript) for integrating with ${provider}.

PURPOSE: ${description}

${apiDocs ? `API DOCUMENTATION:\n${apiDocs}\n` : ''}

The handler should:
- Export async POST and GET functions
- Read the encrypted API key from MongoDB using this pattern:
  import Client from '@/models/Client';
  import crypto from 'crypto';
  const client = await Client.findOne({ clientId: '${clientId}' });
  const keyEntry = client?.integrationKeys?.find(k => k.provider === '${providerSlug}');
  // Decrypt: const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY!.slice(0,32).padEnd(32,'0')), Buffer.from(keyEntry.iv, 'hex'));
  // decipher.setAuthTag(Buffer.from(authTag, 'hex')); // authTag is after ':' in encryptedKey
- Handle errors gracefully with try/catch
- Return JSON responses
- Include CORS headers for widget access
- Be a complete, working file

Return ONLY the TypeScript code. No explanations.`;

    let handlerCode: string;
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: handlerPrompt }] }],
      });
      handlerCode = result.response
        .text()
        .trim()
        .replace(/^```(?:typescript|ts)?\n/m, '')
        .replace(/\n```$/m, '')
        .trim();
    } catch (err) {
      return { error: `Failed to generate integration handler: ${(err as Error).message}` };
    }

    // 4. Write handler file
    const handlerDir = path.join(process.cwd(), 'src/app/api/integrations', clientId, providerSlug);
    fs.mkdirSync(handlerDir, { recursive: true });
    fs.writeFileSync(path.join(handlerDir, 'route.ts'), handlerCode, 'utf-8');

    // 5. Store encrypted API key if provided
    if (apiKey) {
      const crypto = await import('crypto');
      const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key-change-me-32chars!!';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0')), iv);
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      const ClientModel = (await import('@/models/Client')).default;
      await ClientModel.findOneAndUpdate(
        { clientId },
        {
          $push: {
            integrationKeys: {
              provider: providerSlug,
              encryptedKey: encrypted + ':' + authTag,
              iv: iv.toString('hex'),
            },
          },
        }
      );
    }

    // 6. Modify widget to include integration UI
    ctx.write({ type: 'progress', message: 'Adding integration UI to widget...' });

    const bundle = readWidgetCode(clientId, ['components/Widget.jsx']);
    const widgetCode = bundle['components/Widget.jsx'];
    if (widgetCode) {
      const integrationInstruction = `Add a UI section for ${provider} integration. ${description}. The integration endpoint is at /api/integrations/${clientId}/${providerSlug}. Add a button or form as appropriate, and use fetch() to call the endpoint.`;

      const userPrompt = buildCodegenUserPrompt({
        currentCode: widgetCode,
        instruction: integrationInstruction,
        themeJson: bundle['theme.json'],
        widgetConfig: bundle['widget.config.json'],
      });

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: CODEGEN_SYSTEM_PROMPT,
        });
        const newWidgetCode = result.response
          .text()
          .trim()
          .replace(/^```(?:jsx|javascript|js)?\n/m, '')
          .replace(/\n```$/m, '')
          .trim();

        writeWidgetFile(clientId, 'components/Widget.jsx', newWidgetCode);

        // Rebuild with retry (same pattern as modify_widget_code)
        const { execSync } = await import('child_process');
        const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');
        let buildSuccess = false;
        let buildError = '';
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            execSync(`node "${buildScript}" "${clientId}"`, {
              cwd: process.cwd(),
              timeout: 60000,
              stdio: 'pipe',
            });
            buildSuccess = true;
            break;
          } catch (err) {
            buildError = (err as Error).message || 'Build failed';
            if (attempt === 0) {
              ctx.write({ type: 'progress', message: 'Build failed, retrying with fix...' });
              try {
                const retryPrompt = buildCodegenUserPrompt({
                  currentCode: newWidgetCode,
                  instruction: `The previous code had a build error. Fix it:\n${buildError}\n\nOriginal instruction: ${integrationInstruction}`,
                  themeJson: bundle['theme.json'],
                  widgetConfig: bundle['widget.config.json'],
                });
                const retryResult = await model.generateContent({
                  contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
                  systemInstruction: CODEGEN_SYSTEM_PROMPT,
                });
                const fixedCode = retryResult.response
                  .text()
                  .trim()
                  .replace(/^```(?:jsx|javascript|js)?\n/m, '')
                  .replace(/\n```$/m, '')
                  .trim();
                writeWidgetFile(clientId, 'components/Widget.jsx', fixedCode);
              } catch {
                break;
              }
            }
          }
        }

        if (!buildSuccess) {
          return {
            error: `Integration handler created but widget build failed after retry: ${buildError}. Server handler is at /api/integrations/${clientId}/${providerSlug}.`,
          };
        }

        // Deploy
        const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
        const deployDir = path.join(process.cwd(), 'quickwidgets', clientId);
        if (fs.existsSync(distScript) && fs.existsSync(deployDir)) {
          saveVersion(clientId, `Added ${provider} integration`, 'add_integration');
          fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));
        }

        ctx.write({ type: 'widget_ready', clientId });
      } catch (err) {
        return {
          error: `Integration handler created but widget UI update failed: ${(err as Error).message}. The server-side handler is ready at /api/integrations/${clientId}/${providerSlug}.`,
        };
      }
    }

    // 7. Update session
    const BuilderSession = (await import('@/models/BuilderSession')).default;
    await BuilderSession.findByIdAndUpdate(ctx.sessionId, {
      $push: {
        connectedIntegrations: { provider: providerSlug, status: 'connected' },
      },
    });

    return {
      success: true,
      message: `${provider} integration added. Server handler: /api/integrations/${clientId}/${providerSlug}. Widget UI updated.`,
    };
  },
};

export function getToolExecutor(name: AgentToolName): ToolExecutor | undefined {
  return executors[name];
}
