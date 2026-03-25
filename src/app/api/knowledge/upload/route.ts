import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { parseDocument } from '@/lib/documentParser';
import { generateEmbeddingsBatch, splitTextIntoChunks } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;

    if (!file || !clientId) {
      return NextResponse.json({ success: false, error: 'File and clientId are required' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse document
    const parsed = await parseDocument(buffer, file.name);

    // Split into chunks
    const textChunks = splitTextIntoChunks(parsed.text, 500);

    if (textChunks.length === 0) {
      return NextResponse.json({ success: false, error: 'Document is empty or could not be parsed' }, { status: 400 });
    }

    await connectDB();

    // Generate all embeddings in parallel batches, then bulk-insert
    const embeddings = await generateEmbeddingsBatch(textChunks, 15);

    const docs = textChunks.map((text, i) => ({
      clientId,
      text,
      embedding: embeddings[i],
      source: `file:${file.name}`,
    }));
    const inserted = await KnowledgeChunk.insertMany(docs);

    const savedChunks = inserted.map((chunk) => ({
      _id: chunk._id,
      text: chunk.text.substring(0, 100) + '...',
    }));

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name}`,
      metadata: parsed.metadata,
      chunksCreated: savedChunks.length,
      chunks: savedChunks,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    const message = error instanceof Error ? error.message : 'Failed to process document';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
