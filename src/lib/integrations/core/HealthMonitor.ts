import pLimit from 'p-limit';
import { pluginRegistry } from './PluginRegistry';
import { decrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';

const CONCURRENCY_LIMIT = 20;

let running = false;

export async function checkAllConnections(): Promise<{
  checked: number;
  errors: number;
  skipped: boolean;
}> {
  if (running) return { checked: 0, errors: 0, skipped: true };
  running = true;

  try {
    await connectDB();
    const connections = await Integration.find({ status: 'connected' });
    const limit = pLimit(CONCURRENCY_LIMIT);
    let errorCount = 0;

    await Promise.all(
      connections.map((conn) =>
        limit(async () => {
          const plugin = pluginRegistry.get(conn.provider);
          if (!plugin) return;

          try {
            const credentials: Record<string, string> = {};
            if (conn.accessToken) credentials.apiKey = decrypt(conn.accessToken);

            const result = await plugin.healthCheck(credentials);

            if (!result.healthy) {
              conn.status = 'error';
              conn.lastError = result.error || 'Health check failed';
              conn.aiDiagnostic = result.suggestion || null;
              errorCount++;
            } else {
              conn.status = 'connected';
              conn.lastError = null;
              conn.aiDiagnostic = null;
            }
          } catch (err) {
            conn.status = 'error';
            conn.lastError = err instanceof Error ? err.message : 'Unknown error';
            conn.aiDiagnostic =
              'Health check threw an exception. The API key may be invalid or the service may be down.';
            errorCount++;
          }

          conn.lastHealthCheck = new Date();
          await conn.save();
        })
      )
    );

    return { checked: connections.length, errors: errorCount, skipped: false };
  } finally {
    running = false;
  }
}
