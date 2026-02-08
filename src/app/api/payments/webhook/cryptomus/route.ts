/**
 * Cryptomus Webhook Handler
 *
 * POST /api/payments/webhook/cryptomus
 * Receives payment confirmations from Cryptomus
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/PaymentService';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendPaymentSuccessNotice, sendPaymentFailedNotice } from '@/lib/notifications';
import { addExtraCredits } from '@/lib/costGuard';
import { GRACE_PERIOD_DAYS } from '@/lib/paymentProviders/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('sign') || undefined;

    console.log('Cryptomus webhook received:', JSON.stringify(body).slice(0, 500));

    const paymentService = getPaymentService();
    const provider = paymentService.getProvider('cryptomus');

    if (!provider) {
      console.error('Cryptomus provider not configured');
      return NextResponse.json({ error: 'Provider not configured' }, { status: 500 });
    }

    // Validate and process webhook
    const result = await provider.handleWebhook(body, signature);

    if (!result.valid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (!result.clientId) {
      console.error('No clientId in webhook');
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    // Detect top-up payments via explicit type field or legacy clientId format
    let additionalData: Record<string, unknown> = {};
    try {
      if (body.additional_data) {
        additionalData = JSON.parse(body.additional_data);
      }
    } catch {
      /* ignore parse errors, use result.clientId as fallback */
    }

    const isTopUp = additionalData.type === 'top_up' || result.clientId.includes('_topup_');
    const actualClientId =
      additionalData.type === 'top_up'
        ? (additionalData.clientId as string) || result.clientId
        : isTopUp
          ? result.clientId.split('_topup_')[0]
          : result.clientId;

    await connectDB();
    const client = await Client.findOne({ clientId: actualClientId });

    if (!client) {
      console.error(`Client not found: ${actualClientId}`);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Handle different event types
    switch (result.eventType) {
      case 'payment_success': {
        if (isTopUp) {
          // Handle credit top-up payment
          const topUpAmount = result.amount || 10;
          await addExtraCredits(actualClientId, topUpAmount);
          // Clear pending top-up state
          await Client.updateOne(
            { clientId: actualClientId },
            { $unset: { pendingTopUpAmount: '', pendingTopUpPaymentId: '' } }
          );
          console.log(`Top-up $${topUpAmount} credited to client ${actualClientId}`);
        } else {
          // Idempotency check: skip if payment was already processed very recently (within 60s)
          if (client.lastPaymentDate) {
            const timeSinceLastPayment = Date.now() - new Date(client.lastPaymentDate).getTime();
            if (timeSinceLastPayment < 60_000) {
              console.log(`Duplicate webhook ignored for client ${actualClientId}`);
              return NextResponse.json({ success: true, message: 'Already processed' });
            }
          }

          // Process subscription payment (uses client.prepaidMonths for correct duration)
          await paymentService.processPaymentSuccess(actualClientId, result.subscriptionId || '');

          // Re-read client to get the updated nextPaymentDate set by processPaymentSuccess
          const updatedClient = await Client.findOne({ clientId: actualClientId }).select('nextPaymentDate');
          const nextPaymentDate = updatedClient?.nextPaymentDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          // Send success notification with correct date
          await sendPaymentSuccessNotice(client.email, client.telegram || undefined, new Date(nextPaymentDate));
        }
        break;
      }

      case 'payment_failed': {
        if (isTopUp) {
          // Top-up failed - just clear pending state
          await Client.updateOne(
            { clientId: actualClientId },
            { $unset: { pendingTopUpAmount: '', pendingTopUpPaymentId: '' } }
          );
          console.log(`Top-up payment failed for client ${actualClientId}`);
        } else {
          await paymentService.processPaymentFailed(actualClientId);

          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix.ai';
          await sendPaymentFailedNotice(
            client.email,
            client.telegram || undefined,
            GRACE_PERIOD_DAYS,
            `${baseUrl}/cabinet?tab=billing`
          );
        }
        break;
      }

      case 'subscription_canceled':
        // Properly clear all subscription-related fields
        await Client.updateOne(
          { clientId: actualClientId },
          {
            subscriptionStatus: 'canceled',
            paymentMethod: null,
            cryptomusSubscriptionId: null,
            externalCustomerId: null,
          }
        );
        break;

      default:
        console.log(`Unknown event type: ${result.eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
