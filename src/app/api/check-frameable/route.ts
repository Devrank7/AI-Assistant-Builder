import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/check-frameable?url=https://example.com
 *
 * Makes a HEAD request to the given URL and inspects response headers
 * to determine whether the site can be embedded in an iframe.
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
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

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
