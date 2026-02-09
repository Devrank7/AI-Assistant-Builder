import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { scanWidgetFolders, readClientInfo, scanQuickWidgetFolders, readQuickWidgetInfo } from '@/lib/widgetScanner';
import { generateClientToken } from '@/lib/tokenUtils';

export async function GET() {
  try {
    await connectDB();

    const foundClientIds = new Set<string>();

    // --- Scan regular widgets/ folder ---
    const widgetFolders = scanWidgetFolders();

    for (const folder of widgetFolders) {
      if (!folder.hasInfo) continue;

      const clientInfo = readClientInfo(folder.folderPath);
      if (!clientInfo) continue;

      foundClientIds.add(folder.clientId);

      const existingClient = await Client.findOne({ clientId: folder.clientId });

      if (!existingClient) {
        await Client.create({
          clientId: folder.clientId,
          clientToken: clientInfo.clientToken || generateClientToken(),
          clientType: 'full',
          username: clientInfo.username,
          email: clientInfo.email,
          website: clientInfo.website,
          phone: clientInfo.phone || undefined,
          addresses: clientInfo.addresses || [],
          instagram: clientInfo.instagram || undefined,
          requests: 0,
          tokens: 0,
          startDate: new Date(),
          folderPath: folder.folderPath,
          subscriptionStatus: 'pending',
        });
      } else if (!existingClient.clientToken && clientInfo.clientToken) {
        await Client.findOneAndUpdate({ clientId: folder.clientId }, { $set: { clientToken: clientInfo.clientToken } });
      } else if (!existingClient.clientToken && !clientInfo.clientToken) {
        const newToken = generateClientToken();
        await Client.findOneAndUpdate({ clientId: folder.clientId }, { $set: { clientToken: newToken } });
      }
    }

    // --- Scan quickwidgets/ folder ---
    const quickFolders = scanQuickWidgetFolders();

    for (const folder of quickFolders) {
      if (!folder.hasInfo) continue;

      const clientInfo = readQuickWidgetInfo(folder.folderPath);
      if (!clientInfo) continue;

      foundClientIds.add(folder.clientId);

      const existingClient = await Client.findOne({ clientId: folder.clientId });

      if (!existingClient) {
        await Client.create({
          clientId: folder.clientId,
          clientToken: '',
          clientType: 'quick',
          username: clientInfo.username,
          email: clientInfo.email || '',
          website: clientInfo.website,
          phone: clientInfo.phone || undefined,
          addresses: clientInfo.addresses || [],
          instagram: clientInfo.instagram || undefined,
          requests: 0,
          tokens: 0,
          startDate: new Date(),
          folderPath: folder.folderPath,
          isActive: true,
          subscriptionStatus: 'active',
        });
      }
    }

    // Log orphaned clients (without widget folders) but DON'T delete them
    const orphanedClients = await Client.find({
      clientId: { $nin: Array.from(foundClientIds) },
    }).select('clientId username');

    if (orphanedClients.length > 0) {
      console.warn(
        `⚠️ Found ${orphanedClients.length} clients without widget folders: ${orphanedClients.map((c) => c.clientId).join(', ')}`
      );
    }

    // Return all clients from DB
    const clients = await Client.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch clients' }, { status: 500 });
  }
}
