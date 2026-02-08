import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { scanChannelFolders, type ChannelFolderInfo } from '@/lib/widgetScanner';
import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';

export interface ChannelInfo {
  channel: string;
  folderExists: boolean;
  isActive: boolean;
  provider?: string;
  fileConfig?: Record<string, unknown>;
  hasScript?: boolean;
  scriptMeta?: { version: string; description: string; provider?: string };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;

    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 1. Scan filesystem for channel folders
    const folderChannels: ChannelFolderInfo[] = scanChannelFolders(clientId);

    // 2. Get DB channel configs
    await connectDB();
    const dbConfigs = await ChannelConfig.find({ clientId }).lean();

    // 3. Merge: filesystem + DB
    const channelMap = new Map<string, ChannelInfo>();

    // Start with filesystem detections
    for (const fc of folderChannels) {
      channelMap.set(fc.channel, {
        channel: fc.channel,
        folderExists: true,
        isActive: (fc.config?.isActive as boolean) ?? false,
        provider: fc.scriptMeta?.provider || (fc.config?.provider as string | undefined),
        fileConfig: fc.config,
        hasScript: fc.hasScript,
        scriptMeta: fc.scriptMeta,
      });
    }

    // Overlay DB data
    for (const dc of dbConfigs) {
      const existing = channelMap.get(dc.channel);
      if (existing) {
        existing.isActive = dc.isActive;
        existing.provider = dc.provider || existing.provider;
      } else {
        channelMap.set(dc.channel, {
          channel: dc.channel,
          folderExists: false,
          isActive: dc.isActive,
          provider: dc.provider,
        });
      }
    }

    return NextResponse.json({
      success: true,
      channels: Array.from(channelMap.values()),
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch channels' }, { status: 500 });
  }
}
