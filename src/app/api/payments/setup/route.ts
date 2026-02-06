/**
 * Payment Setup API
 *
 * POST /api/payments/setup - Create subscription for client (with prepayment)
 * GET /api/payments/status - Get subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService, PaymentService } from '@/lib/PaymentService';
import { isValidPrepaymentMonths, calculatePrepaymentPrice, getSubscriptionTier } from '@/lib/pricing';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * POST - Setup payment subscription with optional prepayment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, provider = 'cryptomus', months = 1 } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Validate months parameter
    if (!isValidPrepaymentMonths(months)) {
      return NextResponse.json({ success: false, error: 'Invalid months. Choose 1, 3, 6, or 12' }, { status: 400 });
    }

    await connectDB();
    const client = await Client.findOne({ clientId });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Check if already has active subscription with prepaid time remaining
    if (client.subscriptionStatus === 'active' && client.prepaidUntil) {
      const now = new Date();
      if (client.prepaidUntil > now) {
        const daysRemaining = Math.ceil((client.prepaidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return NextResponse.json({
          success: true,
          message: 'Subscription already active with prepaid time',
          subscriptionStatus: client.subscriptionStatus,
          prepaidUntil: client.prepaidUntil,
          daysRemaining,
          currentTier: client.subscriptionTier,
        });
      }
    }

    // Check if still in trial
    const isInTrial = PaymentService.isInTrial(client.startDate);
    const firstPaymentDate = PaymentService.calculateFirstPaymentDate(client.startDate);

    // Calculate pricing
    const pricing = calculatePrepaymentPrice(months);
    const tier = getSubscriptionTier(months);

    // Setup subscription with provider
    const paymentService = getPaymentService();
    const result = await paymentService.setupSubscription(clientId, provider, months);

    if (result.success) {
      // Calculate next payment date
      const nextPaymentDate = new Date();
      if (isInTrial) {
        // If in trial, payment starts after trial ends + prepaid months
        nextPaymentDate.setTime(firstPaymentDate.getTime());
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);
      } else {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);
      }

      await Client.updateOne(
        { clientId },
        {
          nextPaymentDate,
          prepaidMonths: months,
          subscriptionTier: tier,
        }
      );

      return NextResponse.json({
        success: true,
        paymentUrl: result.paymentUrl,
        subscriptionId: result.subscriptionId,
        isInTrial,
        trialEndsAt: isInTrial ? firstPaymentDate : null,
        nextPaymentDate,
        pricing: {
          months,
          total: pricing.total,
          perMonth: pricing.perMonth,
          savings: pricing.savings,
          discount: pricing.discount,
          tier,
        },
      });
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error) {
    console.error('Payment setup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET - Get subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();
    const client = await Client.findOne({ clientId }).select(
      'subscriptionStatus paymentMethod nextPaymentDate lastPaymentDate isActive gracePeriodEnd startDate paymentFailedCount'
    );

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    const isInTrial = PaymentService.isInTrial(client.startDate);
    const trialEndsAt = PaymentService.calculateFirstPaymentDate(client.startDate);
    const daysUntilPayment = client.nextPaymentDate ? PaymentService.getDaysUntilPayment(client.nextPaymentDate) : null;

    return NextResponse.json({
      success: true,
      subscription: {
        status: client.subscriptionStatus,
        isActive: client.isActive,
        paymentMethod: client.paymentMethod,
        nextPaymentDate: client.nextPaymentDate,
        lastPaymentDate: client.lastPaymentDate,
        gracePeriodEnd: client.gracePeriodEnd,
        paymentFailedCount: client.paymentFailedCount,
        isInTrial,
        trialEndsAt: isInTrial ? trialEndsAt : null,
        daysUntilPayment,
      },
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
