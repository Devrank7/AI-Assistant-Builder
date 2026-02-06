/**
 * Unit Tests: Webhook Service
 *
 * Tests for src/lib/webhookService.ts - Signature generation and verification
 */

import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature, generateWebhookSecret } from '@/lib/webhookService';
import crypto from 'crypto';

describe('Webhook Service', () => {
  describe('generateWebhookSecret()', () => {
    it('should generate a secret with whsec_ prefix', () => {
      const secret = generateWebhookSecret();
      expect(secret.startsWith('whsec_')).toBe(true);
    });

    it('should generate unique secrets each time', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate secret of proper length', () => {
      const secret = generateWebhookSecret();
      // whsec_ (6 chars) + 48 hex chars (24 bytes) = 54 chars
      expect(secret.length).toBe(54);
    });
  });

  describe('verifyWebhookSignature()', () => {
    const testSecret = 'whsec_test_secret_123';
    const testPayload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });

    function generateTestSignature(payload: string, secret: string): string {
      return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    it('should return true for valid signature', () => {
      const signature = generateTestSignature(testPayload, testSecret);
      const isValid = verifyWebhookSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const wrongSignature = 'a'.repeat(64); // fake hex signature
      const isValid = verifyWebhookSignature(testPayload, wrongSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should return false for wrong secret', () => {
      const signature = generateTestSignature(testPayload, testSecret);
      const isValid = verifyWebhookSignature(testPayload, signature, 'wrong_secret');
      expect(isValid).toBe(false);
    });

    it('should return false for modified payload', () => {
      const signature = generateTestSignature(testPayload, testSecret);
      const modifiedPayload = testPayload.replace('bar', 'baz');
      const isValid = verifyWebhookSignature(modifiedPayload, signature, testSecret);
      expect(isValid).toBe(false);
    });
  });
});
