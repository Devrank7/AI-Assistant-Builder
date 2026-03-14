// src/test/builder-crmSetup.test.ts
import { describe, it, expect } from 'vitest';
import { getCRMSetup, getSupportedProviders } from '@/lib/builder/crmSetup';

describe('CRM Setup Handler', () => {
  it('should return HubSpot setup config', () => {
    const setup = getCRMSetup('hubspot');
    expect(setup).toBeDefined();
    expect(setup!.displayName).toBe('HubSpot');
    expect(setup!.instructionSteps.length).toBeGreaterThan(0);
  });

  it('should return null for unsupported provider', () => {
    const setup = getCRMSetup('unknown-crm');
    expect(setup).toBeNull();
  });

  it('should list supported providers', () => {
    const providers = getSupportedProviders();
    expect(providers).toContain('hubspot');
  });

  it('should have instruction steps as strings', () => {
    const setup = getCRMSetup('hubspot');
    expect(setup!.instructionSteps.every((s) => typeof s === 'string')).toBe(true);
  });
});
