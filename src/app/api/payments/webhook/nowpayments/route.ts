/**
 * NowPayments IPN Webhook Handler
 *
 * POST /api/payments/webhook/nowpayments
 * Receives Instant Payment Notifications from NowPayments.
 * Validates HMAC-SHA512 signature via x-nowpayments-sig header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/PaymentService';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendPaymentSuccessNotice, sendPaymentFailedNotice } from '@/lib/notifications';
import { addExtraCredits } from '@/lib/costGuard';
import { GRACE_PERIOD_DAYS } from '@/lib/paymentProviders/types';
import { calculatePrepaymentPrice } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-nowpayments-sig') || undefined;

    console.log('NowPayments IPN received:', JSON.stringify(body).slice(0, 500));

    const paymentService = getPaymentService();
    const provider = paymentService.getProvider('nowpayments');

    if (!provider) {
      console.error('NowPayments provider not configured');
      return NextResponse.json({ error: 'Provider not configured' }, { status: 500 });
    }

    // Validate and process webhook
    const result = await provider.handleWebhook(body, signature);

    if (!result.valid) {
      console.error('Invalid IPN signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (!result.clientId) {
      console.error('No clientId in IPN');
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    // Detect top-up vs subscription from order_id
    const orderId = (body.order_id as string) || '';
    const isTopUp = orderId.startsWith('topup_');
    const clientId = result.clientId;

    await connectDB();
    const client = await Client.findOne({ clientId });

    if (!client) {
      console.error(`Client not found: ${clientId}`);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Calculate actual amount for notifications
    const prepaidMonths = client.prepaidMonths || 1;
    const pricing = calculatePrepaymentPrice(prepaidMonths);

    // Handle different event types
    switch (result.eventType) {
      case 'payment_success': {
        if (isTopUp) {
          // Handle credit top-up payment
          const topUpAmount = result.amount || 10;
          await addExtraCredits(clientId, topUpAmount);
          console.log(`Top-up $${topUpAmount} credited to client ${clientId}`);
        } else {
          // Idempotency check: skip if payment was already processed recently (within 1 hour)
          if (client.lastPaymentDate) {
            const timeSinceLastPayment = Date.now() - new Date(client.lastPaymentDate).getTime();
            if (timeSinceLastPayment < 3_600_000) {
              console.log(`Duplicate IPN ignored for client ${clientId}`);
              return NextResponse.json({ success: true, message: 'Already processed' });
            }
          }

          // Process subscription payment
          await paymentService.processPaymentSuccess(clientId, result.subscriptionId || '');

          // Re-read client to get the updated nextPaymentDate
          const updatedClient = await Client.findOne({ clientId }).select('nextPaymentDate');
          const nextPaymentDate = updatedClient?.nextPaymentDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          // Send success notification with actual amount
          await sendPaymentSuccessNotice(
            client.email,
            client.telegram || undefined,
            new Date(nextPaymentDate),
            pricing.total
          );
        }
        break;
      }

      case 'payment_failed': {
        if (isTopUp) {
          console.log(`Top-up payment failed for client ${clientId}`);
        } else {
          await paymentService.processPaymentFailed(clientId);

          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix.ai';
          await sendPaymentFailedNotice(
            client.email,
            client.telegram || undefined,
            GRACE_PERIOD_DAYS,
            `${baseUrl}/cabinet?tab=billing`,
            pricing.total
          );
        }
        break;
      }

      case 'subscription_canceled': {
        // Handle refund — cancel subscription in DB
        await Client.updateOne(
          { clientId },
          {
            subscriptionStatus: 'canceled',
            paymentMethod: null,
            externalCustomerId: null,
          }
        );
        console.log(`Refund processed, subscription canceled for ${clientId}`);
        break;
      }

      default:
        console.log(`Unhandled NowPayments event: ${result.eventType}, status: ${body.payment_status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('NowPayments IPN processing error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
