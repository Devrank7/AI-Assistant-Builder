/**
 * Sync filesystem widget folders → MongoDB Client records on startup.
 *
 * Scans `widgets/` and `quickwidgets/` directories and creates missing
 * Client records in MongoDB so that widgets work immediately after deploy
 * (without waiting for `GET /api/clients` to be called manually).
 *
 * Runs once per process, non-blocking.
 */

import Client from '@/models/Client';
import { generateClientToken } from '@/lib/tokenUtils';
import { scanWidgetFolders, readClientInfo, scanQuickWidgetFolders, readQuickWidgetInfo } from '@/lib/widgetScanner';

let synced = false;

export async function syncClientsIfNeeded(): Promise<void> {
  if (synced) return;
  synced = true;

  let created = 0;

  // Scan regular widgets/
  const widgetFolders = scanWidgetFolders();
  for (const folder of widgetFolders) {
    if (!folder.hasInfo) continue;
    const info = readClientInfo(folder.folderPath);
    if (!info) continue;

    const exists = await Client.findOne({ clientId: folder.clientId }).select('_id').lean();
    if (!exists) {
      await Client.create({
        clientId: folder.clientId,
        clientToken: info.clientToken || generateClientToken(),
        clientType: 'full',
        username: info.username,
        email: info.email,
        website: info.website || '',
        phone: info.phone || undefined,
        addresses: info.addresses || [],
        instagram: info.instagram || undefined,
        requests: 0,
        tokens: 0,
        startDate: new Date(),
        folderPath: folder.folderPath,
        subscriptionStatus: 'pending',
      });
      created++;
    }
  }

  // Scan quickwidgets/
  const quickFolders = scanQuickWidgetFolders();
  for (const folder of quickFolders) {
    if (!folder.hasInfo) continue;
    const info = readQuickWidgetInfo(folder.folderPath);
    if (!info) continue;

    const exists = await Client.findOne({ clientId: folder.clientId }).select('_id').lean();
    if (!exists) {
      await Client.create({
        clientId: folder.clientId,
        clientToken: '',
        clientType: 'quick',
        username: info.username,
        email: info.email || '',
        website: info.website || '',
        phone: info.phone || undefined,
        addresses: info.addresses || [],
        instagram: info.instagram || undefined,
        requests: 0,
        tokens: 0,
        startDate: new Date(),
        folderPath: folder.folderPath,
        isActive: true,
        subscriptionStatus: 'active',
      });
      created++;
    }
  }

  if (created > 0) {
    console.log(`[Sync] Created ${created} missing client records from widget folders`);
  }
}
