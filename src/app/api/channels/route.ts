import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';
import { verifyAdminOrClient } from '@/lib/auth';

/**
 * GET /api/channels?clientId=X — List connected channels (admin/client auth)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const channels = await ChannelConfig.find({ clientId })
      .select('-config.token -config.apiKey -config.webhookSecret -config.whapiToken')
      .lean();

    return NextResponse.json({ success: true, channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch channels' }, { status: 500 });
  }
}

/**
 * POST /api/channels — Connect a new channel (admin auth)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { clientId, channel, config, provider } = await request.json();

    if (!clientId || !channel) {
      return NextResponse.json({ success: false, error: 'clientId and channel are required' }, { status: 400 });
    }

    if (!['telegram', 'whatsapp', 'instagram'].includes(channel)) {
      return NextResponse.json({ success: false, error: 'Invalid channel type' }, { status: 400 });
    }

    await connectDB();

    const updateData: Record<string, unknown> = {
      isActive: true,
      config: config || {},
      connectedAt: new Date(),
    };

    // Save provider for WhatsApp/Instagram
    if (provider) {
      if (!['meta', 'whapi', 'manychat'].includes(provider)) {
        return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 });
      }
      updateData.provider = provider;
    }

    const channelConfig = await ChannelConfig.findOneAndUpdate({ clientId, channel }, updateData, {
      upsert: true,
      new: true,
    });

    return NextResponse.json({ success: true, channel: channelConfig }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ success: false, error: 'Failed to create channel' }, { status: 500 });
  }
}

/**
 * PATCH /api/channels — Update channel config (admin auth)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { channelId, isActive, config } = await request.json();

    if (!channelId) {
      return NextResponse.json({ success: false, error: 'channelId is required' }, { status: 400 });
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (config) updateData.config = config;

    const channelConfig = await ChannelConfig.findByIdAndUpdate(channelId, { $set: updateData }, { new: true });

    if (!channelConfig) {
      return NextResponse.json({ success: false, error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, channel: channelConfig });
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ success: false, error: 'Failed to update channel' }, { status: 500 });
  }
}

/**
 * DELETE /api/channels?channelId=X — Disconnect channel (admin auth)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const channelId = request.nextUrl.searchParams.get('channelId');
    if (!channelId) {
      return NextResponse.json({ success: false, error: 'channelId is required' }, { status: 400 });
    }

    await connectDB();

    const result = await ChannelConfig.findByIdAndDelete(channelId);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete channel' }, { status: 500 });
  }
}
