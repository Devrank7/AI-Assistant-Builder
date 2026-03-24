import type { ToolDefinition } from '../toolRegistry';
import { webFetch } from '../webFetch';

export const universalApiTool: ToolDefinition = {
  name: 'connect_any_api',
  description:
    'Connect ANY external API to the widget by reading its documentation. Use this for APIs not in the built-in list (Google Calendar, HubSpot, etc). Requires: API docs URL, API key, and desired actions. Do NOT include API keys or tokens in your response text.',
  parameters: {
    type: 'object',
    properties: {
      apiDocsUrl: {
        type: 'string',
        description: 'URL of API documentation or base URL',
      },
      name: {
        type: 'string',
        description: 'Human-readable integration name (e.g., "Acme CRM")',
      },
      credentials: {
        type: 'string',
        description: 'JSON string with API keys/tokens. SENSITIVE — do not echo back.',
      },
      desiredActions: {
        type: 'string',
        description: 'What the user wants to do (e.g., "create contacts, check order status")',
      },
    },
    required: ['apiDocsUrl', 'name', 'credentials', 'desiredActions'],
  },
  category: 'integration',
  async executor(args, context) {
    const { apiDocsUrl, name, credentials, desiredActions } = args as {
      apiDocsUrl: string;
      name: string;
      credentials: string;
      desiredActions: string;
    };

    // 1. Fetch API documentation
    let docsContent: string;
    try {
      const result = await webFetch(apiDocsUrl);
      if (result.error || !result.content) {
        return {
          success: false,
          error: `Could not fetch API docs from ${apiDocsUrl}: ${result.error || 'empty response'}. Send me an example API request and I'll create the integration manually.`,
        };
      }
      docsContent = result.content.slice(0, 30000); // 30K char limit
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch API docs: ${(err as Error).message}. Send me an example API request and I'll create the integration manually.`,
      };
    }

    // 2. Use Gemini to generate integration config from docs
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const configPrompt = `From this API documentation, create an integration.config.json for these actions: ${desiredActions}.

Format (strict JSON, no comments):
{
  "provider": "lowercase-slug",
  "name": "${name}",
  "baseUrl": "https://...",
  "auth": { "type": "api_key", "fields": ["apiKey"] },
  "actions": [
    {
      "id": "actionId",
      "name": "Human-readable name",
      "description": "What this action does",
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/endpoint",
      "inputSchema": { "fieldName": "string" },
      "body": { "key": "{{params.fieldName}}" }
    }
  ],
  "healthCheck": { "method": "GET", "path": "/api/status" }
}

RULES:
- provider must be lowercase slug (e.g. "acme-crm")
- baseUrl must start with https://
- Each action needs: id, name, description, method, path
- inputSchema: { fieldName: "type" } where type is string|number|boolean
- For POST/PUT: include body template with {{params.fieldName}} placeholders
- For GET with query params: use path like /api/endpoint?param={{params.param}}

API DOCUMENTATION:
${docsContent}

Return ONLY the JSON. No explanation.`;

    let configJson: Record<string, unknown>;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: configPrompt,
      });
      const text = response.text?.trim() || '';
      // Strip markdown code fences if present
      const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      configJson = JSON.parse(jsonStr);
    } catch (err) {
      return {
        success: false,
        error: `Could not parse API docs into integration config: ${(err as Error).message}. Send me an example API request and I'll create the integration manually.`,
      };
    }

    // 3. Validate required fields
    if (!configJson.provider || !configJson.baseUrl || !Array.isArray(configJson.actions)) {
      return {
        success: false,
        error:
          "Generated config is missing required fields (provider, baseUrl, actions). Send me an example API request and I'll create the integration manually.",
      };
    }

    // 4. Call existing tools in sequence via their executors directly
    const { integrationTools: allIntTools } = await import('./integrationTools');
    const findTool = (n: string) => allIntTools.find((t) => t.name === n);

    // Step 4a: generate_integration
    const genTool = findTool('generate_integration');
    if (!genTool) return { success: false, error: 'generate_integration tool not found' };
    const genResult = await genTool.executor({ config: JSON.stringify(configJson) }, context);
    if (!genResult?.success) {
      return { success: false, error: `generate_integration failed: ${genResult?.error || 'unknown error'}` };
    }

    // Step 4b: connect_integration
    const slug = configJson.provider as string;
    const connectTool = findTool('connect_integration');
    if (!connectTool) return { success: false, error: 'connect_integration tool not found' };
    const connectResult = await connectTool.executor({ slug, credentials }, context);
    if (!connectResult?.success) {
      return { success: false, error: `connect_integration failed: ${connectResult?.error || 'unknown error'}` };
    }

    // Step 4c: attach_integration_to_widget + enable_ai_actions
    const attachTool = findTool('attach_integration_to_widget');
    const enableTool = findTool('enable_ai_actions');
    const actionIds = (configJson.actions as Array<{ id: string }>).map((a) => a.id);

    if (attachTool) {
      await attachTool.executor(
        {
          slug,
          widgetId: (genResult as Record<string, unknown>).clientId || '',
          actions: JSON.stringify(actionIds),
        },
        context
      );
    }

    if (enableTool) {
      await enableTool.executor(
        {
          clientId: (genResult as Record<string, unknown>).clientId || '',
        },
        context
      );
    }

    const actionNames = (configJson.actions as Array<{ name: string }>).map((a) => a.name);
    return {
      success: true,
      message: `Successfully connected ${name} API with ${actionNames.length} actions: ${actionNames.join(', ')}`,
      provider: slug,
      actions: actionNames,
    };
  },
};
