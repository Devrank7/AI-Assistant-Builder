/**
 * Batch check frameability + capture screenshots for all quickwidgets.
 *
 * For each client in quickwidgets/:
 * 1. Read info.json to get website URL
 * 2. GET request to check X-Frame-Options and CSP frame-ancestors
 * 3. Download screenshot from thum.io
 * 4. Update info.json with { frameable, hasPreview }
 *
 * Usage: node scripts/batch-check-frameable.js [--screenshots-only] [--check-only]
 */
const fs = require('fs');
const path = require('path');

const QUICKWIDGETS_DIR = path.join(__dirname, '..', 'quickwidgets');
const CONCURRENCY = 5; // parallel requests

async function checkFrameable(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Use GET with redirect follow — more reliable than HEAD for header detection
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    // We only need headers, consume the body to avoid memory leaks
    try { await res.text(); } catch {}

    // Check X-Frame-Options
    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase().trim();
    const xfoBlocked = xfo === 'deny' || xfo === 'sameorigin';

    // Check Content-Security-Policy frame-ancestors
    const csp = res.headers.get('content-security-policy') || '';
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    let cspBlocked = false;
    if (frameAncestorsMatch) {
      const ancestors = frameAncestorsMatch[1].trim().toLowerCase();
      cspBlocked = ancestors === "'none'" || ancestors === "'self'";
    }

    // Also check for meta refresh / JS redirect indicators (common frame-busters)
    const frameable = !xfoBlocked && !cspBlocked;

    return {
      reachable: true,
      frameable,
      xfo: xfo || null,
      csp: frameAncestorsMatch ? frameAncestorsMatch[1].trim() : null,
    };
  } catch (err) {
    return { reachable: false, frameable: false, error: err.message };
  }
}

async function downloadScreenshot(url, outputPath) {
  try {
    const thumbUrl = `https://image.thum.io/get/width/1440/crop/900/${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s — thum.io can be slow

    const res = await fetch(thumbUrl, {
      signal: controller.signal,
      headers: { Accept: 'image/png,image/jpeg,image/*' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`thum.io returned ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`thum.io returned non-image: ${contentType}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
      throw new Error('thum.io returned tiny image');
    }

    fs.writeFileSync(outputPath, buffer);
    return { success: true, size: Math.round(buffer.length / 1024) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function processClient(clientId, flags) {
  const infoPath = path.join(QUICKWIDGETS_DIR, clientId, 'info.json');
  const previewPath = path.join(QUICKWIDGETS_DIR, clientId, 'preview.png');

  let info;
  try {
    info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
  } catch {
    return { clientId, skipped: true, reason: 'no info.json' };
  }

  if (!info.website) {
    return { clientId, skipped: true, reason: 'no website' };
  }

  const result = { clientId, website: info.website };

  // Check frameability
  if (!flags.screenshotsOnly) {
    const check = await checkFrameable(info.website);
    result.frameable = check.frameable;
    result.reachable = check.reachable;
    result.xfo = check.xfo;
    result.csp = check.csp;

    // Update info.json
    info.frameable = check.frameable;
  }

  // Download screenshot (for non-frameable OR if no preview exists)
  if (!flags.checkOnly) {
    const hasPreview = fs.existsSync(previewPath) && fs.statSync(previewPath).size > 1000;
    if (!hasPreview || (result.frameable === false)) {
      const screenshot = await downloadScreenshot(info.website, previewPath);
      result.screenshot = screenshot;
      info.hasPreview = screenshot.success;
    } else {
      result.screenshot = { success: true, existing: true };
      info.hasPreview = true;
    }
  }

  // Write updated info.json
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));

  return result;
}

async function runBatch(items, concurrency, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    screenshotsOnly: args.includes('--screenshots-only'),
    checkOnly: args.includes('--check-only'),
  };

  const clientDirs = fs.readdirSync(QUICKWIDGETS_DIR).filter(d =>
    fs.statSync(path.join(QUICKWIDGETS_DIR, d)).isDirectory()
  );

  console.log(`Processing ${clientDirs.length} quickwidgets...`);
  if (flags.screenshotsOnly) console.log('  Mode: screenshots only');
  if (flags.checkOnly) console.log('  Mode: frameability check only');

  const results = await runBatch(clientDirs, CONCURRENCY, (clientId) => {
    return processClient(clientId, flags).then(r => {
      const status = r.skipped ? `SKIP (${r.reason})` :
        r.frameable === false ? 'BLOCKED' :
        r.frameable === true ? 'OK' : '?';
      const screenshot = r.screenshot?.success ? `preview:OK (${r.screenshot.size || 'cached'}KB)` :
        r.screenshot?.error ? `preview:FAIL (${r.screenshot.error})` : '';
      console.log(`  ${clientId}: ${status} ${screenshot}`);
      return r;
    });
  });

  // Summary
  const frameable = results.filter(r => r.frameable === true).length;
  const blocked = results.filter(r => r.frameable === false).length;
  const skipped = results.filter(r => r.skipped).length;
  const screenshotOK = results.filter(r => r.screenshot?.success).length;
  const screenshotFail = results.filter(r => r.screenshot && !r.screenshot.success).length;

  console.log('\n--- Summary ---');
  console.log(`Total: ${clientDirs.length}`);
  if (!flags.screenshotsOnly) {
    console.log(`Frameable: ${frameable} | Blocked: ${blocked} | Skipped: ${skipped}`);
  }
  if (!flags.checkOnly) {
    console.log(`Screenshots OK: ${screenshotOK} | Screenshots failed: ${screenshotFail}`);
  }

  // List blocked sites
  const blockedSites = results.filter(r => r.frameable === false && !r.skipped);
  if (blockedSites.length > 0) {
    console.log(`\nBlocked sites (${blockedSites.length}):`);
    for (const r of blockedSites) {
      const reason = r.xfo ? `X-Frame-Options: ${r.xfo}` : r.csp ? `CSP: ${r.csp}` : 'unreachable';
      console.log(`  ${r.clientId}: ${r.website} — ${reason}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
