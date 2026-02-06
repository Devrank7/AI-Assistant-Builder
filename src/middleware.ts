import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) return NextResponse.redirect(new URL('/?auth=required', request.url));
  }

  // Cabinet routes protection
  if (pathname.startsWith('/cabinet')) {
    const clientToken = request.cookies.get('client_token')?.value;
    if (!clientToken) return NextResponse.redirect(new URL('/?auth=required', request.url));
  }

  // Admin API routes protection
  const adminApiPaths = [
    '/api/clients',
    '/api/analytics',
    '/api/integrations',
    '/api/audit-log',
    '/api/notifications',
    '/api/invoices',
    '/api/webhooks',
    '/api/export',
    '/api/payments',
  ];
  if (adminApiPaths.some((p) => pathname.startsWith(p))) {
    const authHeader = request.headers.get('authorization');
    const adminToken = request.cookies.get('admin_token')?.value;
    const clientToken = request.cookies.get('client_token')?.value;
    if (!authHeader && !adminToken && !clientToken) {
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
