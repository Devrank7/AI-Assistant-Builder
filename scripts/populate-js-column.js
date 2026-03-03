/**
 * One-time script: Populate "JavaScript" column in the leads spreadsheet.
 * Each cell gets a console-executable snippet that injects the widget on the client's site.
 *
 * Usage: node scripts/populate-js-column.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const SPREADSHEET_ID = '1048WTUpDHmuJ8sItwbrQIguMPa8QteuSHkpU9_QYeq8';
const BASE_URL = 'https://winbix-ai.xyz';
const API_BASE = 'http://localhost:3000';

const ADMIN_TOKEN = (() => {
  try {
    const envFile = fs.readFileSync(path.join(PROJECT_DIR, '.env.local'), 'utf-8');
    const match = envFile.match(/ADMIN_SECRET_TOKEN=(.+)/);
    return match ? match[1].trim() : '';
  } catch { return ''; }
})();

async function apiCall(method, endpoint, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${ADMIN_TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${endpoint}`, opts);
  return resp.json();
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
}

async function main() {
  // 1. Build website → clientId map from quickwidgets
  const qwDir = path.join(PROJECT_DIR, 'quickwidgets');
  const clientDirs = fs.readdirSync(qwDir).filter(d =>
    fs.statSync(path.join(qwDir, d)).isDirectory()
  );

  const websiteToClient = new Map();
  for (const clientId of clientDirs) {
    try {
      const info = JSON.parse(fs.readFileSync(path.join(qwDir, clientId, 'info.json'), 'utf-8'));
      if (info.website) {
        websiteToClient.set(normalizeUrl(info.website), clientId);
      }
    } catch {}
  }
  console.log(`Loaded ${websiteToClient.size} quickwidgets with websites`);

  // 2. Read spreadsheet
  const sheetData = await apiCall('GET', `/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!sheetData.success) {
    console.error('Failed to read spreadsheet:', sheetData.error);
    return;
  }

  const rows = sheetData.rows;
  console.log(`Spreadsheet has ${rows.length} rows`);

  // 3. Build values for JavaScript column
  const jsValues = [['JavaScript']]; // header
  let matched = 0;

  for (const row of rows) {
    const website = row['Website'] || '';
    const normalized = normalizeUrl(website);
    const clientId = websiteToClient.get(normalized);

    if (clientId) {
      const snippet = `(function(){var s=document.createElement('script');s.src='${BASE_URL}/quickwidgets/${clientId}/script.js';document.head.appendChild(s)})()`;
      jsValues.push([snippet]);
      matched++;
    } else {
      jsValues.push(['']);
    }
  }

  console.log(`Matched ${matched}/${rows.length} rows`);

  // 4. Write to column N
  const updateResult = await apiCall('POST', '/api/integrations/sheets/update', {
    spreadsheetId: SPREADSHEET_ID,
    range: `N1:N${jsValues.length}`,
    values: jsValues,
  });

  if (updateResult.success) {
    console.log(`Updated ${updateResult.updatedCells} cells in JavaScript column (N)`);
  } else {
    console.error('Failed to update:', updateResult.error);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
