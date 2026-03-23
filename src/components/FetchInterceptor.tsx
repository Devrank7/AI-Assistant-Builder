'use client';

import { useEffect } from 'react';

/**
 * Global fetch interceptor that auto-adds `credentials: 'include'`
 * to all requests to internal API routes (/api/).
 *
 * Without this, cookies (auth tokens) are not sent with fetch requests
 * in production (behind nginx proxy), causing "Not Authenticated" errors.
 */
export default function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      // Determine the URL string
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      }

      // Auto-add credentials for internal API calls
      if (url.startsWith('/api/') || url.includes('/api/')) {
        init = { ...init, credentials: 'include' };
      }

      return originalFetch.call(window, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
