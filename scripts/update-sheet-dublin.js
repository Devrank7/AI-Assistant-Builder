#!/usr/bin/env node
/**
 * Update spreadsheet with hasWidget, Demo, and JavaScript columns
 * for all successfully built widgets.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'admin-secret-2026';
const SPREADSHEET_ID = '1UrAuWdcqpGmrHW2pR-QQL3-hvZXm7L9vFa7nBXOmdGg';
const PROD_DOMAIN = 'winbixai.com';

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Cookie': `admin_token=${ADMIN_TOKEN}`, ...options.headers },
  });
  return res.json();
}

async function main() {
  // Load build results
  const results = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mass-build-results.json'), 'utf-8'));

  // Also add lead #1 (davis-business-consultants) which was built manually
  const allSuccesses = [
    { rowIndex: 0, clientId: 'davis-business-consultants', website: 'https://davisbusinessconsultants.com/', name: 'Davis Business Consultants' },
    ...results.successes
  ];

  console.log(`📊 Updating spreadsheet with ${allSuccesses.length} widgets...`);

  // Read current sheet to count rows
  const sheetData = await fetchAPI(`/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!sheetData.success) { console.error('Failed to read sheet'); process.exit(1); }
  const totalRows = sheetData.rows.length;
  const headers = sheetData.headers;
  console.log(`📋 Sheet has ${totalRows} rows, ${headers.length} columns (${headers.join(', ')})`);

  // Current columns: A-L (12 columns)
  // hasWidget = M (index 12), Demo = N (index 13), JavaScript = O (index 14)

  // Build lookup: rowIndex -> clientId
  const clientMap = new Map();
  for (const s of allSuccesses) {
    clientMap.set(s.rowIndex, s.clientId);
  }

  // Prepare data arrays
  const hasWidgetCol = ['hasWidget']; // header
  const demoCol = ['Demo'];
  const jsCol = ['JavaScript'];

  for (let i = 0; i < totalRows; i++) {
    const clientId = clientMap.get(i);
    if (clientId) {
      hasWidgetCol.push('TRUE');
      demoCol.push(`https://${PROD_DOMAIN}/demo/client-website?client=${clientId}&website=${encodeURIComponent(sheetData.rows[i].Website)}`);
      jsCol.push(`(function(){var s=document.createElement('script');s.src='https://${PROD_DOMAIN}/quickwidgets/${clientId}/script.js';document.head.appendChild(s)})()`);
    } else {
      hasWidgetCol.push('');
      demoCol.push('');
      jsCol.push('');
    }
  }

  // First, expand the grid if needed (need at least 15 columns)
  // The Sheets API should handle new columns automatically

  // Update hasWidget column (M)
  console.log(`📝 Writing hasWidget column (M1:M${totalRows + 1})...`);
  const hasWidgetRes = await fetchAPI('/api/integrations/sheets/update', {
    method: 'POST',
    body: JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: `M1:M${totalRows + 1}`,
      values: hasWidgetCol.map(v => [v])
    })
  });
  console.log(`  ${hasWidgetRes.success ? '✅' : '❌'} hasWidget: ${hasWidgetRes.success ? 'done' : hasWidgetRes.error}`);

  // Update Demo column (N)
  console.log(`📝 Writing Demo column (N1:N${totalRows + 1})...`);
  const demoRes = await fetchAPI('/api/integrations/sheets/update', {
    method: 'POST',
    body: JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: `N1:N${totalRows + 1}`,
      values: demoCol.map(v => [v])
    })
  });
  console.log(`  ${demoRes.success ? '✅' : '❌'} Demo: ${demoRes.success ? 'done' : demoRes.error}`);

  // Update JavaScript column (O)
  console.log(`📝 Writing JavaScript column (O1:O${totalRows + 1})...`);
  const jsRes = await fetchAPI('/api/integrations/sheets/update', {
    method: 'POST',
    body: JSON.stringify({
      spreadsheetId: SPREADSHEET_ID,
      range: `O1:O${totalRows + 1}`,
      values: jsCol.map(v => [v])
    })
  });
  console.log(`  ${jsRes.success ? '✅' : '❌'} JavaScript: ${jsRes.success ? 'done' : jsRes.error}`);

  console.log(`\n✅ Spreadsheet update complete!`);
  console.log(`  hasWidget: ${hasWidgetCol.filter(v => v === 'TRUE').length} marked TRUE`);
  console.log(`  Demo: ${demoCol.filter(v => v.startsWith('http')).length} links`);
  console.log(`  JavaScript: ${jsCol.filter(v => v.startsWith('(')).length} snippets`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
