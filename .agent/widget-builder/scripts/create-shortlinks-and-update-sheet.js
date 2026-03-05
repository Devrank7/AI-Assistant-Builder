#!/usr/bin/env node
/**
 * Creates ShortLink records for all batch-created widgets and updates the spreadsheet.
 * Usage: node create-shortlinks-and-update-sheet.js <spreadsheetId>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../../..');
const ADMIN_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'admin-secret-2026';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PROD_URL = 'https://winbix-ai.xyz';
const SPREADSHEET_ID = process.argv[2];

if (!SPREADSHEET_ID) {
  console.error('Usage: node create-shortlinks-and-update-sheet.js <spreadsheetId>');
  process.exit(1);
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[crypto.randomInt(CHARS.length)];
  }
  return code;
}

function curlJson(method, url, data) {
  try {
    let cmd = `curl -s -X ${method} "${BASE_URL}${url}" -H "Content-Type: application/json" -H "Cookie: admin_token=${ADMIN_TOKEN}"`;
    if (data) {
      const jsonStr = JSON.stringify(data).replace(/'/g, "'\\''");
      cmd += ` -d '${jsonStr}'`;
    }
    const result = execSync(cmd, { timeout: 15000, encoding: 'utf8' });
    return JSON.parse(result);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  // 1. Read the leads batch to get the mapping (row index -> clientId)
  const allLeads = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent/widget-builder/leads-batch.json'), 'utf8'));

  // 2. Read spreadsheet to get headers and current data
  console.log('📊 Reading spreadsheet...');
  const sheetData = curlJson('GET', `/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!sheetData.success) {
    console.error('Failed to read spreadsheet:', sheetData.error);
    process.exit(1);
  }

  const headers = sheetData.headers;
  const rows = sheetData.rows;
  console.log(`  Headers: ${headers.join(', ')}`);
  console.log(`  Rows: ${rows.length}`);

  // 3. Find or create hasWidget, Demo, JavaScript column indices
  let hasWidgetCol = headers.indexOf('hasWidget');
  let demoCol = headers.indexOf('Demo');
  let jsCol = headers.indexOf('JavaScript');

  // Column letter helper
  const colLetter = (idx) => {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  };

  let nextCol = headers.length;

  // Add missing columns
  const colUpdates = [];
  if (hasWidgetCol === -1) {
    hasWidgetCol = nextCol++;
    colUpdates.push({ range: `${colLetter(hasWidgetCol)}1`, values: [['hasWidget']] });
  }
  if (demoCol === -1) {
    demoCol = nextCol++;
    colUpdates.push({ range: `${colLetter(demoCol)}1`, values: [['Demo']] });
  }
  if (jsCol === -1) {
    jsCol = nextCol++;
    colUpdates.push({ range: `${colLetter(jsCol)}1`, values: [['JavaScript']] });
  }

  // Check if we need to expand the grid
  if (nextCol > 26) {
    console.log(`  ⚠️ Need to expand grid to ${nextCol} columns`);
    // Use Sheets batchUpdate to expand grid - skip for now, just log
  }

  // Write column headers if needed
  if (colUpdates.length > 0) {
    console.log('📝 Creating new columns:', colUpdates.map(u => u.range).join(', '));
    const headerResult = curlJson('POST', '/api/integrations/sheets/update', {
      spreadsheetId: SPREADSHEET_ID,
      updates: colUpdates
    });
    if (!headerResult.success) {
      console.error('Failed to create column headers:', headerResult.error);
    }
  }

  // 4. For each lead/row, create short link and prepare column updates
  const hasWidgetValues = [];
  const demoValues = [];
  const jsValues = [];
  const shortLinks = {};

  console.log('\n🔗 Creating short links and preparing updates...');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Find matching lead by email or website
    const lead = allLeads.find(l =>
      l.email === row['Owner Email'] ||
      l.website === row['Website']
    );

    if (!lead) {
      console.log(`  ⚠️ Row ${i + 2}: No matching lead for ${row['Company']}`);
      hasWidgetValues.push(['']);
      demoValues.push(['']);
      jsValues.push(['']);
      continue;
    }

    // Check if widget exists
    const widgetDir = path.join(ROOT, 'quickwidgets', lead.clientId);
    if (!fs.existsSync(path.join(widgetDir, 'script.js'))) {
      console.log(`  ⚠️ Row ${i + 2}: Widget not found for ${lead.clientId}`);
      hasWidgetValues.push(['']);
      demoValues.push(['']);
      jsValues.push(['']);
      continue;
    }

    // Create short link via MongoDB
    const code = generateCode();
    try {
      // Use the API to check if shortlink already exists
      const existing = curlJson('GET', `/api/short-link?clientId=${lead.clientId}`);
      let shortCode;

      if (existing.success && existing.code) {
        shortCode = existing.code;
        console.log(`  ♻️ ${lead.clientId}: existing short link ${shortCode}`);
      } else {
        // Create via direct MongoDB insert using a simple API call
        // We'll use the generate-demo approach but simplified
        // Actually, let's create via a temp script
        shortCode = code;
        shortLinks[lead.clientId] = { code: shortCode, website: lead.website };
      }

      const shortUrl = `${PROD_URL}/d/${shortCode}`;
      const jsSnippet = `(function(){var s=document.createElement('script');s.src='${PROD_URL}/quickwidgets/${lead.clientId}/script.js';document.head.appendChild(s)})()`;

      hasWidgetValues.push(['TRUE']);
      demoValues.push([shortUrl]);
      jsValues.push([jsSnippet]);

      console.log(`  ✅ ${lead.clientId}: ${shortUrl}`);
    } catch (e) {
      console.log(`  ❌ ${lead.clientId}: ${e.message}`);
      hasWidgetValues.push(['TRUE']);
      demoValues.push(['']);
      jsValues.push(['']);
    }
  }

  // 5. Batch insert short links into MongoDB
  if (Object.keys(shortLinks).length > 0) {
    console.log(`\n💾 Creating ${Object.keys(shortLinks).length} short links in MongoDB...`);

    // Create a temp script to insert short links
    const insertScript = `
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-widget-admin';

const ShortLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  clientId: { type: String, required: true, index: true },
  website: String,
  widgetType: { type: String, default: 'quick' },
  createdAt: { type: Date, default: Date.now }
});

async function run() {
  await mongoose.connect(MONGODB_URI);
  const ShortLink = mongoose.model('ShortLink', ShortLinkSchema);

  const links = ${JSON.stringify(Object.entries(shortLinks).map(([clientId, { code, website }]) => ({
    code, clientId, website, widgetType: 'quick'
  })))};

  let created = 0;
  for (const link of links) {
    try {
      await ShortLink.create(link);
      created++;
    } catch (e) {
      // Try with a different code on collision
      try {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let newCode = '';
        for (let i = 0; i < 6; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
        link.code = newCode;
        await ShortLink.create(link);
        created++;
      } catch (e2) {
        console.log('Failed to create short link for', link.clientId, e2.message);
      }
    }
  }

  console.log('Created ' + created + ' short links');
  await mongoose.disconnect();
}

run().catch(console.error);
`;

    const tempFile = path.join(ROOT, '.agent/widget-builder/temp-insert-links.js');
    fs.writeFileSync(tempFile, insertScript);

    try {
      execSync(`node ${tempFile}`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
    } catch (e) {
      console.error('Short link insertion failed:', e.message);
    }

    fs.unlinkSync(tempFile);
  }

  // 6. Batch update spreadsheet
  console.log('\n📝 Updating spreadsheet...');

  const updates = [];

  if (hasWidgetValues.length > 0) {
    const startRow = 2;
    const endRow = startRow + hasWidgetValues.length - 1;
    updates.push({
      range: `${colLetter(hasWidgetCol)}${startRow}:${colLetter(hasWidgetCol)}${endRow}`,
      values: hasWidgetValues
    });
  }

  if (demoValues.length > 0) {
    const startRow = 2;
    const endRow = startRow + demoValues.length - 1;
    updates.push({
      range: `${colLetter(demoCol)}${startRow}:${colLetter(demoCol)}${endRow}`,
      values: demoValues
    });
  }

  if (jsValues.length > 0) {
    const startRow = 2;
    const endRow = startRow + jsValues.length - 1;
    updates.push({
      range: `${colLetter(jsCol)}${startRow}:${colLetter(jsCol)}${endRow}`,
      values: jsValues
    });
  }

  if (updates.length > 0) {
    const result = curlJson('POST', '/api/integrations/sheets/update', {
      spreadsheetId: SPREADSHEET_ID,
      updates
    });

    if (result.success) {
      console.log('  ✅ Spreadsheet updated successfully');
    } else {
      console.error('  ❌ Spreadsheet update failed:', result.error);

      // Try updating in smaller batches
      for (const update of updates) {
        const singleResult = curlJson('POST', '/api/integrations/sheets/update', {
          spreadsheetId: SPREADSHEET_ID,
          updates: [update]
        });
        console.log(`  ${singleResult.success ? '✅' : '❌'} ${update.range}`);
      }
    }
  }

  console.log('\n🎉 Done!');
  console.log(`  hasWidget column: ${colLetter(hasWidgetCol)} (index ${hasWidgetCol})`);
  console.log(`  Demo column: ${colLetter(demoCol)} (index ${demoCol})`);
  console.log(`  JavaScript column: ${colLetter(jsCol)} (index ${jsCol})`);
  console.log(`  Total rows updated: ${rows.length}`);
}

main().catch(console.error);
