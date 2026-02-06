/**
 * Cryptomus Payment Provider
 *
 * Implements recurring crypto payments via Cryptomus API.
 * Docs: https://doc.cryptomus.com/
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

interface CryptomusConfig {
  merchantId: string;
  apiKey: string;
  webhookUrl: string;
}

interface CryptomusPaymentResponse {
  state: number;
  result: {
    uuid: string;
    order_id: string;
    amount: string;
    payment_amount: string;
    payer_amount: string;
    discount_percent: number;
    discount: string;
    payer_currency: string;
    currency: string;
    merchant_amount: string;
    network: string;
    address: string;
    from: string;
    txid: string;
    payment_status: string;
    url: string;
    expired_at: number;
    status: string;
    is_final: boolean;
    additional_data: string;
  };
}

export class CryptomusProvider implements PaymentProvider {
  readonly name = 'cryptomus';
  private config: CryptomusConfig;
  private baseUrl = 'https://api.cryptomus.com/v1';

  constructor(config: CryptomusConfig) {
    this.config = config;
  }

  /**
   * Generate signature for Cryptomus API
   */
  private generateSignature(data: Record<string, unknown>): string {
    const jsonData = JSON.stringify(data);
    const base64Data = Buffer.from(jsonData).toString('base64');
    return crypto
      .createHash('md5')
      .update(base64Data + this.config.apiKey)
      .digest('hex');
  }

  /**
   * Make API request to Cryptomus
   */
  private async request<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const signature = this.generateSignature(data);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        merchant: this.config.merchantId,
        sign: signature,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cryptomus API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Create recurring payment subscription
   */
  async createSubscription(
    clientId: string,
    email: string,
    amount: number = SUBSCRIPTION_AMOUNT,
    currency: string = SUBSCRIPTION_CURRENCY
  ): Promise<SubscriptionResult> {
    try {
      // Create recurring payment
      const data = {
        amount: amount.toString(),
        currency: currency,
        order_id: `sub_${clientId}_${Date.now()}`,
        url_callback: this.config.webhookUrl,
        is_recurring: true,
        recurring_period: 'monthly',
        name: 'AI Widget Monthly Subscription',
        additional_data: JSON.stringify({ clientId, email }),
      };

      const response = await this.request<CryptomusPaymentResponse>('/recurrence/create', data);

      if (response.state === 0 && response.result) {
        return {
          success: true,
          subscriptionId: response.result.uuid,
          paymentUrl: response.result.url,
        };
      }

      return {
        success: false,
        error: 'Failed to create subscription',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request('/recurrence/cancel', {
      uuid: subscriptionId,
    });
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    try {
      const response = await this.request<{ result: { status: string; last_pay_off?: string } }>('/recurrence/info', {
        uuid: subscriptionId,
      });

      const status = response.result.status;

      return {
        active: status === 'active',
        status:
          status === 'active'
            ? 'active'
            : status === 'wait'
              ? 'pending'
              : status === 'cancel'
                ? 'canceled'
                : 'past_due',
        lastPaymentDate: response.result.last_pay_off ? new Date(response.result.last_pay_off) : undefined,
      };
    } catch {
      return {
        active: false,
        status: 'past_due',
      };
    }
  }

  /**
   * Validate and process webhook
   *
   * Per Cryptomus docs (https://doc.cryptomus.com/merchant-api/payments/webhook):
   * 1. Extract `sign` from payload BEFORE generating hash
   * 2. Escape slashes in JSON (PHP JSON_UNESCAPED_UNICODE style)
   * 3. Generate MD5(base64(json) + apiKey)
   */
  async handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult> {
    try {
      const data = { ...(payload as Record<string, unknown>) };

      // Extract sign from body (per docs: sign comes IN the webhook body)
      const receivedSign = (data.sign as string) || signature;
      delete data.sign; // Remove sign before generating hash

      // Validate signature
      if (receivedSign) {
        // Per Cryptomus JS docs: escape slashes to match PHP behavior
        const jsonData = JSON.stringify(data).replace(/\//g, '\\/');
        const base64Data = Buffer.from(jsonData).toString('base64');
        const expectedSign = crypto
          .createHash('md5')
          .update(base64Data + this.config.apiKey)
          .digest('hex');

        if (receivedSign !== expectedSign) {
          console.warn('Cryptomus webhook signature mismatch');
          return { valid: false, eventType: 'unknown' };
        }
      }

      const status = data.status as string;
      const additionalData = data.additional_data ? JSON.parse(data.additional_data as string) : {};

      let eventType: WebhookResult['eventType'] = 'unknown';

      if (status === 'paid' || status === 'paid_over') {
        eventType = 'payment_success';
      } else if (status === 'fail' || status === 'wrong_amount') {
        eventType = 'payment_failed';
      } else if (status === 'cancel') {
        eventType = 'subscription_canceled';
      }

      return {
        valid: true,
        eventType,
        clientId: additionalData.clientId,
        subscriptionId: data.uuid as string,
        amount: parseFloat(data.amount as string),
        currency: data.currency as string,
      };
    } catch {
      return { valid: false, eventType: 'unknown' };
    }
  }
}

/**
 * Create Cryptomus provider instance from environment
 */
export function createCryptomusProvider(): CryptomusProvider | null {
  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  const apiKey = process.env.CRYPTOMUS_API_KEY;
  const webhookUrl =
    process.env.CRYPTOMUS_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook/cryptomus`;

  if (!merchantId || !apiKey) {
    console.warn('Cryptomus credentials not configured');
    return null;
  }

  return new CryptomusProvider({
    merchantId,
    apiKey,
    webhookUrl,
  });
}
