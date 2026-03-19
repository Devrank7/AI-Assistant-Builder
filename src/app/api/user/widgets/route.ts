import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const query = auth.organizationId
      ? { organizationId: auth.organizationId }
      : { userId: auth.userId };
    const clients = await Client.find(query)
      .select('clientId username clientType widgetType website createdAt')
      .sort({ createdAt: -1 });

    const widgets = clients.map((c) => ({
      clientId: c.clientId,
      widgetName: c.username,
      clientType: c.clientType,
      widgetType: c.widgetType || 'ai_chat',
      website: c.website,
      createdAt: c.createdAt,
    }));

    return successResponse(widgets);
  } catch (error) {
    console.error('Get user widgets error:', error);
    return Errors.internal('Failed to fetch widgets');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return Errors.badRequest('clientId is required');
    }

    await connectDB();

    const ownershipQuery = auth.organizationId
      ? { clientId, organizationId: auth.organizationId }
      : { clientId, userId: auth.userId };
    const client = await Client.findOne(ownershipQuery);
    if (!client) {
      return Errors.notFound('Widget not found');
    }

    // Delete related data
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;

    if (db) {
      await Promise.allSettled([
        db.collection('knowledgechunks').deleteMany({ clientId }),
        db.collection('aisettings').deleteMany({ clientId }),
        db.collection('chatlogs').deleteMany({ clientId }),
      ]);
    }

    await Client.deleteOne(ownershipQuery);

    return successResponse(undefined, 'Widget deleted successfully');
  } catch (error) {
    console.error('Delete user widget error:', error);
    return Errors.internal('Failed to delete widget');
  }
}
