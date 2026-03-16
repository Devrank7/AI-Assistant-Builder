import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

const mockSave = vi.fn().mockResolvedValue(undefined);

const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  plan: 'none',
  billingPeriod: 'monthly',
  subscriptionStatus: 'trial',
  stripeCustomerId: 'cus_existing123',
  stripeSubscriptionId: null,
  trialEndsAt: null,
  save: mockSave,
};

vi.mock('@/models/User', () => {
  const findByIdFn = vi.fn();
  const findOneFn = vi.fn();
  return {
    default: {
      findById: findByIdFn,
      findOne: findOneFn,
    },
  };
});

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user123',
    user: { email: 'test@example.com', plan: 'none', subscriptionStatus: 'trial' },
  }),
}));

const mockCheckoutSessionCreate = vi.fn();
const mockCustomerCreate = vi.fn();
const mockBillingPortalCreate = vi.fn();
const mockWebhookConstructEvent = vi.fn();
const mockSubscriptionRetrieve = vi.fn();

vi.mock('@/lib/stripe', () => ({
  stripe: {
    customers: { create: (...args: unknown[]) => mockCustomerCreate(...args) },
    checkout: { sessions: { create: (...args: unknown[]) => mockCheckoutSessionCreate(...args) } },
    billingPortal: { sessions: { create: (...args: unknown[]) => mockBillingPortalCreate(...args) } },
    webhooks: { constructEvent: (...args: unknown[]) => mockWebhookConstructEvent(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionRetrieve(...args) },
  },
  getPriceId: vi.fn().mockReturnValue('price_basic_monthly'),
  getPlanFromPriceId: vi.fn().mockReturnValue({ plan: 'basic', billingPeriod: 'monthly' }),
  TRIAL_DAYS: 3,
}));

// --- Imports (after mocks) ---
import { POST as checkoutHandler } from '@/app/api/stripe/checkout/route';
import { POST as portalHandler } from '@/app/api/stripe/portal/route';
import { POST as webhookHandler } from '@/app/api/stripe/webhook/route';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';

// Helper
function createRequest(body?: Record<string, unknown>, headers?: Record<string, string>) {
  const url = 'http://localhost:3000/api/stripe/test';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const init: Record<string, any> = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

function createWebhookRequest(body: string, signature: string) {
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body,
  });
}

async function parseResponse(response: Response) {
  return response.json();
}

// --- Tests ---

