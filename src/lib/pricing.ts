/**
 * Pricing & Subscription Tiers
 *
 * Defines subscription plans with prepayment options and discounts.
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
 * Subscription tier configurations
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  monthly: {
    id: 'monthly',
    months: 1,
    pricePerMonth: 50,
    totalPrice: 50,
    discount: 0,
    label: '1 Month',
    labelRu: '1 месяц',
  },
  quarterly: {
    id: 'quarterly',
    months: 3,
    pricePerMonth: 50,
    totalPrice: 150,
    discount: 0,
    label: '3 Months',
    labelRu: '3 месяца',
  },
  semi_annual: {
    id: 'semi_annual',
    months: 6,
    pricePerMonth: 50,
    totalPrice: 300,
    discount: 0,
    label: '6 Months',
    labelRu: '6 месяцев',
  },
  annual: {
    id: 'annual',
    months: 12,
    pricePerMonth: 42.5,
    totalPrice: 510,
    discount: 0.15,
    label: '12 Months',
    labelRu: '12 месяцев',
  },
};

/**
 * Base monthly price
 */
export const BASE_MONTHLY_PRICE = 50;

/**
 * Annual discount percentage
 */
export const ANNUAL_DISCOUNT = 0.15;

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
export function calculatePrepaymentPrice(months: number): {
  total: number;
  perMonth: number;
  savings: number;
  discount: number;
} {
  // Annual subscription has 15% discount
  if (months >= 12) {
    const regularPrice = BASE_MONTHLY_PRICE * 12;
    const discountedPrice = regularPrice * (1 - ANNUAL_DISCOUNT);
    return {
      total: Math.round(discountedPrice * 100) / 100, // $510
      perMonth: Math.round((discountedPrice / 12) * 100) / 100, // $42.50
      savings: Math.round((regularPrice - discountedPrice) * 100) / 100, // $90
      discount: ANNUAL_DISCOUNT,
    };
  }

  // No discount for shorter periods
  const total = BASE_MONTHLY_PRICE * months;
  return {
    total,
    perMonth: BASE_MONTHLY_PRICE,
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
 * Get all available tiers as array (for API response)
 */
export function getAllTiers(): TierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
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
