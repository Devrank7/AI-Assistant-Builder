import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Simple feedback schema - stored in a lightweight collection
const feedbackSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messageIndex: { type: Number, required: true },
    rating: { type: String, enum: ['up', 'down', null] },
  },
  { timestamps: true }
);

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

export async function POST(request: NextRequest) {
  try {
    const { clientId, sessionId, messageIndex, rating } = await request.json();

    if (!clientId || !sessionId || messageIndex === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Upsert: update existing or create new
    await Feedback.findOneAndUpdate({ clientId, sessionId, messageIndex }, { rating }, { upsert: true, new: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId required' }, { status: 400 });
    }

    await connectDB();

    const feedback = await Feedback.find({ clientId }).sort({ createdAt: -1 }).limit(200).lean();

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
