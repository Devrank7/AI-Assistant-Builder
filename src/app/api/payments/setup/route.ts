/**
 * Payment Setup API
 * 
 * POST /api/payments/setup - Create subscription for client
 * GET /api/payments/status - Get subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService, PaymentService } from '@/lib/PaymentService';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * POST - Setup payment subscription
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clientId, provider = 'cryptomus' } = body;

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: 'clientId is required' },
                { status: 400 }
            );
        }

        await connectDB();
        const client = await Client.findOne({ clientId });

        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Client not found' },
                { status: 404 }
            );
        }

        // Check if already has active subscription
        if (client.subscriptionStatus === 'active' && client.paymentMethod) {
            return NextResponse.json({
                success: true,
                message: 'Subscription already active',
                subscriptionStatus: client.subscriptionStatus,
                nextPaymentDate: client.nextPaymentDate,
            });
        }

        // Check if still in trial
        const isInTrial = PaymentService.isInTrial(client.startDate);
        const firstPaymentDate = PaymentService.calculateFirstPaymentDate(client.startDate);

        // Setup subscription with provider
        const paymentService = getPaymentService();
        const result = await paymentService.setupSubscription(clientId, provider);

        if (result.success) {
            // Update next payment date if in trial
            if (isInTrial) {
                await Client.updateOne(
                    { clientId },
                    { nextPaymentDate: firstPaymentDate }
                );
            }

            return NextResponse.json({
                success: true,
                paymentUrl: result.paymentUrl,
                subscriptionId: result.subscriptionId,
                isInTrial,
                trialEndsAt: isInTrial ? firstPaymentDate : null,
                nextPaymentDate: firstPaymentDate,
            });
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
        );
    } catch (error) {
        console.error('Payment setup error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
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
            return NextResponse.json(
                { success: false, error: 'clientId is required' },
                { status: 400 }
            );
        }

        await connectDB();
        const client = await Client.findOne({ clientId }).select(
            'subscriptionStatus paymentMethod nextPaymentDate lastPaymentDate isActive gracePeriodEnd startDate paymentFailedCount'
        );

        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Client not found' },
                { status: 404 }
            );
        }

        const isInTrial = PaymentService.isInTrial(client.startDate);
        const trialEndsAt = PaymentService.calculateFirstPaymentDate(client.startDate);
        const daysUntilPayment = client.nextPaymentDate
            ? PaymentService.getDaysUntilPayment(client.nextPaymentDate)
            : null;

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
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
