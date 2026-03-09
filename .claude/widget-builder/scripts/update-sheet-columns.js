#!/usr/bin/env node
/**
 * Updates spreadsheet with hasWidget, Demo, and JavaScript columns.
 * Usage: node update-sheet-columns.js <spreadsheetId>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const ADMIN_TOKEN = 'admin-secret-2026';
const BASE_URL = 'http://localhost:3000';
const PROD_URL = 'https://winbixai.com';
const SPREADSHEET_ID = process.argv[2];

function apiCall(method, endpoint, data) {
  try {
    let cmd = `curl -s -X ${method} "${BASE_URL}${endpoint}" -H "Content-Type: application/json" -H "Cookie: admin_token=${ADMIN_TOKEN}"`;
    if (data) {
      // Write data to temp file to avoid shell escaping issues
      const tmpFile = path.join(ROOT, '.agent/widget-builder/temp-api-data.json');
      fs.writeFileSync(tmpFile, JSON.stringify(data));
      cmd += ` -d @${tmpFile}`;
    }
    const result = execSync(cmd, { timeout: 30000, encoding: 'utf8' });
    // Clean up temp file
    const tmpFile = path.join(ROOT, '.agent/widget-builder/temp-api-data.json');
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    return JSON.parse(result);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  // Read leads
  const allLeads = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent/widget-builder/leads-batch.json'), 'utf8'));

  // Read spreadsheet
  console.log('Reading spreadsheet...');
  const sheetData = apiCall('GET', `/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!sheetData.success) {
    console.error('Failed:', sheetData.error);
    process.exit(1);
  }

  const rows = sheetData.rows;
  const headers = sheetData.headers;
  console.log(`${rows.length} rows, headers: ${headers.join(', ')}`);

  // Columns M=12, N=13, O=14
  const hasWidgetCol = 'M';
  const demoCol = 'N';
  const jsCol = 'O';

  // First, write headers
  console.log('Writing column headers...');
  const headerResult = apiCall('POST', '/api/integrations/sheets/update', {
    spreadsheetId: SPREADSHEET_ID,
    range: 'M1:O1',
    values: [['hasWidget', 'Demo', 'JavaScript']]
  });
  console.log('Headers:', headerResult.success ? 'OK' : headerResult.error);

  // Build values for all 100 rows
  const allValues = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lead = allLeads.find(l =>
      l.email === row['Owner Email'] ||
      l.website === row['Website']
    );

    if (!lead || !fs.existsSync(path.join(ROOT, 'quickwidgets', lead.clientId, 'script.js'))) {
      allValues.push(['', '', '']);
      continue;
    }

    const jsSnippet = `(function(){var s=document.createElement('script');s.src='${PROD_URL}/quickwidgets/${lead.clientId}/script.js';document.head.appendChild(s)})()`;

    // Get short link code from MongoDB
    const linkResult = apiCall('GET', `/api/short-link?clientId=${lead.clientId}`);
    const shortUrl = linkResult.success && linkResult.code
      ? `${PROD_URL}/d/${linkResult.code}`
      : `${PROD_URL}/demo/client-website?client=${lead.clientId}&website=${encodeURIComponent(lead.website)}`;

    allValues.push(['TRUE', shortUrl, jsSnippet]);
  }

  // Update in batches of 50 rows
  const BATCH_SIZE = 50;
  for (let start = 0; start < allValues.length; start += BATCH_SIZE) {
    const batch = allValues.slice(start, start + BATCH_SIZE);
    const startRow = start + 2; // 1-indexed, row 1 is header
    const endRow = startRow + batch.length - 1;
    const range = `M${startRow}:O${endRow}`;

    console.log(`Updating ${range} (${batch.length} rows)...`);
    const result = apiCall('POST', '/api/integrations/sheets/update', {
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      values: batch
    });

    if (result.success) {
      console.log(`  ✅ Updated ${result.updatedCells} cells`);
    } else {
      console.error(`  ❌ Failed:`, result.error);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
