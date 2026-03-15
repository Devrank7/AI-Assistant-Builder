// src/app/api/user/playground/check-frame/route.ts

import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const url = request.nextUrl.searchParams.get('url');
    if (!url) return Errors.badRequest('url parameter required');

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return Errors.badRequest('URL must be http or https');
      }
    } catch {
      return Errors.badRequest('Invalid URL format');
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });

      const xFrameOptions = response.headers.get('x-frame-options')?.toLowerCase();
      const csp = response.headers.get('content-security-policy')?.toLowerCase();

      let frameable = true;

      if (xFrameOptions === 'deny' || xFrameOptions === 'sameorigin') {
        frameable = false;
      }

      if (csp) {
        const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/);
        if (frameAncestors) {
          const value = frameAncestors[1].trim();
          if (value === "'none'" || value === "'self'") {
            frameable = false;
          }
        }
      }

      return successResponse({ frameable });
    } catch {
      // If request fails (timeout, DNS error, etc.), assume not frameable
      return successResponse({ frameable: false });
    }
  } catch (error) {
    console.error('Check-frame error:', error);
    return Errors.internal('Failed to check frameability');
  }
}
