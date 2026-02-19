/**
 * Deep Website Crawler
 *
 * BFS-based crawler that discovers and extracts text from all pages of a website.
 * Strategies: sitemap.xml → WordPress REST API → recursive HTML link following.
 * Zero external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrawlOptions {
  maxPages?: number;
  maxTotalChars?: number;
  totalTimeoutMs?: number;
  perPageTimeoutMs?: number;
  perPageBodyLimit?: number;
  concurrency?: number;
  delayMs?: number;
  userAgent?: string;
  onProgress?: (status: CrawlProgress) => void;
}

export interface CrawlProgress {
  pagesVisited: number;
  pagesQueued: number;
  totalCharsCollected: number;
  currentUrl: string;
  elapsedMs: number;
}

export interface CrawlResult {
  pages: CrawledPage[];
  totalChars: number;
  totalPages: number;
  durationMs: number;
  strategies: string[];
  errors: CrawlError[];
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  charCount: number;
  source: 'html' | 'wp-api' | 'sitemap';
}

export interface CrawlError {
  url: string;
  error: string;
}

interface RobotsRules {
  disallowed: string[];
  sitemapUrls: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: Required<Omit<CrawlOptions, 'onProgress'>> = {
  maxPages: 30,
  maxTotalChars: 500_000,
  totalTimeoutMs: 120_000,
  perPageTimeoutMs: 10_000,
  perPageBodyLimit: 200 * 1024,
  concurrency: 3,
  delayMs: 200,
  userAgent: 'Mozilla/5.0 (compatible; WinBixBot/1.0)',
};

// Priority patterns — lower score = crawled first
const PRIORITY_PATTERNS: [RegExp, number][] = [
  [/\/(services|uslugi|poslugy|pricing|prices|ceny|tsiny|prais|our-services)/i, 0],
  [/\/(about|o-nas|pro-nas|about-us|company|o-kompanii|pro-kompaniyu)/i, 1],
  [/\/(faq|questions|voprosy|zapytannya|help)/i, 2],
  [/\/(team|komanda|doctors|specialists|nasha-komanda|vrachi)/i, 2],
  [/\/(contact|kontakt|kontakty|zv-yazok|contacts)/i, 3],
  [/\/(gallery|portfolio|projects|raboty|nashi-raboty)/i, 3],
  [/\/(reviews|otzyvy|vidhuki|testimonials)/i, 4],
  [/\/(blog|news|novosti|novyny|stati|articles)/i, 5],
];

const SKIP_EXTENSIONS =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|pdf|zip|rar|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov|woff|woff2|ttf|eot|json|xml)$/i;
const SKIP_PATH_PATTERNS =
  /\/(wp-admin|wp-includes|wp-content\/plugins|wp-content\/themes|cdn-cgi|\.well-known|feed|rss|atom|wp-login|cart|checkout|account|my-account|sign-in|login|register)\b/i;

// ---------------------------------------------------------------------------
// URL Utilities
// ---------------------------------------------------------------------------

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Strip fragment and common tracking params
    u.hash = '';
    for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref']) {
      u.searchParams.delete(p);
    }
    // Remove trailing slash (except for root)
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path;
    return u.toString();
  } catch {
    return raw;
  }
}

function scoreUrl(url: string): number {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    for (const [pattern, score] of PRIORITY_PATTERNS) {
      if (pattern.test(pathname)) return score;
    }
  } catch {
    /* ignore */
  }
  return 99;
}

function isSameDomain(url: string, baseHost: string): boolean {
  try {
    return new URL(url).hostname === baseHost;
  } catch {
    return false;
  }
}

function shouldSkipUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    if (SKIP_EXTENSIONS.test(pathname)) return true;
    if (SKIP_PATH_PATTERNS.test(pathname)) return true;
    return false;
  } catch {
    return true;
  }
}

function isAllowedByRobots(url: string, rules: RobotsRules): boolean {
  if (rules.disallowed.length === 0) return true;
  try {
    const pathname = new URL(url).pathname;
    return !rules.disallowed.some((rule) => pathname.startsWith(rule));
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// HTTP Fetching
// ---------------------------------------------------------------------------

async function fetchRaw(
  url: string,
  bodyLimit: number,
  timeout: number,
  userAgent: string
): Promise<{ html: string; ok: boolean; contentType: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('text/html')) {
      return { html: '', ok: false, contentType };
    }

    const reader = res.body?.getReader();
    if (!reader) return { html: '', ok: false, contentType };

    let html = '';
    const decoder = new TextDecoder();
    let bytesRead = 0;

    while (bytesRead < bodyLimit) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    return { html, ok: true, contentType };
  } catch {
    return { html: '', ok: false, contentType: '' };
  }
}

