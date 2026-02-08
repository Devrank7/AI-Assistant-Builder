/**
 * Credits Top-Up API
 *
 * POST /api/credits/topup - Purchase additional AI credits
 */

import { NextRequest, NextResponse } from 'next/server';
import { addExtraCredits, TOP_UP_OPTIONS } from '@/lib/costGuard';
import { getPaymentService } from '@/lib/PaymentService';
import { CryptomusProvider } from '@/lib/paymentProviders/cryptomus';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * POST - Create payment for additional credits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, amount, provider = 'cryptomus' } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Validate amount
    if (!TOP_UP_OPTIONS.includes(amount)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid amount. Choose one of: $${TOP_UP_OPTIONS.join(', $')}`,
        },
        { status: 400 }
      );
    }

    await connectDB();
    const client = await Client.findOne({ clientId });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Create one-time payment with provider (not a recurring subscription)
    const paymentService = getPaymentService();
    const cryptomusProvider = paymentService.getProvider(provider);

    if (cryptomusProvider && cryptomusProvider instanceof CryptomusProvider) {
      try {
        // Use one-time payment endpoint instead of recurring subscription
        const result = await cryptomusProvider.createOneTimePayment(clientId, client.email, amount, 'USD');

        if (result.success) {
          return NextResponse.json({
            success: true,
            paymentUrl: result.paymentUrl,
            paymentId: result.subscriptionId,
            amount,
            message: `Перейдите по ссылке для оплаты $${amount}`,
          });
        }
      } catch (error) {
        console.error('Payment provider error:', error);
      }
    }

    // Fallback: Direct credit addition (for testing or when provider is unavailable)
    const success = await addExtraCredits(clientId, amount);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Добавлено $${amount} кредитов. Виджет включен.`,
        amount,
        newLimit: 40 + (client.extraCreditsUsd || 0) + amount,
      });
    }

    return NextResponse.json({ success: false, error: 'Failed to add credits' }, { status: 500 });
  } catch (error) {
    console.error('Credits top-up error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
