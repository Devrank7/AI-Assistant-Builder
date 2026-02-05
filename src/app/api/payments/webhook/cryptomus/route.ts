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

        await connectDB();
        const client = await Client.findOne({ clientId: result.clientId });

        if (!client) {
            console.error(`Client not found: ${result.clientId}`);
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // Handle different event types
        switch (result.eventType) {
            case 'payment_success':
                await paymentService.processPaymentSuccess(result.clientId, result.subscriptionId || '');

                // Send success notification
                const nextPaymentDate = new Date();
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                await sendPaymentSuccessNotice(
                    client.email,
                    client.telegram || undefined,
                    nextPaymentDate
                );
                break;

            case 'payment_failed':
                await paymentService.processPaymentFailed(result.clientId);

                // Send failure notification
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourapp.com';
                await sendPaymentFailedNotice(
                    client.email,
                    client.telegram || undefined,
                    GRACE_PERIOD_DAYS,
                    `${baseUrl}/admin/client/${result.clientId}?tab=billing`
                );
                break;

            case 'subscription_canceled':
                await Client.updateOne(
                    { clientId: result.clientId },
                    { subscriptionStatus: 'canceled', paymentMethod: null }
                );
                break;

            default:
                console.log(`Unknown event type: ${result.eventType}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
