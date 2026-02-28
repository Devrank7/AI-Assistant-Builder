import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import InstagramConfig from '@/models/InstagramConfig';

/**
 * PUT /api/instagram-config/context
 * Update Instagram assistant system prompt via Bearer token auth.
 * Body: { "text": "New system prompt" }
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token || token !== process.env.ADMIN_SECRET_TOKEN) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const text = body.text;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Missing or empty "text" field' }, { status: 400 });
    }

    await connectDB();

    const config = await InstagramConfig.findOneAndUpdate(
      {},
      { $set: { systemPrompt: text.trim() } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      systemPrompt: config.systemPrompt,
    });
  } catch (error) {
    console.error('[InstagramConfig/context] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
