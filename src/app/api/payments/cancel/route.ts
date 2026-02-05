/**
 * Cancel Subscription API
 * 
 * POST /api/payments/cancel - Cancel subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/PaymentService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clientId } = body;

        if (!clientId) {
            return NextResponse.json(
                { success: false, error: 'clientId is required' },
                { status: 400 }
            );
        }

        const paymentService = getPaymentService();
        const success = await paymentService.cancelSubscription(clientId);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Subscription canceled successfully',
            });
        }

        return NextResponse.json(
            { success: false, error: 'Failed to cancel subscription' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
