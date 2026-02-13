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

    // Remove orphaned clients (in DB but no widget folder) and their related data
    const orphanedClients = await Client.find({
      clientId: { $nin: Array.from(foundClientIds) },
    }).select('clientId username');

    if (orphanedClients.length > 0) {
      const mongoose = await import('mongoose');
      const db = mongoose.connection.db;

      for (const orphan of orphanedClients) {
        console.log(`🗑️ Removing orphaned client: ${orphan.clientId} (no widget folder found)`);

        if (db) {
          await Promise.allSettled([
            db.collection('knowledgechunks').deleteMany({ clientId: orphan.clientId }),
            db.collection('aisettings').deleteMany({ clientId: orphan.clientId }),
            db.collection('chatlogs').deleteMany({ clientId: orphan.clientId }),
          ]);
        }

        await Client.deleteOne({ clientId: orphan.clientId });
      }

      console.log(`🗑️ Cleaned up ${orphanedClients.length} orphaned clients`);
    }

    // Return all clients from DB
    const clients = await Client.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch clients' }, { status: 500 });
  }
}
