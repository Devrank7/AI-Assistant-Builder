import Stripe from 'stripe';
import type { Plan, BillingPeriod } from '@/models/User';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder');

export const PRICE_IDS = {
  basic_monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
  basic_annual: process.env.STRIPE_PRICE_BASIC_ANNUAL || 'price_basic_annual',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
} as const;

type PriceKey = keyof typeof PRICE_IDS;

export function getPriceId(plan: Exclude<Plan, 'none'>, period: BillingPeriod): string {
  const key = `${plan}_${period}` as PriceKey;
  return PRICE_IDS[key];
}

export function getPlanFromPriceId(
  priceId: string
): { plan: Exclude<Plan, 'none'>; billingPeriod: BillingPeriod } | null {
  for (const [key, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) {
      const [plan, period] = key.split('_') as [Exclude<Plan, 'none'>, BillingPeriod];
      return { plan, billingPeriod: period };
    }
  }
  return null;
}

export const TRIAL_DAYS = 3;
