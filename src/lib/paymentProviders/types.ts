/**
 * Payment Provider Interface
 *
 * Abstract interface for payment providers.
 * Implement this for each provider (NowPayments, Cryptomus, etc.).
 */

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  paymentUrl?: string;
  error?: string;
}

export interface SubscriptionStatus {
  active: boolean;
  status: 'active' | 'pending' | 'canceled' | 'past_due';
  nextPaymentDate?: Date;
  lastPaymentDate?: Date;
}

export interface WebhookResult {
  valid: boolean;
  eventType: 'payment_success' | 'payment_failed' | 'subscription_canceled' | 'unknown';
  clientId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentProvider {
  readonly name: string;

  /**
   * Create a new subscription for a client
   * Returns a payment URL for the client to complete setup
   */
  createSubscription(clientId: string, email: string, amount: number, currency: string): Promise<SubscriptionResult>;

  /**
   * Create a one-time payment (e.g. credit top-up)
   * Returns a payment URL for the client to complete payment
   */
  createOneTimePayment(clientId: string, email: string, amount: number, currency: string): Promise<SubscriptionResult>;

  /**
   * Cancel an existing subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;

  /**
   * Process and validate incoming webhook
   */
  handleWebhook(payload: unknown, signature?: string): Promise<WebhookResult>;
}

/**
 * Payment configuration
 */
export interface PaymentConfig {
  nowpayments?: {
    apiKey: string;
    ipnSecretKey: string;
  };
  cryptomus?: {
    merchantId: string;
    apiKey: string;
    webhookSecret?: string;
  };
  wayforpay?: {
    merchantAccount: string;
    merchantSecretKey: string;
    merchantDomainName: string;
    merchantPassword: string;
  };
}

/**
 * Subscription amount constants
 */
export const SUBSCRIPTION_AMOUNT = 50; // USD
export const SUBSCRIPTION_CURRENCY = 'USD';
export const TRIAL_DAYS = 30;
export const GRACE_PERIOD_DAYS = 3;
export const REMINDER_DAYS_BEFORE = 3;
