/**
 * Payment Service
 *
 * Unified payment service that routes to the correct provider.
 * Supports: Cryptomus (now), Dodo/LiqPay (future)
 */

import { PaymentProvider, SubscriptionResult, TRIAL_DAYS, GRACE_PERIOD_DAYS } from './paymentProviders/types';
import { createCryptomusProvider } from './paymentProviders/cryptomus';
import Client, { PaymentMethod } from '@/models/Client';
import connectDB from '@/lib/mongodb';
import { calculatePrepaymentPrice, getSubscriptionTier, isValidPrepaymentMonths } from '@/lib/pricing';

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
   * @param months - Number of months to prepay (1, 3, 6, or 12)
   */
  async setupSubscription(
    clientId: string,
    providerName: PaymentMethod,
    months: number = 1
  ): Promise<SubscriptionResult> {
    if (!providerName) {
      return { success: false, error: 'No payment provider specified' };
    }

    // Validate months parameter
    if (!isValidPrepaymentMonths(months)) {
      return { success: false, error: 'Invalid months. Choose 1, 3, 6, or 12' };
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

    // Calculate prepayment price (includes annual discount)
    const pricing = calculatePrepaymentPrice(months);

    // Create subscription with provider
    const result = await provider.createSubscription(
      clientId,
      client.email,
      pricing.total, // $50, $150, $300, or $510
      'USD'
    );

    if (result.success && result.subscriptionId) {
      // Update client with subscription info and prepayment metadata
      await Client.updateOne(
        { clientId },
        {
          paymentMethod: providerName,
          cryptomusSubscriptionId: providerName === 'cryptomus' ? result.subscriptionId : undefined,
          externalCustomerId: providerName !== 'cryptomus' ? result.subscriptionId : undefined,
          prepaidMonths: months,
          subscriptionTier: getSubscriptionTier(months),
          lastPrepaymentAmount: pricing.total,
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
   * @param months - Number of months prepaid (defaults to client's prepaidMonths or 1)
   */
  async processPaymentSuccess(clientId: string, subscriptionId: string, months?: number): Promise<void> {
    await connectDB();

    // Get client to determine prepaid months if not provided
    const client = await Client.findOne({ clientId });
    const prepaidMonths = months ?? client?.prepaidMonths ?? 1;

    // Calculate next payment date based on prepaid months
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + prepaidMonths);

    const pricing = calculatePrepaymentPrice(prepaidMonths);

    await Client.updateOne(
      { clientId },
      {
        isActive: true,
        subscriptionStatus: 'active',
        lastPaymentDate: new Date(),
        nextPaymentDate: nextPaymentDate,
        prepaidUntil: nextPaymentDate,
        prepaidMonths: prepaidMonths,
        subscriptionTier: getSubscriptionTier(prepaidMonths),
        lastPrepaymentAmount: pricing.total,
        paymentFailedCount: 0,
        gracePeriodEnd: null,
      }
    );

    console.log(
      `Payment success for client ${clientId}, prepaid ${prepaidMonths} months, next payment: ${nextPaymentDate}`
    );
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
   * Uses trialActivatedAt if available, otherwise falls back to startDate
   */
  static calculateFirstPaymentDate(startDate: Date, trialActivatedAt?: Date | null): Date {
    const effectiveStart = trialActivatedAt ? new Date(trialActivatedAt) : new Date(startDate);
    const paymentDate = new Date(effectiveStart);
    paymentDate.setDate(paymentDate.getDate() + TRIAL_DAYS);
    return paymentDate;
  }

  /**
   * Check if client is in trial
   * Uses trialActivatedAt if available, otherwise falls back to startDate
   */
  static isInTrial(startDate: Date, trialActivatedAt?: Date | null): boolean {
    const trialEnd = PaymentService.calculateFirstPaymentDate(startDate, trialActivatedAt);
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
