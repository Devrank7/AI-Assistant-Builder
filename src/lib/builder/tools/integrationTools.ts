// src/lib/builder/tools/integrationTools.ts
import type { ToolDefinition } from '../toolRegistry';
import { webSearch } from '../webSearch';
import { webFetch } from '../webFetch';
import { validateGeneratedCode, encryptApiKey } from '../security';
import fs from 'fs';
import path from 'path';

export const integrationTools: ToolDefinition[] = [
  {
    name: 'web_search',
    description:
      'Search the internet using Brave Search API. Use for finding API documentation, tutorials, best practices.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'string', description: 'Number of results (default 10, max 20)' },
      },
      required: ['query'],
    },
    category: 'integration',
    async executor(args) {
      const query = args.query as string;
      const count = parseInt((args.count as string) || '10', 10);
      const results = await webSearch(query, Math.min(count, 20));
      return { success: true, results, count: results.length };
    },
  },
  {
    name: 'web_fetch',
    description:
      'Fetch and parse any URL. Converts HTML to clean markdown (30K char limit). Use for reading API docs, web pages.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
    category: 'integration',
    async executor(args) {
      const url = args.url as string;
      const result = await webFetch(url);
      if (result.error) return { success: false, error: result.error };
      return { success: true, content: result.content };
    },
  },
  {
    name: 'search_api_docs',
    description:
      'Search for API documentation, fetch top result, extract structured reference. Combines web_search + web_fetch + extraction.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'API provider name (e.g., "Calendly", "Stripe")' },
        topic: { type: 'string', description: 'Specific topic to search (e.g., "create event endpoint")' },
      },
      required: ['provider'],
    },
    category: 'integration',
    async executor(args) {
      const provider = args.provider as string;
      const topic = (args.topic as string) || 'API documentation';
      const query = `${provider} ${topic} API reference 2026`;
      const results = await webSearch(query, 5);
      if (results.length === 0) return { success: false, error: `No results for: ${query}` };

      const topUrl = results[0].url;
      const fetched = await webFetch(topUrl);
      return {
        success: true,
        searchResults: results.slice(0, 3),
        fetchedUrl: topUrl,
        content: fetched.content || fetched.error,
      };
    },
  },
  {
    name: 'write_integration',
    description:
      'Write a server-side API route handler for an external integration. Validates generated code for security. Claude writes the code itself.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        provider: { type: 'string', description: 'Integration provider (e.g., "calendly")' },
        code: { type: 'string', description: 'The TypeScript code for the API route handler' },
      },
      required: ['clientId', 'provider', 'code'],
    },
    category: 'integration',
    async executor(args) {
      const clientId = args.clientId as string;
      const provider = (args.provider as string).toLowerCase().replace(/\s+/g, '-');
      const code = args.code as string;

      const validation = validateGeneratedCode(code);
      if (!validation.valid) {
        return { error: `Code rejected: ${validation.reason}. Please rewrite without using blocked APIs.` };
      }

      const handlerDir = path.join(process.cwd(), 'src/app/api/builder/integrations', clientId, provider);
      fs.mkdirSync(handlerDir, { recursive: true });
      fs.writeFileSync(path.join(handlerDir, 'route.ts'), code, 'utf-8');

      return {
        success: true,
        handlerPath: `/api/builder/integrations/${clientId}/${provider}`,
        message: `Integration handler written to ${handlerDir}/route.ts`,
      };
    },
  },
  {
    name: 'test_integration',
    description: 'Test an API key by making a simple validation call to the external API.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Integration provider' },
        apiKey: { type: 'string', description: 'API key to test' },
        testUrl: { type: 'string', description: 'API endpoint to test against' },
      },
      required: ['provider', 'apiKey', 'testUrl'],
    },
    category: 'integration',
    async executor(args) {
      const apiKey = args.apiKey as string;
      const testUrl = args.testUrl as string;

      try {
        const res = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, error: 'API key is invalid or expired. Please check and try again.' };
        }

        const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;
        if (encKey && encKey.length >= 64) {
          const encrypted = encryptApiKey(apiKey, encKey);
          return {
            success: true,
            status: res.status,
            encrypted: encrypted,
            message: 'API key validated successfully.',
          };
        }

        return { success: true, status: res.status, message: 'API key validated (encryption key not configured).' };
      } catch (err) {
        return { success: false, error: `Test failed: ${(err as Error).message}` };
      }
    },
  },
  {
    name: 'guide_user',
    description:
      'Generate step-by-step instructions for the user (how to get API key, configure settings, etc.). Returns formatted instruction card.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'What to guide the user on (e.g., "get Calendly API key")' },
        steps: { type: 'string', description: 'JSON array of step strings' },
      },
      required: ['topic', 'steps'],
    },
    category: 'integration',
    async executor(args, ctx) {
      const topic = args.topic as string;
      let steps: string[];
      try {
        steps = JSON.parse(args.steps as string);
      } catch {
        steps = [args.steps as string];
      }
      ctx.write({ type: 'crm_instruction', provider: topic, steps });
      return { success: true, message: `Instructions displayed for: ${topic}` };
    },
  },
];
