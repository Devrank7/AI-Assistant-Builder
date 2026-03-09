#!/usr/bin/env node
/**
 * Analyze websites and build personalized widgets.
 * Fetches each website, extracts colors/content/structure, creates configs, and builds.
 *
 * Usage: node scripts/analyze-and-build-batch.js [startRow] [endRow]
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
const PROD_DOMAIN = 'winbixai.com';

const SKIP_ROWS = new Set([21, 27]); // Duplicate row indices (0-based)

async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Cookie': `admin_token=${ADMIN_TOKEN}`, ...options.headers },
  });
  return res.json();
}

function deriveClientId(email, website) {
  const generic = ['gmail.com','outlook.com','yahoo.com','hotmail.com','mail.ru','yandex.ru','ukr.net','icloud.com'];
  if (email) {
    const [local, domain] = email.split('@');
    if (generic.includes(domain)) {
      return local.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    const parts = domain.split('.'); parts.pop();
    return parts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  }
  if (website) {
    try {
      const h = new URL(website).hostname.replace(/^www\./, '');
      const p = h.split('.'); p.pop();
      return p.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    } catch { return null; }
  }
  return null;
}

function getBaseUrl(website) {
  try { const u = new URL(website); return `${u.protocol}//${u.hostname}`; }
  catch { return website; }
}

// Extract information from raw HTML
function extractFromHTML(html, url) {
  const result = {
    title: '',
    description: '',
    colors: [],
    font: null,
    fontUrl: null,
    phone: null,
    email: null,
    address: null,
    isDark: false,
    textContent: '',
    navLinks: [],
    ogImage: null,
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch) result.description = descMatch[1].trim();

  // OG image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) result.ogImage = ogMatch[1];

  // Extract hex colors from CSS
  const hexColors = [];
  const colorMatches = html.matchAll(/#([0-9a-fA-F]{6})\b/g);
  for (const m of colorMatches) {
    const hex = '#' + m[1].toLowerCase();
    if (!hexColors.includes(hex) && hex !== '#000000' && hex !== '#ffffff' && hex !== '#f5f5f5' && hex !== '#333333' && hex !== '#666666' && hex !== '#999999' && hex !== '#cccccc' && hex !== '#eeeeee' && hex !== '#fafafa') {
      hexColors.push(hex);
    }
  }
  result.colors = hexColors.slice(0, 10);

  // Google Fonts
  const fontUrlMatch = html.match(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s<>]+/);
  if (fontUrlMatch) {
    result.fontUrl = fontUrlMatch[0].replace(/&amp;/g, '&');
    const familyMatch = result.fontUrl.match(/family=([^:&+]+)/);
    if (familyMatch) result.font = `'${familyMatch[1].replace(/\+/g, ' ')}', -apple-system, sans-serif`;
  }

  // CSS font-family
  if (!result.font) {
    const fontMatch = html.match(/font-family:\s*['"]?([^;'"}{]+)/i);
    if (fontMatch) {
      const f = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '').trim();
      if (f && f !== 'inherit' && f !== 'initial') result.font = `'${f}', -apple-system, sans-serif`;
    }
  }

  // Phone numbers
  const phoneMatch = html.match(/(?:tel:|phone|call)[:\s]*([+\d\s()-]{10,})/i)
    || html.match(/href=["']tel:([^"']+)["']/i);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  // Email
  const emailMatch = html.match(/href=["']mailto:([^"'?]+)["']/i);
  if (emailMatch) result.email = emailMatch[1].trim();

  // Address
  const addrMatch = html.match(/(?:address|location)[:\s]*([^<]{10,80})/i);
  if (addrMatch) result.address = addrMatch[1].trim();

  // Check dark theme
  const bgMatch = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/gi);
  if (bgMatch) {
    for (const bg of bgMatch) {
      const hex = bg.match(/#[0-9a-fA-F]{6}/)[0];
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      if (r < 50 && g < 50 && b < 50) { result.isDark = true; break; }
    }
  }

  // Extract text content (stripped of tags)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    result.textContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);
  }

  // Navigation links
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (navMatch) {
    const linkMatches = navMatch[1].matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([^<]+)<\/a>/gi);
    for (const lm of linkMatches) {
      result.navLinks.push({ url: lm[1], text: lm[2].trim() });
    }
  }

  return result;
}

// Fetch a website with timeout
async function fetchWebsite(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Fetch additional pages for deep knowledge
async function fetchSubPages(baseUrl, navLinks, limit = 5) {
  const pages = [];
  const visited = new Set([baseUrl, baseUrl + '/']);

  // Priority pages
  const priority = ['about', 'services', 'pricing', 'contact', 'faq', 'team', 'programmes', 'courses', 'consulting'];

  const sorted = navLinks.sort((a, b) => {
    const aScore = priority.findIndex(p => a.url.toLowerCase().includes(p));
    const bScore = priority.findIndex(p => b.url.toLowerCase().includes(p));
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });

  for (const link of sorted.slice(0, limit)) {
    try {
      let url = link.url;
      if (url.startsWith('/')) url = baseUrl + url;
      if (!url.startsWith('http')) continue;
      if (visited.has(url)) continue;
      visited.add(url);

      const html = await fetchWebsite(url, 10000);
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        const text = bodyMatch[1]
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000);
        pages.push({ url, title: link.text, text });
      }
    } catch {
      // Skip failed pages
    }
  }
  return pages;
}

function toHex(r, g, b) {
  return '#' + [r,g,b].map(c => Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0')).join('');
}

function deriveColors(primary) {
  const hex = primary.replace('#','');
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  const mix = (c, w, ratio) => Math.round(c + (w - c) * ratio);

  return {
    PRIMARY: primary,
    DARKER: toHex(r*0.8, g*0.8, b*0.8),
    LIGHTER: toHex(Math.min(255,r*1.1), Math.min(255,g*1.1), Math.min(255,b*1.1)),
    MEDIUM: toHex(mix(r,255,0.4), mix(g,255,0.4), mix(b,255,0.4)),
    LIGHT: toHex(mix(r,255,0.7), mix(g,255,0.7), mix(b,255,0.7)),
    LIGHT_MEDIUM: toHex(mix(r,255,0.6), mix(g,255,0.6), mix(b,255,0.6)),
    VERY_LIGHT: toHex(mix(r,255,0.9), mix(g,255,0.9), mix(b,255,0.9)),
    RGB: `${r}, ${g}, ${b}`,
  };
}

function createTheme(clientId, domain, primary, accent, font, fontUrl, isDark) {
  const p = deriveColors(primary);
  const a = deriveColors(accent);
  const theme = {
    label: `${clientId} theme`,
    domain, fontUrl: fontUrl || null,
    font: font || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    isDark: isDark || false,
    widgetW:"360px", widgetH:"520px", widgetMaxW:"360px", widgetMaxH:"520px",
    toggleSize:"w-14 h-14", toggleRadius:"rounded-2xl",
    headerPad:"px-5 py-4", nameSize:"text-[14px]", headerAccent:"",
    avatarHeaderRound:"rounded-xl", chatAvatarRound:"rounded-xl", hasShine:true,
    headerFrom:p.PRIMARY, headerVia:p.LIGHTER, headerTo:accent,
    toggleFrom:p.PRIMARY, toggleVia:p.LIGHTER, toggleTo:accent,
    toggleShadow:p.PRIMARY, toggleHoverRgb:p.RGB,
    sendFrom:p.PRIMARY, sendTo:accent,
    sendHoverFrom:p.DARKER, sendHoverTo:a.DARKER,
    onlineDotBg:p.LIGHT, onlineDotBorder:p.PRIMARY, typingDot:p.MEDIUM,
    userMsgFrom:p.PRIMARY, userMsgTo:accent, userMsgShadow:p.PRIMARY,
    avatarFrom:p.VERY_LIGHT, avatarTo:p.LIGHT, avatarBorder:p.LIGHT_MEDIUM, avatarIcon:p.PRIMARY,
    linkColor:p.PRIMARY, linkHover:p.DARKER, copyHover:p.PRIMARY, copyActive:p.PRIMARY,
    chipBorder:p.LIGHT_MEDIUM, chipFrom:p.VERY_LIGHT, chipTo:p.LIGHT,
    chipText:p.DARKER, chipHoverFrom:p.LIGHT, chipHoverTo:p.LIGHT_MEDIUM, chipHoverBorder:p.MEDIUM,
    focusBorder:p.MEDIUM, focusRing:p.VERY_LIGHT,
    imgActiveBorder:p.MEDIUM, imgActiveBg:p.VERY_LIGHT, imgActiveText:p.PRIMARY,
    imgHoverText:p.PRIMARY, imgHoverBorder:p.MEDIUM, imgHoverBg:p.VERY_LIGHT,
    cssPrimary:p.PRIMARY, cssAccent:accent, focusRgb:p.RGB,
    feedbackActive:p.PRIMARY, feedbackHover:p.MEDIUM,
  };
  if (isDark) {
    const dr=parseInt(primary.replace('#','').substring(0,2),16);
    const dg=parseInt(primary.replace('#','').substring(2,4),16);
    const db=parseInt(primary.replace('#','').substring(4,6),16);
    theme.surfaceBg=toHex(Math.round(dr*0.05),Math.round(dg*0.05+8),Math.round(db*0.05+16));
    theme.surfaceCard=toHex(Math.round(dr*0.08+5),Math.round(dg*0.08+13),Math.round(db*0.08+23));
    theme.surfaceBorder=toHex(Math.round(dr*0.12+10),Math.round(dg*0.12+25),Math.round(db*0.12+35));
    theme.surfaceInput=toHex(Math.round(dr*0.06),Math.round(dg*0.06+10),Math.round(db*0.06+18));
    theme.surfaceInputFocus=toHex(Math.round(dr*0.09+5),Math.round(dg*0.09+16),Math.round(db*0.09+28));
    theme.textPrimary="#e2e8f0"; theme.textSecondary="#64748b"; theme.textMuted="#475569";
  }
  return theme;
}

function getQuickReplies(niche) {
  const n = niche.toLowerCase().trim();
  if (n.includes('coaching') || n.includes('coach')) return ['Book a session', 'About coaching', 'Testimonials', 'Contact us'];
  if (n.includes('consulting') || n.includes('consultant')) return ['Book a consultation', 'View services', 'About us', 'Contact us'];
  if (n.includes('training')) return ['Training programs', 'Schedule & pricing', 'Custom training', 'Contact us'];
  if (n.includes('mediat') || n.includes('conflict') || n.includes('negotiat')) return ['Our services', 'Book a consultation', 'About the team', 'Contact us'];
  if (n.includes('pr ') || n.includes('comms')) return ['PR services', 'View our work', 'Book a consultation', 'Contact us'];
  if (n.includes('brand') || n.includes('market')) return ['Our services', 'View portfolio', 'Book a consultation', 'Contact us'];
  if (n.includes('hr')) return ['HR services', 'Book a consultation', 'About the team', 'Contact us'];
  if (n.includes('wellness') || n.includes('resilience')) return ['Wellness programs', 'Corporate packages', 'Book a session', 'Contact us'];
  if (n.includes('financial')) return ['Financial services', 'Book a consultation', 'About the firm', 'Contact us'];
  if (n.includes('mentor')) return ['Mentoring info', 'Book a session', 'About the mentor', 'Contact us'];
  return ['About us', 'Our services', 'Book a consultation', 'Contact us'];
}

function buildWidget(clientId) {
  try {
    execSync(`node .agent/widget-builder/scripts/generate-single-theme.js ${clientId}`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 30000 });
    execSync(`node .agent/widget-builder/scripts/build.js ${clientId}`, { cwd: PROJECT_ROOT, stdio: 'pipe', timeout: 60000 });
    const deployDir = path.join(QUICKWIDGETS_DIR, clientId);
    fs.mkdirSync(deployDir, { recursive: true });
    fs.copyFileSync(path.join(PROJECT_ROOT, '.agent/widget-builder/dist/script.js'), path.join(deployDir, 'script.js'));
    const size = fs.statSync(path.join(deployDir, 'script.js')).size;
    if (size < 100000 || size > 700000) console.warn(`  ⚠️ Unusual size: ${(size/1024).toFixed(0)}KB`);
    return true;
  } catch (err) {
    console.error(`  ❌ Build failed: ${err.stderr?.toString().substring(0, 200) || err.message}`);
    return false;
  }
}

async function processLead(lead, rowIdx) {
  const { 'Business Name': businessName, 'Email (LPR)': email, Website: website, Niche: niche, Phone: phone, City: city } = lead;

  if (!website || !website.trim()) return { success: false, error: 'No website' };

  const clientId = deriveClientId(email, website);
  if (!clientId) return { success: false, error: 'No clientId' };

  // Skip already built
  if (fs.existsSync(path.join(QUICKWIDGETS_DIR, clientId, 'script.js'))) {
    console.log(`  ⏭️ Already exists: ${clientId}`);
    return { success: true, clientId, skipped: true };
  }

  const baseUrl = getBaseUrl(website);
  const brandName = businessName.split('|')[0].split(' - ')[0].split(':')[0].trim().substring(0, 60);

  // 1. Fetch and analyze website
  console.log(`  🌐 Fetching ${baseUrl}...`);
  let siteData;
  try {
    const html = await fetchWebsite(website, 15000);
    siteData = extractFromHTML(html, website);

    // Fetch subpages for deep knowledge
    console.log(`  📄 Crawling ${siteData.navLinks.length} subpages...`);
    const subPages = await fetchSubPages(baseUrl, siteData.navLinks, 4);
    siteData.subPages = subPages;
  } catch (err) {
    console.log(`  ⚠️ Site fetch failed: ${err.message}. Using defaults.`);
    siteData = { title: brandName, description: '', colors: [], font: null, fontUrl: null, isDark: false, textContent: '', navLinks: [], subPages: [], phone: null, email: null };
  }

  // 2. Determine colors
  let primary = siteData.colors[0] || '#2563eb';
  let accent = siteData.colors[1] || siteData.colors[0] || '#1e40af';
  // Ensure contrast — if primary and accent are too similar, darken accent
  if (primary === accent) {
    const hex = accent.replace('#','');
    const r = Math.max(0, parseInt(hex.substring(0,2),16) - 40);
    const g = Math.max(0, parseInt(hex.substring(2,4),16) - 40);
    const b = Math.max(0, parseInt(hex.substring(4,6),16) - 40);
    accent = toHex(r, g, b);
  }

  // 3. Create configs
  const clientDir = path.join(CLIENTS_DIR, clientId);
  fs.mkdirSync(path.join(clientDir, 'src/components'), { recursive: true });
  fs.mkdirSync(path.join(clientDir, 'src/hooks'), { recursive: true });
  fs.mkdirSync(path.join(clientDir, 'knowledge'), { recursive: true });

  const hostname = new URL(baseUrl).hostname.replace('www.', '');
  const theme = createTheme(clientId, hostname, primary, accent, siteData.font, siteData.fontUrl, siteData.isDark);
  fs.writeFileSync(path.join(clientDir, 'theme.json'), JSON.stringify(theme, null, 2));

  const quickReplies = getQuickReplies(niche);
  const contacts = {};
  if (siteData.phone || phone) contacts.phone = siteData.phone || phone;
  if (siteData.email || email) contacts.email = siteData.email || email;
  contacts.website = baseUrl;

  const config = {
    clientId,
    botName: `${brandName} AI`,
    welcomeMessage: `Welcome to **${brandName}**! How can I help you today?`,
    inputPlaceholder: "Ask a question...",
    quickReplies,
    avatar: { type: "initials", initials: brandName.split(/[\s&]+/).filter(w => w.length > 1).map(w => w[0]).join('').substring(0,2).toUpperCase() || 'AI' },
    design: { position: "bottom-right" },
    features: {
      sound: true, voiceInput: true, feedback: true, streaming: true,
      tts: true, autoLang: true, richCards: true, leadForm: true, memory: true,
      proactive: { delay: 8, message: `Questions about ${brandName}? We're here to help!` }
    },
    contacts
  };
  fs.writeFileSync(path.join(clientDir, 'widget.config.json'), JSON.stringify(config, null, 2));

  // 4. Build
  console.log(`  🔨 Building widget...`);
  if (!buildWidget(clientId)) return { success: false, clientId, error: 'Build failed' };

  // 5. Write info.json
  const info = {
    clientId, username: clientId, name: brandName,
    email: email || '', website: baseUrl,
    phone: siteData.phone || phone || null,
    addresses: siteData.address ? [siteData.address] : (city ? [`${city}, Ireland`] : []),
    instagram: null, clientType: "quick",
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(QUICKWIDGETS_DIR, clientId, 'info.json'), JSON.stringify(info, null, 2));

  // 6. Build deep knowledge
  let knowledge = `# ${brandName}\n\n`;
  knowledge += `Website: ${baseUrl}\n`;
  knowledge += `Niche: ${niche}\n`;
  if (city) knowledge += `City: ${city}, Ireland\n`;
  if (siteData.phone || phone) knowledge += `Phone: ${siteData.phone || phone}\n`;
  if (email) knowledge += `Email: ${email}\n`;
  if (siteData.address) knowledge += `Address: ${siteData.address}\n`;
  knowledge += '\n';

  if (siteData.description) knowledge += `## About\n${siteData.description}\n\n`;
  if (siteData.title && siteData.title !== brandName) knowledge += `Page title: ${siteData.title}\n\n`;

  if (siteData.textContent) {
    knowledge += `## Homepage Content\n${siteData.textContent.substring(0, 3000)}\n\n`;
  }

  if (siteData.subPages && siteData.subPages.length > 0) {
    for (const page of siteData.subPages) {
      knowledge += `## ${page.title || page.url}\n${page.text.substring(0, 2000)}\n\n`;
    }
  }

  fs.writeFileSync(path.join(clientDir, 'knowledge/context.md'), knowledge);

  // 7. Upload knowledge
  try {
    await fetchAPI('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify({ clientId, text: knowledge, source: 'quick-widget-builder' })
    });
  } catch (err) {
    console.log(`  ⚠️ Knowledge upload error: ${err.message}`);
  }

  // 8. Set AI settings
  const svcDesc = `a ${niche.toLowerCase()} business in ${city || 'Dublin'}, Ireland`;
  const systemPrompt = `You are an AI assistant for ${brandName} — ${svcDesc}.

${siteData.description ? `About: ${siteData.description}\n` : ''}
Contact: ${[siteData.phone||phone, email, baseUrl].filter(Boolean).join(' | ')}

Instructions:
- Answer based ONLY on information from the knowledge base
- Be helpful, professional, and friendly
- If unsure, suggest contacting the business directly
- Respond in English
- Keep answers concise (2-4 sentences unless more detail needed)`;

  try {
    await fetchAPI(`/api/ai-settings/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify({
        systemPrompt,
        greeting: `Welcome to **${brandName}**! How can I help you today?`,
        temperature: 0.7, maxTokens: 2048, topK: 5
      })
    });
  } catch (err) {
    console.log(`  ⚠️ AI settings error: ${err.message}`);
  }

  console.log(`  ✅ Done: ${clientId} (colors: ${primary}, ${accent})`);
  return { success: true, clientId };
}

async function main() {
  const startRow = parseInt(process.argv[2]) || 1;
  const endRow = parseInt(process.argv[3]) || 999;

  console.log(`📊 Fetching spreadsheet...`);
  const data = await fetchAPI(`/api/integrations/sheets/read?spreadsheetId=${SPREADSHEET_ID}`);
  if (!data.success) { console.error('Sheet read failed:', data.error); process.exit(1); }

  const rows = data.rows;
  console.log(`📋 ${rows.length} leads found. Processing rows ${startRow}-${Math.min(endRow, rows.length)}\n`);

  const successes = [], failures = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    if (rowNum < startRow || rowNum > endRow) continue;
    if (SKIP_ROWS.has(i)) { console.log(`⏭️ [${rowNum}] Skipping duplicate`); skipped++; continue; }

    console.log(`\n🔄 [${rowNum}/${rows.length}] ${rows[i]['Business Name']} — ${rows[i].Website}`);
    try {
      const result = await processLead(rows[i], i);
      if (result.success) {
        if (result.skipped) skipped++;
        else successes.push({ rowIndex: i, clientId: result.clientId, website: rows[i].Website, name: rows[i]['Business Name'] });
      } else {
        failures.push({ rowIndex: i, website: rows[i].Website, name: rows[i]['Business Name'], error: result.error || 'unknown' });
      }
    } catch (err) {
      failures.push({ rowIndex: i, website: rows[i].Website, name: rows[i]['Business Name'], error: err.message });
      console.error(`  ❌ ${err.message}`);
    }
  }

  const results = { successes, failures, skipped, total: rows.length, startRow, endRow, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(PROJECT_ROOT, 'mass-build-results.json'), JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Created: ${successes.length} | ❌ Failed: ${failures.length} | ⏭️ Skipped: ${skipped}`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach(f => console.log(`  - [${f.rowIndex+1}] ${f.name}: ${f.error}`));
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
