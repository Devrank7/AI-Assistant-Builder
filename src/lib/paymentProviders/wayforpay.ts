/**
 * WayForPay Payment Provider
 *
 * Implements card payments via WayForPay (Visa/Mastercard).
 * Supports recurring (regular) payments managed by WayForPay.
 *
 * Flow:
 * 1. Create signed form data → redirect to checkout page
 * 2. Checkout page auto-submits form to https://secure.wayforpay.com/pay
 * 3. User completes payment on WayForPay page
 * 4. WayForPay sends webhook → we validate HMAC-MD5 → process
 *
 * Recurring:
 * - Initial purchase includes regularMode/regularAmount/dateNext params
 * - WayForPay auto-charges monthly after prepaid period ends
 * - Each recurring charge triggers the same webhook
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

interface WayForPayConfig {
  merchantAccount: string;
  merchantSecretKey: string;
  merchantDomainName: string;
  merchantPassword: string;
  serviceUrl: string;
  returnUrl: string;
}

export interface WayForPayFormData {
  merchantAccount: string;
  merchantDomainName: string;
  merchantTransactionSecureType: string;
  merchantSignature: string;
  orderReference: string;
  orderDate: string;
  amount: string;
  currency: string;
  productName: string[];
  productPrice: string[];
  productCount: string[];
  serviceUrl: string;
  returnUrl: string;
  language: string;
  clientEmail?: string;
  regularMode?: string;
  regularAmount?: string;
  regularBehavior?: string;
  dateNext?: string;
  dateEnd?: string;
}

interface PendingOrder {
  formData: WayForPayFormData;
  expires: number;
}

// In-memory storage for pending orders (TTL: 15 min)
const pendingOrders: Map<string, PendingOrder> = new Map();
const ORDER_TTL_MS = 15 * 60 * 1000;

function cleanupExpiredOrders(): void {
  const now = Date.now();
  for (const [key, order] of pendingOrders) {
    if (order.expires < now) {
      pendingOrders.delete(key);
    }
  }
}

/**
 * Generate HMAC-MD5 signature for WayForPay
 */
function generateSignature(secretKey: string, fields: (string | number)[]): string {
  const signString = fields.join(';');
  return crypto.createHmac('md5', secretKey).update(signString, 'utf8').digest('hex');
}

