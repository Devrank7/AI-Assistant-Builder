import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AISettings from '@/models/AISettings';
import { defaultSystemPrompt } from '@/models/AISettings'; // Fix import if needed or use string directly
import InstagramConfig from '@/models/InstagramConfig';
import { invalidatePromptCache } from '@/lib/gemini';
import { getModelIds, GEMINI_MODELS } from '@/lib/models'; // Ensure this exists or mock/fix
import { verifyAdminOrClient } from '@/lib/auth';
import { exportClientSeed } from '@/lib/exportSeed';

const INSTAGRAM_BOT_ID = '_instagram_assistant_';

// GET - Get AI settings for a client
export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params;

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // If authenticated as client, ensure they are accessing their own data
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    let settings = await AISettings.findOne({ clientId });

    // Create default settings if none exist
    if (!settings) {
      settings = await AISettings.create({
        clientId,
        systemPrompt: defaultSystemPrompt || 'You are a helpful AI assistant.',
        greeting: 'Привет! Чем могу помочь?',
        temperature: 0.7,
        maxTokens: 1024,
        topK: 3,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
      availableModels: GEMINI_MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        tier: m.tier,
        description: m.description,
        isDefault: m.isDefault,
      })),
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch AI settings' }, { status: 500 });
  }
}

// PUT - Update AI settings
export async function PUT(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params;

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();

    // Validate model if provided
    if (body.aiModel && !getModelIds().includes(body.aiModel)) {
      return NextResponse.json(
        { success: false, error: `Invalid model. Available: ${getModelIds().join(', ')}` },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = ['aiModel', 'systemPrompt', 'greeting', 'temperature', 'maxTokens', 'topK', 'handoffEnabled'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const settings = await AISettings.findOneAndUpdate({ clientId }, { $set: updateData }, { new: true, upsert: true });

    // If system prompt was updated, invalidate the cached context
    if (updateData.systemPrompt) {
      await invalidatePromptCache(clientId);
    }

    // Sync shared fields to InstagramConfig (so ManyChat uses the same prompt)
    const syncFields: Record<string, unknown> = {};
    if (updateData.systemPrompt !== undefined) syncFields.systemPrompt = updateData.systemPrompt;
    if (updateData.aiModel !== undefined) syncFields.aiModel = updateData.aiModel;
    if (updateData.temperature !== undefined) syncFields.temperature = updateData.temperature;
    if (updateData.maxTokens !== undefined) syncFields.maxTokens = updateData.maxTokens;

    if (Object.keys(syncFields).length > 0) {
      await InstagramConfig.findOneAndUpdate({}, { $set: syncFields }, { upsert: true }).catch((err: unknown) => {
        console.error(`[AI Settings] Failed to sync to InstagramConfig:`, err);
      });
    }

    // Auto-export seed file on local so it deploys with the code
    exportClientSeed(clientId).catch(() => {});

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update AI settings' }, { status: 500 });
  }
}
