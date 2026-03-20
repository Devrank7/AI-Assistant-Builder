/**
 * Multi-Model Provider
 *
 * Supports Gemini, Claude, and OpenAI as AI providers.
 * Provides fallback logic: tries providers in order, catches errors, falls back to next.
 * Tracks cost per request.
 */

export type ModelProvider = 'gemini' | 'claude' | 'openai';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface GenerateResult {
  text: string;
  provider: ModelProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}

interface ProviderConfig {
  provider: ModelProvider;
  apiKey: string;
  defaultModel: string;
  costPerInputToken: number;
  costPerOutputToken: number;
}

/**
 * Get provider configs from environment variables.
 */
function getProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (process.env.GEMINI_API_KEY) {
    configs.push({
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: 'gemini-2.0-flash',
      costPerInputToken: 0.000000075,
      costPerOutputToken: 0.0000003,
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    configs.push({
      provider: 'claude',
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: 'claude-sonnet-4-20250514',
      costPerInputToken: 0.000003,
      costPerOutputToken: 0.000015,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    configs.push({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o-mini',
      costPerInputToken: 0.00000015,
      costPerOutputToken: 0.0000006,
    });
  }

  return configs;
}

/**
 * Calculate cost for a request.
 */
export function calculateProviderCost(provider: ModelProvider, inputTokens: number, outputTokens: number): number {
  const configs = getProviderConfigs();
  const config = configs.find((c) => c.provider === provider);
  if (!config) return 0;
  return inputTokens * config.costPerInputToken + outputTokens * config.costPerOutputToken;
}

/**
 * Generate with Google Gemini.
 */
export async function generateWithGemini(
  options: GenerateOptions,
  apiKey?: string,
  model?: string
): Promise<GenerateResult> {
  const { GoogleGenAI } = await import('@google/genai');
  const key = apiKey || process.env.GEMINI_API_KEY || '';
  const modelId = model || 'gemini-2.0-flash';
  const ai = new GoogleGenAI({ apiKey: key });

  const config: Record<string, unknown> = {
    maxOutputTokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
  };

  if (options.systemPrompt) {
    config.systemInstruction = options.systemPrompt;
  }

  if (options.functions && options.functions.length > 0) {
    config.tools = [
      {
        functionDeclarations: options.functions.map((f) => ({
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        })),
      },
    ];
  }

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  if (options.conversationHistory) {
    for (const msg of options.conversationHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }
  contents.push({ role: 'user', parts: [{ text: options.prompt }] });

  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config,
  });

  const text = response.text || '';
  const usage = response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? Math.ceil(options.prompt.length / 4);
  const outputTokens = usage?.candidatesTokenCount ?? Math.ceil(text.length / 4);

  const functionCalls = response.functionCalls?.map((fc) => ({
    name: fc.name || '',
    args: (fc.args || {}) as Record<string, unknown>,
  }));

  return {
    text,
    provider: 'gemini',
    model: modelId,
    inputTokens,
    outputTokens,
    costUsd: calculateProviderCost('gemini', inputTokens, outputTokens),
    functionCalls,
  };
}

/**
 * Generate with Anthropic Claude.
 */
export async function generateWithClaude(
  options: GenerateOptions,
  apiKey?: string,
  model?: string
): Promise<GenerateResult> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
  const modelId = model || 'claude-sonnet-4-20250514';

  const messages: Array<{ role: string; content: string }> = [];
  if (options.conversationHistory) {
    for (const msg of options.conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }
  messages.push({ role: 'user', content: options.prompt });

  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    messages,
  };

  if (options.systemPrompt) {
    body.system = options.systemPrompt;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('');

  const inputTokens = data.usage?.input_tokens ?? Math.ceil(options.prompt.length / 4);
  const outputTokens = data.usage?.output_tokens ?? Math.ceil(text.length / 4);

  return {
    text,
    provider: 'claude',
    model: modelId,
    inputTokens,
    outputTokens,
    costUsd: calculateProviderCost('claude', inputTokens, outputTokens),
  };
}

/**
 * Generate with OpenAI.
 */
export async function generateWithOpenAI(
  options: GenerateOptions,
  apiKey?: string,
  model?: string
): Promise<GenerateResult> {
  const key = apiKey || process.env.OPENAI_API_KEY || '';
  const modelId = model || 'gpt-4o-mini';

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  if (options.conversationHistory) {
    for (const msg of options.conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }
  messages.push({ role: 'user', content: options.prompt });

  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    messages,
  };

  if (options.functions && options.functions.length > 0) {
    body.tools = options.functions.map((f) => ({
      type: 'function',
      function: { name: f.name, description: f.description, parameters: f.parameters },
    }));
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: {
        content?: string;
        tool_calls?: Array<{
          function: { name: string; arguments: string };
        }>;
      };
    }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const choice = data.choices[0];
  const text = choice?.message?.content || '';
  const inputTokens = data.usage?.prompt_tokens ?? Math.ceil(options.prompt.length / 4);
  const outputTokens = data.usage?.completion_tokens ?? Math.ceil(text.length / 4);

  const functionCalls = choice?.message?.tool_calls?.map((tc) => ({
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
  }));

  return {
    text,
    provider: 'openai',
    model: modelId,
    inputTokens,
    outputTokens,
    costUsd: calculateProviderCost('openai', inputTokens, outputTokens),
    functionCalls,
  };
}

/**
 * Returns list of providers that have API keys configured.
 */
export function getAvailableProviders(): ModelProvider[] {
  return getProviderConfigs().map((c) => c.provider);
}

/**
 * Generate with fallback: tries providers in order, falls back on error.
 */
export async function generateWithFallback(
  options: GenerateOptions,
  preferredOrder?: ModelProvider[]
): Promise<GenerateResult> {
  const available = getProviderConfigs();
  if (available.length === 0) {
    throw new Error('No AI providers configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.');
  }

  const order = preferredOrder || available.map((c) => c.provider);
  const errors: string[] = [];

  for (const provider of order) {
    const config = available.find((c) => c.provider === provider);
    if (!config) continue;

    try {
      switch (provider) {
        case 'gemini':
          return await generateWithGemini(options, config.apiKey, config.defaultModel);
        case 'claude':
          return await generateWithClaude(options, config.apiKey, config.defaultModel);
        case 'openai':
          return await generateWithOpenAI(options, config.apiKey, config.defaultModel);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      console.error(`[MultiModelProvider] ${provider} failed:`, msg);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}
