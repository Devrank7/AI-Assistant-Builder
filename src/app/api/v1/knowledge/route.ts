import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import KnowledgeChunk from '@/models/KnowledgeChunk';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read')) return Errors.forbidden('Insufficient scope: read required');

    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get('widgetId');

    await connectDB();

    let clientIds: string[];

    if (widgetId) {
      // Verify widget belongs to this org
      const widget = await Client.findOne({
        clientId: widgetId,
        organizationId: auth.organizationId,
      })
        .select('clientId')
        .lean();

      if (!widget) return Errors.notFound('Widget not found');
      clientIds = [widgetId];
    } else {
      const widgets = await Client.find({ organizationId: auth.organizationId }).select('clientId').lean();
      clientIds = widgets.map((w) => w.clientId);
    }

    if (clientIds.length === 0) {
      return successResponse({ chunks: [], total: 0 });
    }

    // Exclude the embedding vector from the response — it's large and not useful to callers
    const chunks = await KnowledgeChunk.find({ clientId: { $in: clientIds } })
      .select('-embedding')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ chunks, total: chunks.length });
  } catch (error) {
    console.error('v1 GET /knowledge error:', error);
    return Errors.internal('Failed to retrieve knowledge chunks');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'write')) return Errors.forbidden('Insufficient scope: write required');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Errors.badRequest('Invalid JSON body');
    }

    const { widgetId, content, source } = body as {
      widgetId?: string;
      content?: string;
      source?: string;
    };

    if (!widgetId || typeof widgetId !== 'string') {
      return Errors.badRequest('Missing required field: widgetId');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return Errors.badRequest('Missing required field: content');
    }

    await connectDB();

    // Verify the widget belongs to this org
    const widget = await Client.findOne({
      clientId: widgetId,
      organizationId: auth.organizationId,
    })
      .select('clientId')
      .lean();

    if (!widget) return Errors.notFound('Widget not found');

    // Create the chunk without an embedding vector (manual entries don't have embeddings)
    const chunk = await KnowledgeChunk.create({
      clientId: widgetId,
      text: content.trim(),
      embedding: [], // No embedding for manually created chunks
      source: typeof source === 'string' && source.trim() ? source.trim() : 'manual',
    });

    // Return the saved chunk without the embedding field
    const { embedding: _embedding, ...chunkData } = chunk.toObject();
    void _embedding;

    return successResponse({ chunk: chunkData }, 'Knowledge chunk created successfully', 201);
  } catch (error) {
    console.error('v1 POST /knowledge error:', error);
    return Errors.internal('Failed to create knowledge chunk');
  }
}
