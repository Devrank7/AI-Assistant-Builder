import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://api.stripe.com';

async function stripeFetch(
  path: string,
  secretKey: string,
  options?: RequestInit & { formBody?: Record<string, string> }
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    ...((options?.headers as Record<string, string>) || {}),
  };

  const fetchOpts: RequestInit = {
    ...options,
    headers,
  };

  // Stripe uses form-urlencoded for POST requests
  if (options?.formBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetchOpts.body = new URLSearchParams(options.formBody).toString();
    fetchOpts.headers = headers;
  }

  return fetch(`${BASE_URL}${path}`, fetchOpts);
}

export const stripePlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await stripeFetch('/v1/balance', credentials.apiKey);
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid Stripe API key',
            suggestion: 'Check your secret key at Stripe Dashboard > Developers > API keys.',
          };
        return { healthy: false, error: `Stripe API error: ${res.status}` };
      }
      const data = await res.json();
      return {
        healthy: true,
        details: {
          currency: data.available?.[0]?.currency || 'unknown',
          availableBalance: data.available?.[0]?.amount || 0,
        },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or Stripe service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const secretKey = credentials.apiKey;
    try {
      switch (action) {
        case 'createPaymentLink': {
          // First create a price
          const amount = Math.round(Number(params.amount) * 100); // cents
          const currency = (params.currency as string) || 'usd';

          const priceRes = await stripeFetch('/v1/prices', secretKey, {
            method: 'POST',
            formBody: {
              unit_amount: String(amount),
              currency: currency,
              'product_data[name]': (params.description as string) || 'Payment',
            },
          });
          if (!priceRes.ok) {
            const errBody = await priceRes.text().catch(() => '');
            return {
              success: false,
              error: `Stripe price creation failed: ${errBody.slice(0, 200)}`,
              retryable: priceRes.status >= 500,
            };
          }
          const priceData = await priceRes.json();

          // Create payment link
          const linkRes = await stripeFetch('/v1/payment_links', secretKey, {
            method: 'POST',
            formBody: {
              'line_items[0][price]': priceData.id,
              'line_items[0][quantity]': '1',
            },
          });
          if (!linkRes.ok) {
            const errBody = await linkRes.text().catch(() => '');
            return {
              success: false,
              error: `Stripe payment link failed: ${errBody.slice(0, 200)}`,
              retryable: linkRes.status >= 500,
            };
          }
          const linkData = await linkRes.json();
          return {
            success: true,
            data: { id: linkData.id, url: linkData.url },
          };
        }

        case 'checkPayment': {
          const paymentId = String(params.paymentId);
          const res = await stripeFetch(`/v1/payment_intents/${paymentId}`, secretKey);
          if (!res.ok) {
            return {
              success: false,
              error: `Stripe error: ${res.status}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              id: data.id,
              status: data.status,
              amount: data.amount,
              currency: data.currency,
            },
          };
        }

        case 'createCustomer': {
          const formBody: Record<string, string> = {};
          if (params.email) formBody.email = String(params.email);
          if (params.name) formBody.name = String(params.name);
          if (params.phone) formBody.phone = String(params.phone);
          if (params.description) formBody.description = String(params.description);

          const res = await stripeFetch('/v1/customers', secretKey, {
            method: 'POST',
            formBody,
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `Stripe error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: { id: data.id, email: data.email },
          };
        }

        case 'listProducts': {
          const limit = params.limit ? String(params.limit) : '10';
          const res = await stripeFetch(`/v1/products?limit=${limit}&active=true`, secretKey);
          if (!res.ok) return { success: false, error: `Stripe error: ${res.status}` };
          const data = await res.json();
          return {
            success: true,
            data: {
              products: (data.data || []).map((p: Record<string, unknown>) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                active: p.active,
              })),
              total: data.data?.length || 0,
            },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
        retryable: true,
      };
    }
  },

  describeCapabilities() {
    return 'Stripe Payments: Create payment links, check payment status, create customers, list products.';
  },
};
