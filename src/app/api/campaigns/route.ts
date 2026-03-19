/**
 * Outbound Campaigns API
 *
 * GET /api/campaigns?clientId=xxx - List campaigns
 * POST /api/campaigns - Create campaign
 * PATCH /api/campaigns - Update campaign
 * DELETE /api/campaigns?id=xxx - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OutboundCampaign from '@/models/OutboundCampaign';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const clientId = new URL(request.url).searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const campaigns = await OutboundCampaign.find({ clientId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error('Campaigns GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { clientId, name, trigger, triggerConfig, channel, messageTemplate, targetTags, excludeTags } = body;

    if (!clientId || !name || !trigger || !messageTemplate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const campaign = await OutboundCampaign.create({
      clientId,
      name,
      trigger,
      triggerConfig,
      channel,
      messageTemplate,
      targetTags,
      excludeTags,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Campaigns POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign id is required' }, { status: 400 });
    }

    const campaign = await OutboundCampaign.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('Campaigns PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign id is required' }, { status: 400 });
    }

    await OutboundCampaign.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Campaigns DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
