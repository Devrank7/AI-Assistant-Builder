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
    name: 'Gemini 3 Flash (Preview)',
    provider: 'google',
    pricing: { inputPer1M: 0.1, outputPer1M: 0.4 },
    maxOutputTokens: 8192,
    description: 'Новейшая экономичная модель (Preview).',
    isDefault: true,
    tier: 'standard',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    pricing: { inputPer1M: 0.1, outputPer1M: 0.4 },
    maxOutputTokens: 8192,
    description: 'Быстрая и стабильная модель v2.0.',
    isDefault: false,
    tier: 'standard',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    pricing: { inputPer1M: 0.05, outputPer1M: 0.2 },
    maxOutputTokens: 8192,
    description: 'Самая экономичная модель. Подходит для простых FAQ-ботов.',
    isDefault: false,
    tier: 'lite',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: 'google',
    pricing: { inputPer1M: 1.25, outputPer1M: 5.0 },
    maxOutputTokens: 16384,
    description: 'Продвинутая модель для сложных задач. Выше стоимость.',
    isDefault: false,
    tier: 'pro',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    pricing: { inputPer1M: 0.15, outputPer1M: 0.6 },
    maxOutputTokens: 8192,
    description: 'Предыдущее поколение Flash. Стабильная и проверенная.',
    isDefault: false,
    tier: 'standard',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    pricing: { inputPer1M: 1.25, outputPer1M: 10.0 },
    maxOutputTokens: 16384,
    description: 'Предыдущее поколение Pro. Максимальное качество ответов.',
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
