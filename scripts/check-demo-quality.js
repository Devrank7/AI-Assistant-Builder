/**
 * Check iframe frameability for all leads in a Google Sheets spreadsheet.
 * Reads rows with hasWidget=TRUE and a Demo link, checks if the client's
 * website can be embedded in an iframe, writes "Work Demo" column (TRUE/FALSE).
 *
 * Usage: node scripts/check-demo-quality.js <spreadsheetId>
 */
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const API_BASE = 'http://localhost:3000';
const CONCURRENCY = 5;

const ADMIN_TOKEN = (() => {
  try {
    const envFile = fs.readFileSync(path.join(PROJECT_DIR, '.env.local'), 'utf-8');
    const match = envFile.match(/ADMIN_SECRET_TOKEN=(.+)/);
    return match ? match[1].trim() : '';
  } catch { return ''; }
})();

// --- API helper ---
async function apiCall(method, endpoint, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${ADMIN_TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${endpoint}`, opts);
  return resp.json();
}

// --- Frameability check (reused from batch-check-frameable.js) ---
async function checkFrameable(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    // Consume body to avoid memory leaks
    try { await res.text(); } catch {}

    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase().trim();
    const xfoBlocked = xfo === 'deny' || xfo === 'sameorigin';

    const csp = res.headers.get('content-security-policy') || '';
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    let cspBlocked = false;
    if (frameAncestorsMatch) {
      const ancestors = frameAncestorsMatch[1].trim().toLowerCase();
      cspBlocked = ancestors === "'none'" || ancestors === "'self'";
    }

    return { reachable: true, frameable: !xfoBlocked && !cspBlocked, xfo: xfo || null, csp: frameAncestorsMatch ? frameAncestorsMatch[1].trim() : null };
  } catch (err) {
    return { reachable: false, frameable: false, error: err.message };
  }
}

// --- Concurrent batch runner ---
async function runBatch(items, concurrency, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// --- Column index → letter (0=A, 25=Z, 26=AA) ---
function colLetter(index) {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

async function main() {
  const spreadsheetId = process.argv[2];
  if (!spreadsheetId) {
    console.error('Usage: node scripts/check-demo-quality.js <spreadsheetId>');
    process.exit(1);
  }

  if (!ADMIN_TOKEN) {
    console.error('ADMIN_SECRET_TOKEN not found in .env.local');
    process.exit(1);
  }

  // 1. Read spreadsheet
  console.log(`Reading spreadsheet ${spreadsheetId}...`);
  const sheetData = await apiCall('GET', `/api/integrations/sheets/read?spreadsheetId=${spreadsheetId}`);
  if (!sheetData.success) {
    console.error('Failed to read spreadsheet:', sheetData.error);
    process.exit(1);
  }

  const { headers, rows } = sheetData;
  console.log(`Found ${rows.length} rows, headers: [${headers.join(', ')}]`);

  // 2. Validate required columns
  const hasWidgetCol = headers.findIndex(h => h.toLowerCase() === 'haswidget');
  const demoCol = headers.findIndex(h => h.toLowerCase() === 'demo');
  const websiteCol = headers.findIndex(h => h.toLowerCase() === 'website');

  if (hasWidgetCol === -1) {
    console.error('Missing required column: "hasWidget"');
    process.exit(1);
  }
  if (demoCol === -1) {
    console.error('Missing required column: "Demo"');
    process.exit(1);
  }
  if (websiteCol === -1) {
    console.error('Missing required column: "Website"');
    process.exit(1);
  }

  const hasWidgetKey = headers[hasWidgetCol];
  const demoKey = headers[demoCol];
  const websiteKey = headers[websiteCol];

  // 3. Filter qualifying rows
  const qualifying = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hasWidget = (row[hasWidgetKey] || '').toString().toUpperCase();
    const demo = (row[demoKey] || '').toString().trim();
    const website = (row[websiteKey] || '').toString().trim();

    if ((hasWidget === 'TRUE' || hasWidget === 'YES') && demo) {
      qualifying.push({ index: i, website, demo, row });
    }
  }

  console.log(`\nQualifying rows (hasWidget=TRUE + Demo exists): ${qualifying.length} / ${rows.length}`);

  if (qualifying.length === 0) {
    console.log('No rows to check. Exiting.');
    return;
  }

  // 4. Check frameability for each qualifying row
  console.log(`\nChecking frameability (${CONCURRENCY} concurrent)...\n`);

  const results = await runBatch(qualifying, CONCURRENCY, async (item, i) => {
    let url = item.website;

    // Ensure URL has protocol
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }

    if (!url) {
      console.log(`  ${i + 1}. [SKIP] Row ${item.index + 2}: no website URL`);
      return { ...item, frameable: false, reason: 'no website' };
    }

    const check = await checkFrameable(url);
    const status = check.frameable ? 'TRUE' : 'FALSE';
    const reason = !check.reachable ? 'unreachable' :
      check.xfo ? `X-Frame-Options: ${check.xfo}` :
      check.csp ? `CSP: ${check.csp}` : 'OK';

    console.log(`  ${i + 1}. [${status}] ${url} — ${reason}`);
    return { ...item, frameable: check.frameable, check };
  });

  // 5. Find or create "Work Demo" column
  let workDemoCol = headers.findIndex(h => h.toLowerCase() === 'work demo');
  let workDemoLetter;

  if (workDemoCol === -1) {
    // Create new column after the last header
    workDemoCol = headers.length;
    workDemoLetter = colLetter(workDemoCol);
    console.log(`\nCreating "Work Demo" column at ${workDemoLetter}`);
  } else {
    workDemoLetter = colLetter(workDemoCol);
    console.log(`\nUpdating existing "Work Demo" column at ${workDemoLetter}`);
  }

  // 6. Build values array: header + all rows
  const values = [['Work Demo']]; // row 1 = header
  const qualifyingMap = new Map(results.map(r => [r.index, r]));

  for (let i = 0; i < rows.length; i++) {
    const result = qualifyingMap.get(i);
    if (result) {
      values.push([result.frameable ? 'TRUE' : 'FALSE']);
    } else {
      values.push(['']);
    }
  }

  // 7. Write to spreadsheet
  const range = `${workDemoLetter}1:${workDemoLetter}${values.length}`;
  console.log(`Writing ${values.length} values to range ${range}...`);

  const updateResult = await apiCall('POST', '/api/integrations/sheets/update', {
    spreadsheetId,
    range,
    values,
  });

  if (updateResult.success) {
    console.log(`Updated ${updateResult.updatedCells} cells`);
  } else {
    console.error('Failed to update spreadsheet:', updateResult.error);
    process.exit(1);
  }

  // 8. Summary
  const frameable = results.filter(r => r.frameable).length;
  const blocked = results.filter(r => !r.frameable).length;

  console.log('\n=== Summary ===');
  console.log(`Total checked: ${results.length}`);
  console.log(`Work Demo TRUE (frameable): ${frameable}`);
  console.log(`Work Demo FALSE (blocked): ${blocked}`);
  console.log(`Skipped (no widget/demo): ${rows.length - results.length}`);
  console.log(`Column: ${workDemoLetter} ("Work Demo")`);

  if (blocked > 0) {
    console.log(`\nBlocked sites:`);
    for (const r of results.filter(r => !r.frameable)) {
      const reason = r.reason || (r.check?.xfo ? `X-Frame-Options: ${r.check.xfo}` : r.check?.csp ? `CSP: ${r.check.csp}` : 'unreachable');
      console.log(`  Row ${r.index + 2}: ${r.website} — ${reason}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
