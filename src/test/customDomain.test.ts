import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB connection
const mockConnectDB = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));

// Mock CustomDomain model
const mockCreate = vi.fn();
const mockFindOne = vi.fn();
vi.mock('@/models/CustomDomain', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

import { validateDomainFormat } from '@/lib/customDomainService';

describe('Custom Domain Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateDomainFormat', () => {
    it('should accept valid domain formats', () => {
      expect(validateDomainFormat('example.com')).toBe(true);
      expect(validateDomainFormat('sub.example.com')).toBe(true);
      expect(validateDomainFormat('my-site.example.co.uk')).toBe(true);
    });

    it('should reject invalid domain formats', () => {
      expect(validateDomainFormat('')).toBe(false);
      expect(validateDomainFormat('not a domain')).toBe(false);
      expect(validateDomainFormat('http://example.com')).toBe(false);
      expect(validateDomainFormat('.example.com')).toBe(false);
      expect(validateDomainFormat('example')).toBe(false);
    });
  });

  describe('createDomain', () => {
    it('should generate a winbix-verify-xxx verification token', async () => {
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockImplementation((data: Record<string, unknown>) => Promise.resolve(data));

      const { createDomain } = await import('@/lib/customDomainService');
      const result = await createDomain('org123', 'client456', 'chat.example.com');

      expect(result.verificationToken).toMatch(/^winbix-verify-[a-f0-9]{32}$/);
      expect(result.domain).toBe('chat.example.com');
      expect(result.status).toBe('pending_verification');
      expect(result.cnameTarget).toBe('proxy.winbixai.com');
    });

    it('should reject duplicate domains', async () => {
      mockFindOne.mockResolvedValue({ domain: 'taken.example.com' });

      const { createDomain } = await import('@/lib/customDomainService');
      await expect(createDomain('org123', 'client456', 'taken.example.com')).rejects.toThrow(
        'Domain already registered'
      );
    });
  });
});
