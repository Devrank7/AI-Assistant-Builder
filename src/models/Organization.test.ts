import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// We test the schema shape and defaults, not DB persistence
describe('Organization model', () => {
  let Organization: typeof import('@/models/Organization').default;

  beforeEach(async () => {
    vi.resetModules();
    // Clear cached model to avoid OverwriteModelError
    delete mongoose.models.Organization;
    // mongoose.modelSchemas may not exist in newer mongoose versions
    if ((mongoose as any).modelSchemas) {
      delete (mongoose as any).modelSchemas.Organization;
    }
    Organization = (await import('@/models/Organization')).default;
  });

  it('creates with correct defaults', () => {
    const org = new Organization({
      name: 'Test Org',
      ownerId: 'user123',
    });
    expect(org.name).toBe('Test Org');
    expect(org.ownerId).toBe('user123');
    expect(org.plan).toBe('free');
    expect(org.billingPeriod).toBe('monthly');
    expect(org.subscriptionStatus).toBe('active');
    expect(org.limits.maxWidgets).toBe(1);
    expect(org.limits.maxMessages).toBe(100);
    expect(org.limits.maxTeamMembers).toBe(1);
  });

  it('accepts all valid plan values', () => {
    const plans = ['free', 'starter', 'pro', 'enterprise'] as const;
    for (const plan of plans) {
      const org = new Organization({ name: 'Test', ownerId: 'u1', plan });
      expect(org.plan).toBe(plan);
    }
  });

  it('stores stripe fields', () => {
    const org = new Organization({
      name: 'Test',
      ownerId: 'u1',
      stripeCustomerId: 'cus_abc',
      stripeSubscriptionId: 'sub_xyz',
    });
    expect(org.stripeCustomerId).toBe('cus_abc');
    expect(org.stripeSubscriptionId).toBe('sub_xyz');
  });
});