// ---------------------------------------------------------------------------
// HTML Processing
// ---------------------------------------------------------------------------

/**
 * Extract readable text from HTML. No character cap by default.
 */
export function extractTextContent(html: string, maxLength?: number): string {
  let text = html;
  // Remove script/style/noscript/svg/head blocks
  text = text.replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&#\d+;/g, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function extractPageTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || '';
}

/**
 * Extract JSON-LD structured data (useful for SPAs where body is JS-rendered).
 */
function extractStructuredData(html: string): string {
  const blocks: string[] = [];
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const parts: string[] = [];
      const extract = (obj: Record<string, unknown>, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          if (['@context', '@type', '@id', 'url', 'image', 'logo'].includes(key)) continue;
          if (typeof value === 'string' && value.length > 2 && value.length < 2000) {
            parts.push(`${prefix}${key}: ${value}`);
          } else if (typeof value === 'object' && value && !Array.isArray(value)) {
            extract(value as Record<string, unknown>, `${key}.`);
          }
        }
      };
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (typeof item === 'object' && item) extract(item);
        });
      } else if (typeof data === 'object') {
        extract(data);
      }
      if (parts.length > 0) blocks.push(parts.join('\n'));
    } catch {
      /* invalid JSON-LD, skip */
    }
  }
  return blocks.join('\n\n');
}

/**
 * Discover all same-domain links from HTML.
 */
function discoverLinks(html: string, pageUrl: string, baseHost: string): string[] {
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  const found = new Set<string>();
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], pageUrl);
      const normalized = normalizeUrl(resolved.href);
      if (isSameDomain(normalized, baseHost) && !shouldSkipUrl(normalized)) {
        found.add(normalized);
      }
    } catch {
      /* skip malformed URLs */
    }
  }

  return [...found];
}

// ---------------------------------------------------------------------------
// Robots.txt
// ---------------------------------------------------------------------------

async function fetchRobotsTxt(baseUrl: string, timeout: number, userAgent: string): Promise<RobotsRules> {
  const rules: RobotsRules = { disallowed: [], sitemapUrls: [] };
  try {
    const u = new URL(baseUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent },
    });
    clearTimeout(timer);
    if (!res.ok) return rules;

    const text = await res.text();
    let inRelevantBlock = false;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.slice(11).trim().toLowerCase();
        inRelevantBlock = agent === '*' || agent === 'winbixbot';
      } else if (inRelevantBlock && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.slice(9).trim();
        if (path) rules.disallowed.push(path);
      }
      // Sitemap directives are global (not per user-agent)
      if (trimmed.toLowerCase().startsWith('sitemap:')) {
        rules.sitemapUrls.push(trimmed.slice(8).trim());
      }
    }
  } catch {
    /* no robots.txt — allow everything */
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Sitemap Discovery
// ---------------------------------------------------------------------------

async function fetchSitemapUrls(
  sitemapUrl: string,
  baseHost: string,
  timeout: number,
  userAgent: string,
  depth: number = 0
): Promise<string[]> {
  if (depth > 2) return []; // Prevent infinite sitemap index recursion
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent },
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const xml = await res.text();
    const urls: string[] = [];

    // Check if this is a sitemap index
    if (xml.includes('<sitemapindex')) {
      const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
      let match;
      while ((match = locRegex.exec(xml)) !== null) {
        const childUrls = await fetchSitemapUrls(match[1].trim(), baseHost, timeout, userAgent, depth + 1);
        urls.push(...childUrls);
      }
    } else {
      // Regular sitemap — extract <loc> URLs
      const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
      let match;
      while ((match = locRegex.exec(xml)) !== null) {
        const url = match[1].trim();
        if (isSameDomain(url, baseHost) && !shouldSkipUrl(url)) {
          urls.push(normalizeUrl(url));
        }
      }
    }

    return urls;
  } catch {
    return [];
  }
}

