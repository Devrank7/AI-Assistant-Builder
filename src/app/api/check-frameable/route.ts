import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/check-frameable?url=https://example.com
 *
 * Makes a GET request to the given URL and inspects response headers
 * to determine whether the site can be embedded in an iframe.
 * Uses GET instead of HEAD because many servers don't return
 * X-Frame-Options or CSP headers on HEAD requests.
 *
 * Returns: { reachable: boolean, frameable: boolean }
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ reachable: false, frameable: false });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeout);

    // Consume body to free resources (we only need headers)
    try {
      await res.text();
    } catch {}

    // Check X-Frame-Options header
    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase().trim();
    const xfoBlocked = xfo === 'deny' || xfo === 'sameorigin';

    // Check Content-Security-Policy frame-ancestors directive
    const csp = res.headers.get('content-security-policy') || '';
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    let cspBlocked = false;
    if (frameAncestorsMatch) {
      const ancestors = frameAncestorsMatch[1].trim().toLowerCase();
      // 'none' or 'self' (without other origins) means no external framing
      cspBlocked = ancestors === "'none'" || ancestors === "'self'";
    }

    return NextResponse.json({
      reachable: true,
      frameable: !xfoBlocked && !cspBlocked,
    });
  } catch {
    // Network error, DNS failure, timeout, SSL error, connection refused
    return NextResponse.json({ reachable: false, frameable: false });
  }
}
