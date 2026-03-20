import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import KnowledgeChunk from '@/models/KnowledgeChunk';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'admin')) return Errors.forbidden('Insufficient scope: admin required');

    const { id } = await params;
    await connectDB();

    // Find the chunk first so we can verify it belongs to one of the org's widgets
    const chunk = await KnowledgeChunk.findById(id).select('clientId').lean();
    if (!chunk) return Errors.notFound('Knowledge chunk not found');

    // Ensure the chunk's owning widget belongs to this org
    const widget = await Client.findOne({
      clientId: chunk.clientId,
      organizationId: auth.organizationId,
    })
      .select('clientId')
      .lean();

    if (!widget) {
      // Widget doesn't belong to this org — return 404 to avoid leaking existence
      return Errors.notFound('Knowledge chunk not found');
    }

    await KnowledgeChunk.findByIdAndDelete(id);

    return successResponse({ id }, 'Knowledge chunk deleted successfully');
  } catch (error) {
    console.error('v1 DELETE /knowledge/[id] error:', error);
    return Errors.internal('Failed to delete knowledge chunk');
  }
}