describe('Stripe Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);

    // Default mock behaviors
    vi.mocked(verifyUser).mockResolvedValue({
      authenticated: true,
      userId: 'user123',
      user: { email: 'test@example.com', plan: 'none', subscriptionStatus: 'trial' },
    });
  });

  // ==================== CHECKOUT ====================
  describe('POST /api/stripe/checkout', () => {
    it('should create checkout session and return URL', async () => {
      const user = { ...mockUser, stripeCustomerId: 'cus_existing123', trialEndsAt: new Date() };
      vi.mocked(User.findById).mockResolvedValue(user as any);
      mockCheckoutSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session123' });

      const req = createRequest({ plan: 'basic', period: 'monthly' });
      const res = await checkoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://checkout.stripe.com/session123');
      expect(mockCheckoutSessionCreate).toHaveBeenCalledOnce();
    });

    it('should create Stripe customer if none exists', async () => {
      const user = { ...mockUser, stripeCustomerId: '', save: mockSave };
      vi.mocked(User.findById).mockResolvedValue(user as any);
      mockCustomerCreate.mockResolvedValue({ id: 'cus_new123' });
      mockCheckoutSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session456' });

      const req = createRequest({ plan: 'pro', period: 'annual' });
      const res = await checkoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCustomerCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
      expect(user.stripeCustomerId).toBe('cus_new123');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should include trial_period_days if user has not had trial', async () => {
      const user = { ...mockUser, trialEndsAt: null, save: mockSave };
      vi.mocked(User.findById).mockResolvedValue(user as any);
      mockCheckoutSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/trial' });

      const req = createRequest({ plan: 'basic', period: 'monthly' });
      await checkoutHandler(req);

      expect(mockCheckoutSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: { trial_period_days: 3 },
        })
      );
    });

    it('should not include trial if user already had trial', async () => {
      const user = { ...mockUser, trialEndsAt: new Date('2024-01-01'), save: mockSave };
      vi.mocked(User.findById).mockResolvedValue(user as any);
      mockCheckoutSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/notrial' });

      const req = createRequest({ plan: 'basic', period: 'monthly' });
      await checkoutHandler(req);

      const callArgs = mockCheckoutSessionCreate.mock.calls[0][0];
      expect(callArgs.subscription_data).toBeUndefined();
    });

    it('should return 400 for invalid plan', async () => {
      const req = createRequest({ plan: 'enterprise', period: 'monthly' });
      const res = await checkoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid plan');
    });

    it('should return 400 for invalid period', async () => {
      const req = createRequest({ plan: 'basic', period: 'weekly' });
      const res = await checkoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid period');
    });

    it('should return 401 if not authenticated', async () => {
      const { Errors } = await import('@/lib/apiResponse');
      vi.mocked(verifyUser).mockResolvedValue({
        authenticated: false,
        response: Errors.unauthorized('Not authenticated'),
      });

      const req = createRequest({ plan: 'basic', period: 'monthly' });
      const res = await checkoutHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // ==================== PORTAL ====================
  describe('POST /api/stripe/portal', () => {
    it('should return portal URL', async () => {
      const user = { ...mockUser, stripeCustomerId: 'cus_existing123' };
      vi.mocked(User.findById).mockResolvedValue(user as any);
      mockBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal123' });

      const req = createRequest();
      const res = await portalHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://billing.stripe.com/portal123');
      expect(mockBillingPortalCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123',
          return_url: expect.stringContaining('/dashboard'),
        })
      );
    });

    it('should return 400 if user has no stripeCustomerId', async () => {
      const user = { ...mockUser, stripeCustomerId: '' };
      vi.mocked(User.findById).mockResolvedValue(user as any);

      const req = createRequest();
      const res = await portalHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('No billing account');
    });

    it('should return 401 if not authenticated', async () => {
      const { Errors } = await import('@/lib/apiResponse');
      vi.mocked(verifyUser).mockResolvedValue({
        authenticated: false,
        response: Errors.unauthorized('Not authenticated'),
      });

      const req = createRequest();
      const res = await portalHandler(req);

      expect(res.status).toBe(401);
    });
  });

  // ==================== WEBHOOK ====================
  describe('POST /api/stripe/webhook', () => {
    it('should handle checkout.session.completed', async () => {
      const user = { ...mockUser, save: mockSave };
      vi.mocked(User.findOne).mockResolvedValue(user as any);

      mockWebhookConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_existing123',
            subscription: 'sub_123',
          },
        },
      });

      mockSubscriptionRetrieve.mockResolvedValue({
        status: 'active',
        items: { data: [{ price: { id: 'price_basic_monthly' } }] },
        trial_end: null,
      });

      const req = createWebhookRequest('{"type":"checkout.session.completed"}', 'sig_valid');
      const res = await webhookHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(user.plan).toBe('basic');
      expect(user.subscriptionStatus).toBe('active');
      expect(user.stripeSubscriptionId).toBe('sub_123');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should set trialEndsAt for trialing subscription on checkout.session.completed', async () => {
      const user = { ...mockUser, save: mockSave };
      vi.mocked(User.findOne).mockResolvedValue(user as any);

      const trialEnd = Math.floor(Date.now() / 1000) + 86400 * 3;
      mockWebhookConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: { customer: 'cus_existing123', subscription: 'sub_trial' },
        },
      });
      mockSubscriptionRetrieve.mockResolvedValue({
        status: 'trialing',
        trial_end: trialEnd,
        items: { data: [{ price: { id: 'price_basic_monthly' } }] },
      });

      const req = createWebhookRequest('{}', 'sig_valid');
      const res = await webhookHandler(req);

      expect(res.status).toBe(200);
      expect(user.trialEndsAt).toEqual(new Date(trialEnd * 1000));
      expect(user.subscriptionStatus).toBe('trial');
    });

    it('should handle customer.subscription.deleted', async () => {
      const user = {
        ...mockUser,
        plan: 'basic',
        subscriptionStatus: 'active',
        stripeSubscriptionId: 'sub_123',
        save: mockSave,
      };
      vi.mocked(User.findOne).mockResolvedValue(user as any);

      mockWebhookConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_existing123',
          },
        },
      });

      const req = createWebhookRequest('{"type":"customer.subscription.deleted"}', 'sig_valid');
      const res = await webhookHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(user.plan).toBe('none');
      expect(user.subscriptionStatus).toBe('canceled');
      expect(user.stripeSubscriptionId).toBeNull();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated', async () => {
      const user = { ...mockUser, save: mockSave };
      vi.mocked(User.findOne).mockResolvedValue(user as any);

      mockWebhookConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_existing123',
            status: 'active',
            items: { data: [{ price: { id: 'price_basic_monthly' } }] },
          },
        },
      });

      const req = createWebhookRequest('{}', 'sig_valid');
      const res = await webhookHandler(req);

      expect(res.status).toBe(200);
      expect(user.plan).toBe('basic');
      expect(user.subscriptionStatus).toBe('active');
    });

    it('should handle invoice.payment_failed', async () => {
      const user = { ...mockUser, subscriptionStatus: 'active', save: mockSave };
      vi.mocked(User.findOne).mockResolvedValue(user as any);

      mockWebhookConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: { customer: 'cus_existing123' },
        },
      });

      const req = createWebhookRequest('{}', 'sig_valid');
      const res = await webhookHandler(req);

      expect(res.status).toBe(200);
      expect(user.subscriptionStatus).toBe('past_due');
    });

    it('should reject invalid signatures', async () => {
      mockWebhookConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = createWebhookRequest('{"invalid":"body"}', 'sig_invalid');
      const res = await webhookHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid signature');
    });

    it('should return 400 if stripe-signature header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const res = await webhookHandler(req);
      const data = await parseResponse(res);

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing stripe-signature');
    });
  });
});
