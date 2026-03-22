import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Dashboard and Plans routes protection (JWT user auth)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/plans')) {
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    // Only redirect if BOTH tokens are missing. If access expired but refresh is alive,
    // let the page load — the client-side AuthProvider will auto-refresh.
    if (!accessToken && !refreshToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
      return NextResponse.redirect(new URL('/?auth=login', baseUrl));
    }
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
      return NextResponse.redirect(new URL('/?auth=required', baseUrl));
    }
  }

  // Cabinet routes protection
  if (pathname.startsWith('/cabinet')) {
    const clientToken = request.cookies.get('client_token')?.value;
    if (!clientToken) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
      return NextResponse.redirect(new URL('/?auth=required', baseUrl));
    }
  }

  // Public API routes (no auth required)
  const publicApiPaths = ['/api/clients/demo', '/api/webhooks'];
  if (publicApiPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Admin API routes protection
  const adminApiPaths = [
    '/api/clients',
    '/api/analytics',
    '/api/integrations',
    '/api/audit-log',
    '/api/notifications',
    '/api/invoices',
    '/api/export',
    '/api/payments',
    '/api/contacts',
    '/api/inbox',
    '/api/flows',
    '/api/cobrowsing',
    '/api/video-avatars',
  ];
  if (adminApiPaths.some((p) => pathname.startsWith(p))) {
    const authHeader = request.headers.get('authorization');
    const adminToken = request.cookies.get('admin_token')?.value;
    const clientToken = request.cookies.get('client_token')?.value;
    const accessToken = request.cookies.get('access_token')?.value;
    if (!authHeader && !adminToken && !clientToken && !accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
