/**
 * WayForPay Webhook Handler
 *
 * POST /api/payments/webhook/wayforpay
 * Receives payment confirmations from WayForPay.
 * MUST respond with signed JSON: { orderReference, status, time, signature }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/PaymentService';
import { WayForPayProvider } from '@/lib/paymentProviders/wayforpay';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendPaymentSuccessNotice, sendPaymentFailedNotice } from '@/lib/notifications';
import { addExtraCredits } from '@/lib/costGuard';
import { GRACE_PERIOD_DAYS } from '@/lib/paymentProviders/types';
import { calculatePrepaymentPrice } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  const paymentService = getPaymentService();
  const provider = paymentService.getProvider('wayforpay') as WayForPayProvider | undefined;

  if (!provider) {
    console.error('WayForPay provider not configured');
    return NextResponse.json({ error: 'Provider not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const orderReference = body.orderReference as string;

    console.log('WayForPay webhook received:', JSON.stringify(body).slice(0, 500));

    // Validate and process webhook
    const result = await provider.handleWebhook(body);

    // WayForPay REQUIRES a signed response even for invalid webhooks
    if (!result.valid) {
      console.error('Invalid WayForPay webhook signature');
      // Still respond with accept to prevent retries
      if (orderReference) {
        return NextResponse.json(provider.generateCallbackResponse(orderReference));
      }
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (!result.clientId) {
      console.error('No clientId in WayForPay webhook');
      return NextResponse.json(provider.generateCallbackResponse(orderReference));
    }

    // Detect top-up vs subscription from orderReference prefix
    const isTopUp = orderReference?.startsWith('wfp_topup_');
    // Detect recurring payment: has recToken but orderReference is from initial payment
    const isRecurring = !!body.recToken && !isTopUp;
    const clientId = result.clientId;

    await connectDB();
    const client = await Client.findOne({ clientId });

    if (!client) {
      console.error(`Client not found: ${clientId}`);
      return NextResponse.json(provider.generateCallbackResponse(orderReference));
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
          console.log(`WayForPay top-up $${topUpAmount} credited to client ${clientId}`);
        } else {
          // Idempotency check: skip if payment was already processed recently (within 1 hour)
          if (client.lastPaymentDate) {
            const timeSinceLastPayment = Date.now() - new Date(client.lastPaymentDate).getTime();
            if (timeSinceLastPayment < 3_600_000) {
              console.log(`Duplicate WayForPay webhook ignored for client ${clientId}`);
              return NextResponse.json(provider.generateCallbackResponse(orderReference));
            }
          }

          // Save recToken for future use
          if (body.recToken) {
            await Client.updateOne({ clientId }, { wayforpayRecToken: body.recToken });
          }

          // For recurring payments, extend by 1 month; for initial, use client's prepaidMonths
          const months = isRecurring ? 1 : undefined;
          await paymentService.processPaymentSuccess(clientId, result.subscriptionId || '', months);

          // Re-read client to get the updated nextPaymentDate
          const updatedClient = await Client.findOne({ clientId }).select('nextPaymentDate');
          const nextPaymentDate = updatedClient?.nextPaymentDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          // Send success notification
          const amount = isRecurring ? 50 : pricing.total;
          await sendPaymentSuccessNotice(client.email, client.telegram || undefined, new Date(nextPaymentDate), amount);
        }
        break;
      }

      case 'payment_failed': {
        if (isTopUp) {
          console.log(`WayForPay top-up payment failed for client ${clientId}`);
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
        // Refund processed — cancel subscription
        await Client.updateOne(
          { clientId },
          {
            subscriptionStatus: 'canceled',
            paymentMethod: null,
            externalCustomerId: null,
            wayforpayRecToken: null,
          }
        );
        console.log(`WayForPay refund processed, subscription canceled for ${clientId}`);
        break;
      }

      default:
        console.log(`Unhandled WayForPay event: ${result.eventType}, status: ${body.transactionStatus}`);
    }

    // WayForPay requires this specific signed response
    return NextResponse.json(provider.generateCallbackResponse(orderReference));
  } catch (error) {
    console.error('WayForPay webhook processing error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
