import { isPrivateIP } from './security';
import dns from 'dns/promises';

const MAX_CONTENT_LENGTH = 30000;
const FETCH_TIMEOUT = 10000;
const MAX_REDIRECTS = 3;

export function htmlToMarkdown(html: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  let text = html;
  // Remove script/style
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  // Convert links
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  // Convert paragraphs and line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Clean up whitespace
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '\n... (truncated)';
  }
  return text;
}

export async function webFetch(url: string, redirectCount: number = 0): Promise<{ content?: string; error?: string }> {
  if (redirectCount > MAX_REDIRECTS) {
    return { error: 'Too many redirects (max 3)' };
  }

  try {
    const parsed = new URL(url);

    // SSRF: Check hostname against known private patterns
    if (['localhost', '0.0.0.0'].includes(parsed.hostname)) {
      return { error: 'Blocked: private/internal address' };
    }

    // SSRF: DNS resolve and check IP
    try {
      const addresses = await dns.resolve4(parsed.hostname);
      if (addresses.some(isPrivateIP)) {
        return { error: 'Blocked: private/internal address' };
      }
    } catch {
      // If DNS fails for an IP-address hostname, check directly
      if (isPrivateIP(parsed.hostname)) {
        return { error: 'Blocked: private/internal address' };
      }
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'WinBixAI-Builder/2.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: 'manual',
    });

    // Handle redirects manually (validate IP at each hop, max 3)
    if ([301, 302, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) return { error: 'Redirect with no location' };
      return webFetch(location, redirectCount + 1);
    }

    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json')
    ) {
      return { error: `Unsupported content type: ${contentType}` };
    }

    const raw = await res.text();

    if (contentType.includes('text/html')) {
      return { content: htmlToMarkdown(raw) };
    }
    // JSON or plain text
    const truncated = raw.length > MAX_CONTENT_LENGTH ? raw.slice(0, MAX_CONTENT_LENGTH) + '... (truncated)' : raw;
    return { content: truncated };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
