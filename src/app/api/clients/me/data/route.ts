/**
 * DELETE /api/clients/me/data
 *
 * GDPR Right to Erasure — deletes all client data:
 * - Chat logs (messages, IP, user agent)
 * - Knowledge base chunks
 * - AI settings
 * - Audit logs
 * - Feedback records
 * - Channel configs
 * - Deactivates client account (keeps minimal record for billing/legal)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings from '@/models/AISettings';
import AuditLog from '@/models/AuditLog';
import Feedback from '@/models/Feedback';
import ChannelConfig from '@/models/ChannelConfig';
import { verifyClient } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyClient(request);
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = auth.clientId;
    await connectDB();

    // Verify client exists
    const client = await Client.findOne({ clientId });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Delete all associated data
    const results = await Promise.allSettled([
      ChatLog.deleteMany({ clientId }),
      KnowledgeChunk.deleteMany({ clientId }),
      AISettings.deleteMany({ clientId }),
      AuditLog.deleteMany({ $or: [{ targetId: clientId }, { actor: clientId }] }),
      Feedback.deleteMany({ clientId }),
      ChannelConfig.deleteMany({ clientId }),
    ]);

    // Count deleted records
    const deleted: Record<string, number> = {};
    const collections = ['chatLogs', 'knowledge', 'aiSettings', 'auditLogs', 'feedback', 'channelConfigs'];
    results.forEach((r, i) => {
      deleted[collections[i]] = r.status === 'fulfilled' ? r.value.deletedCount || 0 : 0;
    });

    // Deactivate client and clear personal data (keep clientId for billing records)
    await Client.updateOne(
      { clientId },
      {
        isActive: false,
        subscriptionStatus: 'canceled',
        email: '',
        phone: '',
        telegram: '',
        instagram: '',
        addresses: [],
        clientToken: '', // Invalidate token
      }
    );

    console.log(`[GDPR] Data deleted for client ${clientId}:`, deleted);

    // Clear auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'All data has been deleted',
      deleted,
    });
    response.cookies.set('client_token', '', { maxAge: 0, path: '/' });

    return response;
  } catch (error) {
    console.error('[GDPR] Data deletion error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
