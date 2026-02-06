/**
 * Get current client data (from cookie)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyClient(request);

    // Ensure authenticated and is a client
    if (!auth.authenticated || auth.role !== 'client') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    // Now TS knows auth has clientId because role is 'client'
    const client = await Client.findOne({ clientId: auth.clientId }).select('-__v');

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Get file list if needed (mock for now or implement file listing)
    // For now, returning empty list as in previous implementation
    const files: string[] = [];

    return NextResponse.json({
      success: true,
      client,
      files,
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME,
    });
  } catch (error) {
    console.error('Error fetching client data:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
