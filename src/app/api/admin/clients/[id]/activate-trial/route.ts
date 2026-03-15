import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import Client from '@/models/Client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    await connectDB();

    const client = await Client.findOne({ clientId: id });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Atomic update to prevent race conditions (double activation)
    const now = new Date();
    const updated = await Client.findOneAndUpdate(
      { clientId: id, subscriptionStatus: 'pending' },
      {
        $set: {
          subscriptionStatus: 'trial',
          trialActivatedAt: now,
          gracePeriodEnd: null,
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Client status is ${client.subscriptionStatus}, not pending` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      client: {
        subscriptionStatus: updated.subscriptionStatus,
        trialActivatedAt: updated.trialActivatedAt,
      },
    });
  } catch (error) {
    console.error('Error activating trial:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
