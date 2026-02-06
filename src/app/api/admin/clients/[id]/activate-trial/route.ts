import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const client = await Client.findOne({ clientId: id });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (client.subscriptionStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Client status is ${client.subscriptionStatus}, not pending` },
        { status: 400 }
      );
    }

    // Activate Trial
    const now = new Date();
    client.subscriptionStatus = 'trial';
    client.trialActivatedAt = now;
    // Set grace period end to null initially (will be set when trial expires)
    client.gracePeriodEnd = null;

    // Optional: Reset start date to now so creation date doesn't confuse logic?
    // Requirement says "30 days ... activated only when admin clicks".
    // So logic that calculates trial end must use trialActivatedAt if present.
    // We'll handle that in the cron job.

    await client.save();

    return NextResponse.json({
      success: true,
      client: {
        subscriptionStatus: client.subscriptionStatus,
        trialActivatedAt: client.trialActivatedAt,
      },
    });
  } catch (error) {
    console.error('Error activating trial:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
