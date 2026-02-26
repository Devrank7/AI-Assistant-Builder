import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const QUICK_WIDGETS_DIR = path.join(process.cwd(), 'quickwidgets');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbix-ai.xyz';

interface DemoClient {
  name: string;
  clientId: string;
  website: string;
  email: string;
  demoUrl: string;
  createdAt: string;
}

export async function GET() {
  try {
    if (!fs.existsSync(QUICK_WIDGETS_DIR)) {
      return NextResponse.json({ success: true, clients: [] });
    }

    const folders = fs.readdirSync(QUICK_WIDGETS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    const clients: DemoClient[] = [];

    for (const folder of folders) {
      const infoPath = path.join(QUICK_WIDGETS_DIR, folder.name, 'info.json');
      if (!fs.existsSync(infoPath)) continue;

      try {
        const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        const website = info.website || '';
        const demoUrl = website
          ? `${BASE_URL}/demo/client-website?client=${info.clientId || folder.name}&website=${encodeURIComponent(website)}`
          : `${BASE_URL}/demo/client-website?client=${info.clientId || folder.name}`;

        clients.push({
          name: info.name || folder.name,
          clientId: info.clientId || folder.name,
          website,
          email: info.email || '',
          demoUrl,
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
