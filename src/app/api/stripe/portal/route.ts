import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const user = await User.findById(auth.userId);
  if (!user) return Errors.notFound('User not found');

  if (!user.stripeCustomerId || user.stripeCustomerId.startsWith('cus_temp_')) {
    return Errors.badRequest('No billing account found. Please subscribe to a plan first.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${BASE_URL}/dashboard`,
  });

  return successResponse({ url: session.url });
}
