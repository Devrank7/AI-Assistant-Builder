/**
 * Unit Tests: Invoice Generator
 *
 * Tests for src/lib/invoiceGenerator.ts - HTML invoice generation
 */

import { describe, it, expect } from 'vitest';
import { generateInvoiceHTML } from '@/lib/invoiceGenerator';
import { IInvoice } from '@/models/Invoice';

describe('Invoice Generator', () => {
  const mockInvoice = {
    invoiceNumber: 'INV-202602-0001',
    amount: 50,
    currency: 'USD',
    status: 'paid',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-02-28'),
    paidAt: new Date('2026-02-01'),
    description: 'AI Widget Subscription - February 2026',
    createdAt: new Date('2026-02-01'),
    metadata: {
      tokensUsed: 150000,
      requestsCount: 500,
      costBreakdown: {
        apiCost: 5.25,
        subscriptionFee: 50,
      },
    },
  } as unknown as IInvoice;

  const mockClient = {
    username: 'Test Client',
    email: 'test@example.com',
    website: 'https://example.com',
    phone: '+380991234567',
  };

  const mockCompany = {
    name: 'ChatBot Fusion',
    email: 'billing@chatbotfusion.com',
    website: 'https://chatbotfusion.com',
    address: 'Kyiv, Ukraine',
  };

  describe('generateInvoiceHTML()', () => {
    it('should generate valid HTML document', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="ru">');
      expect(html).toContain('</html>');
    });

    it('should include invoice number', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('INV-202602-0001');
    });

    it('should include client information', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('Test Client');
      expect(html).toContain('test@example.com');
      expect(html).toContain('https://example.com');
    });

    it('should include company information', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('ChatBot Fusion');
      expect(html).toContain('billing@chatbotfusion.com');
    });

    it('should format amount correctly', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('$50.00');
    });

    it('should show paid status with green color', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('#10b981'); // green for paid
      expect(html).toContain('Оплачен');
    });

    it('should include cost breakdown when available', () => {
      const html = generateInvoiceHTML({
        invoice: mockInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('$5.25'); // API cost
      expect(html).toContain('150'); // tokens (partial match)
    });

    it('should show pending status with yellow color', () => {
      const pendingInvoice = { ...mockInvoice, status: 'pending', paidAt: null } as unknown as IInvoice;
      const html = generateInvoiceHTML({
        invoice: pendingInvoice,
        client: mockClient,
        company: mockCompany,
      });

      expect(html).toContain('#f59e0b'); // yellow for pending
      expect(html).toContain('Ожидает оплаты');
    });
  });
});
