// src/lib/builder/siteAnalyzer.ts
// Deep site analyzer: sitemap → BFS → parallel fetch → rich extraction
import type { SiteProfile } from './types';

const MAX_PAGES = 30;
const CONCURRENCY = 5;
const FETCH_TIMEOUT = 8000;
const CONTENT_LIMIT = 15000; // chars per page

// ─── Public API ───────────────────────────────────────────────

export async function analyzeSite(url: string): Promise<SiteProfile> {
  const base = new URL(url);
  const origin = base.origin;

  const profile: SiteProfile = {
    url,
    businessName: base.hostname.replace('www.', ''),
    businessType: 'general',
    colors: [],
    fonts: [],
    pages: [],
  };

  // 1. Fetch the homepage first (we always need it)
  const homeHtml = await fetchPage(url);
  if (!homeHtml) return profile;

  // Extract design tokens from the homepage
  profile.businessName = extractTitle(homeHtml) || profile.businessName;
  profile.colors = extractColors(homeHtml);
  profile.fonts = extractFonts(homeHtml);
  profile.favicon = extractFavicon(homeHtml, url);
  profile.contactInfo = extractContactInfo(homeHtml);
  profile.businessType = detectBusinessType(homeHtml);

  const homeContent = extractTextContent(homeHtml);
  if (homeContent) {
    profile.pages.push({ url, title: profile.businessName, content: homeContent });
  }

  // 2. Discover URLs via multiple strategies (parallel)
  const discovered = new Set<string>([url]);
  const [sitemapUrls, wpUrls, linkUrls] = await Promise.all([
    discoverFromSitemap(origin),
    discoverFromWordPress(origin),
    Promise.resolve(extractInternalLinks(homeHtml, url)),
  ]);

  // Merge all discovered URLs, prioritizing sitemap (most complete)
  for (const u of [...sitemapUrls, ...wpUrls, ...linkUrls]) {
    if (!discovered.has(u) && discovered.size < MAX_PAGES * 2) {
      discovered.add(u);
    }
  }

  // Remove homepage
  discovered.delete(url);

  // 3. Prioritize important pages
  const prioritized = prioritizeUrls([...discovered]);
  const toCrawl = prioritized.slice(0, MAX_PAGES - 1); // -1 for homepage

  // 4. Parallel fetch with concurrency limit
  const results = await crawlParallel(toCrawl, CONCURRENCY);

  for (const result of results) {
    if (!result.html) continue;

    const title = extractTitle(result.html) || result.url;
    const content = extractTextContent(result.html);
    if (content && content.length > 50) {
      profile.pages.push({ url: result.url, title, content, crawled: true });
    }

    // Extract additional colors/fonts from subpages
    const subColors = extractColors(result.html);
    const subFonts = extractFonts(result.html);
    for (const c of subColors) {
      if (!profile.colors.includes(c) && profile.colors.length < 20) {
        profile.colors.push(c);
      }
    }
    for (const f of subFonts) {
      if (!profile.fonts.includes(f) && profile.fonts.length < 10) {
        profile.fonts.push(f);
      }
    }
  }

  return profile;
}

// ─── URL Discovery ────────────────────────────────────────────

async function discoverFromSitemap(origin: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];

  for (const path of sitemapPaths) {
    try {
      const xml = await fetchPage(`${origin}${path}`);
      if (!xml) continue;

      // Check if this is a sitemap index (contains other sitemaps)
      const sitemapRefs = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());

      if (sitemapRefs.length > 0) {
        // Fetch child sitemaps (max 3 to avoid overloading)
        for (const ref of sitemapRefs.slice(0, 3)) {
          try {
            const childXml = await fetchPage(ref);
            if (childXml) {
              const childUrls = [...childXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
              urls.push(...childUrls);
            }
          } catch { /* skip */ }
        }
      }

      // Direct URL entries
      const directUrls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
      urls.push(...directUrls);

      if (urls.length > 0) break; // Found a working sitemap
    } catch { /* try next */ }
  }

  // Filter to same origin and dedupe
  const base = new URL(origin);
  return [...new Set(urls.filter((u) => {
    try { return new URL(u).hostname === base.hostname; }
    catch { return false; }
  }))];
}

