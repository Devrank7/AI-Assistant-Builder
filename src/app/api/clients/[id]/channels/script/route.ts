import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyAdmin } from '@/lib/auth';
import { loadChannelScript, invalidateScriptCache, readScriptSource } from '@/lib/scriptRunner';

const WIDGETS_DIR = path.join(process.cwd(), 'widgets');

type DetectedChannel = 'instagram' | 'whatsapp' | 'telegram-bot';
const VALID_CHANNELS: DetectedChannel[] = ['instagram', 'whatsapp', 'telegram-bot'];

/**
 * GET /api/clients/[id]/channels/script?channel=whatsapp
 * Returns script source code and metadata
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const channel = request.nextUrl.searchParams.get('channel') as DetectedChannel;

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ success: false, error: 'Invalid channel parameter' }, { status: 400 });
    }

    const code = readScriptSource(clientId, channel);
    if (!code) {
      return NextResponse.json({ success: true, hasScript: false });
    }

    const script = loadChannelScript(clientId, channel);
    const scriptPath = path.join(WIDGETS_DIR, clientId, channel, 'script.js');
    let lastModified: string | null = null;
    try {
      const stat = fs.statSync(scriptPath);
      lastModified = stat.mtime.toISOString();
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      hasScript: true,
      code,
      meta: script?.meta || null,
      lastModified,
    });
  } catch (error) {
    console.error('Error reading script:', error);
    return NextResponse.json({ success: false, error: 'Failed to read script' }, { status: 500 });
  }
}

/**
 * PUT /api/clients/[id]/channels/script?channel=whatsapp
 * Writes script.js and clears cache
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;

    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const channel = request.nextUrl.searchParams.get('channel') as DetectedChannel;
    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ success: false, error: 'Invalid channel parameter' }, { status: 400 });
    }

    const body = await request.json();
    const code = body.code;
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing code in body' }, { status: 400 });
    }

    // Ensure channel directory exists
    const channelDir = path.join(WIDGETS_DIR, clientId, channel);
    const resolved = path.resolve(channelDir);
    if (!resolved.startsWith(path.resolve(WIDGETS_DIR))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }

    fs.mkdirSync(channelDir, { recursive: true });
    fs.writeFileSync(path.join(channelDir, 'script.js'), code, 'utf-8');

    // Clear cache so the new script is picked up immediately
    invalidateScriptCache(clientId, channel);

    // Try to load to validate
    const script = loadChannelScript(clientId, channel);

    return NextResponse.json({
      success: true,
      meta: script?.meta || null,
    });
  } catch (error) {
    console.error('Error writing script:', error);
    return NextResponse.json({ success: false, error: 'Failed to write script' }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id]/channels/script?channel=whatsapp
 * Removes script.js and clears cache
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;

    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const channel = request.nextUrl.searchParams.get('channel') as DetectedChannel;
    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ success: false, error: 'Invalid channel parameter' }, { status: 400 });
    }

    const scriptPath = path.join(WIDGETS_DIR, clientId, channel, 'script.js');
    const resolved = path.resolve(scriptPath);
    if (!resolved.startsWith(path.resolve(WIDGETS_DIR))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }

    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    invalidateScriptCache(clientId, channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete script' }, { status: 500 });
  }
}
