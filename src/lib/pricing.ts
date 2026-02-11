/**
 * Pricing & Subscription Tiers
 *
 * Defines subscription plans with prepayment options and discounts.
 * Supports dynamic pricing via getPricingConfig() from database.
 */

export type SubscriptionTier = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface TierConfig {
  id: SubscriptionTier;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  discount: number; // 0.15 = 15%
  label: string;
  labelRu: string;
}

/**
 * Base monthly price (default)
 */
export const BASE_MONTHLY_PRICE = 65;

/**
 * Annual discount percentage (default)
 */
export const ANNUAL_DISCOUNT = 0.15;

/**
 * Build subscription tiers dynamically from base price and discount
 */
export function buildSubscriptionTiers(
  basePrice: number = BASE_MONTHLY_PRICE,
  annualDiscount: number = ANNUAL_DISCOUNT
): Record<SubscriptionTier, TierConfig> {
  const annualPricePerMonth = Math.round(basePrice * (1 - annualDiscount) * 100) / 100;
  const annualTotal = Math.round(basePrice * 12 * (1 - annualDiscount) * 100) / 100;

  return {
    monthly: {
      id: 'monthly',
      months: 1,
      pricePerMonth: basePrice,
      totalPrice: basePrice,
      discount: 0,
      label: '1 Month',
      labelRu: '1 месяц',
    },
    quarterly: {
      id: 'quarterly',
      months: 3,
      pricePerMonth: basePrice,
      totalPrice: basePrice * 3,
      discount: 0,
      label: '3 Months',
      labelRu: '3 месяца',
    },
    semi_annual: {
      id: 'semi_annual',
      months: 6,
      pricePerMonth: basePrice,
      totalPrice: basePrice * 6,
      discount: 0,
      label: '6 Months',
      labelRu: '6 месяцев',
    },
    annual: {
      id: 'annual',
      months: 12,
      pricePerMonth: annualPricePerMonth,
      totalPrice: annualTotal,
      discount: annualDiscount,
      label: '12 Months',
      labelRu: '12 месяцев',
    },
  };
}

/**
 * Default subscription tiers (static, for backwards compat)
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = buildSubscriptionTiers();

/**
 * Get tier configuration by months
 */
export function getTierByMonths(months: number): TierConfig | null {
  const tier = Object.values(SUBSCRIPTION_TIERS).find((t) => t.months === months);
  return tier || null;
}

/**
 * Get tier configuration by ID
 */
export function getTierById(tierId: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tierId];
}

/**
 * Calculate prepayment price for given months
 */
export function calculatePrepaymentPrice(
  months: number,
  basePrice: number = BASE_MONTHLY_PRICE,
  discount: number = ANNUAL_DISCOUNT
): {
  total: number;
  perMonth: number;
  savings: number;
  discount: number;
} {
  if (months >= 12) {
    const regularPrice = basePrice * 12;
    const discountedPrice = regularPrice * (1 - discount);
    return {
      total: Math.round(discountedPrice * 100) / 100,
      perMonth: Math.round((discountedPrice / 12) * 100) / 100,
      savings: Math.round((regularPrice - discountedPrice) * 100) / 100,
      discount,
    };
  }

  const total = basePrice * months;
  return {
    total,
    perMonth: basePrice,
    savings: 0,
    discount: 0,
  };
}

/**
 * Get subscription tier ID based on months
 */
export function getSubscriptionTier(months: number): SubscriptionTier {
  if (months >= 12) return 'annual';
  if (months >= 6) return 'semi_annual';
  if (months >= 3) return 'quarterly';
  return 'monthly';
}

/**
 * Get all available tiers as array (for API response) — static defaults
 */
export function getAllTiers(): TierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * Get dynamic tiers from DB config
 */
export async function getDynamicTiers(): Promise<TierConfig[]> {
  const { getPricingConfig } = await import('@/lib/pricingConfig');
  const config = await getPricingConfig();
  return Object.values(buildSubscriptionTiers(config.baseMonthlyPrice, config.annualDiscount));
}

/**
 * Calculate prepayment price using DB config
 */
export async function getDynamicPrepaymentPrice(months: number) {
  const { getPricingConfig } = await import('@/lib/pricingConfig');
  const config = await getPricingConfig();
  return calculatePrepaymentPrice(months, config.baseMonthlyPrice, config.annualDiscount);
}

/**
 * Valid prepayment months options
 */
export const VALID_PREPAYMENT_MONTHS = [1, 3, 6, 12];

/**
 * Validate prepayment months
 */
export function isValidPrepaymentMonths(months: number): boolean {
  return VALID_PREPAYMENT_MONTHS.includes(months);
}

/**
 * Calculate next payment date from now
 */
export function calculateNextPaymentDate(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}