async function discoverFromWordPress(origin: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    // WP REST API — pages
    const pagesJson = await fetchPage(`${origin}/wp-json/wp/v2/pages?per_page=20&_fields=link`);
    if (pagesJson) {
      try {
        const pages = JSON.parse(pagesJson);
        if (Array.isArray(pages)) {
          for (const p of pages) {
            if (p.link) urls.push(p.link);
          }
        }
      } catch { /* not JSON */ }
    }

    // WP REST API — posts
    const postsJson = await fetchPage(`${origin}/wp-json/wp/v2/posts?per_page=10&_fields=link`);
    if (postsJson) {
      try {
        const posts = JSON.parse(postsJson);
        if (Array.isArray(posts)) {
          for (const p of posts) {
            if (p.link) urls.push(p.link);
          }
        }
      } catch { /* not JSON */ }
    }
  } catch { /* not WordPress */ }

  return urls;
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  const links: string[] = [];
  const base = new URL(baseUrl);
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const linkUrl = new URL(match[1], baseUrl);
      // Same hostname, different path, no file extensions for assets
      if (
        linkUrl.hostname === base.hostname &&
        linkUrl.pathname !== base.pathname &&
        !linkUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|css|js|pdf|zip|mp3|mp4|ico)$/i)
      ) {
        links.push(linkUrl.origin + linkUrl.pathname);
      }
    } catch { /* skip invalid */ }
  }

  return [...new Set(links)];
}

// ─── URL Prioritization ──────────────────────────────────────

function prioritizeUrls(urls: string[]): string[] {
  const highPriority = [
    /\/(about|o-nas|pro-nas|who-we-are)/i,
    /\/(services|uslugi|poslugy|solutions)/i,
    /\/(contact|kontakty|contacts)/i,
    /\/(pricing|price|tseny|prais)/i,
    /\/(faq|questions|voprosy)/i,
    /\/(products?|catalog|katalog|shop|magazin)/i,
    /\/(team|our-team|komanda)/i,
    /\/(reviews|testimonials|otzyvy)/i,
    /\/(blog|news|novosti)/i,
    /\/(portfolio|projects|raboty)/i,
  ];

  const scored = urls.map((url) => {
    let score = 0;
    const path = new URL(url).pathname;

    // Priority pages get higher score
    for (let i = 0; i < highPriority.length; i++) {
      if (highPriority[i].test(path)) {
        score += 100 - i * 5; // First patterns have higher priority
        break;
      }
    }

    // Penalize deep paths (more slashes = lower priority)
    const depth = (path.match(/\//g) || []).length;
    score -= depth * 10;

    // Penalize very long URLs
    if (url.length > 100) score -= 20;

    // Penalize URLs with query params
    if (url.includes('?')) score -= 30;

    return { url, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.url);
}

// ─── Parallel Crawling ───────────────────────────────────────

interface CrawlResult {
  url: string;
  html: string | null;
}

async function crawlParallel(urls: string[], concurrency: number): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const currentIndex = index++;
      const url = urls[currentIndex];
      const html = await fetchPage(url);
      results.push({ url, html });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── Fetch ───────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WinBixAI-Builder/2.0; +https://winbixai.com)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,uk;q=0.8,ru;q=0.7',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/') && !contentType.includes('application/json') && !contentType.includes('application/xml')) {
      return null; // Skip binary content
    }

    return await res.text();
  } catch {
    return null;
  }
}

// ─── Extraction Helpers ──────────────────────────────────────

function extractTitle(html: string): string | null {
  // Try og:title first (usually cleaner)
  const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1].trim();

  // Fall back to <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim().split('|')[0].split('—')[0].split('-')[0].trim() : null;
}

