/**
 * Pricing Config Service
 *
 * Singleton MongoDB document with in-memory cache.
 * All server-side code reads pricing via getPricingConfig().
 */

import connectDB from '@/lib/mongodb';
import PricingConfig from '@/models/PricingConfig';

// === Default values ===
export const DEFAULT_BASE_MONTHLY_PRICE = 65;
export const DEFAULT_ANNUAL_DISCOUNT = 0.15;
export const DEFAULT_COST_WARNING_THRESHOLD = 20;
export const DEFAULT_COST_BLOCK_THRESHOLD = 40;

// === Cache ===
export interface PricingConfigData {
  baseMonthlyPrice: number;
  annualDiscount: number;
  costWarningThreshold: number;
  costBlockThreshold: number;
}

let cachedConfig: PricingConfigData | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getDefaults(): PricingConfigData {
  return {
    baseMonthlyPrice: DEFAULT_BASE_MONTHLY_PRICE,
    annualDiscount: DEFAULT_ANNUAL_DISCOUNT,
    costWarningThreshold: DEFAULT_COST_WARNING_THRESHOLD,
    costBlockThreshold: DEFAULT_COST_BLOCK_THRESHOLD,
  };
}

/**
 * Get pricing config (cached, DB-backed).
 * Hot path safe: returns from cache within TTL, falls back to defaults on error.
 */
export async function getPricingConfig(): Promise<PricingConfigData> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    await connectDB();
    const doc = await PricingConfig.findOne({ key: 'global' }).lean();

    if (doc) {
      cachedConfig = {
        baseMonthlyPrice: doc.baseMonthlyPrice,
        annualDiscount: doc.annualDiscount,
        costWarningThreshold: doc.costWarningThreshold,
        costBlockThreshold: doc.costBlockThreshold,
      };
    } else {
      cachedConfig = getDefaults();
    }

    cacheExpiry = now + CACHE_TTL_MS;
    return cachedConfig;
  } catch (error) {
    console.error('[PricingConfig] Error loading config:', error);
    return cachedConfig || getDefaults();
  }
}

/**
 * Update pricing config (admin only). Invalidates cache.
 */
export async function updatePricingConfig(updates: Partial<PricingConfigData>): Promise<PricingConfigData> {
  await connectDB();

  const doc = await PricingConfig.findOneAndUpdate({ key: 'global' }, { $set: updates }, { upsert: true, new: true });

  cachedConfig = {
    baseMonthlyPrice: doc.baseMonthlyPrice,
    annualDiscount: doc.annualDiscount,
    costWarningThreshold: doc.costWarningThreshold,
    costBlockThreshold: doc.costBlockThreshold,
  };
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  return cachedConfig;
}
