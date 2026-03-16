// src/lib/builder/tools/proactiveTools.ts
import type { ToolDefinition } from '../toolRegistry';
import type { Suggestion } from '../types';

export const proactiveTools: ToolDefinition[] = [
  {
    name: 'analyze_opportunities',
    description:
      'Analyze the current site profile and widget to find improvement areas. Call after initial deployment.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', message: 'Analyzing opportunities...' });

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const siteProfile = session?.siteProfile;
      const knowledgeUploaded = session?.knowledgeUploaded;

      const opportunities: string[] = [];
      if (siteProfile) {
        const pages = ((siteProfile as Record<string, unknown>).pages as Array<Record<string, unknown>>) || [];
        if (pages.length < 5)
          opportunities.push(
            'knowledge_gap: Only ' + pages.length + ' pages crawled. More pages mean better AI answers.'
          );
        const features = ((siteProfile as Record<string, unknown>).detectedFeatures as string[]) || [];
        if (features?.includes('booking_page'))
          opportunities.push('integration: Detected booking page — consider adding calendar integration.');
        if (features?.includes('pricing_page'))
          opportunities.push('feature: Detected pricing page — add FAQ about pricing to knowledge base.');
      }
      if (!knowledgeUploaded)
        opportunities.push('knowledge_gap: Knowledge base is empty. Upload website content for better AI responses.');

      return { success: true, opportunities, count: opportunities.length };
    },
  },
  {
    name: 'suggest_improvements',
    description: 'Format improvement suggestions as interactive cards. Shows suggestions in the chat UI.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: { type: 'string', description: 'JSON array of Suggestion objects' },
      },
      required: ['suggestions'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      let suggestions: Suggestion[];
      try {
        suggestions = JSON.parse(args.suggestions as string);
      } catch {
        return { error: 'Invalid suggestions JSON' };
      }

      ctx.write({ type: 'suggestions', suggestions });
      ctx.write({ type: 'progress', stage: 'suggestions', status: 'complete' });
      return { success: true, count: suggestions.length };
    },
  },
  {
    name: 'check_knowledge_gaps',
    description:
      'Compare crawled pages vs uploaded knowledge to find gaps. Identifies pages not yet in knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;

      const res = await fetch(`${ctx.baseUrl}/api/knowledge?clientId=${clientId}`, {
        headers: { Cookie: ctx.cookie },
      });
      const data = await res.json();
      const uploadedCount = data.data?.length || 0;

      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const pages = ((session?.siteProfile as Record<string, unknown>)?.pages as Array<unknown>) || [];

      return {
        success: true,
        totalPages: pages.length,
        knowledgeChunks: uploadedCount,
        hasGaps: pages.length > 0 && uploadedCount < pages.length * 2,
      };
    },
  },
  {
    name: 'analyze_competitors',
    description: '[DEFERRED TO v2] Find competitor websites and compare their chat solutions. Not yet implemented.',
    parameters: {
      type: 'object',
      properties: {
        businessType: { type: 'string', description: 'Business type to search competitors for' },
      },
      required: ['businessType'],
    },
    category: 'proactive',
    async executor() {
      return {
        success: false,
        error: 'analyze_competitors is deferred to v2. It will be available in a future update.',
      };
    },
  },
];
