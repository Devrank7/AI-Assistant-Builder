// src/lib/builder/agentTools.ts
import type { SSEEvent, AgentToolName, PanelMode, SiteProfile } from './types';
import { analyzeSite } from './siteAnalyzer';
import { uploadKnowledge, setAIPrompt } from './knowledgeCrawler';
import { getCRMSetup } from './crmSetup';

export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
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
];

export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
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
};

export function getToolExecutor(name: AgentToolName): ToolExecutor | undefined {
  return executors[name];
}
