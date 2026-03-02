import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ShortLink from '@/models/ShortLink';

function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host') || 'winbix-ai.xyz'}`;
}

/**
 * GET /d/[code] — Redirect short link to full demo URL
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const base = getBaseUrl(_request);
  try {
    const { code } = await params;
    await connectDB();

    const link = await ShortLink.findOne({ code });
    if (!link) {
      return NextResponse.redirect(`${base}/`, 302);
    }

    const demoUrl = link.website
      ? `${base}/demo/client-website?client=${link.clientId}&type=${link.widgetType}&website=${encodeURIComponent(link.website)}`
      : `${base}/demo/client-website?client=${link.clientId}&type=${link.widgetType}`;

    return NextResponse.redirect(demoUrl, 302);
  } catch (error) {
    console.error('[ShortLink] Redirect error:', error);
    return NextResponse.redirect(`${base}/`, 302);
  }
}