async function trySitemapDiscovery(
  baseUrl: string,
  baseHost: string,
  robotsRules: RobotsRules,
  timeout: number,
  userAgent: string
): Promise<string[]> {
  const allUrls = new Set<string>();

  // Try sitemap URLs from robots.txt
  for (const sitemapUrl of robotsRules.sitemapUrls) {
    const urls = await fetchSitemapUrls(sitemapUrl, baseHost, timeout, userAgent);
    urls.forEach((u) => allUrls.add(u));
  }

  // Try standard sitemap location if none found in robots.txt
  if (allUrls.size === 0) {
    const u = new URL(baseUrl);
    const defaultSitemap = `${u.protocol}//${u.host}/sitemap.xml`;
    const urls = await fetchSitemapUrls(defaultSitemap, baseHost, timeout, userAgent);
    urls.forEach((u) => allUrls.add(u));
  }

  return [...allUrls];
}

// ---------------------------------------------------------------------------
// WordPress REST API
// ---------------------------------------------------------------------------

async function tryWordPressApi(baseUrl: string, timeout: number, userAgent: string): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const u = new URL(baseUrl);
  const apiBase = `${u.protocol}//${u.host}/wp-json/wp/v2`;

  for (const endpoint of ['pages', 'posts']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(`${apiBase}/${endpoint}?per_page=100&_fields=title,content,link`, {
        signal: controller.signal,
        headers: { 'User-Agent': userAgent },
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const items = await res.json();
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const title = item.title?.rendered || '';
        const contentHtml = item.content?.rendered || '';
        const text = extractTextContent(contentHtml);
        if (text.length > 50) {
          pages.push({
            url: item.link || '',
            title: extractTextContent(title),
            text,
            charCount: text.length,
            source: 'wp-api',
          });
        }
      }
    } catch {
      /* Not WordPress or API disabled */
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Text Deduplication
// ---------------------------------------------------------------------------

/**
 * Remove repeated boilerplate (nav, footer, sidebar) across pages.
 * Strategy: split each page into 3-sentence blocks, hash them,
 * and remove blocks that appear in 3+ pages.
 */
function deduplicatePages(pages: CrawledPage[]): CrawledPage[] {
  if (pages.length < 3) return pages;

  // Count how many pages contain each text block
  const blockCounts = new Map<string, number>();
  const pageBlocks = pages.map((page) => {
    const sentences = page.text.split(/[.!?]\s+/).filter((s) => s.length > 20);
    const blocks: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const block = sentences
        .slice(i, i + 3)
        .join('. ')
        .trim();
      if (block.length > 30) blocks.push(block);
    }
    for (const block of blocks) {
      blockCounts.set(block, (blockCounts.get(block) || 0) + 1);
    }
    return blocks;
  });

  // Threshold: blocks appearing in 40%+ of pages are boilerplate
  const threshold = Math.max(3, Math.floor(pages.length * 0.4));

  return pages.map((page, i) => {
    const blocks = pageBlocks[i];
    const uniqueBlocks = blocks.filter((b) => (blockCounts.get(b) || 0) < threshold);

    if (uniqueBlocks.length === blocks.length) return page; // No boilerplate removed

    const cleanText = uniqueBlocks.join('. ').trim();
    return {
      ...page,
      text: cleanText || page.text, // Fallback to original if everything was "boilerplate"
      charCount: cleanText.length || page.charCount,
    };
  });
}

// ---------------------------------------------------------------------------
// BFS Crawl Core
// ---------------------------------------------------------------------------

async function bfsCrawl(
  seedUrls: string[],
  baseHost: string,
  robotsRules: RobotsRules,
  opts: Required<Omit<CrawlOptions, 'onProgress'>> & { onProgress?: CrawlOptions['onProgress'] }
): Promise<{ pages: CrawledPage[]; errors: CrawlError[] }> {
  const visited = new Set<string>();
  const queue: { url: string; score: number }[] = [];
  const pages: CrawledPage[] = [];
  const errors: CrawlError[] = [];
  let totalChars = 0;
  const startTime = Date.now();
  let blogCount = 0;
  const MAX_BLOG_PAGES = 5;

  // Seed the queue
  for (const url of seedUrls) {
    const normalized = normalizeUrl(url);
    if (!visited.has(normalized) && !shouldSkipUrl(normalized)) {
      queue.push({ url: normalized, score: scoreUrl(normalized) });
    }
  }

  while (queue.length > 0) {
    // Check limits
    if (visited.size >= opts.maxPages) break;
    if (totalChars >= opts.maxTotalChars) break;
    if (Date.now() - startTime > opts.totalTimeoutMs) break;

    // Sort by priority (lower score first)
    queue.sort((a, b) => a.score - b.score);

    // Take a batch for concurrent fetching
    const batch: string[] = [];
    while (batch.length < opts.concurrency && queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      if (!isAllowedByRobots(item.url, robotsRules)) continue;

      // Cap blog/news pages
      const isBlog = /\/(blog|news|novosti|novyny|stati|articles)\//i.test(item.url);
      if (isBlog && blogCount >= MAX_BLOG_PAGES) continue;
      if (isBlog) blogCount++;

      visited.add(item.url);
      batch.push(item.url);
    }

    if (batch.length === 0) break;

    // Fetch batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const { html, ok } = await fetchRaw(url, opts.perPageBodyLimit, opts.perPageTimeoutMs, opts.userAgent);
        if (!ok || !html) throw new Error('Fetch failed');

        const text = extractTextContent(html);
        const structured = extractStructuredData(html);
        const title = extractPageTitle(html);
        const combinedText = structured ? `${text}\n\n${structured}` : text;
        const newLinks = discoverLinks(html, url, baseHost);

        return { url, title, text: combinedText, newLinks };
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        const { url, title, text, newLinks } = result.value;
        if (text.length > 50) {
          pages.push({ url, title, text, charCount: text.length, source: 'html' });
          totalChars += text.length;
        }
        // Enqueue discovered links
        for (const link of newLinks) {
          const normalized = normalizeUrl(link);
          if (!visited.has(normalized)) {
            queue.push({ url: normalized, score: scoreUrl(normalized) });
          }
        }
      } else {
        errors.push({ url: batch[i], error: String(result.reason) });
      }
    }

    // Politeness delay
    if (queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
    }

    // Progress callback
    opts.onProgress?.({
      pagesVisited: pages.length,
      pagesQueued: queue.length,
      totalCharsCollected: totalChars,
      currentUrl: batch[0],
      elapsedMs: Date.now() - startTime,
    });
  }

  return { pages, errors };
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export async function crawlWebsite(url: string, options?: CrawlOptions): Promise<CrawlResult> {
  const opts = { ...DEFAULTS, ...options };
  const startTime = Date.now();
  const strategies: string[] = [];
  let allPages: CrawledPage[] = [];
  let allErrors: CrawlError[] = [];

  const baseHost = new URL(url).hostname;

  // 1. Fetch robots.txt
  const robotsRules = await fetchRobotsTxt(url, opts.perPageTimeoutMs, opts.userAgent);

  // 2. Try sitemap discovery
  const sitemapUrls = await trySitemapDiscovery(url, baseHost, robotsRules, opts.perPageTimeoutMs, opts.userAgent);
  if (sitemapUrls.length > 0) {
    strategies.push('sitemap');
  }

  // 3. Try WordPress REST API
  const wpPages = await tryWordPressApi(url, opts.perPageTimeoutMs, opts.userAgent);
  if (wpPages.length > 0) {
    strategies.push('wp-api');
    allPages.push(...wpPages);
  }

  // 4. BFS crawl — seed with homepage + sitemap URLs
  const seedUrls = [normalizeUrl(url), ...sitemapUrls];

  // Skip URLs already covered by WP API
  const wpUrls = new Set(wpPages.map((p) => normalizeUrl(p.url)));
  const filteredSeeds = seedUrls.filter((u) => !wpUrls.has(u));

  // Adjust max pages: subtract WP pages already collected
  const remainingPages = Math.max(1, opts.maxPages - wpPages.length);
  const remainingChars = Math.max(1000, opts.maxTotalChars - wpPages.reduce((sum, p) => sum + p.charCount, 0));

  const bfsResult = await bfsCrawl(filteredSeeds, baseHost, robotsRules, {
    ...opts,
    maxPages: remainingPages,
    maxTotalChars: remainingChars,
    onProgress: options?.onProgress,
  });

  if (bfsResult.pages.length > 0) {
    strategies.push('html-crawl');
    allPages.push(...bfsResult.pages);
    allErrors.push(...bfsResult.errors);
  }

  // 5. Deduplicate boilerplate
  allPages = deduplicatePages(allPages);

  const totalChars = allPages.reduce((sum, p) => sum + p.charCount, 0);

  return {
    pages: allPages,
    totalChars,
    totalPages: allPages.length,
    durationMs: Date.now() - startTime,
    strategies,
    errors: allErrors,
  };
}
