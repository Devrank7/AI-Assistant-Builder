import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ShortLink from '@/models/ShortLink';

/**
 * GET /d/[code] — Redirect short link to full demo URL
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    await connectDB();

    const link = await ShortLink.findOne({ code });
    if (!link) {
      return NextResponse.redirect(new URL('/', _request.url));
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${_request.headers.get('host')}`;
    const widgetDir = link.widgetType === 'quick' ? 'quickwidgets' : 'widgets';
    const demoUrl = link.website
      ? `${base}/demo/client-website?client=${link.clientId}&type=${link.widgetType}&website=${encodeURIComponent(link.website)}`
      : `${base}/demo/client-website?client=${link.clientId}&type=${link.widgetType}`;

    return NextResponse.redirect(demoUrl, 302);
  } catch (error) {
    console.error('[ShortLink] Redirect error:', error);
    return NextResponse.redirect(new URL('/', _request.url));
  }
}
