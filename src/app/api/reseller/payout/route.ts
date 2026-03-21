import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  const method = (body.method as string) || 'bank_transfer';
  const ALLOWED_METHODS = ['bank_transfer', 'paypal', 'crypto', 'stripe'];
  if (!ALLOWED_METHODS.includes(method)) {
    return Errors.badRequest(`Invalid payout method. Allowed: ${ALLOWED_METHODS.join(', ')}`);
  }

  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  if (reseller.status === 'suspended') {
    return Errors.forbidden('Reseller account is suspended');
  }

  const pending = reseller.earnings?.pendingEarnings ?? 0;
  const minPayout = reseller.commission?.minPayout ?? 50;

  if (pending < minPayout) {
    return Errors.badRequest(
      `Minimum payout threshold not met. You need at least $${minPayout.toFixed(2)} (current: $${pending.toFixed(2)})`
    );
  }

  // Check for already-pending payout request
  const existingPending = (reseller.payoutHistory ?? []).find((p) => p.status === 'pending');
  if (existingPending) {
    return Errors.badRequest('You already have a pending payout request. Wait for it to be processed.');
  }

  const payoutEntry = {
    amount: pending,
    method,
    status: 'pending' as const,
    requestedAt: new Date(),
  };

  reseller.payoutHistory.push(payoutEntry);
  // Move earnings to pending payout state (already tracked)
  await reseller.save();

  return successResponse(
    {
      amount: pending,
      method,
      status: 'pending',
      requestedAt: payoutEntry.requestedAt,
    },
    `Payout of $${pending.toFixed(2)} requested successfully`
  );
}

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();
  if (!reseller) return Errors.notFound('Reseller account not found');

  return successResponse({
    payoutHistory: (reseller.payoutHistory ?? []).slice().reverse(),
    pendingEarnings: reseller.earnings?.pendingEarnings ?? 0,
    minPayout: reseller.commission?.minPayout ?? 50,
  });
}
