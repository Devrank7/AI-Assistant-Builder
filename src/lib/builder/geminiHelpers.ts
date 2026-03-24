// src/lib/builder/geminiHelpers.ts
// Shared Gemini API helper with automatic model fallback on quota exhaustion / 404
import { GoogleGenAI } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.1-pro-preview';
const FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-pro'];
const ALL_MODELS = [PRIMARY_MODEL, ...FALLBACK_MODELS];
const MAX_RETRIES = 3;

// Singleton AI client
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }
  return _ai;
}

interface GenerateOptions {
  contents: string | Array<{ role: string; parts: Array<{ text: string }> }>;
  config?: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
  /** Start from a specific model instead of PRIMARY_MODEL */
  preferredModel?: string;
}

/**
 * Call ai.models.generateContent with automatic retry + model fallback.
 * Tries PRIMARY_MODEL first, then cascades through FALLBACK_MODELS on
 * quota exhaustion (429/daily limit) or model-not-found (404).
 */
export async function generateWithFallback(options: GenerateOptions): Promise<GenerateContentResponse> {
  const ai = getAI();
  const { contents, config, preferredModel } = options;

  // Determine starting model index
  let modelIdx = 0;
  if (preferredModel) {
    const idx = ALL_MODELS.indexOf(preferredModel);
    if (idx >= 0) modelIdx = idx;
  }

  let lastErr: Error | null = null;

  while (modelIdx < ALL_MODELS.length) {
    const model = ALL_MODELS[modelIdx];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: contents as string,
          config: config as Record<string, unknown>,
        });
        return result;
      } catch (err) {
        lastErr = err as Error;
        const msg = lastErr.message || '';
        console.error(
          `[geminiHelpers] generateContent error (model=${model}, attempt ${attempt + 1}/${MAX_RETRIES}):`,
          msg.slice(0, 200)
        );

        // Quota exhaustion or model not found → skip to next model
        const isDailyQuota = /quota.*per.*day|per_day|PerDay|retry in \d+h/i.test(msg);
        const isModelNotFound = /not found|NOT_FOUND|404/i.test(msg);
        if (isDailyQuota || isModelNotFound) {
          console.warn(
            `[geminiHelpers] ${model} unavailable (${isDailyQuota ? 'quota' : '404'}), trying next model...`
          );
          break; // break retry loop → move to next model
        }

        // Transient errors (503, 429 rate limit) → retry with backoff
        const isTransient = /503|unavailable|overloaded|resource exhausted|too many requests|429/i.test(msg);
        if (isTransient && attempt < MAX_RETRIES - 1) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 8000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Non-transient error on last attempt → try next model
        if (attempt === MAX_RETRIES - 1) {
          break;
        }
      }
    }

    modelIdx++;
  }

  throw lastErr || new Error('All Gemini models failed');
}

export { getAI, PRIMARY_MODEL, FALLBACK_MODELS, ALL_MODELS };
