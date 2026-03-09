#!/usr/bin/env node
/**
 * Mass Quick Widget Creator
 * Processes leads from a JSON file, creates widgets with niche-based theming,
 * deep-crawls websites for knowledge, and sets up AI settings.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CLIENTS_DIR = path.resolve(__dirname, '../clients');
const QUICKWIDGETS_DIR = path.resolve(PROJECT_ROOT, 'quickwidgets');
const API_BASE = 'http://localhost:3000';
const ADMIN_TOKEN = 'admin-secret-2026';

// ── Niche Color Palettes ──
const NICHE_COLORS = {
  plumber: [
    { primary: '#1565C0', accent: '#0288D1', name: 'Classic Blue' },
    { primary: '#0D47A1', accent: '#1976D2', name: 'Deep Blue' },
    { primary: '#00796B', accent: '#0097A7', name: 'Teal' },
    { primary: '#2E7D32', accent: '#388E3C', name: 'Green' },
    { primary: '#1B5E20', accent: '#2196F3', name: 'Forest Blue' },
  ],
  electrician: [
    { primary: '#E65100', accent: '#FF8F00', name: 'Electric Orange' },
    { primary: '#F9A825', accent: '#FF6F00', name: 'Amber' },
    { primary: '#1565C0', accent: '#FFC107', name: 'Blue Gold' },
    { primary: '#283593', accent: '#F9A825', name: 'Navy Gold' },
    { primary: '#D32F2F', accent: '#FF6F00', name: 'Red Orange' },
  ],
  painter: [
    { primary: '#00695C', accent: '#26A69A', name: 'Teal' },
    { primary: '#4527A0', accent: '#7C4DFF', name: 'Purple' },
    { primary: '#1565C0', accent: '#42A5F5', name: 'Blue' },
    { primary: '#2E7D32', accent: '#66BB6A', name: 'Green' },
    { primary: '#C62828', accent: '#EF5350', name: 'Red' },
    { primary: '#00838F', accent: '#26C6DA', name: 'Cyan' },
    { primary: '#4E342E', accent: '#8D6E63', name: 'Brown' },
    { primary: '#37474F', accent: '#78909C', name: 'Slate' },
  ],
  carpenter: [
    { primary: '#4E342E', accent: '#8D6E63', name: 'Wood Brown' },
    { primary: '#33691E', accent: '#689F38', name: 'Forest Green' },
    { primary: '#BF360C', accent: '#E64A19', name: 'Terra Cotta' },
    { primary: '#3E2723', accent: '#6D4C41', name: 'Dark Wood' },
    { primary: '#1B5E20', accent: '#4CAF50', name: 'Nature Green' },
    { primary: '#795548', accent: '#A1887F', name: 'Light Wood' },
    { primary: '#455A64', accent: '#78909C', name: 'Steel' },
  ],
  tiler: [
    { primary: '#37474F', accent: '#607D8B', name: 'Slate Grey' },
    { primary: '#00695C', accent: '#00897B', name: 'Teal' },
    { primary: '#283593', accent: '#3F51B5', name: 'Navy' },
    { primary: '#455A64', accent: '#0288D1', name: 'Grey Blue' },
    { primary: '#1B5E20', accent: '#43A047', name: 'Green' },
  ],
};

// ── Niche Quick Replies ──
const NICHE_REPLIES = {
  plumber: ['Book a plumber', 'View services', 'Emergency plumbing', 'Get a quote'],
  electrician: ['Book an electrician', 'View services', 'Emergency callout', 'Get a quote'],
  painter: ['Get a free quote', 'View services', 'See our work', 'Contact us'],
  carpenter: ['Get a quote', 'View services', 'See our projects', 'Contact us'],
  tiler: ['Get a free quote', 'View services', 'See our work', 'Contact us'],
};

// ── Niche Proactive Messages ──
const NICHE_PROACTIVE = {
  plumber: 'Need a plumber? Get a free quote in seconds!',
  electrician: 'Need an electrician? Get a free quote today!',
  painter: 'Looking for professional painters? Get a free quote!',
  carpenter: 'Need carpentry work done? Get a free quote!',
  tiler: 'Need tiling done? Get a free quote today!',
};

// ── Niche Service Descriptions ──
const NICHE_SERVICES = {
  plumber: 'professional plumbing services including emergency plumbing, hot water systems, gas fitting, drain clearing, bathroom & kitchen renovations, leak repairs, and general plumbing maintenance',
  electrician: 'professional electrical services including emergency electrical, power point installation, switchboard upgrades, lighting installation, ceiling fan installation, smoke alarm installation, and electrical safety inspections',
  painter: 'professional painting and decorating services including interior painting, exterior painting, residential painting, commercial painting, colour consultation, wallpaper removal, and surface preparation',
  carpenter: 'professional carpentry services including custom cabinetry, timber decking, door & window installation, kitchen renovations, bathroom renovations, pergolas, fencing, and general carpentry & maintenance',
  tiler: 'professional tiling services including bathroom tiling, kitchen tiling, floor tiling, wall tiling, outdoor tiling, waterproofing, tile repair, and renovation tiling',
};

let colorIndex = { plumber: 0, electrician: 0, painter: 0, carpenter: 0, tiler: 0 };

function getNextColors(niche) {
  const palette = NICHE_COLORS[niche] || NICHE_COLORS.plumber;
  const colors = palette[colorIndex[niche] % palette.length];
  colorIndex[niche]++;
  return colors;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex, pct = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct;
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`;
}

function lighten(hex, pct = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const f = pct;
  return `#${Math.round(r + (255 - r) * f).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * f).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * f).toString(16).padStart(2, '0')}`;
}

function mixWhite(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  return `#${Math.round(r + (255 - r) * pct).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * pct).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * pct).toString(16).padStart(2, '0')}`;
}

function createTheme(lead, colors) {
  const p = colors.primary;
  const a = colors.accent;
  const rgb = hexToRgb(p);

  return {
    label: `${lead.name} — ${colors.name} Theme`,
    domain: lead.website.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    fontUrl: null,
    font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    isDark: false,
    widgetW: '360px', widgetH: '520px', widgetMaxW: '360px', widgetMaxH: '520px',
    toggleSize: 'w-14 h-14', toggleRadius: 'rounded-2xl',
    headerPad: 'px-5 py-4', nameSize: 'text-[14px]',
    headerAccent: '', avatarHeaderRound: 'rounded-xl', chatAvatarRound: 'rounded-xl',
    hasShine: true,
    headerFrom: p, headerVia: lighten(p, 0.1), headerTo: a,
    toggleFrom: p, toggleVia: lighten(p, 0.1), toggleTo: a,
    toggleShadow: p, toggleHoverRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    sendFrom: p, sendTo: a,
    sendHoverFrom: darken(p), sendHoverTo: darken(a),
    onlineDotBg: mixWhite(p, 0.7), onlineDotBorder: p,
    typingDot: mixWhite(p, 0.4),
    userMsgFrom: p, userMsgTo: a, userMsgShadow: p,
    avatarFrom: mixWhite(p, 0.9), avatarTo: mixWhite(p, 0.7),
    avatarBorder: mixWhite(p, 0.6), avatarIcon: p,
    linkColor: p, linkHover: darken(p), copyHover: p, copyActive: p,
    chipBorder: mixWhite(p, 0.6), chipFrom: mixWhite(p, 0.9), chipTo: mixWhite(p, 0.7),
    chipText: darken(p), chipHoverFrom: mixWhite(p, 0.7), chipHoverTo: mixWhite(p, 0.6),
    chipHoverBorder: mixWhite(p, 0.4),
    focusBorder: mixWhite(p, 0.4), focusRing: mixWhite(p, 0.9),
    imgActiveBorder: mixWhite(p, 0.4), imgActiveBg: mixWhite(p, 0.9), imgActiveText: p,
    imgHoverText: p, imgHoverBorder: mixWhite(p, 0.4), imgHoverBg: mixWhite(p, 0.9),
    cssPrimary: p, cssAccent: a, focusRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    feedbackActive: p, feedbackHover: mixWhite(p, 0.4),
  };
}

function createWidgetConfig(lead) {
  const niche = lead.niche;
  const phone = lead.phone ? lead.phone.replace(/\s+/g, '') : '';

  return {
    clientId: lead.id,
    botName: `${lead.name} AI`,
    welcomeMessage: `Welcome to **${lead.name}**! How can we help you today?`,
    inputPlaceholder: 'Ask us anything...',
    quickReplies: NICHE_REPLIES[niche] || NICHE_REPLIES.plumber,
    avatar: { type: 'initials', initials: lead.initials },
    design: { position: 'bottom-right' },
    features: {
      sound: true, voiceInput: true, feedback: true, streaming: true,
      tts: true, autoLang: true, richCards: true, leadForm: true, memory: true,
      proactive: { delay: 8, message: NICHE_PROACTIVE[niche] || 'Need help? Ask us anything!' },
    },
    contacts: {
      ...(phone && { phone }),
      ...(lead.email && { email: lead.email }),
      ...(lead.website && { website: lead.website }),
    },
  };
}

function createInfoJson(lead) {
  return {
    clientId: lead.id,
    username: lead.id,
    name: lead.name,
    email: lead.email || '',
    website: lead.website || '',
    phone: lead.phone || null,
    addresses: lead.address ? [lead.address] : [],
    instagram: null,
    clientType: 'quick',
    createdAt: new Date().toISOString(),
  };
}

function createSystemPrompt(lead) {
  const niche = lead.niche;
  const services = NICHE_SERVICES[niche] || NICHE_SERVICES.plumber;
  const phone = lead.phone || 'the company directly';
  const contactParts = [];
  if (lead.phone) contactParts.push(`Phone: ${lead.phone}`);
  if (lead.email) contactParts.push(`Email: ${lead.email}`);
  if (lead.address) contactParts.push(`Address: ${lead.address}`);
  contactParts.push(`Website: ${lead.website}`);

  return `You are an AI assistant for ${lead.name} — a Sydney-based company providing ${services}.

Contact: ${contactParts.join(' | ')}
Service Area: Sydney, NSW & surrounding areas.

Instructions:
- Answer based ONLY on information provided in the knowledge base
- Be helpful, professional, friendly
- If unsure, suggest contacting ${phone}
- Respond in English
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

async function processLead(lead, index, total) {
  const startTime = Date.now();
  console.log(`\n[${ index + 1}/${total}] Processing: ${lead.name} (${lead.id})`);

  try {
    // 1. Create directories
    const clientDir = path.join(CLIENTS_DIR, lead.id);
    const srcDir = path.join(clientDir, 'src', 'components');
    const hooksDir = path.join(clientDir, 'src', 'hooks');
    const knowledgeDir = path.join(clientDir, 'knowledge');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.mkdirSync(knowledgeDir, { recursive: true });

    // 2. Create theme.json
    const colors = getNextColors(lead.niche);
    const theme = createTheme(lead, colors);
    fs.writeFileSync(path.join(clientDir, 'theme.json'), JSON.stringify(theme, null, 2));

    // 3. Create widget.config.json
    const config = createWidgetConfig(lead);
    fs.writeFileSync(path.join(clientDir, 'widget.config.json'), JSON.stringify(config, null, 2));

    // 4. Generate source files
    execSync(`node ${path.join(__dirname, 'generate-single-theme.js')} ${lead.id}`, {
      cwd: PROJECT_ROOT, stdio: 'pipe',
    });

    // 5. Build widget
    execSync(`node ${path.join(__dirname, 'build.js')} ${lead.id}`, {
      cwd: PROJECT_ROOT, stdio: 'pipe',
    });

    // 6. Deploy
    const qwDir = path.join(QUICKWIDGETS_DIR, lead.id);
    fs.mkdirSync(qwDir, { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, '..', 'dist', 'script.js'),
      path.join(qwDir, 'script.js')
    );

    // 7. Write info.json
    const info = createInfoJson(lead);
    fs.writeFileSync(path.join(qwDir, 'info.json'), JSON.stringify(info, null, 2));

    // 8. Sync client in DB
    await apiCall('GET', '/api/clients');

    // 9. Set AI settings
    const aiBody = {
      systemPrompt: createSystemPrompt(lead),
      greeting: `Welcome to ${lead.name}! How can we help you today?`,
      temperature: 0.7,
      maxTokens: 2048,
      topK: 5,
    };
    const aiFile = `/tmp/ai-settings-${lead.id}.json`;
    fs.writeFileSync(aiFile, JSON.stringify(aiBody));
    try {
      execSync(`curl -s -X PUT "${API_BASE}/api/ai-settings/${lead.id}" -H "Content-Type: application/json" -H "Cookie: admin_token=${ADMIN_TOKEN}" -d @${aiFile}`, { stdio: 'pipe' });
    } catch (e) {
      console.log(`  ⚠️  AI settings failed (non-critical)`);
    }

    // 10. Deep crawl for knowledge (with timeout)
    try {
      console.log(`  🔍 Deep crawling ${lead.website}...`);
      const crawlResp = await Promise.race([
        apiCall('POST', '/api/knowledge/deep-crawl', {
          clientId: lead.id,
          websiteUrl: lead.website,
          brandName: lead.name,
          replace: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Crawl timeout')), 120000)),
      ]);

      if (crawlResp.success) {
        console.log(`  📚 Crawled ${crawlResp.crawl?.totalPages || '?'} pages, ${crawlResp.knowledge?.savedChunks || '?'} chunks`);
      } else {
        // Fallback: upload basic knowledge
        console.log(`  ⚠️  Deep crawl failed, uploading basic knowledge`);
        await uploadBasicKnowledge(lead);
      }
    } catch (e) {
      console.log(`  ⚠️  Deep crawl timeout/error, uploading basic knowledge`);
      await uploadBasicKnowledge(lead);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Done in ${elapsed}s`);
    return { success: true, id: lead.id, name: lead.name, website: lead.website };

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`  ❌ Failed in ${elapsed}s: ${error.message}`);
    return { success: false, id: lead.id, name: lead.name, website: lead.website, error: error.message };
  }
}

async function uploadBasicKnowledge(lead) {
  const niche = lead.niche;
  const services = NICHE_SERVICES[niche] || NICHE_SERVICES.plumber;
  const text = `# ${lead.name}\n\n${lead.name} is a Sydney-based company providing ${services}.\n\nContact:\n- Phone: ${lead.phone || 'N/A'}\n- Email: ${lead.email || 'N/A'}\n- Address: ${lead.address || 'Sydney, NSW'}\n- Website: ${lead.website}\n\nService Area: Sydney, NSW & surrounding areas.`;

  await apiCall('POST', '/api/knowledge', {
    clientId: lead.id,
    text,
    source: 'quick-widget-builder',
  });
}

async function main() {
  const leadsFile = process.argv[2] || '/tmp/mass-widget-leads.json';
  const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));

  console.log(`\n🚀 Mass Widget Creator`);
  console.log(`📋 Total leads: ${leads.length}`);
  console.log(`─────────────────────────────\n`);

  const results = { successes: [], failures: [] };

  for (let i = 0; i < leads.length; i++) {
    const result = await processLead(leads[i], i, leads.length);
    if (result.success) {
      results.successes.push(result);
    } else {
      results.failures.push(result);
    }
  }

  // Summary
  console.log(`\n═══════════════════════════════`);
  console.log(`📊 RESULTS`);
  console.log(`✅ Created: ${results.successes.length}`);
  console.log(`❌ Failed: ${results.failures.length}`);
  console.log(`═══════════════════════════════`);

  if (results.failures.length > 0) {
    console.log(`\nFailed:`);
    results.failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} — ${f.error}`));
  }

  // Write results to file for reference
  fs.writeFileSync('/tmp/mass-widget-results.json', JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to /tmp/mass-widget-results.json`);
}

main().catch(console.error);
