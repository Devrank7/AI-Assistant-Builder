import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const QUICKWIDGETS_DIR = path.join(process.cwd(), 'quickwidgets');

/**
 * Capture a full-page screenshot of a website and save it as preview.png.
 *
 * Uses puppeteer-core with system-installed Chromium.
 * Falls back to downloading from thum.io if Chromium is unavailable.
 *
 * Designed to run in the background (fire-and-forget) after demo generation.
 */
export async function captureScreenshot(
  clientId: string,
  websiteUrl: string
): Promise<{ success: boolean; method: string; error?: string }> {
  const outputPath = path.join(QUICKWIDGETS_DIR, clientId, 'preview.png');

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Strategy 1: Try Puppeteer with system Chromium
  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || findChromium();
  if (chromiumPath) {
    try {
      const result = await captureWithPuppeteer(chromiumPath, websiteUrl, outputPath);
      if (result) {
        console.log(`[Screenshot] ${clientId}: Captured via Puppeteer (${getFileSizeKB(outputPath)}KB)`);
        return { success: true, method: 'puppeteer' };
      }
    } catch (err) {
      console.warn(`[Screenshot] ${clientId}: Puppeteer failed:`, err);
    }
  }

  // Strategy 2: Download from thum.io
  try {
    await captureWithThumio(websiteUrl, outputPath);
    console.log(`[Screenshot] ${clientId}: Captured via thum.io (${getFileSizeKB(outputPath)}KB)`);
    return { success: true, method: 'thum.io' };
  } catch (err) {
    console.warn(`[Screenshot] ${clientId}: thum.io failed:`, err);
  }

  return { success: false, method: 'none', error: 'All screenshot methods failed' };
}

/**
 * Take a screenshot using Puppeteer with system-installed Chromium.
 */
async function captureWithPuppeteer(executablePath: string, url: string, outputPath: string): Promise<boolean> {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-translate',
      '--no-first-run',
      '--single-process',
    ],
  });

  try {
    const page = await browser.newPage();

    // Desktop viewport
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    // Wait a bit for lazy-loaded content
    await new Promise((r) => setTimeout(r, 2000));

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false, // viewport only (1440x900) — not full page scroll
    });

    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000;
  } finally {
    await browser.close();
  }
}

/**
 * Download a screenshot from thum.io external service.
 */
async function captureWithThumio(url: string, outputPath: string): Promise<void> {
  const thumbUrl = `https://image.thum.io/get/width/1440/crop/900/${url}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const res = await fetch(thumbUrl, {
    signal: controller.signal,
    headers: { Accept: 'image/png,image/jpeg,image/*' },
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`thum.io returned ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`thum.io returned non-image content: ${contentType}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error('thum.io returned suspiciously small image');
  }

  fs.writeFileSync(outputPath, buffer);
}

/**
 * Try to find Chromium on common system paths.
 */
function findChromium(): string | null {
  const candidates = [
    '/usr/bin/chromium-browser', // Alpine
    '/usr/bin/chromium', // Debian/Ubuntu
    '/usr/bin/google-chrome', // Chrome on Linux
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getFileSizeKB(filePath: string): number {
  try {
    return Math.round(fs.statSync(filePath).size / 1024);
  } catch {
    return 0;
  }
}