function extractColors(html: string): string[] {
  const colors = new Set<string>();

  // 1. Hex colors from inline styles and style blocks
  const hexRegex = /#([0-9a-fA-F]{6})\b/g;
  let match;
  while ((match = hexRegex.exec(html)) !== null) {
    const hex = `#${match[1].toLowerCase()}`;
    // Filter out common non-brand colors (pure white, black, grays)
    if (!['#000000', '#ffffff', '#fff', '#333333', '#666666', '#999999', '#cccccc'].includes(hex)) {
      colors.add(hex);
    }
  }

  // 2. CSS custom properties (--primary-color: #xxx)
  const varRegex = /--(?:primary|secondary|accent|brand|main|theme)[^:]*:\s*(#[0-9a-fA-F]{6})/gi;
  while ((match = varRegex.exec(html)) !== null) {
    colors.add(match[1].toLowerCase());
  }

  // 3. rgb/rgba values
  const rgbRegex = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((match = rgbRegex.exec(html)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    // Skip near-white, near-black, and grays
    if (r === g && g === b) continue;
    if (r > 240 && g > 240 && b > 240) continue;
    if (r < 15 && g < 15 && b < 15) continue;
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    colors.add(hex);
  }

  return [...colors].slice(0, 15);
}

function extractFonts(html: string): string[] {
  const fonts = new Set<string>();

  // 1. font-family declarations
  const fontFamilyRegex = /font-family:\s*["']?([^"';,}]+)/gi;
  let match;
  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const font = match[1].trim().replace(/["']/g, '');
    const genericFonts = ['inherit', 'initial', 'unset', 'sans-serif', 'serif', 'monospace', 'system-ui', 'cursive', 'fantasy', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI'];
    if (!genericFonts.some((g) => g.toLowerCase() === font.toLowerCase())) {
      fonts.add(font);
    }
  }

  // 2. Google Fonts links
  const gfRegex = /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi;
  while ((match = gfRegex.exec(html)) !== null) {
    const families = decodeURIComponent(match[1]).split('|');
    for (const family of families) {
      const name = family.split(':')[0].replace(/\+/g, ' ').trim();
      if (name) fonts.add(name);
    }
  }

  // 3. @font-face declarations
  const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*["']?([^"';,}]+)/gi;
  while ((match = fontFaceRegex.exec(html)) !== null) {
    const font = match[1].trim().replace(/["']/g, '');
    if (font) fonts.add(font);
  }

  return [...fonts].slice(0, 8);
}

function extractFavicon(html: string, baseUrl: string): string | undefined {
  // Try multiple favicon patterns
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        return new URL(match[1], baseUrl).href;
      } catch { /* skip */ }
    }
  }

  return undefined;
}

function extractContactInfo(html: string): SiteProfile['contactInfo'] {
  const phone = html.match(/href=["']tel:([^"']+)["']/i)?.[1]?.replace(/\s/g, '');
  const email = html.match(/href=["']mailto:([^"'?]+)/i)?.[1];

  // Try to find address in structured data
  const addressMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i);
  const address = addressMatch?.[1];

  if (!phone && !email && !address) return undefined;
  return {
    phone: phone || undefined,
    email: email || undefined,
    address: address || undefined,
  };
}

function extractTextContent(html: string): string {
  // Remove non-content elements
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' [FOOTER] ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(noscript|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Preserve semantic structure
  cleaned = cleaned
    .replace(/<(h[1-6])[^>]*>/gi, '\n\n### ')
    .replace(/<\/(h[1-6])>/gi, '\n\n')
    .replace(/<(p|div|section|article|main|li)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ');

  // Clean up whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return cleaned.slice(0, CONTENT_LIMIT);
}

function detectBusinessType(html: string): string {
  const text = html.toLowerCase();

  const keywords: Record<string, { words: string[]; weight: number }> = {
    dental: { words: ['dental', 'dentist', 'teeth', 'orthodont', 'стоматолог', 'зуб'], weight: 0 },
    restaurant: { words: ['restaurant', 'menu', 'cuisine', 'dining', 'reservation', 'ресторан', 'меню', 'кухня'], weight: 0 },
    ecommerce: { words: ['add to cart', 'buy now', 'checkout', 'shop', 'store', 'product', 'корзина', 'купить', 'магазин', 'товар'], weight: 0 },
    saas: { words: ['software', 'platform', 'api', 'dashboard', 'analytics', 'pricing plan', 'free trial'], weight: 0 },
    realestate: { words: ['real estate', 'property', 'listing', 'apartment', 'rent', 'недвижимость', 'квартира', 'аренда'], weight: 0 },
    beauty: { words: ['salon', 'beauty', 'spa', 'nail', 'hair', 'cosmetic', 'салон', 'красота', 'манікюр'], weight: 0 },
    medical: { words: ['medical', 'clinic', 'doctor', 'health', 'patient', 'клиника', 'врач', 'здоровье', 'лікар'], weight: 0 },
    legal: { words: ['law', 'attorney', 'legal', 'lawyer', 'юрист', 'адвокат', 'право'], weight: 0 },
    fitness: { words: ['gym', 'fitness', 'workout', 'training', 'фитнес', 'тренажер', 'тренировк'], weight: 0 },
    education: { words: ['course', 'learn', 'education', 'training', 'school', 'university', 'курс', 'обучение', 'школа'], weight: 0 },
    travel: { words: ['hotel', 'travel', 'booking', 'tour', 'отель', 'путешеств', 'бронир', 'тур'], weight: 0 },
    auto: { words: ['car', 'auto', 'vehicle', 'dealer', 'авто', 'машин', 'автомобил', 'СТО'], weight: 0 },
    construction: { words: ['construction', 'build', 'renovation', 'строительст', 'ремонт', 'будівництв'], weight: 0 },
  };

  for (const [type, config] of Object.entries(keywords)) {
    for (const word of config.words) {
      const regex = new RegExp(word, 'gi');
      const matches = text.match(regex);
      if (matches) {
        keywords[type].weight += matches.length;
      }
    }
  }

  const sorted = Object.entries(keywords).sort((a, b) => b[1].weight - a[1].weight);
  return sorted[0][1].weight >= 2 ? sorted[0][0] : 'general';
}
