/**
 * Customer Profile Detail API
 *
 * GET /api/customers/[visitorId]?clientId=xxx - Get full profile
 * PATCH /api/customers/[visitorId] - Update profile (tags, notes)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CustomerProfile from '@/models/CustomerProfile';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ visitorId: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { visitorId } = await params;
    const clientId = new URL(request.url).searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const profile = await CustomerProfile.findOne({ clientId, visitorId }).lean();
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ visitorId: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { visitorId } = await params;
    const body = await request.json();
    const { clientId, tags, name, email, phone, assignedPersona } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (tags !== undefined) update.tags = tags;
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (assignedPersona !== undefined) update.assignedPersona = assignedPersona;

    const profile = await CustomerProfile.findOneAndUpdate(
      { clientId, visitorId },
      { $set: update },
      { new: true }
    ).lean();

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Customer update API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
