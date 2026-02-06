import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { scanWidgetFolders, readClientInfo } from '@/lib/widgetScanner';
import { generateClientToken } from '@/lib/tokenUtils';

export async function GET() {
  try {
    await connectDB();

    // Сканируем папку widgets
    const widgetFolders = scanWidgetFolders();

    const foundClientIds = new Set<string>();

    // Синхронизируем с базой данных
    for (const folder of widgetFolders) {
      if (!folder.hasInfo) continue;

      const clientInfo = readClientInfo(folder.folderPath);
      if (!clientInfo) continue;

      foundClientIds.add(folder.clientId);

      const existingClient = await Client.findOne({ clientId: folder.clientId });

      if (!existingClient) {
        // Создаём нового клиента
        // Используем токен из info.json или генерируем новый
        await Client.create({
          clientId: folder.clientId,
          clientToken: clientInfo.clientToken || generateClientToken(),
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
        // Обновляем существующего клиента, если у него нет токена, но есть в info.json
        await Client.findOneAndUpdate({ clientId: folder.clientId }, { $set: { clientToken: clientInfo.clientToken } });
      } else if (!existingClient.clientToken && !clientInfo.clientToken) {
        // Генерируем токен если нет ни в БД, ни в info.json
        const newToken = generateClientToken();
        await Client.findOneAndUpdate({ clientId: folder.clientId }, { $set: { clientToken: newToken } });
      }
    }

    // Удаляем клиентов, которых нет в папке widgets (Orphaned Clients)
    const deleteResult = await Client.deleteMany({
      clientId: { $nin: Array.from(foundClientIds) },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(`🧹 Deleted ${deleteResult.deletedCount} orphaned clients from database.`);
    }

    // Возвращаем всех клиентов из БД
    const clients = await Client.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch clients' }, { status: 500 });
  }
}