/**
 * Format date as DD.MM.YYYY for WayForPay
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export class WayForPayProvider implements PaymentProvider {
  readonly name = 'wayforpay';
  private config: WayForPayConfig;

  constructor(config: WayForPayConfig) {
    this.config = config;
  }

  /**
   * Create subscription payment with recurring setup.
   * Returns a URL to our intermediate checkout page that auto-submits to WayForPay.
   */
  async createSubscription(
    clientId: string,
    email: string,
    amount: number = SUBSCRIPTION_AMOUNT,
    currency: string = SUBSCRIPTION_CURRENCY
  ): Promise<SubscriptionResult> {
    try {
      cleanupExpiredOrders();

      const orderReference = `wfp_sub_${clientId}_${Date.now()}`;
      const orderDate = Math.floor(Date.now() / 1000);
      const productName = 'WinBix AI Subscription';
      const productCount = 1;
      const productPrice = amount;

      // Calculate recurring start date (after prepaid period)
      // Amount determines months: $50=1mo, $150=3mo, $300=6mo, $510=12mo
      const monthsMap: Record<number, number> = { 50: 1, 150: 3, 300: 6, 510: 12 };
      const months = monthsMap[amount] || Math.round(amount / 50) || 1;
      const dateNext = new Date();
      dateNext.setMonth(dateNext.getMonth() + months);

      // Recurring end date: 5 years from now
      const dateEnd = new Date();
      dateEnd.setFullYear(dateEnd.getFullYear() + 5);

      // Generate signature for purchase
      const signatureFields = [
        this.config.merchantAccount,
        this.config.merchantDomainName,
        orderReference,
        orderDate,
        amount,
        currency,
        productName,
        productCount,
        productPrice,
      ];
      const signature = generateSignature(this.config.merchantSecretKey, signatureFields);

      const formData: WayForPayFormData = {
        merchantAccount: this.config.merchantAccount,
        merchantDomainName: this.config.merchantDomainName,
        merchantTransactionSecureType: 'AUTO',
        merchantSignature: signature,
        orderReference,
        orderDate: String(orderDate),
        amount: String(amount),
        currency,
        productName: [productName],
        productPrice: [String(productPrice)],
        productCount: [String(productCount)],
        serviceUrl: this.config.serviceUrl,
        returnUrl: this.config.returnUrl,
        language: 'RU',
        clientEmail: email,
        // Recurring params
        regularMode: 'monthly',
        regularAmount: String(SUBSCRIPTION_AMOUNT), // Always $50/month after prepaid
        regularBehavior: 'preset',
        dateNext: formatDate(dateNext),
        dateEnd: formatDate(dateEnd),
      };

      // Store form data for checkout page to retrieve
      pendingOrders.set(orderReference, {
        formData,
        expires: Date.now() + ORDER_TTL_MS,
      });

      return {
        success: true,
        subscriptionId: orderReference,
        paymentUrl: `/api/payments/wayforpay/checkout?ref=${encodeURIComponent(orderReference)}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create one-time payment (for credit top-ups, no recurring)
   */
  async createOneTimePayment(
    clientId: string,
    email: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<SubscriptionResult> {
    try {
      cleanupExpiredOrders();

      const orderReference = `wfp_topup_${clientId}_${Date.now()}`;
      const orderDate = Math.floor(Date.now() / 1000);
      const productName = `WinBix AI Credits Top-Up $${amount}`;
      const productCount = 1;
      const productPrice = amount;

      const signatureFields = [
        this.config.merchantAccount,
        this.config.merchantDomainName,
        orderReference,
        orderDate,
        amount,
        currency,
        productName,
        productCount,
        productPrice,
      ];
      const signature = generateSignature(this.config.merchantSecretKey, signatureFields);

      const formData: WayForPayFormData = {
        merchantAccount: this.config.merchantAccount,
        merchantDomainName: this.config.merchantDomainName,
        merchantTransactionSecureType: 'AUTO',
        merchantSignature: signature,
        orderReference,
        orderDate: String(orderDate),
        amount: String(amount),
        currency,
        productName: [productName],
        productPrice: [String(productPrice)],
        productCount: [String(productCount)],
        serviceUrl: this.config.serviceUrl,
        returnUrl: this.config.returnUrl,
        language: 'RU',
        clientEmail: email,
        // No recurring params for top-ups
      };

      pendingOrders.set(orderReference, {
        formData,
        expires: Date.now() + ORDER_TTL_MS,
      });

      return {
        success: true,
        subscriptionId: orderReference,
        paymentUrl: `/api/payments/wayforpay/checkout?ref=${encodeURIComponent(orderReference)}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel recurring payment via regularApi
   */
  async cancelSubscription(orderReference: string): Promise<void> {
    if (!orderReference) return;

    try {
      const response = await fetch('https://api.wayforpay.com/regularApi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'REMOVE',
          merchantAccount: this.config.merchantAccount,
          merchantPassword: this.config.merchantPassword,
          orderReference,
        }),
      });

      const result = await response.json();
      if (result.reasonCode !== 4100) {
        console.warn(`WayForPay cancel failed for ${orderReference}:`, result.reason);
      }
    } catch (error) {
      console.error('WayForPay cancel error:', error);
    }
  }

  /**
   * Check payment/subscription status
   */
  async getSubscriptionStatus(orderReference: string): Promise<SubscriptionStatus> {
    try {
      const signatureFields = [this.config.merchantAccount, orderReference];
      const signature = generateSignature(this.config.merchantSecretKey, signatureFields);

      const response = await fetch('https://api.wayforpay.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'CHECK_STATUS',
          merchantAccount: this.config.merchantAccount,
          orderReference,
          merchantSignature: signature,
          apiVersion: 1,
        }),
      });

      const result = await response.json();
      const status = result.transactionStatus;

      return {
        active: status === 'Approved',
        status:
          status === 'Approved'
            ? 'active'
            : status === 'InProcessing' || status === 'Pending'
              ? 'pending'
              : status === 'Declined' || status === 'Expired'
                ? 'past_due'
                : 'canceled',
        lastPaymentDate: result.processingDate ? new Date(result.processingDate * 1000) : undefined,
      };
    } catch {
      return { active: false, status: 'past_due' };
    }
  }

  /**
   * Validate and process incoming webhook.
   *
   * WayForPay webhook verification:
   * 1. Extract fields from payload
   * 2. Build signature string: merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
   * 3. HMAC-MD5 with secret key
   * 4. Compare with merchantSignature in payload
   */
  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    try {
      const data = payload as Record<string, unknown>;

      const merchantAccount = data.merchantAccount as string;
      const orderReference = data.orderReference as string;
      const amount = data.amount as number;
      const currency = data.currency as string;
      const authCode = (data.authCode as string) || '';
      const cardPan = (data.cardPan as string) || '';
      const transactionStatus = data.transactionStatus as string;
      const reasonCode = data.reasonCode as number;

      // Validate signature
      const signatureFields = [
        merchantAccount,
        orderReference,
        amount,
        currency,
        authCode,
        cardPan,
        transactionStatus,
        reasonCode,
      ];
      const expectedSignature = generateSignature(this.config.merchantSecretKey, signatureFields);

      if (expectedSignature !== (data.merchantSignature as string)) {
        console.warn('WayForPay webhook signature mismatch');
        return { valid: false, eventType: 'unknown' };
      }

      // Map transaction status to event type
      let eventType: WebhookResult['eventType'] = 'unknown';
      if (transactionStatus === 'Approved') {
        eventType = 'payment_success';
      } else if (transactionStatus === 'Declined' || transactionStatus === 'Expired') {
        eventType = 'payment_failed';
      } else if (transactionStatus === 'Refunded' || transactionStatus === 'Voided') {
        eventType = 'subscription_canceled';
      }

      // Extract clientId from orderReference
      // Format: wfp_sub_clientId_timestamp or wfp_topup_clientId_timestamp
      let clientId: string | undefined;
      if (orderReference) {
        const parts = orderReference.split('_');
        if (parts.length >= 4 && parts[0] === 'wfp') {
          // wfp_sub_clientId_timestamp or wfp_topup_clientId_timestamp
          const prefix = parts[1]; // 'sub' or 'topup'
          if (prefix === 'sub' || prefix === 'topup') {
            clientId = parts.slice(2, -1).join('_');
          }
        }
      }

      return {
        valid: true,
        eventType,
        clientId,
        subscriptionId: orderReference,
        amount,
        currency,
      };
    } catch {
      return { valid: false, eventType: 'unknown' };
    }
  }

  /**
   * Get stored form data for checkout page
   */
  getCheckoutFormData(orderReference: string): WayForPayFormData | null {
    cleanupExpiredOrders();
    const pending = pendingOrders.get(orderReference);
    if (!pending) return null;
    return pending.formData;
  }

  /**
   * Generate required webhook response with signature
   */
  generateCallbackResponse(orderReference: string): {
    orderReference: string;
    status: string;
    time: number;
    signature: string;
  } {
    const time = Math.floor(Date.now() / 1000);
    const signature = generateSignature(this.config.merchantSecretKey, [orderReference, 'accept', time]);

    return {
      orderReference,
      status: 'accept',
      time,
      signature,
    };
  }
}

/**
 * Create WayForPay provider instance from environment variables
 */
export function createWayForPayProvider(): WayForPayProvider | null {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const secretKey = process.env.WAYFORPAY_SECRET_KEY;
  const merchantDomain = process.env.WAYFORPAY_MERCHANT_DOMAIN;
  const merchantPassword = process.env.WAYFORPAY_MERCHANT_PASSWORD;

  if (!merchantAccount || !secretKey) {
    console.warn('WayForPay credentials not configured');
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix.ai';

  return new WayForPayProvider({
    merchantAccount,
    merchantSecretKey: secretKey,
    merchantDomainName: merchantDomain || new URL(baseUrl).hostname,
    merchantPassword: merchantPassword || '',
    serviceUrl: `${baseUrl}/api/payments/webhook/wayforpay`,
    returnUrl: `${baseUrl}/cabinet/billing?status=success`,
  });
}
