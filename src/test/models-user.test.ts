import { describe, it, expect } from 'vitest';

describe('User model schema', () => {
  it('should export a valid Mongoose model', async () => {
    const { default: User } = await import('@/models/User');
    expect(User.modelName).toBe('User');
  });

  it('should require email and passwordHash', async () => {
    const { default: User } = await import('@/models/User');
    const user = new User({});
    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err!.errors.email).toBeDefined();
    expect(err!.errors.passwordHash).toBeDefined();
  });

  it('should have correct default values', async () => {
    const { default: User } = await import('@/models/User');
    const user = new User({
      email: 'test@example.com',
      passwordHash: '$2a$12$hash',
      name: 'Test',
      stripeCustomerId: 'cus_test',
    });
    expect(user.plan).toBe('none');
    expect(user.billingPeriod).toBe('monthly');
    expect(user.subscriptionStatus).toBe('trial');
    expect(user.emailVerified).toBe(false);
    expect(user.refreshTokens).toEqual([]);
  });
});
