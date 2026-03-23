'use client';

import { useEffect } from 'react';

/**
 * Global fetch interceptor:
 * 1. Auto-adds `credentials: 'include'` to all /api/ calls
 * 2. On 401 response, automatically refreshes the token and retries the request ONCE
 *
 * This ensures users NEVER see "Not Authenticated" errors due to expired tokens.
 * The access_token expires every 15 minutes — this interceptor silently refreshes it.
 */
export default function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let isRefreshing = false;
    let refreshPromise: Promise<boolean> | null = null;

    async function refreshToken(): Promise<boolean> {
      try {
        const res = await originalFetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        return res.ok;
      } catch {
        return false;
      }
    }

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      }

      const isApiCall = url.startsWith('/api/') || url.includes('/api/');
      const isAuthRoute =
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/refresh') ||
        url.includes('/api/auth/logout') ||
        url.includes('/api/auth/google');

      // Auto-add credentials for internal API calls
      if (isApiCall) {
        init = { ...init, credentials: 'include' };
      }

      const response = await originalFetch(input, init);

      // Don't retry auth routes (avoid infinite loops)
      if (!isApiCall || isAuthRoute) {
        return response;
      }

      // On 401, try refreshing the token and retry once
      if (response.status === 401) {
        // Deduplicate concurrent refresh attempts
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const refreshed = await (refreshPromise || refreshToken());

        if (refreshed) {
          // Retry the original request with fresh token
          return originalFetch(input, init);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
