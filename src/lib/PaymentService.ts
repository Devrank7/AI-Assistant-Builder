/**
 * Payment Service
 * 
 * Unified payment service that routes to the correct provider.
 * Supports: Cryptomus (now), Dodo/LiqPay (future)
 */

import { PaymentProvider, SubscriptionResult, SubscriptionStatus, WebhookResult, TRIAL_DAYS, GRACE_PERIOD_DAYS } from './paymentProviders/types';
import { createCryptomusProvider } from './paymentProviders/cryptomus';
import Client, { PaymentMethod } from '@/models/Client';
import connectDB from '@/lib/mongodb';

class PaymentService {
    private providers: Map<string, PaymentProvider> = new Map();

    constructor() {
        this.initializeProviders();
    }

    private initializeProviders() {
        // Initialize Cryptomus
        const cryptomus = createCryptomusProvider();
        if (cryptomus) {
            this.providers.set('cryptomus', cryptomus);
        }

        // Future: Initialize Dodo, LiqPay here
    }

    /**
     * Get provider by name
     */
    getProvider(name: string): PaymentProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Get available providers
     */
    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Setup subscription for a client
     */
    async setupSubscription(
        clientId: string,
        providerName: PaymentMethod
    ): Promise<SubscriptionResult> {
        if (!providerName) {
            return { success: false, error: 'No payment provider specified' };
        }

        const provider = this.providers.get(providerName);
        if (!provider) {
            return { success: false, error: `Provider ${providerName} not available` };
        }

        await connectDB();
        const client = await Client.findOne({ clientId });

        if (!client) {
            return { success: false, error: 'Client not found' };
        }

        // Create subscription with provider
        const result = await provider.createSubscription(
            clientId,
            client.email,
            50, // $50/month
            'USD'
        );

        if (result.success && result.subscriptionId) {
            // Update client with subscription info
            await Client.updateOne(
                { clientId },
                {
                    paymentMethod: providerName,
                    cryptomusSubscriptionId: providerName === 'cryptomus' ? result.subscriptionId : undefined,
                    externalCustomerId: providerName !== 'cryptomus' ? result.subscriptionId : undefined,
                }
            );
        }

        return result;
    }

    /**
     * Cancel subscription for a client
     */
    async cancelSubscription(clientId: string): Promise<boolean> {
        await connectDB();
        const client = await Client.findOne({ clientId });

        if (!client || !client.paymentMethod) {
            return false;
        }

        const provider = this.providers.get(client.paymentMethod);
        if (!provider) {
            return false;
        }

        const subscriptionId = client.cryptomusSubscriptionId || client.externalCustomerId;
        if (!subscriptionId) {
            return false;
        }

        try {
            await provider.cancelSubscription(subscriptionId);
            await Client.updateOne(
                { clientId },
                {
                    subscriptionStatus: 'canceled',
                    paymentMethod: null,
                    cryptomusSubscriptionId: null,
                    externalCustomerId: null,
                }
            );
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Process successful payment
     */
    async processPaymentSuccess(clientId: string, subscriptionId: string): Promise<void> {
        await connectDB();

        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        await Client.updateOne(
            { clientId },
            {
                isActive: true,
                subscriptionStatus: 'active',
                lastPaymentDate: new Date(),
                nextPaymentDate: nextPaymentDate,
                paymentFailedCount: 0,
                gracePeriodEnd: null,
            }
        );

        console.log(`Payment success for client ${clientId}, next payment: ${nextPaymentDate}`);
    }

    /**
     * Process failed payment
     */
    async processPaymentFailed(clientId: string): Promise<void> {
        await connectDB();

        const client = await Client.findOne({ clientId });
        if (!client) return;

        const failedCount = (client.paymentFailedCount || 0) + 1;

        // Set grace period end date
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

        await Client.updateOne(
            { clientId },
            {
                subscriptionStatus: 'past_due',
                paymentFailedCount: failedCount,
                gracePeriodEnd: gracePeriodEnd,
            }
        );

        console.log(`Payment failed for client ${clientId}, grace period ends: ${gracePeriodEnd}`);
    }

    /**
     * Suspend client (after grace period)
     */
    async suspendClient(clientId: string): Promise<void> {
        await connectDB();

        await Client.updateOne(
            { clientId },
            {
                isActive: false,
                subscriptionStatus: 'suspended',
            }
        );

        console.log(`Client ${clientId} suspended due to payment failure`);
    }

    /**
     * Calculate first payment date (after trial)
     */
    static calculateFirstPaymentDate(startDate: Date): Date {
        const paymentDate = new Date(startDate);
        paymentDate.setDate(paymentDate.getDate() + TRIAL_DAYS);
        return paymentDate;
    }

    /**
     * Check if client is in trial
     */
    static isInTrial(startDate: Date): boolean {
        const trialEnd = this.calculateFirstPaymentDate(startDate);
        return new Date() < trialEnd;
    }

    /**
     * Get days until payment
     */
    static getDaysUntilPayment(nextPaymentDate: Date): number {
        const now = new Date();
        const diff = nextPaymentDate.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}

// Singleton instance
let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
    if (!paymentServiceInstance) {
        paymentServiceInstance = new PaymentService();
    }
    return paymentServiceInstance;
}

export { PaymentService };
