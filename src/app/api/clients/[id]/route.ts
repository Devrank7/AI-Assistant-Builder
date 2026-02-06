import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { listWidgetFiles } from '@/lib/widgetScanner';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // If client, ensure they can only access their own data
    if (auth.role === 'client' && auth.clientId !== id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const client = await Client.findOne({ clientId: id });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Получаем список файлов виджета
    const files = listWidgetFiles(client.folderPath);

    return NextResponse.json({
      success: true,
      client,
      files,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication - only admins can update clients
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update client data
    if (auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    const client = await Client.findOneAndUpdate({ clientId: id }, { $set: body }, { new: true });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ success: false, error: 'Failed to update client' }, { status: 500 });
  }
}
