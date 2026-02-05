import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { scanWidgetFolders, readClientInfo } from '@/lib/widgetScanner';

export async function GET() {
  try {
    await connectDB();

    // Сканируем папку widgets
    const widgetFolders = scanWidgetFolders();

    // Синхронизируем с базой данных
    for (const folder of widgetFolders) {
      if (!folder.hasInfo) continue;

      const existingClient = await Client.findOne({ clientId: folder.clientId });

      if (!existingClient) {
        // Читаем info.json и создаём клиента
        const clientInfo = readClientInfo(folder.folderPath);

        if (clientInfo) {
          await Client.create({
            clientId: folder.clientId,
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
          });
        }
      }
    }

    // Возвращаем всех клиентов из БД
    const clients = await Client.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
