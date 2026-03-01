/**
 * POST /api/generate-demo
 *
 * Self-service widget generator. Accepts a website URL + primary color,
 * builds a demo widget, and returns a preview link.
 *
 * Pipeline: validate → fetch site metadata → generate theme → build → deploy → create client → background knowledge upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { randomBytes, randomInt } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings from '@/models/AISettings';
import { generateEmbedding, splitTextIntoChunks } from '@/lib/gemini';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rateLimit';
import { generateThemeJson, generateWidgetConfig } from '@/lib/themeGenerator';
import { crawlWebsite } from '@/lib/crawler';
import { withRetry } from '@/lib/retry';
import ShortLink from '@/models/ShortLink';
import { captureScreenshot } from '@/lib/screenshot';

// --- Paths ---
const PROJECT_ROOT = process.cwd();
const BUILDER_ROOT = path.join(PROJECT_ROOT, '.agent', 'widget-builder');
const CLIENTS_DIR = path.join(BUILDER_ROOT, 'clients');
const DIST_SCRIPT = path.join(BUILDER_ROOT, 'dist', 'script.js');
const QUICKWIDGETS_DIR = path.join(PROJECT_ROOT, 'quickwidgets');

// --- Validation ---
const requestSchema = z.object({
  websiteUrl: z.string().url().max(2000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid 6-digit hex color'),
  isDark: z.boolean().optional().default(false),
});

// --- Build Mutex (prevents concurrent build.js from corrupting shared src/) ---
let buildQueue: Promise<void> = Promise.resolve();

function enqueueBuild(fn: () => Promise<void>): Promise<void> {
  const task = buildQueue.then(fn, fn);
  buildQueue = task.catch(() => {});
  return task;
}

// --- Website Metadata Extraction ---
interface SiteMetadata {
  title: string;
  description: string;
  language: string;
  rawHtml: string;
  phone: string;
  email: string;
}

async function fetchSiteMetadata(url: string): Promise<SiteMetadata> {
  const defaults: SiteMetadata = {
    title: '',
    description: '',
    language: 'en',
    rawHtml: '',
    phone: '',
    email: '',
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WinBixBot/1.0)',
        Accept: 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return defaults;

    // Read only first 100KB to avoid memory issues
    const reader = res.body?.getReader();
    if (!reader) return defaults;

    let html = '';
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const MAX_BYTES = 100 * 1024;

    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    // Extract metadata via regex
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);

    // Extract phone and email from HTML
    const phoneMatch = html.match(/href=["']tel:([^"']+)["']/i);
    const emailMatch = html.match(/href=["']mailto:([^"'?]+)["'?]/i);

    return {
      title: (titleMatch?.[1] || ogTitleMatch?.[1] || '').trim(),
      description: (descMatch?.[1] || '').trim(),
      language: (langMatch?.[1] || 'en').split('-')[0].toLowerCase(),
      rawHtml: html,
      phone: (phoneMatch?.[1] || '').trim(),
      email: (emailMatch?.[1] || '').trim(),
    };
  } catch {
    return defaults;
  }
}

// --- Set AI System Prompt (synchronous — must complete before user interacts) ---
async function setAISettings(clientId: string, brandName: string, language: string): Promise<void> {
  let systemPrompt: string;
  if (language === 'uk') {
    systemPrompt = `Ти — AI-асистент компанії "${brandName}". Відповідай на основі наданої бази знань. Будь ввічливим, корисним та професійним. Якщо не знаєш відповіді — порадь зв'язатися з компанією напряму. Відповідай українською мовою. ВАЖЛИВО: ти представляєш ТІЛЬКИ компанію "${brandName}", ніяку іншу.`;
  } else if (language === 'ru') {
    systemPrompt = `Ты — AI-ассистент компании "${brandName}". Отвечай на основе предоставленной базы знаний. Будь вежливым, полезным и профессиональным. Если не знаешь ответа — предложи связаться с компанией напрямую. Отвечай на русском языке. ВАЖНО: ты представляешь ТОЛЬКО компанию "${brandName}", никакую другую.`;
  } else if (language === 'pl') {
    systemPrompt = `Jesteś asystentem AI firmy "${brandName}". Odpowiadaj na podstawie dostarczonej bazy wiedzy. Bądź uprzejmy, pomocny i profesjonalny. Jeśli nie znasz odpowiedzi — zasugeruj bezpośredni kontakt z firmą. Odpowiadaj po polsku. WAŻNE: reprezentujesz TYLKO firmę "${brandName}", żadną inną.`;
  } else if (language === 'ar') {
    systemPrompt = `أنت مساعد AI لشركة "${brandName}". أجب بناءً على قاعدة المعرفة المقدمة. كن مهذبًا ومفيدًا ومحترفًا. إذا لم تعرف الإجابة، اقترح التواصل مع الشركة مباشرة. أجب باللغة العربية. مهم: أنت تمثل فقط شركة "${brandName}"، لا شركة أخرى.`;
  } else {
    systemPrompt = `You are an AI assistant for "${brandName}". Answer questions based on the provided knowledge base. Be helpful, professional, and friendly. If you don't know the answer, suggest contacting the company directly. Respond in English. IMPORTANT: You represent ONLY "${brandName}", no other company.`;
  }

  await AISettings.findOneAndUpdate(
    { clientId },
    {
      $set: {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2048,
        topK: 5,
      },
    },
    { upsert: true }
  );
}

// --- Background Knowledge Upload — deep crawl + embeddings ---
async function uploadKnowledgeBackground(clientId: string, brandName: string, websiteUrl: string): Promise<void> {
  try {
    await connectDB();

    // 1. Deep crawl the entire website (up to 30 pages, 2 min timeout)
    const crawlResult = await crawlWebsite(websiteUrl, {
      maxPages: 30,
      totalTimeoutMs: 120_000,
      onProgress: (p) =>
        console.log(
          `[KnowledgeBg] ${clientId}: ${p.pagesVisited} pages crawled, ${p.totalCharsCollected} chars (${Math.round(p.elapsedMs / 1000)}s)`
        ),
    });

    if (crawlResult.pages.length === 0) {
      console.log(`[KnowledgeBg] ${clientId}: No pages crawled, skipping knowledge upload`);
      return;
    }

    console.log(
      `[KnowledgeBg] ${clientId}: Crawl complete — ${crawlResult.totalPages} pages, ${crawlResult.totalChars} chars, strategies: ${crawlResult.strategies.join(', ')} (${Math.round(crawlResult.durationMs / 1000)}s)`
    );

    // 2. Compile all crawled content
    let fullText = `${brandName}\n\n`;
    for (const page of crawlResult.pages) {
      fullText += `--- ${page.title || page.url} ---\n${page.text}\n\n`;
    }

    // 3. Split into chunks and generate embeddings (batched to avoid rate limits)
    const textChunks = splitTextIntoChunks(fullText, 500);
    console.log(`[KnowledgeBg] ${clientId}: Processing ${textChunks.length} chunks`);

    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1000;
    let savedChunks = 0;

    for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
      const batch = textChunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (chunkText) => {
          const embedding = await withRetry(() => generateEmbedding(chunkText), {
            maxRetries: 3,
            backoffMs: 2000,
          });
          await KnowledgeChunk.create({
            clientId,
            text: chunkText,
            embedding,
            source: 'deep-crawl',
          });
        })
      );
      savedChunks += results.filter((r) => r.status === 'fulfilled').length;

      // Delay between batches to avoid Gemini rate limits
      if (i + BATCH_SIZE < textChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // 4. Export seed (dev → production sync)
    try {
      const { exportClientSeed } = await import('@/lib/exportSeed');
      await exportClientSeed(clientId);
    } catch {
      /* non-fatal */
    }

    console.log(`[KnowledgeBg] ${clientId}: Knowledge upload complete (${savedChunks}/${textChunks.length} chunks)`);
  } catch (error) {
    console.error(`[KnowledgeBg] ${clientId}: Knowledge upload failed:`, error);
  }
}

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit
    const rateLimitKey = getRateLimitKey(request, 'demo-gen');
    const rateCheck = checkRateLimit(rateLimitKey, RATE_LIMITS.demoGenerate);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { websiteUrl, primaryColor, isDark } = parsed.data;

    // 3. Generate clientId from domain
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname.replace(/^www\./, '');
    const domainSlug = domain
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    const suffix = randomBytes(3).toString('hex');
    const clientId = `demo-${domainSlug}-${suffix}`;

    // 4. Fetch site metadata
    const metadata = await fetchSiteMetadata(websiteUrl);
    const brandName = metadata.title
      ? metadata.title
          .split(/[|\-–—]/)
          .map((s) => s.trim())
          .filter(Boolean)[0] || domain
      : domain.charAt(0).toUpperCase() + domain.slice(1).replace(/\.\w+$/, '');

    // 5. Generate theme.json
    const themeJson = generateThemeJson({
      primaryColor,
      isDark,
      domain,
      brandName,
    });

    // 6. Generate widget.config.json
    const lang = metadata.language || 'en';
    const isUkr = lang === 'uk';
    const isRus = lang === 'ru';
    const greeting = metadata.description
      ? isUkr
        ? `Вітаємо! 👋 Я — AI-помічник **${brandName}**. Чим можу допомогти?`
        : isRus
          ? `Привет! 👋 Я — AI-ассистент **${brandName}**. Чем могу помочь?`
          : `Hi there! 👋 I'm the **${brandName}** AI assistant. How can I help you?`
      : isUkr
        ? `Вітаємо! 👋 Чим можу допомогти?`
        : isRus
          ? `Привет! 👋 Чем могу помочь?`
          : `Hi there! 👋 How can I help you?`;

    const widgetConfig = generateWidgetConfig({
      clientId,
      brandName,
      greeting,
      language: lang,
      contacts: {
        phone: metadata.phone || undefined,
        email: metadata.email || undefined,
        website: websiteUrl,
      },
    });

    // 7. Write config files
    const clientDir = path.join(CLIENTS_DIR, clientId);
    fs.mkdirSync(clientDir, { recursive: true });
    fs.writeFileSync(path.join(clientDir, 'theme.json'), JSON.stringify(themeJson, null, 2));
    fs.writeFileSync(path.join(clientDir, 'widget.config.json'), JSON.stringify(widgetConfig, null, 2));

    // 8. Build widget (mutex-protected)
    try {
      await enqueueBuild(async () => {
        execSync(`node scripts/generate-single-theme.js ${clientId}`, {
          cwd: BUILDER_ROOT,
          timeout: 30000,
          stdio: 'pipe',
        });
        execSync(`node scripts/build.js ${clientId}`, {
          cwd: BUILDER_ROOT,
          timeout: 60000,
          stdio: 'pipe',
        });
      });
    } catch (buildError) {
      // Cleanup on build failure
      try {
        fs.rmSync(clientDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      console.error('[GenerateDemo] Build failed:', buildError);
      return NextResponse.json({ success: false, error: 'Widget build failed. Please try again.' }, { status: 500 });
    }

    // 9. Deploy to quickwidgets/
    const qwDir = path.join(QUICKWIDGETS_DIR, clientId);
    fs.mkdirSync(qwDir, { recursive: true });

    if (!fs.existsSync(DIST_SCRIPT)) {
      try {
        fs.rmSync(clientDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return NextResponse.json({ success: false, error: 'Build output not found.' }, { status: 500 });
    }

    fs.copyFileSync(DIST_SCRIPT, path.join(qwDir, 'script.js'));

    // 10. Write info.json
    const infoJson = {
      name: brandName,
      clientId,
      username: clientId,
      email: '',
      website: websiteUrl,
      clientType: 'quick',
      features: ['streaming', 'quick-replies', 'feedback', 'sound', 'voice-input'],
      createdAt: new Date().toISOString(),
      version: '2.0.0',
      selfService: true,
    };
    fs.writeFileSync(path.join(qwDir, 'info.json'), JSON.stringify(infoJson, null, 2));

    // 11. Create Client record + Set AI system prompt (SYNCHRONOUS — must complete before user interacts)
    try {
      await connectDB();
      const existing = await Client.findOne({ clientId });
      if (!existing) {
        await Client.create({
          clientId,
          clientToken: '',
          clientType: 'quick',
          username: clientId,
          email: '',
          website: websiteUrl,
          requests: 0,
          tokens: 0,
          startDate: new Date(),
          folderPath: clientId,
          isActive: true,
          subscriptionStatus: 'active',
        });
      }
      // Set AI system prompt NOW — so the AI knows who it represents from the first interaction
      await setAISettings(clientId, brandName, lang);
    } catch (dbError) {
      console.error('[GenerateDemo] DB error (non-fatal):', dbError);
    }

    // 12. Fire-and-forget: deep crawl + upload knowledge embeddings in background
    uploadKnowledgeBackground(clientId, brandName, websiteUrl).catch((err) => {
      console.error('[GenerateDemo] Background knowledge upload error:', err);
    });

    // 12b. Fire-and-forget: capture website screenshot for iframe-blocked sites
    captureScreenshot(clientId, websiteUrl).catch((err) => {
      console.error('[GenerateDemo] Screenshot capture error:', err);
    });

    // 13. Create short link
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let shortCode = '';
    for (let i = 0; i < 6; i++) shortCode += chars[randomInt(chars.length)];
    try {
      await ShortLink.create({ code: shortCode, clientId, website: websiteUrl, widgetType: 'quick' });
    } catch {
      // Code collision — retry once with a new code
      shortCode = '';
      for (let i = 0; i < 6; i++) shortCode += chars[randomInt(chars.length)];
      await ShortLink.create({ code: shortCode, clientId, website: websiteUrl, widgetType: 'quick' }).catch(() => {});
    }

    // 14. Build response
    const encodedUrl = encodeURIComponent(websiteUrl);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`;
    const demoUrl = `${baseUrl}/demo/client-website?client=${clientId}&type=quick&website=${encodedUrl}`;
    const shortUrl = `${baseUrl}/d/${shortCode}`;
    const embedCode = `<script src="${baseUrl}/quickwidgets/${clientId}/script.js"></script>`;

    return NextResponse.json({
      success: true,
      data: {
        clientId,
        demoUrl,
        shortUrl,
        embedCode,
      },
    });
  } catch (error) {
    console.error('[GenerateDemo] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
