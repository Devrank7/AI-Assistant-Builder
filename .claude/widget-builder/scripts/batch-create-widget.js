#!/usr/bin/env node
/**
 * Batch widget creator - processes a single lead from JSON input
 * Usage: echo '<json>' | node batch-create-widget.js
 * Or: node batch-create-widget.js --file leads.json --index 0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const CLIENTS_DIR = path.resolve(__dirname, '../clients');
const DIST_DIR = path.resolve(__dirname, '../dist');
const QW_DIR = path.join(ROOT, 'quickwidgets');

const ADMIN_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'admin-secret-2026';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function deriveColors(primary, secondary, isDark) {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  };

  const mix = (hex, white, ratio) => {
    const c = hexToRgb(hex);
    return rgbToHex(
      c.r + (white ? 255 - c.r : -c.r) * ratio,
      c.g + (white ? 255 - c.g : -c.g) * ratio,
      c.b + (white ? 255 - c.b : -c.b) * ratio
    );
  };

  const p = hexToRgb(primary);
  const darker = mix(primary, false, 0.15);
  const lighter = mix(primary, true, 0.10);
  const medium = mix(primary, true, 0.40);
  const light = mix(primary, true, 0.70);
  const lightMedium = mix(primary, true, 0.60);
  const veryLight = mix(primary, true, 0.90);

  const sec = secondary || mix(primary, false, 0.2);

  const base = {
    headerFrom: primary,
    headerVia: lighter,
    headerTo: sec,
    toggleFrom: primary,
    toggleVia: lighter,
    toggleTo: sec,
    toggleShadow: primary,
    toggleHoverRgb: `${p.r}, ${p.g}, ${p.b}`,
    sendFrom: primary,
    sendTo: sec,
    sendHoverFrom: darker,
    sendHoverTo: mix(sec, false, 0.15),
    onlineDotBg: light,
    onlineDotBorder: primary,
    typingDot: medium,
    userMsgFrom: primary,
    userMsgTo: sec,
    userMsgShadow: primary,
    avatarFrom: veryLight,
    avatarTo: light,
    avatarBorder: lightMedium,
    avatarIcon: primary,
    linkColor: primary,
    linkHover: darker,
    copyHover: primary,
    copyActive: primary,
    chipBorder: lightMedium,
    chipFrom: mix(primary, true, 0.95),
    chipTo: veryLight,
    chipText: darker,
    chipHoverFrom: veryLight,
    chipHoverTo: light,
    chipHoverBorder: medium,
    focusBorder: medium,
    focusRing: veryLight,
    imgActiveBorder: medium,
    imgActiveBg: veryLight,
    imgActiveText: primary,
    imgHoverText: primary,
    imgHoverBorder: medium,
    imgHoverBg: veryLight,
    cssPrimary: primary,
    cssAccent: sec,
    focusRgb: `${p.r}, ${p.g}, ${p.b}`,
    feedbackActive: primary,
    feedbackHover: medium
  };

  if (isDark) {
    base.avatarFrom = mix(primary, false, 0.8);
    base.avatarTo = mix(primary, false, 0.7);
    base.avatarBorder = mix(primary, false, 0.5);
    base.chipBorder = mix(primary, false, 0.7);
    base.chipFrom = mix(primary, false, 0.9);
    base.chipTo = mix(primary, false, 0.8);
    base.chipText = light;
    base.chipHoverFrom = mix(primary, false, 0.75);
    base.chipHoverTo = mix(primary, false, 0.65);
    base.chipHoverBorder = primary;
    base.focusRing = mix(primary, false, 0.8);
    base.imgActiveBg = mix(primary, false, 0.9);
    base.imgHoverBg = mix(primary, false, 0.9);
    base.linkColor = light;
    base.linkHover = lighter;

    // Dark surface colors
    base.surfaceBg = '#0b1018';
    base.surfaceCard = '#111927';
    base.surfaceBorder = '#1e2d3d';
    base.surfaceInput = '#0f1720';
    base.surfaceInputFocus = '#162232';
    base.textPrimary = '#e2e8f0';
    base.textSecondary = '#64748b';
    base.textMuted = '#475569';
  }

  return base;
}

function getQuickReplies(niche) {
  const map = {
    'roof repair': ['Get a free estimate', 'Roof repair services', 'Contact us'],
    'roofing contractor': ['Get a free estimate', 'Our roofing services', 'Contact us'],
    'roofer': ['Get a free estimate', 'Roofing services', 'Contact us'],
    'maid service': ['Book a cleaning', 'View pricing', 'Contact us'],
    'house cleaning service': ['Book a cleaning', 'View pricing', 'Contact us'],
    'electrical contractor': ['Request a quote', 'Our services', 'Contact us'],
    'electrician': ['Request a quote', 'Electrical services', 'Contact us'],
    'carpet cleaning': ['Book a cleaning', 'Get pricing', 'Contact us'],
    'exterminator': ['Schedule service', 'View services', 'Contact us'],
    'painting contractor': ['Get a free estimate', 'Our services', 'Contact us'],
    'painter': ['Get a free estimate', 'Our services', 'Contact us'],
    'home remodeling contractor': ['Get a free estimate', 'View our work', 'Contact us'],
    'bathroom remodeling': ['Get a free estimate', 'View our work', 'Contact us'],
    'kitchen remodeling': ['Get a free estimate', 'View our work', 'Contact us'],
    'landscaping company': ['Get a free estimate', 'Our services', 'Contact us'],
    'landscaper': ['Get a free estimate', 'Our services', 'Contact us'],
    'lawn care service': ['Get a free estimate', 'Our services', 'Contact us'],
    'flooring contractor': ['Get a free estimate', 'View flooring options', 'Contact us'],
    'pressure washing': ['Get a free estimate', 'Our services', 'Contact us'],
    'water damage restoration': ['Request emergency service', 'Our services', 'Contact us'],
    'window installation': ['Get a free estimate', 'View our windows', 'Contact us'],
    'drywall contractor': ['Get a free estimate', 'Our services', 'Contact us'],
    'deck builder': ['Get a free estimate', 'View our work', 'Contact us'],
    'tree service': ['Get a free estimate', 'Our services', 'Contact us'],
    'pool service': ['Schedule service', 'Our services', 'Contact us'],
    'fence contractor': ['Get a free estimate', 'View fence styles', 'Contact us'],
    'fence': ['Get a free estimate', 'View fence styles', 'Contact us'],
    'insulation contractor': ['Get a free estimate', 'Our services', 'Contact us'],
    'plumber': ['Request service', 'Our services', 'Contact us'],
    'handyman service': ['Request service', 'Our services', 'Contact us'],
    'siding contractor': ['Get a free estimate', 'Our services', 'Contact us'],
    'siding': ['Get a free estimate', 'Our services', 'Contact us'],
    'septic tank service': ['Schedule service', 'Our services', 'Contact us'],
    'epoxy flooring': ['Get a free estimate', 'View our work', 'Contact us'],
    'solar panel installer': ['Get a free estimate', 'Solar solutions', 'Contact us'],
    'HVAC contractor': ['Schedule service', 'Our services', 'Contact us'],
    'HVAC': ['Schedule service', 'HVAC services', 'Contact us'],
    'AC': ['Schedule service', 'AC services', 'Contact us'],
    'air conditioning repair': ['Schedule service', 'AC services', 'Contact us'],
    'garage door repair': ['Request service', 'Our services', 'Contact us'],
    'foundation repair': ['Get a free inspection', 'Our services', 'Contact us'],
    'irrigation system installer': ['Schedule service', 'Our services', 'Contact us'],
    'sprinkler': ['Schedule service', 'Our services', 'Contact us'],
    'moving company': ['Get a free quote', 'Our services', 'Contact us'],
    'gutter': ['Get a free estimate', 'Our services', 'Contact us'],
    'stucco repair': ['Get a free estimate', 'Our services', 'Contact us'],
    'concrete': ['Get a free estimate', 'Our services', 'Contact us'],
    'water': ['Request emergency service', 'Our services', 'Contact us'],
    'kitchen': ['Get a free estimate', 'View our work', 'Contact us'],
  };

  return map[niche] || ['Learn more', 'Our services', 'Contact us'];
}

function getProactiveMessage(brandName, niche) {
  const messages = {
    'roof repair': `Need roofing help? ${brandName} offers free estimates!`,
    'roofing contractor': `Need roofing help? ${brandName} offers free estimates!`,
    'roofer': `Need roofing help? ${brandName} offers free estimates!`,
    'maid service': `Need a clean home? Ask about our cleaning services!`,
    'house cleaning service': `Need a clean home? Ask about our cleaning services!`,
    'electrical contractor': `Need electrical work? Get a free quote from ${brandName}!`,
    'electrician': `Need electrical work? Get a free quote from ${brandName}!`,
    'plumber': `Need plumbing help? ${brandName} is here for you!`,
    'HVAC contractor': `Need AC or heating service? Ask us anything!`,
    'HVAC': `Need AC or heating service? Ask us anything!`,
    'AC': `Need AC service? Ask us anything!`,
  };

  return messages[niche] || `Hi! Need help? Ask ${brandName} anything!`;
}

function createThemeJson(lead) {
  const colors = deriveColors(lead.primary, lead.secondary, lead.isDark);

  const theme = {
    label: `${lead.brandName} — ${lead.isDark ? 'Dark' : 'Light'} Theme`,
    domain: lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\?.*$/, ''),
    fontUrl: lead.fontUrl || null,
    font: lead.font || "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    isDark: lead.isDark || false,
    widgetW: '360px',
    widgetH: '520px',
    widgetMaxW: '360px',
    widgetMaxH: '520px',
    toggleSize: 'w-14 h-14',
    toggleRadius: 'rounded-2xl',
    headerPad: 'px-5 py-4',
    nameSize: 'text-[14px]',
    headerAccent: '',
    avatarHeaderRound: 'rounded-xl',
    chatAvatarRound: 'rounded-xl',
    hasShine: true,
    ...colors
  };

  return theme;
}

function createWidgetConfig(lead) {
  const initials = lead.brandName.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return {
    clientId: lead.clientId,
    botName: `${lead.brandName} AI`,
    welcomeMessage: `Welcome to **${lead.brandName}**! How can we help you today?`,
    inputPlaceholder: 'Ask a question...',
    quickReplies: getQuickReplies(lead.niche),
    avatar: {
      type: 'initials',
      initials: initials.substring(0, 2)
    },
    design: {
      position: 'bottom-right'
    },
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
        message: getProactiveMessage(lead.brandName, lead.niche)
      }
    },
    contacts: {
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website
    }
  };
}

function createInfoJson(lead) {
  return {
    clientId: lead.clientId,
    username: lead.clientId,
    name: lead.brandName,
    email: lead.email || '',
    website: lead.website,
    phone: lead.phone || null,
    addresses: lead.address ? [lead.address] : [],
    instagram: null,
    clientType: 'quick',
    createdAt: new Date().toISOString()
  };
}

function createSystemPrompt(lead) {
  let prompt = `You are an AI assistant for ${lead.brandName}`;
  if (lead.description) {
    prompt += ` — ${lead.description}`;
  }
  prompt += '.\n\n';

  prompt += 'Company Information:\n';
  prompt += `- Name: ${lead.brandName}\n`;
  if (lead.address) prompt += `- Address: ${lead.address}\n`;
  if (lead.phone) prompt += `- Phone: ${lead.phone}\n`;
  if (lead.email) prompt += `- Email: ${lead.email}\n`;
  prompt += `- Website: ${lead.website}\n`;
  if (lead.rating) prompt += `- Rating: ${lead.rating} stars (${lead.reviews} reviews)\n`;

  if (lead.services) {
    prompt += `\nServices:\n${lead.services}\n`;
  }

  if (lead.knowledgeExtra) {
    prompt += `\n${lead.knowledgeExtra}\n`;
  }

  prompt += '\nInstructions:\n';
  prompt += '- Answer based ONLY on information above\n';
  prompt += '- Be helpful, professional, friendly\n';
  if (lead.phone) {
    prompt += `- If unsure, suggest contacting the company at ${lead.phone}\n`;
  } else {
    prompt += '- If unsure, suggest visiting the website or contacting the company directly\n';
  }
  prompt += '- Respond in English\n';
  prompt += '- Keep answers concise (2-4 sentences unless more needed)\n';

  return prompt;
}

function createKnowledgeText(lead) {
  let text = `${lead.brandName}`;
  if (lead.description) text += ` — ${lead.description}`;
  text += '.\n\n';

  if (lead.services) text += `Services:\n${lead.services}\n\n`;

  text += 'Contact Information:\n';
  if (lead.phone) text += `- Phone: ${lead.phone}\n`;
  if (lead.email) text += `- Email: ${lead.email}\n`;
  if (lead.address) text += `- Address: ${lead.address}\n`;
  text += `- Website: ${lead.website}\n`;
  if (lead.serviceArea) text += `- Service Area: ${lead.serviceArea}\n`;

  if (lead.rating) text += `\nRating: ${lead.rating} stars with ${lead.reviews} reviews\n`;

  if (lead.knowledgeExtra) text += `\n${lead.knowledgeExtra}\n`;

  return text;
}

async function processLead(lead) {
  const clientDir = path.join(CLIENTS_DIR, lead.clientId);
  const srcDir = path.join(clientDir, 'src');
  const knowledgeDir = path.join(clientDir, 'knowledge');
  const qwDir = path.join(QW_DIR, lead.clientId);

  console.log(`\n🔵 Processing: ${lead.brandName} (${lead.clientId})`);

  // 1. Create directories
  fs.mkdirSync(path.join(srcDir, 'components'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'hooks'), { recursive: true });
  fs.mkdirSync(knowledgeDir, { recursive: true });
  fs.mkdirSync(qwDir, { recursive: true });

  // 2. Write configs
  const theme = createThemeJson(lead);
  fs.writeFileSync(path.join(clientDir, 'theme.json'), JSON.stringify(theme, null, 2));

  const config = createWidgetConfig(lead);
  fs.writeFileSync(path.join(clientDir, 'widget.config.json'), JSON.stringify(config, null, 2));

  // 3. Write knowledge
  const knowledgeText = createKnowledgeText(lead);
  fs.writeFileSync(path.join(knowledgeDir, 'context.md'), knowledgeText);

  // 4. Generate source files
  try {
    execSync(`node ${path.join(__dirname, 'generate-single-theme.js')} ${lead.clientId}`, {
      cwd: ROOT,
      stdio: 'pipe'
    });
    console.log(`  ✅ Generated source files`);
  } catch (e) {
    console.error(`  ❌ Generate failed: ${e.message}`);
    return { success: false, error: 'generate_failed' };
  }

  // 5. Build
  try {
    execSync(`node ${path.join(__dirname, 'build.js')} ${lead.clientId}`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60000
    });
    console.log(`  ✅ Built widget`);
  } catch (e) {
    console.error(`  ❌ Build failed: ${e.message}`);
    return { success: false, error: 'build_failed' };
  }

  // 6. Deploy
  const scriptSrc = path.join(DIST_DIR, 'script.js');
  if (!fs.existsSync(scriptSrc)) {
    console.error(`  ❌ No build output found`);
    return { success: false, error: 'no_build_output' };
  }
  fs.copyFileSync(scriptSrc, path.join(qwDir, 'script.js'));

  // 7. Write info.json
  const info = createInfoJson(lead);
  fs.writeFileSync(path.join(qwDir, 'info.json'), JSON.stringify(info, null, 2));
  console.log(`  ✅ Deployed to quickwidgets/${lead.clientId}/`);

  // 8. Upload knowledge
  try {
    const knowledgePayload = JSON.stringify({
      clientId: lead.clientId,
      text: knowledgeText,
      source: 'quick-widget-builder'
    });
    execSync(`curl -s -X POST "${BASE_URL}/api/knowledge" -H "Content-Type: application/json" -H "Cookie: admin_token=${ADMIN_TOKEN}" -d '${knowledgePayload.replace(/'/g, "'\\''")}'`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 10000
    });
    console.log(`  ✅ Knowledge uploaded`);
  } catch (e) {
    console.log(`  ⚠️ Knowledge upload failed (non-critical)`);
  }

  // 9. Set AI settings
  try {
    const systemPrompt = createSystemPrompt(lead);
    const aiPayload = JSON.stringify({
      systemPrompt,
      greeting: config.welcomeMessage,
      temperature: 0.7,
      maxTokens: 2048,
      topK: 5
    });
    execSync(`curl -s -X PUT "${BASE_URL}/api/ai-settings/${lead.clientId}" -H "Content-Type: application/json" -H "Cookie: admin_token=${ADMIN_TOKEN}" -d '${aiPayload.replace(/'/g, "'\\''")}'`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 10000
    });
    console.log(`  ✅ AI settings configured`);
  } catch (e) {
    console.log(`  ⚠️ AI settings failed (non-critical)`);
  }

  console.log(`  🎉 ${lead.brandName} complete!`);
  return { success: true };
}

// Main
async function main() {
  let leads;

  if (process.argv.includes('--file')) {
    const fileIdx = process.argv.indexOf('--file') + 1;
    const filePath = process.argv[fileIdx];
    leads = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (process.argv.includes('--index')) {
      const idx = parseInt(process.argv[process.argv.indexOf('--index') + 1]);
      leads = [leads[idx]];
    }
  } else {
    // Read from stdin
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    leads = JSON.parse(input);
    if (!Array.isArray(leads)) leads = [leads];
  }

  const results = { successes: [], failures: [] };

  for (const lead of leads) {
    try {
      const result = await processLead(lead);
      if (result.success) {
        results.successes.push({ clientId: lead.clientId, brandName: lead.brandName, website: lead.website });
      } else {
        results.failures.push({ clientId: lead.clientId, brandName: lead.brandName, website: lead.website, error: result.error });
      }
    } catch (e) {
      results.failures.push({ clientId: lead.clientId, brandName: lead.brandName, website: lead.website, error: e.message });
    }
  }

  console.log('\n📊 Batch Results:');
  console.log(`  ✅ Successes: ${results.successes.length}`);
  console.log(`  ❌ Failures: ${results.failures.length}`);

  if (results.failures.length > 0) {
    console.log('\nFailed leads:');
    results.failures.forEach(f => console.log(`  - ${f.brandName}: ${f.error}`));
  }

  // Output JSON results
  fs.writeFileSync(path.join(ROOT, '.agent/widget-builder/batch-results.json'), JSON.stringify(results, null, 2));
}

main().catch(console.error);
