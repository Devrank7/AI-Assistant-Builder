import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

const PRODUCTION_URL = 'https://winbixai.com';
const VERIFY_TIMEOUT_MS = 8000;

function buildEmbedCode(clientId: string, clientType: string): string {
  const folder = clientType === 'production' ? 'widgets' : 'quickwidgets';
  return `<script src="${PRODUCTION_URL}/${folder}/${clientId}/script.js"></script>`;
}

async function checkInstallation(website: string, embedCode: string): Promise<{ verified: boolean; checkedAt: Date }> {
  if (!website) return { verified: false, checkedAt: new Date() };
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WinBixAI-Verifier/1.0' },
    });
    clearTimeout(timeout);
    const html = await res.text();
    // Extract src from embed code to check
    const srcMatch = embedCode.match(/src="([^"]+)"/);
    const scriptSrc = srcMatch?.[1] ?? '';
    const verified = scriptSrc ? html.includes(scriptSrc) : false;
    return { verified, checkedAt: new Date() };
  } catch {
    return { verified: false, checkedAt: new Date() };
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };

    const clients = await Client.find(query)
      .select('clientId username clientType widgetType website clientToken createdAt')
      .sort({ createdAt: -1 });

    const widgets = await Promise.all(
      clients.map(async (c) => {
        const embedCode = buildEmbedCode(c.clientId, c.clientType);
        // Best-effort installation check (only if website is set)
        const installCheck = c.website
          ? await checkInstallation(c.website, embedCode)
          : { verified: false, checkedAt: new Date() };

        return {
          clientId: c.clientId,
          widgetName: c.username,
          clientType: c.clientType === 'full' ? 'full' : 'quick',
          widgetType: c.widgetType || 'ai_chat',
          website: c.website || null,
          embedCode,
          clientToken: c.clientToken,
          installationVerified: installCheck.verified,
          lastVerified: installCheck.checkedAt,
        };
      })
    );

    return successResponse(widgets);
  } catch (error) {
    console.error('Installation GET error:', error);
    return Errors.internal('Failed to fetch installation data');
  }
}
