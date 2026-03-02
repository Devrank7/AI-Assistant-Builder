import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import InstagramConfig from '@/models/InstagramConfig';
import AISettings from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import { verifyAdmin } from '@/lib/auth';

const INSTAGRAM_BOT_ID = '_instagram_assistant_';

/**
 * GET /api/instagram-config — Get global Instagram config
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let config = await InstagramConfig.findOne({});
    if (!config) {
      config = await InstagramConfig.create({});
    }

    return NextResponse.json({
      success: true,
      config: {
        systemPrompt: config.systemPrompt,
        pageAccessToken: config.pageAccessToken,
        pageId: config.pageId,
        isActive: config.isActive,
        aiModel: config.aiModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        processingMessage: config.processingMessage,
      },
    });
  } catch (error) {
    console.error('[InstagramConfig] GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/instagram-config — Update global Instagram config
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const updateFields: Record<string, unknown> = {};
    if (body.systemPrompt !== undefined) updateFields.systemPrompt = body.systemPrompt;
    if (body.pageAccessToken !== undefined) updateFields.pageAccessToken = body.pageAccessToken;
    if (body.pageId !== undefined) updateFields.pageId = body.pageId;
    if (body.isActive !== undefined) updateFields.isActive = body.isActive;
    if (body.aiModel !== undefined) updateFields.aiModel = body.aiModel;
    if (body.temperature !== undefined) updateFields.temperature = Math.min(1, Math.max(0, body.temperature));
    if (body.maxTokens !== undefined) updateFields.maxTokens = Math.min(4096, Math.max(128, body.maxTokens));
    if (body.processingMessage !== undefined) updateFields.processingMessage = body.processingMessage;

    const config = await InstagramConfig.findOneAndUpdate({}, { $set: updateFields }, { upsert: true, new: true });

    // Reverse sync shared fields to AISettings (so widget & all channels use the same prompt)
    const syncFields: Record<string, unknown> = {};
    if (updateFields.systemPrompt !== undefined) syncFields.systemPrompt = updateFields.systemPrompt;
    if (updateFields.aiModel !== undefined) syncFields.aiModel = updateFields.aiModel;
    if (updateFields.temperature !== undefined) syncFields.temperature = updateFields.temperature;
    if (updateFields.maxTokens !== undefined) syncFields.maxTokens = updateFields.maxTokens;

    if (Object.keys(syncFields).length > 0) {
      await AISettings.findOneAndUpdate({ clientId: INSTAGRAM_BOT_ID }, { $set: syncFields }, { upsert: true }).catch(
        (err: unknown) => {
          console.error(`[InstagramConfig] Failed to sync to AISettings:`, err);
        }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        systemPrompt: config.systemPrompt,
        pageAccessToken: config.pageAccessToken,
        pageId: config.pageId,
        isActive: config.isActive,
        aiModel: config.aiModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        processingMessage: config.processingMessage,
      },
    });
  } catch (error) {
    console.error('[InstagramConfig] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/instagram-config — Clear all Instagram chat sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const result = await ChatLog.deleteMany({ clientId: INSTAGRAM_BOT_ID });

    console.log(`[InstagramConfig] Cleared ${result.deletedCount} Instagram chat sessions`);
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[InstagramConfig] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
