// src/test/builder-siteAnalyzer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Site Analyzer', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('should extract business name from title tag', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Acme Dental Clinic</title></head><body></body></html>'),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.businessName).toBe('Acme Dental Clinic');
    expect(profile.url).toBe('https://example.com');
  });

  it('should extract hex colors from inline styles', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title><style>body { color: #ff5733; background: #1a1a2e; }</style></head><body></body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.colors).toContain('#ff5733');
    expect(profile.colors).toContain('#1a1a2e');
  });

  it('should extract font families from CSS', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title><style>body { font-family: "Inter", sans-serif; }</style></head><body></body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.fonts).toContain('Inter');
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.businessName).toBe('example.com');
    expect(profile.pages).toHaveLength(0);
  });

  it('should extract contact info from page content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title></head><body>' +
            '<a href="tel:+1234567890">Call us</a>' +
            '<a href="mailto:info@example.com">Email</a>' +
            '</body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.contactInfo?.phone).toBe('+1234567890');
    expect(profile.contactInfo?.email).toBe('info@example.com');
  });
});
