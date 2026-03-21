import Stripe from 'stripe';
import type { Plan, BillingPeriod } from '@/models/User';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set. Stripe cannot be initialised.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function requireStripePrice(envVar: string, name: string): string {
  const value = process.env[envVar];
  if (!value) {
    // Non-critical: allow startup without all price IDs configured
    // Will fail at checkout time if plan is selected without a configured price
    console.warn(`[stripe] ${envVar} not set — "${name}" checkout will be unavailable`);
    return '';
  }
  return value;
}

export const PRICE_IDS = {
  basic_monthly: requireStripePrice('STRIPE_PRICE_BASIC_MONTHLY', 'basic_monthly'),
  basic_annual: requireStripePrice('STRIPE_PRICE_BASIC_ANNUAL', 'basic_annual'),
  starter_monthly: requireStripePrice('STRIPE_PRICE_STARTER_MONTHLY', 'starter_monthly'),
  starter_annual: requireStripePrice('STRIPE_PRICE_STARTER_ANNUAL', 'starter_annual'),
  pro_monthly: requireStripePrice('STRIPE_PRICE_PRO_MONTHLY', 'pro_monthly'),
  pro_annual: requireStripePrice('STRIPE_PRICE_PRO_ANNUAL', 'pro_annual'),
  enterprise_monthly: requireStripePrice('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'enterprise_monthly'),
  enterprise_annual: requireStripePrice('STRIPE_PRICE_ENTERPRISE_ANNUAL', 'enterprise_annual'),
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
