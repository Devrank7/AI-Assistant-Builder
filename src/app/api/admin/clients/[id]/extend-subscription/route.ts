import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { months, reason } = body;

    // Validate months
    if (!months || !Number.isInteger(months) || months < 1 || months > 12) {
      return NextResponse.json({ success: false, error: 'Invalid months. Must be integer 1-12' }, { status: 400 });
    }

    await connectDB();

    const client = await Client.findOne({ clientId: id });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Calculate new nextPaymentDate
    // If client has remaining prepaid time, extend from that date (don't lose remaining days)
    const now = new Date();
    const baseDate =
      client.nextPaymentDate && new Date(client.nextPaymentDate) > now ? new Date(client.nextPaymentDate) : now;
    const nextPaymentDate = new Date(baseDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);

    const updated = await Client.findOneAndUpdate(
      { clientId: id },
      {
        $set: {
          isActive: true,
          subscriptionStatus: 'active',
          nextPaymentDate,
          prepaidUntil: nextPaymentDate,
          gracePeriodEnd: null,
          paymentFailedCount: 0,
        },
      },
      { new: true }
    );

    console.log(
      `[Admin] Subscription extended for ${id}: +${months} months, next payment: ${nextPaymentDate.toISOString()}${reason ? `, reason: ${reason}` : ''}`
    );

    return NextResponse.json({
      success: true,
      client: {
        nextPaymentDate: updated!.nextPaymentDate,
        prepaidUntil: updated!.prepaidUntil,
        subscriptionStatus: updated!.subscriptionStatus,
        isActive: updated!.isActive,
      },
    });
  } catch (error) {
    console.error('Error extending subscription:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
