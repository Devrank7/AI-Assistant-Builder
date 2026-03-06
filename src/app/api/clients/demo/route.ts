import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '@/lib/mongodb';
import ShortLink from '@/models/ShortLink';

const QUICK_WIDGETS_DIR = path.join(process.cwd(), 'quickwidgets');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';

interface DemoClient {
  name: string;
  clientId: string;
  website: string;
  email: string;
  demoUrl: string;
  shortUrl: string;
  createdAt: string;
}

export async function GET() {
  try {
    if (!fs.existsSync(QUICK_WIDGETS_DIR)) {
      return NextResponse.json({ success: true, clients: [] });
    }

    const folders = fs.readdirSync(QUICK_WIDGETS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    // Load all short links in one query
    await connectDB();
    const shortLinks = await ShortLink.find({ widgetType: 'quick' }).lean();
    const shortLinkMap = new Map(shortLinks.map((sl) => [sl.clientId, sl.code]));

    const clients: DemoClient[] = [];

    for (const folder of folders) {
      const infoPath = path.join(QUICK_WIDGETS_DIR, folder.name, 'info.json');
      if (!fs.existsSync(infoPath)) continue;

      try {
        const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        const website = info.website || '';
        const cid = info.clientId || folder.name;
        const demoUrl = website
          ? `${BASE_URL}/demo/client-website?client=${cid}&website=${encodeURIComponent(website)}`
          : `${BASE_URL}/demo/client-website?client=${cid}`;

        const code = shortLinkMap.get(cid);
        const shortUrl = code ? `${BASE_URL}/d/${code}` : '';

        clients.push({
          name: info.name || folder.name,
          clientId: cid,
          website,
          email: info.email || '',
          demoUrl,
          shortUrl,
          createdAt: info.createdAt || '',
        });
      } catch {
        // Skip malformed info.json
      }
    }

    clients.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, total: clients.length, clients });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to list demo clients: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
