#!/usr/bin/env node
/**
 * Mass widget builder for Dublin consulting/coaching leads.
 * Processes leads from spreadsheet, creates widgets sequentially.
 *
 * Usage: node scripts/mass-build-dublin.js [startIndex] [endIndex]
 * Example: node scripts/mass-build-dublin.js 2 10  (processes leads 2-10)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'admin-secret-2026';
const SPREADSHEET_ID = '1UrAuWdcqpGmrHW2pR-QQL3-hvZXm7L9vFa7nBXOmdGg';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(PROJECT_ROOT, '.agent/widget-builder/clients');
const QUICKWIDGETS_DIR = path.join(PROJECT_ROOT, 'quickwidgets');

// Duplicate rows to skip (0-indexed row numbers)
const SKIP_ROWS = new Set([21, 27]); // Row 22 and 28 (duplicates of row 1 and 2)

async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `admin_token=${ADMIN_TOKEN}`,
      ...options.headers,
    },
  });
  return res.json();
}

function deriveClientId(email, website) {
  const genericDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'mail.ru', 'yandex.ru', 'ukr.net', 'icloud.com'];

  if (email) {
    const [localPart, domain] = email.split('@');
    if (genericDomains.includes(domain)) {
      return localPart.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    // Use email domain without TLD
    const domainParts = domain.split('.');
    domainParts.pop(); // remove TLD
    return domainParts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  }

  if (website) {
    try {
      const url = new URL(website);
      const hostname = url.hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      parts.pop(); // remove TLD
      return parts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    } catch {
      return null;
    }
  }
  return null;
}

function getBaseUrl(website) {
  try {
    const url = new URL(website);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return website;
  }
}

function deriveColorsFromPrimary(primary) {
  // Simple hex color manipulation
  const hex = primary.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const toHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
  const mix = (c, white, ratio) => Math.round(c + (white - c) * ratio);

  return {
    PRIMARY: primary,
    PRIMARY_DARKER: toHex(r * 0.8, g * 0.8, b * 0.8),
    PRIMARY_LIGHTER: toHex(Math.min(255, r * 1.1), Math.min(255, g * 1.1), Math.min(255, b * 1.1)),
    PRIMARY_MEDIUM: toHex(mix(r, 255, 0.4), mix(g, 255, 0.4), mix(b, 255, 0.4)),
    PRIMARY_LIGHT: toHex(mix(r, 255, 0.7), mix(g, 255, 0.7), mix(b, 255, 0.7)),
    PRIMARY_LIGHT_MEDIUM: toHex(mix(r, 255, 0.6), mix(g, 255, 0.6), mix(b, 255, 0.6)),
    PRIMARY_VERY_LIGHT: toHex(mix(r, 255, 0.9), mix(g, 255, 0.9), mix(b, 255, 0.9)),
    RGB: `${r}, ${g}, ${b}`,
  };
}

function createThemeJson(clientId, domain, primary, accent, font, fontUrl, isDark) {
  const p = deriveColorsFromPrimary(primary);
  const a = deriveColorsFromPrimary(accent);

  const theme = {
    label: `${clientId} — Custom Theme`,
    domain: domain,
    fontUrl: fontUrl || null,
    font: font || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    isDark: isDark || false,
    widgetW: "360px",
    widgetH: "520px",
    widgetMaxW: "360px",
    widgetMaxH: "520px",
    toggleSize: "w-14 h-14",
    toggleRadius: "rounded-2xl",
    headerPad: "px-5 py-4",
    nameSize: "text-[14px]",
    headerAccent: "",
    avatarHeaderRound: "rounded-xl",
    chatAvatarRound: "rounded-xl",
    hasShine: true,
    headerFrom: p.PRIMARY,
    headerVia: p.PRIMARY_LIGHTER,
    headerTo: accent,
    toggleFrom: p.PRIMARY,
    toggleVia: p.PRIMARY_LIGHTER,
    toggleTo: accent,
    toggleShadow: p.PRIMARY,
    toggleHoverRgb: p.RGB,
    sendFrom: p.PRIMARY,
    sendTo: accent,
    sendHoverFrom: p.PRIMARY_DARKER,
    sendHoverTo: a.PRIMARY_DARKER,
    onlineDotBg: p.PRIMARY_LIGHT,
    onlineDotBorder: p.PRIMARY,
    typingDot: p.PRIMARY_MEDIUM,
    userMsgFrom: p.PRIMARY,
    userMsgTo: accent,
    userMsgShadow: p.PRIMARY,
    avatarFrom: p.PRIMARY_VERY_LIGHT,
    avatarTo: p.PRIMARY_LIGHT,
    avatarBorder: p.PRIMARY_LIGHT_MEDIUM,
    avatarIcon: p.PRIMARY,
    linkColor: p.PRIMARY,
    linkHover: p.PRIMARY_DARKER,
    copyHover: p.PRIMARY,
    copyActive: p.PRIMARY,
    chipBorder: p.PRIMARY_LIGHT_MEDIUM,
    chipFrom: p.PRIMARY_VERY_LIGHT,
    chipTo: p.PRIMARY_LIGHT,
    chipText: p.PRIMARY_DARKER,
    chipHoverFrom: p.PRIMARY_LIGHT,
    chipHoverTo: p.PRIMARY_LIGHT_MEDIUM,
    chipHoverBorder: p.PRIMARY_MEDIUM,
    focusBorder: p.PRIMARY_MEDIUM,
    focusRing: p.PRIMARY_VERY_LIGHT,
    imgActiveBorder: p.PRIMARY_MEDIUM,
    imgActiveBg: p.PRIMARY_VERY_LIGHT,
    imgActiveText: p.PRIMARY,
    imgHoverText: p.PRIMARY,
    imgHoverBorder: p.PRIMARY_MEDIUM,
    imgHoverBg: p.PRIMARY_VERY_LIGHT,
    cssPrimary: p.PRIMARY,
    cssAccent: accent,
    focusRgb: p.RGB,
    feedbackActive: p.PRIMARY,
    feedbackHover: p.PRIMARY_MEDIUM,
  };

  if (isDark) {
    // Derive dark surface colors from primary
    const dr = parseInt(primary.replace('#','').substring(0,2), 16);
    const dg = parseInt(primary.replace('#','').substring(2,4), 16);
    const db = parseInt(primary.replace('#','').substring(4,6), 16);
    const toHex = (r,g,b) => '#' + [r,g,b].map(c => Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0')).join('');
    theme.surfaceBg = toHex(Math.round(dr*0.05), Math.round(dg*0.05+8), Math.round(db*0.05+16));
    theme.surfaceCard = toHex(Math.round(dr*0.08+5), Math.round(dg*0.08+13), Math.round(db*0.08+23));
    theme.surfaceBorder = toHex(Math.round(dr*0.12+10), Math.round(dg*0.12+25), Math.round(db*0.12+35));
    theme.surfaceInput = toHex(Math.round(dr*0.06), Math.round(dg*0.06+10), Math.round(db*0.06+18));
    theme.surfaceInputFocus = toHex(Math.round(dr*0.09+5), Math.round(dg*0.09+16), Math.round(db*0.09+28));
    theme.textPrimary = "#e2e8f0";
    theme.textSecondary = "#64748b";
    theme.textMuted = "#475569";
  }

  return theme;
}

function createWidgetConfig(clientId, brandName, niche, welcomeMsg, quickReplies, contacts) {
  return {
    clientId,
    botName: `${brandName} AI`,
    welcomeMessage: welcomeMsg,
    inputPlaceholder: "Ask a question...",
    quickReplies: quickReplies,
    avatar: { type: "initials", initials: brandName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() },
    design: { position: "bottom-right" },
    features: {
      sound: true,
      voiceInput: true,
      feedback: true,
      streaming: true,
      tts: true,
      autoLang: true,
      richCards: true,
      leadForm: true,
      memory: true,
      proactive: {
        delay: 8,
        message: `Have questions about ${niche.toLowerCase()}? We're here to help!`
      }
    },
    contacts: contacts
  };
}

function createInfoJson(clientId, brandName, email, website, phone, addresses) {
  return {
    clientId,
    username: clientId,
    name: brandName,
    email: email || "",
    website: website,
    phone: phone || null,
    addresses: addresses || [],
    instagram: null,
    clientType: "quick",
    createdAt: new Date().toISOString()
  };
}

function buildWidget(clientId) {
  try {
    execSync(`node .agent/widget-builder/scripts/generate-single-theme.js ${clientId}`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 30000,
    });

    execSync(`node .agent/widget-builder/scripts/build.js ${clientId}`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });

    // Deploy
    const deployDir = path.join(QUICKWIDGETS_DIR, clientId);
    fs.mkdirSync(deployDir, { recursive: true });
    fs.copyFileSync(
      path.join(PROJECT_ROOT, '.agent/widget-builder/dist/script.js'),
      path.join(deployDir, 'script.js')
    );

    // Validate
    const stats = fs.statSync(path.join(deployDir, 'script.js'));
    if (stats.size < 100000 || stats.size > 700000) {
      console.warn(`  ⚠️ Unusual file size: ${(stats.size / 1024).toFixed(0)}KB`);
    }

    return true;
  } catch (err) {
    console.error(`  ❌ Build failed: ${err.message}`);
    return false;
  }
}

async function uploadKnowledge(clientId, knowledgeText) {
  try {
    const res = await fetchAPI('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        text: knowledgeText,
        source: 'quick-widget-builder'
      })
    });
    return res.success;
  } catch (err) {
    console.error(`  ❌ Knowledge upload failed: ${err.message}`);
    return false;
  }
}

async function setAISettings(clientId, brandName, description, services, contact, language) {
  const systemPrompt = `You are an AI assistant for ${brandName} — ${description}

Services: ${services}

Contact: ${contact}

Instructions:
- Answer based ONLY on information from the knowledge base
- Be helpful, professional, and friendly
- If unsure, suggest contacting the company directly
- Respond in ${language || 'English'}
- Keep answers concise (2-4 sentences unless more detail needed)`;

  try {
    const res = await fetchAPI(`/api/ai-settings/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify({
        systemPrompt,
        greeting: `Welcome to **${brandName}**! How can I help you today?`,
        temperature: 0.7,
        maxTokens: 2048,
        topK: 5
      })
    });
    return res.success;
  } catch (err) {
    console.error(`  ❌ AI settings failed: ${err.message}`);
    return false;
  }
}

// Quick replies by niche
function getQuickReplies(niche) {
  const nicheMap = {
    'business consulting': ['Book a consultation', 'View services', 'About the team', 'Contact us'],
    'b2b consulting': ['Book a consultation', 'View services', 'Case studies', 'Contact us'],
    'life coaching': ['Book a session', 'About coaching', 'Testimonials', 'Contact us'],
    'career coaching': ['Book a session', 'Career services', 'About the coach', 'Contact us'],
    'executive coaching': ['Book a consultation', 'Coaching services', 'About the coach', 'Contact us'],
    'leadership coaching': ['Book a session', 'Leadership programs', 'About the coach', 'Contact us'],
    'sales coaching': ['Sales training info', 'Book a session', 'View programs', 'Contact us'],
    'team coaching': ['Team programs', 'Book a consultation', 'About coaching', 'Contact us'],
    'icf coaching': ['Certification info', 'Course schedule', 'About programs', 'Contact us'],
    'marketing consulting': ['Marketing services', 'Book a consultation', 'Case studies', 'Contact us'],
    'digital consulting': ['Digital services', 'Book a consultation', 'Our approach', 'Contact us'],
    'brand consulting': ['Branding services', 'View portfolio', 'Book a consultation', 'Contact us'],
    'financial advisory': ['Financial services', 'Book a consultation', 'About the firm', 'Contact us'],
    'od consulting': ['OD services', 'Book a consultation', 'About the team', 'Contact us'],
    'coaching': ['Coaching services', 'Book a session', 'About the coach', 'Contact us'],
    'pr consulting': ['PR services', 'View portfolio', 'Book a consultation', 'Contact us'],
    'comms consulting': ['Communication services', 'Book a consultation', 'About us', 'Contact us'],
    'hr consultant': ['HR services', 'Book a consultation', 'About the team', 'Contact us'],
    'management consultant': ['Consulting services', 'Book a consultation', 'Our expertise', 'Contact us'],
    'strategy consulting': ['Strategy services', 'Book a consultation', 'Case studies', 'Contact us'],
    'training': ['Training programs', 'Schedule & pricing', 'Custom training', 'Contact us'],
    'change management': ['Change services', 'Book a consultation', 'About us', 'Contact us'],
    'conflict resolution consultant': ['Mediation services', 'Book a consultation', 'About us', 'Contact us'],
    'mediation consultant': ['Mediation services', 'Book a session', 'About the mediator', 'Contact us'],
    'negotiation consultant': ['Negotiation training', 'Book a consultation', 'About us', 'Contact us'],
    'wellness coach  business': ['Wellness programs', 'Corporate packages', 'Book a consultation', 'Contact us'],
    'resilience coach': ['Resilience training', 'Corporate programs', 'Book a session', 'Contact us'],
    'presentation skills coach': ['Presentation training', 'Workshop info', 'Book a session', 'Contact us'],
    'business mentoring': ['Mentoring info', 'Book a session', 'About the mentor', 'Contact us'],
    'coaching training': ['Course info', 'Schedule & fees', 'About programs', 'Contact us'],
    'executive coaching & od': ['Coaching services', 'OD consulting', 'Book a consultation', 'Contact us'],
    'business coaching': ['Coaching programs', 'Book a session', 'About the coach', 'Contact us'],
    'communication coach': ['Communication training', 'Book a session', 'About the coach', 'Contact us'],
  };

  const key = niche.toLowerCase().trim();
  return nicheMap[key] || ['About us', 'Our services', 'Book a consultation', 'Contact us'];
}

async function processLead(lead, index) {
  const { 'Business Name': businessName, 'Email (LPR)': email, Website: website, Niche: niche, Phone: phone } = lead;

  if (!website || website.trim() === '') {
    return { success: false, error: 'No website' };
  }

  const clientId = deriveClientId(email, website);
  if (!clientId) {
    return { success: false, error: 'Could not derive clientId' };
  }

  // Check if already built
  if (fs.existsSync(path.join(QUICKWIDGETS_DIR, clientId, 'script.js'))) {
    console.log(`  ⏭️ Already built: ${clientId}`);
    return { success: true, clientId, skipped: true };
  }

  const baseUrl = getBaseUrl(website);
  const brandName = businessName.split('|')[0].split('-')[0].split(':')[0].trim();

  console.log(`  📝 Creating configs for ${clientId}...`);

  // Create directories
  const clientDir = path.join(CLIENTS_DIR, clientId);
  fs.mkdirSync(path.join(clientDir, 'src/components'), { recursive: true });
  fs.mkdirSync(path.join(clientDir, 'src/hooks'), { recursive: true });
  fs.mkdirSync(path.join(clientDir, 'knowledge'), { recursive: true });

  // Default colors (will be overridden by per-lead analysis if possible)
  // Use a blue/professional default for consulting
  const theme = createThemeJson(
    clientId,
    new URL(baseUrl).hostname.replace('www.', ''),
    '#2563eb', // default blue
    '#1e40af', // default dark blue
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    null,
    false
  );

  fs.writeFileSync(path.join(clientDir, 'theme.json'), JSON.stringify(theme, null, 2));

  const quickReplies = getQuickReplies(niche);
  const contacts = {};
  if (phone) contacts.phone = phone;
  if (email) contacts.email = email;
  contacts.website = baseUrl;

  const config = createWidgetConfig(
    clientId,
    brandName,
    niche,
    `Welcome to **${brandName}**! How can I help you today?`,
    quickReplies,
    contacts
  );

  fs.writeFileSync(path.join(clientDir, 'widget.config.json'), JSON.stringify(config, null, 2));

  // Build widget
  console.log(`  🔨 Building widget...`);
  const buildSuccess = buildWidget(clientId);
  if (!buildSuccess) {
    return { success: false, clientId, error: 'Build failed' };
  }

  // Write info.json
  const info = createInfoJson(clientId, brandName, email, baseUrl, phone, []);
  fs.writeFileSync(
    path.join(QUICKWIDGETS_DIR, clientId, 'info.json'),
    JSON.stringify(info, null, 2)
  );

  // Upload minimal knowledge
  const knowledgeText = `# ${brandName}\n\nWebsite: ${baseUrl}\nNiche: ${niche}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\n\nThis is a ${niche.toLowerCase()} business based in Dublin, Ireland.`;

  fs.writeFileSync(path.join(clientDir, 'knowledge/context.md'), knowledgeText);

  await uploadKnowledge(clientId, knowledgeText);
  await setAISettings(clientId, brandName, `a ${niche.toLowerCase()} business in Dublin, Ireland.`, niche, `Email: ${email || 'N/A'}, Phone: ${phone || 'N/A'}, Website: ${baseUrl}`, 'English');

  console.log(`  ✅ Done: ${clientId}`);
  return { success: true, clientId };
}

async function main() {
  const startIdx = parseInt(process.argv[2]) || 1;
  const endIdx = parseInt(process.argv[3]) || 999;

  console.log(`📊 Reading spreadsheet...`);
  const data = await fetchAPI(`/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);

  if (!data.success) {
    console.error('Failed to read spreadsheet:', data.error);
    process.exit(1);
  }

  const rows = data.rows;
  console.log(`📋 Total leads: ${rows.length}`);

  const successes = [];
  const failures = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    if (SKIP_ROWS.has(i)) {
      console.log(`⏭️ [${i + 1}/${rows.length}] Skipping duplicate: ${rows[i].Website}`);
      skipped++;
      continue;
    }

    const rowNum = i + 1;
    if (rowNum < startIdx || rowNum > endIdx) continue;

    const lead = rows[i];
    console.log(`\n🔄 [${rowNum}/${rows.length}] ${lead['Business Name']} — ${lead.Website}`);

    try {
      const result = await processLead(lead, i);
      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          successes.push({ rowIndex: i, clientId: result.clientId, website: lead.Website, name: lead['Business Name'] });
        }
      } else {
        failures.push({ rowIndex: i, website: lead.Website, name: lead['Business Name'], error: result.error });
      }
    } catch (err) {
      failures.push({ rowIndex: i, website: lead.Website, name: lead['Business Name'], error: err.message });
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  // Save results
  const results = { successes, failures, skipped, total: rows.length, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(PROJECT_ROOT, 'mass-build-results.json'), JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Created: ${successes.length} widgets`);
  console.log(`❌ Failed: ${failures.length} leads`);
  console.log(`⏭️ Skipped: ${skipped} leads`);
  console.log(`📋 Results saved to mass-build-results.json`);

  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    failures.forEach(f => console.log(`  - ${f.name} (${f.website}): ${f.error}`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
