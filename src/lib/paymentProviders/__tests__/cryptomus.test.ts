/**
 * Cryptomus Payment Provider Tests
 *
 * Verifies integration matches official Cryptomus API documentation:
 * - https://doc.cryptomus.com/merchant-api/request-format
 * - https://doc.cryptomus.com/merchant-api/payments/webhook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { CryptomusProvider } from '../cryptomus';

// Mock config
const mockConfig = {
  merchantId: 'test-merchant-id',
  apiKey: 'test-api-key-123',
  webhookUrl: 'https://example.com/webhook',
};

describe('CryptomusProvider', () => {
  let provider: CryptomusProvider;

  beforeEach(() => {
    provider = new CryptomusProvider(mockConfig);
    vi.clearAllMocks();
  });

  describe('Signature Generation', () => {
    it('should generate MD5(base64(json) + apiKey) signature per docs', () => {
      const testData = { amount: '20', currency: 'USDT', order_id: '1' };

      // Expected per Cryptomus docs: md5(base64(json) + apiKey)
      const jsonData = JSON.stringify(testData);
      const base64Data = Buffer.from(jsonData).toString('base64');
      const expectedSign = crypto
        .createHash('md5')
        .update(base64Data + mockConfig.apiKey)
        .digest('hex');

      // Access private method via prototype
      const actualSign = (provider as unknown as { generateSignature: (d: unknown) => string }).generateSignature(
        testData
      );

      expect(actualSign).toBe(expectedSign);
    });

    it('should handle empty object for signature', () => {
      const testData = {};

      const jsonData = JSON.stringify(testData);
      const base64Data = Buffer.from(jsonData).toString('base64');
      const expectedSign = crypto
        .createHash('md5')
        .update(base64Data + mockConfig.apiKey)
        .digest('hex');

      const actualSign = (provider as unknown as { generateSignature: (d: unknown) => string }).generateSignature(
        testData
      );

      expect(actualSign).toBe(expectedSign);
    });
  });

  describe('Webhook Handling', () => {
    it('should extract sign from payload before verification (per docs)', async () => {
      // Create valid webhook payload with sign included
      const payloadWithoutSign = {
        type: 'payment',
        uuid: '62f88b36-a9d5-4fa6-aa26-e040c3dbf26d',
        order_id: '97a75bf8eda5cca41ba9d2e104840fcd',
        amount: '3.00000000',
        status: 'paid',
        currency: 'TRX',
        additional_data: JSON.stringify({ clientId: 'client123' }),
      };

      // Generate valid sign (without sign field in payload)
      const jsonData = JSON.stringify(payloadWithoutSign).replace(/\//g, '\\/');
      const base64Data = Buffer.from(jsonData).toString('base64');
      const validSign = crypto
        .createHash('md5')
        .update(base64Data + mockConfig.apiKey)
        .digest('hex');

      // Payload as received from Cryptomus (sign included in body)
      const webhookPayload = {
        ...payloadWithoutSign,
        sign: validSign,
      };

      const result = await provider.handleWebhook(webhookPayload);

      expect(result.valid).toBe(true);
      expect(result.eventType).toBe('payment_success');
      expect(result.clientId).toBe('client123');
    });

    it('should reject invalid signature', async () => {
      const webhookPayload = {
        type: 'payment',
        uuid: 'test-uuid',
        amount: '10.00',
        status: 'paid',
        currency: 'USDT',
        sign: 'invalid-signature-hash',
      };

      const result = await provider.handleWebhook(webhookPayload);

      expect(result.valid).toBe(false);
      expect(result.eventType).toBe('unknown');
    });

    it('should handle slashes in txid field correctly', async () => {
      // Per docs: JavaScript needs to escape slashes to match PHP behavior
      const payloadWithoutSign = {
        uuid: 'test-uuid',
        amount: '20',
        status: 'paid',
        currency: 'USDT',
        txid: 'someTxidWith/Slash',
        additional_data: null,
      };

      // Generate sign with escaped slashes
      const jsonData = JSON.stringify(payloadWithoutSign).replace(/\//g, '\\/');
      const base64Data = Buffer.from(jsonData).toString('base64');
      const validSign = crypto
        .createHash('md5')
        .update(base64Data + mockConfig.apiKey)
        .digest('hex');

      const webhookPayload = {
        ...payloadWithoutSign,
        sign: validSign,
      };

      const result = await provider.handleWebhook(webhookPayload);

      expect(result.valid).toBe(true);
    });

    it('should map payment statuses correctly', async () => {
      const testCases = [
        { status: 'paid', expected: 'payment_success' },
        { status: 'paid_over', expected: 'payment_success' },
        { status: 'fail', expected: 'payment_failed' },
        { status: 'wrong_amount', expected: 'payment_failed' },
        { status: 'cancel', expected: 'subscription_canceled' },
        { status: 'check', expected: 'unknown' },
      ];

      for (const { status, expected } of testCases) {
        const payload = {
          uuid: 'test-uuid',
          amount: '10',
          status,
          currency: 'USD',
        };

        // Skip signature validation for status mapping test
        const result = await provider.handleWebhook(payload);

        expect(result.eventType).toBe(expected);
      }
    });

    it('should parse additional_data JSON correctly', async () => {
      const additionalData = { clientId: 'client456', email: 'test@example.com' };
      const payload = {
        uuid: 'test-uuid',
        amount: '25.00',
        status: 'paid',
        currency: 'USD',
        additional_data: JSON.stringify(additionalData),
      };

      const result = await provider.handleWebhook(payload);

      expect(result.valid).toBe(true);
      expect(result.clientId).toBe('client456');
    });

    it('should handle missing additional_data gracefully', async () => {
      const payload = {
        uuid: 'test-uuid',
        amount: '15.00',
        status: 'paid',
        currency: 'USDT',
      };

      const result = await provider.handleWebhook(payload);

      expect(result.valid).toBe(true);
      expect(result.clientId).toBeUndefined();
    });
  });
});
