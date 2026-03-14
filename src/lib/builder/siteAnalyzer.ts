// src/lib/builder/siteAnalyzer.ts
import type { SiteProfile } from './types';

const MAX_SUBPAGES = 5;
const FETCH_TIMEOUT = 10000;

export async function analyzeSite(url: string): Promise<SiteProfile> {
  const profile: SiteProfile = {
    url,
    businessName: new URL(url).hostname.replace('www.', ''),
    businessType: 'general',
    colors: [],
    fonts: [],
    pages: [],
  };

  try {
    const html = await fetchPage(url);
    if (!html) return profile;

    profile.businessName = extractTitle(html) || profile.businessName;
    profile.colors = extractColors(html);
    profile.fonts = extractFonts(html);
    profile.favicon = extractFavicon(html, url);
    profile.contactInfo = extractContactInfo(html);
    profile.businessType = detectBusinessType(html);

    const mainContent = extractTextContent(html);
    if (mainContent) {
      profile.pages.push({ url, title: profile.businessName, content: mainContent });
    }

    const links = extractInternalLinks(html, url);
    const subpageUrls = links.slice(0, MAX_SUBPAGES);

    for (const subUrl of subpageUrls) {
      try {
        const subHtml = await fetchPage(subUrl);
        if (!subHtml) continue;
        const title = extractTitle(subHtml) || subUrl;
        const content = extractTextContent(subHtml);
        if (content) {
          profile.pages.push({ url: subUrl, title, content });
        }
      } catch {
        // Skip failed subpages
      }
    }
  } catch {
    // Return partial profile on error
  }

  return profile;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WinBixAI-Builder/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractColors(html: string): string[] {
  const colorRegex = /#[0-9a-fA-F]{6}\b/g;
  const matches = html.match(colorRegex) || [];
  return [...new Set(matches)].slice(0, 10);
}

function extractFonts(html: string): string[] {
  const fontRegex = /font-family:\s*["']?([^"';,]+)/gi;
  const fonts: string[] = [];
  let match;
  while ((match = fontRegex.exec(html)) !== null) {
    const font = match[1].trim();
    if (!['inherit', 'initial', 'sans-serif', 'serif', 'monospace', 'system-ui'].includes(font.toLowerCase())) {
      fonts.push(font);
    }
  }
  return [...new Set(fonts)].slice(0, 5);
}

function extractFavicon(html: string, baseUrl: string): string | undefined {
  const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (!match) return undefined;
  try {
    return new URL(match[1], baseUrl).href;
  } catch {
    return undefined;
  }
}

function extractContactInfo(html: string): SiteProfile['contactInfo'] {
  const phone = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  const email = html.match(/href=["']mailto:([^"']+)["']/i)?.[1];
  if (!phone && !email) return undefined;
  return { phone: phone || undefined, email: email || undefined };
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000);
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  const links: string[] = [];
  const base = new URL(baseUrl);
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const linkUrl = new URL(match[1], baseUrl);
      if (linkUrl.hostname === base.hostname && linkUrl.pathname !== base.pathname) {
        links.push(linkUrl.href);
      }
    } catch {
      /* skip invalid URLs */
    }
  }

  return [...new Set(links)];
}

function detectBusinessType(html: string): string {
  const text = html.toLowerCase();
  const keywords: Record<string, string[]> = {
    dental: ['dental', 'dentist', 'teeth', 'orthodont'],
    restaurant: ['restaurant', 'menu', 'cuisine', 'dining', 'reservation'],
    saas: ['software', 'platform', 'api', 'dashboard', 'analytics'],
    realestate: ['real estate', 'property', 'listing', 'apartment', 'rent'],
    beauty: ['salon', 'beauty', 'spa', 'nail', 'hair', 'cosmetic'],
    medical: ['medical', 'clinic', 'doctor', 'health', 'patient'],
    legal: ['law', 'attorney', 'legal', 'lawyer'],
    fitness: ['gym', 'fitness', 'workout', 'training'],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some((w) => text.includes(w))) return type;
  }
  return 'general';
}
