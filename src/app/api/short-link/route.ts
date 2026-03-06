import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ShortLink from '@/models/ShortLink';
import { verifyAdmin } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';

/**
 * GET /api/short-link?clientId=xxx — Get short link for a client
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ success: false, error: 'Missing clientId' }, { status: 400 });
  }

  await connectDB();
  const link = await ShortLink.findOne({ clientId });

  return NextResponse.json({
    success: true,
    shortUrl: link ? `${BASE_URL}/d/${link.code}` : null,
    code: link?.code || null,
  });
}
