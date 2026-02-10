/**
 * NowPayments Payment Provider
 *
 * Implements crypto payments via NowPayments API (invoice-based).
 * Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
 *
 * Flow:
 * 1. Create invoice → get invoice_url → redirect user
 * 2. User pays in chosen cryptocurrency
 * 3. NowPayments sends IPN webhook → we validate HMAC-SHA512 → process
 */

import crypto from 'crypto';
import {
  PaymentProvider,
  SubscriptionResult,
  SubscriptionStatus,
  WebhookResult,
  SUBSCRIPTION_AMOUNT,
  SUBSCRIPTION_CURRENCY,
} from './types';

interface NowPaymentsConfig {
  apiKey: string;
  ipnSecretKey: string;
  webhookUrl: string;
  successUrl: string;
  cancelUrl: string;
}

interface NowPaymentsInvoiceResponse {
  id: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string | null;
  ipn_callback_url: string;
  invoice_url: string;
  success_url: string;
  cancel_url: string;
  created_at: string;
  updated_at: string;
}

interface NowPaymentsPaymentStatus {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

export class NowPaymentsProvider implements PaymentProvider {
  readonly name = 'nowpayments';
  private config: NowPaymentsConfig;
  private baseUrl = 'https://api.nowpayments.io/v1';

  constructor(config: NowPaymentsConfig) {
    this.config = config;
  }

  /**
   * Make GET request to NowPayments API
   */
  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NowPayments API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Make POST request to NowPayments API
   */
  private async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NowPayments API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Create invoice for subscription payment
   */
  async createSubscription(
    clientId: string,
    email: string,
    amount: number = SUBSCRIPTION_AMOUNT,
    currency: string = SUBSCRIPTION_CURRENCY
  ): Promise<SubscriptionResult> {
    try {
      const orderId = `sub_${clientId}_${Date.now()}`;

      const response = await this.post<NowPaymentsInvoiceResponse>('/invoice', {
        price_amount: amount,
        price_currency: currency.toLowerCase(),
        order_id: orderId,
        order_description: `WinBix AI Subscription | ${clientId} | ${email}`,
        ipn_callback_url: this.config.webhookUrl,
        success_url: this.config.successUrl,
        cancel_url: this.config.cancelUrl,
      });

      if (response.id && response.invoice_url) {
        return {
          success: true,
          subscriptionId: response.id,
          paymentUrl: response.invoice_url,
        };
      }

      return {
        success: false,
        error: 'Failed to create invoice',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create one-time invoice for credit top-ups
   */
  async createOneTimePayment(
    clientId: string,
    email: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<SubscriptionResult> {
    try {
      const orderId = `topup_${clientId}_${Date.now()}`;

      const response = await this.post<NowPaymentsInvoiceResponse>('/invoice', {
        price_amount: amount,
        price_currency: currency.toLowerCase(),
        order_id: orderId,
        order_description: `WinBix AI Credits Top-Up $${amount} | ${clientId} | ${email}`,
        ipn_callback_url: this.config.webhookUrl,
        success_url: this.config.successUrl,
        cancel_url: this.config.cancelUrl,
      });

      if (response.id && response.invoice_url) {
        return {
          success: true,
          subscriptionId: response.id,
          paymentUrl: response.invoice_url,
        };
      }

      return {
        success: false,
        error: 'Failed to create payment',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel subscription (no-op for invoice-based payments)
   * Billing is managed by our own system, not NowPayments recurring.
   */
  async cancelSubscription(_subscriptionId: string): Promise<void> {
    // Invoice-based: nothing to cancel on NowPayments side.
    // Our PaymentService handles DB status update.
  }

  /**
   * Get payment status from NowPayments
   */
  async getSubscriptionStatus(paymentId: string): Promise<SubscriptionStatus> {
    try {
      const response = await this.get<NowPaymentsPaymentStatus>(`/payment/${paymentId}`);

      const status = response.payment_status;

      return {
        active: status === 'finished' || status === 'confirmed',
        status:
          status === 'finished' || status === 'confirmed'
            ? 'active'
            : status === 'waiting' || status === 'confirming' || status === 'sending'
              ? 'pending'
              : status === 'expired' || status === 'failed'
                ? 'past_due'
                : 'canceled',
        lastPaymentDate: response.updated_at ? new Date(response.updated_at) : undefined,
      };
    } catch {
      return {
        active: false,
        status: 'past_due',
      };
    }
  }

  /**
   * Validate and process IPN webhook
   *
   * NowPayments IPN verification:
   * 1. Sort webhook body alphabetically by key
   * 2. JSON.stringify the sorted object
   * 3. HMAC-SHA512 with IPN secret key
   * 4. Compare with x-nowpayments-sig header
   */
  async handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult> {
    try {
      const data = payload as Record<string, unknown>;

      // Validate signature
      if (!signature) {
        console.error('NowPayments webhook received without signature');
        return { valid: false, eventType: 'unknown' };
      }

      // Sort payload keys alphabetically and stringify
      const sortedKeys = Object.keys(data).sort();
      const sorted: Record<string, unknown> = {};
      for (const key of sortedKeys) {
        sorted[key] = data[key];
      }
      const sortedJson = JSON.stringify(sorted);

      // Generate HMAC-SHA512
      const expectedSignature = crypto.createHmac('sha512', this.config.ipnSecretKey).update(sortedJson).digest('hex');

      if (signature !== expectedSignature) {
        console.warn('NowPayments webhook signature mismatch');
        return { valid: false, eventType: 'unknown' };
      }

      // Map payment status to event type
      const paymentStatus = data.payment_status as string;
      let eventType: WebhookResult['eventType'] = 'unknown';

      if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
        eventType = 'payment_success';
      } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
        eventType = 'payment_failed';
      } else if (paymentStatus === 'refunded') {
        eventType = 'subscription_canceled';
      }

      // Extract clientId from order_id (format: sub_clientId_timestamp or topup_clientId_timestamp)
      const orderId = data.order_id as string;
      let clientId: string | undefined;

      if (orderId) {
        // Parse: sub_clientId_timestamp or topup_clientId_timestamp
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          // Remove prefix (sub/topup) and timestamp (last part)
          const prefix = parts[0];
          if (prefix === 'sub' || prefix === 'topup') {
            // clientId is everything between prefix and last timestamp
            clientId = parts.slice(1, -1).join('_');
          }
        }
      }

      return {
        valid: true,
        eventType,
        clientId,
        subscriptionId: data.payment_id?.toString(),
        amount: typeof data.price_amount === 'number' ? data.price_amount : parseFloat(data.price_amount as string),
        currency: data.price_currency as string,
      };
    } catch {
      return { valid: false, eventType: 'unknown' };
    }
  }
}

/**
 * Create NowPayments provider instance from environment variables
 */
export function createNowPaymentsProvider(): NowPaymentsProvider | null {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const ipnSecretKey = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!apiKey || !ipnSecretKey) {
    console.warn('NowPayments credentials not configured');
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix.ai';

  return new NowPaymentsProvider({
    apiKey,
    ipnSecretKey,
    webhookUrl: `${baseUrl}/api/payments/webhook/nowpayments`,
    successUrl: `${baseUrl}/cabinet?tab=billing&status=success`,
    cancelUrl: `${baseUrl}/cabinet?tab=billing&status=canceled`,
  });
}
