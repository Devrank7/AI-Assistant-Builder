import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Correction from '@/models/Correction';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { verifyAdminOrClient } from '@/lib/auth';
import { generateEmbedding } from '@/lib/gemini';

/**
 * POST /api/corrections — Submit a correction (client or admin auth)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, sessionId, messageIndex, userQuestion, originalAnswer, correctedAnswer } = await request.json();

    if (!clientId || !sessionId || messageIndex === undefined || !userQuestion || !originalAnswer || !correctedAnswer) {
      return NextResponse.json(
        {
          success: false,
          error:
            'All fields are required: clientId, sessionId, messageIndex, userQuestion, originalAnswer, correctedAnswer',
        },
        { status: 400 }
      );
    }

    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const correction = await Correction.create({
      clientId,
      sessionId,
      messageIndex,
      userQuestion,
      originalAnswer,
      correctedAnswer,
    });

    return NextResponse.json({ success: true, correction }, { status: 201 });
  } catch (error) {
    console.error('Error creating correction:', error);
    return NextResponse.json({ success: false, error: 'Failed to create correction' }, { status: 500 });
  }
}

/**
 * GET /api/corrections?clientId=X — List corrections (admin or client auth)
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

    const corrections = await Correction.find({ clientId }).sort({ createdAt: -1 }).lean();

    const stats = {
      total: corrections.length,
      pending: corrections.filter((c) => c.status === 'pending').length,
      applied: corrections.filter((c) => c.status === 'applied').length,
      rejected: corrections.filter((c) => c.status === 'rejected').length,
    };

    return NextResponse.json({ success: true, corrections, stats });
  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch corrections' }, { status: 500 });
  }
}

/**
 * PATCH /api/corrections — Update correction status (admin only)
 * Body: { correctionId, status, apply? }
 * If apply=true and status='applied', creates a high-priority knowledge chunk
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { correctionId, status, apply } = await request.json();

    if (!correctionId || !status) {
      return NextResponse.json({ success: false, error: 'correctionId and status are required' }, { status: 400 });
    }

    if (!['pending', 'applied', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const updateData: Record<string, unknown> = { status };
    if (status === 'applied') {
      updateData.appliedAt = new Date();
    }

    const correction = await Correction.findByIdAndUpdate(correctionId, { $set: updateData }, { new: true });

    if (!correction) {
      return NextResponse.json({ success: false, error: 'Correction not found' }, { status: 404 });
    }

    // If apply=true and status=applied, create a high-priority knowledge chunk
    if (apply && status === 'applied') {
      const correctionText = `IMPORTANT CORRECTION: When user asks "${correction.userQuestion}", the correct answer is: ${correction.correctedAnswer}`;

      const embedding = await generateEmbedding(correctionText);

      await KnowledgeChunk.create({
        clientId: correction.clientId,
        text: correctionText,
        embedding,
        source: 'correction',
      });
    }

    return NextResponse.json({ success: true, correction });
  } catch (error) {
    console.error('Error updating correction:', error);
    return NextResponse.json({ success: false, error: 'Failed to update correction' }, { status: 500 });
  }
}
