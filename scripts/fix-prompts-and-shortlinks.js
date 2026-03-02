#!/usr/bin/env node
/**
 * Fix system prompts (enforce Australian English) and create short links
 * for all quick widgets, then update the spreadsheet.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── MongoDB connection ──
const MONGODB_URI = process.env.MONGODB_URI || (() => {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf-8');
  const match = envFile.match(/MONGODB_URI=(.+)/);
  return match ? match[1].trim() : '';
})();

const API_BASE = 'http://localhost:3000';
const ADMIN_TOKEN = (() => {
  const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf-8');
  const match = envFile.match(/ADMIN_SECRET_TOKEN=(.+)/);
  return match ? match[1].trim() : 'admin-secret-2026';
})();
const BASE_URL = 'https://winbix-ai.xyz';
const SPREADSHEET_ID = '1048WTUpDHmuJ8sItwbrQIguMPa8QteuSHkpU9_QYeq8';

// ── Mongoose models (inline to avoid TS imports) ──
const AISettingsSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  aiModel: { type: String, default: 'gemini-3-flash-preview' },
  systemPrompt: { type: String, default: '' },
  greeting: { type: String, default: '' },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  topK: { type: Number, default: 5 },
  handoffEnabled: { type: Boolean, default: false },
}, { timestamps: true });

const ShortLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  clientId: { type: String, required: true, index: true },
  website: { type: String, default: '' },
  widgetType: { type: String, enum: ['quick', 'full'], default: 'quick' },
  createdAt: { type: Date, default: Date.now },
});

const AISettings = mongoose.models.AISettings || mongoose.model('AISettings', AISettingsSchema);
const ShortLink = mongoose.models.ShortLink || mongoose.model('ShortLink', ShortLinkSchema);

// ── Niche service descriptions ──
const NICHE_SERVICES = {
  plumber: 'professional plumbing services including emergency plumbing, hot water systems, gas fitting, drain clearing, bathroom & kitchen renovations, leak repairs, and general plumbing maintenance',
  electrician: 'professional electrical services including emergency electrical, power point installation, switchboard upgrades, lighting installation, ceiling fan installation, smoke alarm installation, and electrical safety inspections',
  painter: 'professional painting and decorating services including interior painting, exterior painting, residential painting, commercial painting, colour consultation, wallpaper removal, and surface preparation',
  carpenter: 'professional carpentry services including custom cabinetry, timber decking, door & window installation, kitchen renovations, bathroom renovations, pergolas, fencing, and general carpentry & maintenance',
  tiler: 'professional tiling services including bathroom tiling, kitchen tiling, floor tiling, wall tiling, outdoor tiling, waterproofing, tile repair, and renovation tiling',
};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

function buildSystemPrompt(name, niche, phone, email, address, website) {
  const services = NICHE_SERVICES[niche] || NICHE_SERVICES.plumber;
  const contactParts = [];
  if (phone) contactParts.push(`Phone: ${phone}`);
  if (email) contactParts.push(`Email: ${email}`);
  if (address) contactParts.push(`Address: ${address}`);
  if (website) contactParts.push(`Website: ${website}`);

  return `You are an AI assistant for ${name} — a Sydney-based company providing ${services}.

Contact: ${contactParts.join(' | ')}
Service Area: Sydney, NSW & surrounding areas.

CRITICAL LANGUAGE RULE: You MUST respond ONLY in English. Use Australian English spelling and expressions (e.g. "colour" not "color", "organisation" not "organization", "no worries", "mate"). NEVER respond in any other language regardless of what language the user writes in. If a user writes in another language, respond in English and politely let them know you can only assist in English.

Instructions:
- Answer based ONLY on information provided in the knowledge base
- Be helpful, professional, and friendly with a warm Australian tone
- If unsure, suggest contacting ${phone || 'the company directly'}
- Keep answers concise (2-4 sentences unless more detail is needed)
- Help visitors book services, get quotes, and learn about the company`;
}

async function apiCall(method, endpoint, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `admin_token=${ADMIN_TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${endpoint}`, opts);
  return resp.json();
}

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  // ── Step 1: Load all quick widget info ──
  const quickwidgetsDir = path.resolve(__dirname, '..', 'quickwidgets');
  const clientDirs = fs.readdirSync(quickwidgetsDir)
    .filter(d => fs.statSync(path.join(quickwidgetsDir, d)).isDirectory());

  console.log(`📋 Found ${clientDirs.length} quick widgets\n`);

  // Load leads data for niche info
  const leadsFile = '/tmp/mass-widget-leads.json';
  const leads = fs.existsSync(leadsFile) ? JSON.parse(fs.readFileSync(leadsFile, 'utf-8')) : [];
  const leadsMap = new Map(leads.map(l => [l.id, l]));
  // Add beat-a-leak-plumbing manually
  leadsMap.set('beat-a-leak-plumbing', {
    id: 'beat-a-leak-plumbing', name: 'Beat a Leak Plumbing',
    email: 'Beataleakplumbing@gmail.com', website: 'https://beataleakplumbing.com.au/',
    phone: '+61 405 113 587', address: '30 Archer St, Blacktown NSW 2148, Australia',
    niche: 'plumber',
  });

  // ── Step 2: Update system prompts ──
  console.log('📝 Updating system prompts to Australian English...');
  let promptsUpdated = 0;

  for (const clientId of clientDirs) {
    const lead = leadsMap.get(clientId);
    if (!lead) {
      console.log(`  ⚠️  ${clientId}: no lead data, skipping prompt update`);
      continue;
    }

    // Read info.json for any missing data
    const infoPath = path.join(quickwidgetsDir, clientId, 'info.json');
    let info = {};
    try { info = JSON.parse(fs.readFileSync(infoPath, 'utf-8')); } catch {}

    const name = info.name || lead.name;
    const phone = lead.phone || info.phone || '';
    const email = lead.email || info.email || '';
    const address = lead.address || (info.addresses && info.addresses[0]) || '';
    const website = lead.website || info.website || '';
    const niche = lead.niche || 'plumber';

    const newPrompt = buildSystemPrompt(name, niche, phone, email, address, website);

    await AISettings.findOneAndUpdate(
      { clientId },
      { $set: { systemPrompt: newPrompt } },
      { upsert: true }
    );
    promptsUpdated++;
  }
  console.log(`✅ Updated ${promptsUpdated} system prompts\n`);

  // ── Step 3: Create short links ──
  console.log('🔗 Creating short links...');
  const existingLinks = await ShortLink.find({ widgetType: 'quick' }).lean();
  const existingMap = new Map(existingLinks.map(sl => [sl.clientId, sl]));

  let linksCreated = 0;
  let linksExisting = 0;
  const shortLinksMap = new Map(); // clientId -> shortUrl

  for (const clientId of clientDirs) {
    const lead = leadsMap.get(clientId);
    const infoPath = path.join(quickwidgetsDir, clientId, 'info.json');
    let info = {};
    try { info = JSON.parse(fs.readFileSync(infoPath, 'utf-8')); } catch {}

    const website = (lead && lead.website) || info.website || '';

    if (existingMap.has(clientId)) {
      const existing = existingMap.get(clientId);
      shortLinksMap.set(clientId, `${BASE_URL}/d/${existing.code}`);
      linksExisting++;
      continue;
    }

    // Create new short link
    let code = generateCode();
    try {
      await ShortLink.create({ code, clientId, website, widgetType: 'quick' });
    } catch {
      // Collision, retry
      code = generateCode();
      try {
        await ShortLink.create({ code, clientId, website, widgetType: 'quick' });
      } catch (e) {
        console.log(`  ❌ ${clientId}: failed to create short link`);
        continue;
      }
    }

    shortLinksMap.set(clientId, `${BASE_URL}/d/${code}`);
    linksCreated++;
  }
  console.log(`✅ Created ${linksCreated} new short links (${linksExisting} already existed)\n`);

  // ── Step 4: Read spreadsheet to map rows to clientIds ──
  console.log('📊 Reading spreadsheet...');
  const sheetData = await apiCall('GET', `/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!sheetData.success) {
    console.error('❌ Failed to read spreadsheet');
    await mongoose.disconnect();
    return;
  }

  // Map company names to clientIds by matching leads
  const rows = sheetData.rows;
  const demoValues = [['Demo']]; // header

  // Build a map from company name -> lead for matching
  const nameToLead = new Map();
  for (const lead of leads) {
    nameToLead.set(lead.name.toLowerCase(), lead);
  }
  nameToLead.set('beat a leak plumbing', leadsMap.get('beat-a-leak-plumbing'));

  let matched = 0;
  for (const row of rows) {
    const companyName = row['Company Name'] || '';
    const lead = nameToLead.get(companyName.toLowerCase());

    if (lead && shortLinksMap.has(lead.id)) {
      demoValues.push([shortLinksMap.get(lead.id)]);
      matched++;
    } else {
      // Try fuzzy match by website
      const website = row['Website'] || '';
      let foundUrl = '';
      for (const [clientId, lead2] of leadsMap) {
        if (lead2.website && website && (
          lead2.website.includes(website.replace(/^https?:\/\//, '').replace(/\/$/, '')) ||
          website.includes(lead2.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))
        )) {
          foundUrl = shortLinksMap.get(clientId) || '';
          if (foundUrl) { matched++; break; }
        }
      }
      demoValues.push([foundUrl]);
    }
  }

  console.log(`✅ Matched ${matched}/${rows.length} rows to demo links\n`);

  // ── Step 5: Update spreadsheet with Demo column (L) ──
  console.log('📊 Writing Demo column to spreadsheet...');
  const updateResult = await apiCall('POST', '/api/integrations/sheets/update', {
    spreadsheetId: SPREADSHEET_ID,
    range: `L1:L${demoValues.length}`,
    values: demoValues,
  });

  if (updateResult.success) {
    console.log(`✅ Updated ${updateResult.updatedCells} cells in Demo column\n`);
  } else {
    console.error('❌ Failed to update spreadsheet:', updateResult.error);
  }

  // ── Summary ──
  console.log('═══════════════════════════════');
  console.log('📊 SUMMARY');
  console.log(`📝 System prompts updated: ${promptsUpdated}`);
  console.log(`🔗 Short links created: ${linksCreated} (${linksExisting} existing)`);
  console.log(`📋 Spreadsheet rows matched: ${matched}/${rows.length}`);
  console.log('═══════════════════════════════');

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});
