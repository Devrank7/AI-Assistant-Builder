import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { deleteQuickWidgetFolder } from '@/lib/widgetScanner';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify admin auth via cookie
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id: clientId } = await params;

    const client = await Client.findOne({ clientId });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (client.clientType !== 'quick') {
      return NextResponse.json(
        { success: false, error: 'Only quick widgets can be deleted via this endpoint' },
        { status: 400 }
      );
    }

    // Delete the quickwidgets folder
    deleteQuickWidgetFolder(clientId);

    // Delete related DB records
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;

    if (db) {
      // Clean up knowledge chunks, AI settings, chat logs
      await Promise.allSettled([
        db.collection('knowledgechunks').deleteMany({ clientId }),
        db.collection('aisettings').deleteMany({ clientId }),
        db.collection('chatlogs').deleteMany({ clientId }),
      ]);
    }

    // Delete the client record
    await Client.deleteOne({ clientId });

    return NextResponse.json({ success: true, message: `Quick widget ${clientId} deleted` });
  } catch (error) {
    console.error('Error deleting quick widget:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete quick widget' }, { status: 500 });
  }
}
