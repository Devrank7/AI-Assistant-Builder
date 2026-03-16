import { NextRequest } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { sessionId } = await request.json();
  if (!sessionId) return Errors.badRequest('sessionId is required');

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session || session.status !== 'complete') {
    return Errors.badRequest('Session not completed');
  }

  await connectDB();
  const user = await User.findById(auth.userId);
  if (!user) return Errors.notFound('User not found');

  // Only process if plan is still 'none' (webhook hasn't fired yet)
  if (user.plan === 'none' && session.subscription) {
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const planInfo = priceId ? getPlanFromPriceId(priceId) : null;

    if (planInfo) {
      user.plan = planInfo.plan;
      user.billingPeriod = planInfo.billingPeriod;
    }

    user.subscriptionStatus = subscription.status === 'trialing' ? 'trial' : 'active';
    user.stripeSubscriptionId = subscriptionId;

    if (subscription.status === 'trialing' && subscription.trial_end) {
      user.trialEndsAt = new Date(subscription.trial_end * 1000);
    }

    await user.save();
  }

  return Response.json({
    success: true,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
  });
}
