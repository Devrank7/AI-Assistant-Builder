import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { generateEmbeddingsBatch, splitTextIntoChunks } from '@/lib/gemini';
import { verifyAdminOrClient } from '@/lib/auth';
import { exportClientSeed } from '@/lib/exportSeed';

// GET - List knowledge chunks for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const includeEmbeddings = searchParams.get('includeEmbeddings') === 'true';
    const selectFields = includeEmbeddings ? 'text source embedding createdAt _id' : 'text source createdAt _id';
    const chunks = await KnowledgeChunk.find({ clientId }).select(selectFields).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, chunks });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch knowledge' }, { status: 500 });
  }
}

// POST - Add new knowledge
export async function POST(request: NextRequest) {
  try {
    const { clientId, text, source } = await request.json();

    if (!clientId || !text) {
      return NextResponse.json({ success: false, error: 'clientId and text are required' }, { status: 400 });
    }

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Split text into chunks
    const textChunks = splitTextIntoChunks(text, 500);

    // Generate all embeddings in parallel batches (15 at a time)
    const embeddings = await generateEmbeddingsBatch(textChunks, 15);

    // Bulk-insert all chunks with their embeddings
    const docs = textChunks.map((chunkText, i) => ({
      clientId,
      text: chunkText,
      embedding: embeddings[i],
      source: source || 'manual',
    }));
    const inserted = await KnowledgeChunk.insertMany(docs);

    const createdChunks = inserted.map((chunk) => ({
      _id: chunk._id,
      text: chunk.text,
      source: chunk.source,
    }));

    // Auto-export seed file on local so it deploys with the code
    exportClientSeed(clientId).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Created ${createdChunks.length} knowledge chunks`,
      chunks: createdChunks,
    });
  } catch (error) {
    console.error('Error adding knowledge:', error);
    return NextResponse.json(
      { success: false, error: `Failed to add knowledge: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove knowledge chunk
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chunkId = searchParams.get('id');
    const clientId = searchParams.get('clientId'); // Required to verify ownership

    if (!chunkId || !clientId) {
      return NextResponse.json({ success: false, error: 'Chunk id and clientId are required' }, { status: 400 });
    }

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Verify ownership before deleting
    const result = await KnowledgeChunk.findOneAndDelete({
      _id: chunkId,
      clientId: clientId, // Strict ownership check
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Chunk not found' }, { status: 404 });
    }

    // Re-export seed file after deletion
    exportClientSeed(clientId).catch(() => {});

    return NextResponse.json({ success: true, message: 'Chunk deleted' });
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete knowledge' }, { status: 500 });
  }
}
