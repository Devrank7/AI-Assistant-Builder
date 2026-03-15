import { NextRequest } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return Errors.badRequest('Missing stripe-signature header');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Errors.badRequest('Invalid signature');
  }

  await connectDB();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const user = await User.findOne({ stripeCustomerId: customerId });
      if (!user) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const planInfo = priceId ? getPlanFromPriceId(priceId) : null;

      if (planInfo) {
        user.plan = planInfo.plan;
        user.billingPeriod = planInfo.billingPeriod;
      }

      user.subscriptionStatus = 'active';
      user.stripeSubscriptionId = subscriptionId;

      if (subscription.status === 'trialing' && subscription.trial_end) {
        user.trialEndsAt = new Date(subscription.trial_end * 1000);
        user.subscriptionStatus = 'trial';
      }

      await user.save();
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const user = await User.findOne({ stripeCustomerId: customerId });
      if (!user) break;

      const priceId = subscription.items.data[0]?.price?.id;
      const planInfo = priceId ? getPlanFromPriceId(priceId) : null;

      if (planInfo) {
        user.plan = planInfo.plan;
        user.billingPeriod = planInfo.billingPeriod;
      }

      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        trialing: 'trial',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user.subscriptionStatus = (statusMap[subscription.status] || subscription.status) as any;

      await user.save();
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const user = await User.findOne({ stripeCustomerId: customerId });
      if (!user) break;

      user.plan = 'none';
      user.subscriptionStatus = 'canceled';
      user.stripeSubscriptionId = null;

      await user.save();
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const user = await User.findOne({ stripeCustomerId: customerId });
      if (!user) break;

      user.subscriptionStatus = 'past_due';
      await user.save();
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
