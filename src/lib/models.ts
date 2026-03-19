/**
 * Gemini Model Registry
 *
 * Contains all available Gemini models with pricing info.
 * Prices are per 1M tokens in USD.
 */

export interface ModelPricing {
  inputPer1M: number; // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'google';
  pricing: ModelPricing;
  maxOutputTokens: number;
  description: string;
  isDefault: boolean;
  tier: 'lite' | 'standard' | 'pro';
}

export const GEMINI_MODELS: AIModel[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    pricing: { inputPer1M: 0.5, outputPer1M: 3.0 },
    maxOutputTokens: 65536,
    description: 'Быстрая и экономичная модель нового поколения.',
    isDefault: true,
    tier: 'standard',
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'google',
    pricing: { inputPer1M: 0.25, outputPer1M: 1.5 },
    maxOutputTokens: 65536,
    description: 'Сверхбыстрая бюджетная модель для фоновых задач.',
    isDefault: false,
    tier: 'lite',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    pricing: { inputPer1M: 2.0, outputPer1M: 12.0 },
    maxOutputTokens: 65536,
    description: 'Новейшая Pro модель. Максимальное качество ответов.',
    isDefault: false,
    tier: 'pro',
  },
];

/**
 * Get model by ID, fallback to default
 */
export function getModel(modelId: string): AIModel {
  return GEMINI_MODELS.find((m) => m.id === modelId) || GEMINI_MODELS.find((m) => m.isDefault)!;
}

/**
 * Get default model
 */
export function getDefaultModel(): AIModel {
  return GEMINI_MODELS.find((m) => m.isDefault)!;
}

/**
 * Calculate cost in USD for given token counts
 */
export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModel(modelId);
  const inputCost = (inputTokens / 1_000_000) * model.pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal precision
}

/**
 * Get all model IDs (for validation)
 */
export function getModelIds(): string[] {
  return GEMINI_MODELS.map((m) => m.id);
}
