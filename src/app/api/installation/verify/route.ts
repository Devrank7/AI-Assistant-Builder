import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

const PRODUCTION_URL = 'https://winbixai.com';
const VERIFY_TIMEOUT_MS = 10000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { url, clientId } = body as { url?: string; clientId?: string };

    if (!url || typeof url !== 'string') {
      return Errors.badRequest('url is required');
    }
    if (!clientId || typeof clientId !== 'string') {
      return Errors.badRequest('clientId is required');
    }

    await connectDB();

    // Verify the widget belongs to this user / org
    const ownerQuery = auth.organizationId
      ? { clientId, organizationId: auth.organizationId }
      : { clientId, userId: auth.userId };

    const client = await Client.findOne(ownerQuery).select('clientId clientType');
    if (!client) {
      return Errors.notFound('Widget not found');
    }

    const folder = client.clientType === 'full' ? 'widgets' : 'quickwidgets';
    const expectedSrc = `${PRODUCTION_URL}/${folder}/${clientId}/script.js`;

    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    let verified = false;
    let details = '';
    let statusCode: number | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

      const res = await fetch(normalized, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WinBixAI-Verifier/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      statusCode = res.status;

      if (!res.ok) {
        details = `Website returned HTTP ${res.status}. Make sure the URL is correct and publicly accessible.`;
      } else {
        const html = await res.text();
        if (html.includes(expectedSrc)) {
          verified = true;
          details = 'Widget script tag found in page source. Installation confirmed!';
        } else {
          // Check partial match (maybe they used a different script path pattern)
          const partialMatch = html.includes(clientId);
          if (partialMatch) {
            details = `Found a reference to your client ID (${clientId}), but the exact script URL doesn't match. Make sure you're using: <script src="${expectedSrc}"></script>`;
          } else {
            details = `Script tag not found on this page. Ensure the tag is placed before </body> and the page has been saved/published. Expected: <script src="${expectedSrc}"></script>`;
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        details = `Request timed out after ${VERIFY_TIMEOUT_MS / 1000}s. The website may be slow or blocking automated requests.`;
      } else {
        details = `Could not reach ${normalized}. Check that the URL is correct and the site is live.`;
      }
    }

    return successResponse({
      verified,
      details,
      url: normalized,
      statusCode,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Installation verify error:', error);
    return Errors.internal('Failed to verify installation');
  }
}
