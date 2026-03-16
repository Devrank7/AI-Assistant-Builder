import { NextRequest } from 'next/server';
import { stripe, getPriceId, TRIAL_DAYS } from '@/lib/stripe';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import type { Plan, BillingPeriod } from '@/models/User';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const VALID_PLANS: Plan[] = ['basic', 'pro'];
const VALID_PERIODS: BillingPeriod[] = ['monthly', 'annual'];

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  let body: { plan?: string; period?: string };
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  const { plan, period } = body;

  if (!plan || !VALID_PLANS.includes(plan as Plan)) {
    return Errors.badRequest('Invalid plan. Must be "basic" or "pro"');
  }

  if (!period || !VALID_PERIODS.includes(period as BillingPeriod)) {
    return Errors.badRequest('Invalid period. Must be "monthly" or "annual"');
  }

  await connectDB();
  const user = await User.findById(auth.userId);
  if (!user) return Errors.notFound('User not found');

  let stripeCustomerId = user.stripeCustomerId;

  if (!stripeCustomerId || stripeCustomerId.startsWith('cus_temp_')) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: auth.userId },
    });
    stripeCustomerId = customer.id;
    user.stripeCustomerId = stripeCustomerId;
    await user.save();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionParams: any = {
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: getPriceId(plan as Exclude<Plan, 'none'>, period as BillingPeriod), quantity: 1 }],
    success_url: `${BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/plans`,
  };

  if (!user.trialEndsAt) {
    sessionParams.subscription_data = {
      trial_period_days: TRIAL_DAYS,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return successResponse({ url: session.url });
}
