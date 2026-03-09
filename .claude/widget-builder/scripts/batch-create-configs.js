#!/usr/bin/env node
/**
 * Batch create widget configs + knowledge seeds for real estate leads.
 * Usage: node batch-create-configs.js
 *
 * Reads leads from stdin as JSON array, creates:
 * - .agent/widget-builder/clients/<id>/theme.json
 * - .agent/widget-builder/clients/<id>/widget.config.json
 * - knowledge-seeds/<id>.json
 * - quickwidgets/<id>/info.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CLIENTS_DIR = path.resolve(__dirname, '../clients');

// Read leads from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const leads = JSON.parse(input);
  console.log(`Processing ${leads.length} leads...`);

  for (const lead of leads) {
    try {
      createConfigs(lead);
      console.log(`✅ ${lead.clientId}: configs created`);
    } catch (err) {
      console.error(`❌ ${lead.clientId}: ${err.message}`);
    }
  }

  console.log('Done!');
});

function createConfigs(lead) {
  const { clientId, name, email, phone, website, address, instagram,
          primaryColor, secondaryColor, font, fontUrl, isDark, tagline,
          description, services, language } = lead;

  const clientDir = path.join(CLIENTS_DIR, clientId, 'src', 'components');
  const hooksDir = path.join(CLIENTS_DIR, clientId, 'src', 'hooks');
  const knowledgeDir = path.join(CLIENTS_DIR, clientId, 'knowledge');
  fs.mkdirSync(clientDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.mkdirSync(knowledgeDir, { recursive: true });

  // Derive colors
  const colors = deriveColors(primaryColor, secondaryColor || primaryColor, isDark);

  // Determine layout
  const layout = isDark ? 'standard' : 'standard';

  // Initials
  const initials = name.split(' ').filter(w => w.length > 1 && w[0] === w[0].toUpperCase()).slice(0, 2).map(w => w[0]).join('');

  // Language-aware quick replies
  const quickReplies = language === 'fr'
    ? ["Acheter un bien", "Louer un bien", "Projets off-plan"]
    : language === 'ar'
    ? ["شراء عقار", "إيجار عقار", "مشاريع قيد الإنشاء"]
    : ["Buy a property", "Rent a property", "Off-plan projects"];

  const welcomeMsg = language === 'fr'
    ? `Bienvenue chez **${name}**! Comment puis-je vous aider?`
    : `Welcome to **${name}**! How can I help you find your perfect property?`;

  const placeholder = language === 'fr'
    ? "Posez une question..."
    : "Ask about properties, prices, areas...";

  const proactiveMsg = language === 'fr'
    ? `Besoin d'aide pour trouver un bien à Dubaï?`
    : `Looking for property in Dubai? Let me help!`;

  // widget.config.json
  const widgetConfig = {
    clientId,
    botName: `${name.split(' ').slice(0, 2).join(' ')} AI`,
    welcomeMessage: welcomeMsg,
    inputPlaceholder: placeholder,
    quickReplies,
    avatar: { type: "initials", initials: initials || "RE" },
    design: { position: "bottom-right" },
    features: {
      sound: true, voiceInput: true, feedback: true, streaming: true,
      tts: true, autoLang: true, richCards: true, leadForm: true, memory: true,
      proactive: { delay: 8, message: proactiveMsg }
    },
    contacts: {
      ...(phone ? { phone: phone.replace(/\s/g, '') } : {}),
      ...(email && !email.includes('doe.com') && !email.includes('mysite.com') && !email.includes('mail.com') && !email.includes('dorik.io') && !email.includes('2x.webp') ? { email } : {}),
      website
    }
  };

  fs.writeFileSync(
    path.join(CLIENTS_DIR, clientId, 'widget.config.json'),
    JSON.stringify(widgetConfig, null, 2)
  );

  // theme.json
  const theme = {
    label: `${name} — ${isDark ? 'Dark' : 'Light'} Theme`,
    domain: new URL(website).hostname.replace('www.', ''),
    fontUrl: fontUrl || null,
    font: font || "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    isDark: !!isDark,
    widgetW: "360px", widgetH: "520px", widgetMaxW: "360px", widgetMaxH: "520px",
    toggleSize: "w-14 h-14", toggleRadius: "rounded-2xl",
    headerPad: "px-5 py-4", nameSize: "text-[14px]",
    headerAccent: "", avatarHeaderRound: "rounded-xl", chatAvatarRound: "rounded-xl",
    hasShine: true,
    ...colors
  };

  fs.writeFileSync(
    path.join(CLIENTS_DIR, clientId, 'theme.json'),
    JSON.stringify(theme, null, 2)
  );

  // info.json
  const qwDir = path.join(ROOT, 'quickwidgets', clientId);
  fs.mkdirSync(qwDir, { recursive: true });

  const info = {
    clientId,
    username: clientId,
    name,
    email: email || "",
    website,
    phone: phone || null,
    addresses: address ? [address] : [],
    instagram: instagram || null,
    clientType: "quick",
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(qwDir, 'info.json'), JSON.stringify(info, null, 2));

  // knowledge-seeds/<id>.json
  const seed = {
    clientId,
    exportedAt: new Date().toISOString(),
    chunks: [
      {
        text: `${name}\n\n${description || `${name} is a real estate agency based in Dubai, UAE.`}\n\n${tagline ? `Tagline: ${tagline}\n\n` : ''}Services:\n${services || '- Property sales and rentals\n- Off-plan projects\n- Market consultation'}\n\nKey Areas: Dubai, UAE.`,
        source: "quick-widget-builder"
      },
      {
        text: `Contact Information:\n${phone ? `- Phone: ${phone}\n` : ''}${email ? `- Email: ${email}\n` : ''}- Website: ${website}\n${address ? `- Address: ${address}\n` : ''}${instagram ? `- Instagram: ${instagram}\n` : ''}`,
        source: "quick-widget-builder"
      }
    ],
    aiSettings: {
      systemPrompt: `You are an AI assistant for ${name} — a real estate agency in Dubai, UAE.\n\nCompany: ${name}\n${address ? `Location: ${address}\n` : ''}${phone ? `Phone: ${phone}\n` : ''}${email ? `Email: ${email}\n` : ''}Website: ${website}\n${instagram ? `Instagram: ${instagram}\n` : ''}\n${services ? `Services: ${services}\n` : 'Services: Property sales and rentals, off-plan projects, market consultation.\n'}\nInstructions:\n- Answer based ONLY on the information above and knowledge base\n- Be helpful, professional, and friendly\n- If unsure, suggest contacting the company directly${phone ? ` at ${phone}` : ''}${email ? ` or ${email}` : ''}\n- Respond in the same language the user writes in\n- Keep answers concise (2-4 sentences unless more detail needed)`,
      greeting: welcomeMsg,
      temperature: 0.7,
      maxTokens: 2048,
      topK: 5,
      aiModel: "gemini-3-flash-preview",
      handoffEnabled: false
    }
  };

  fs.writeFileSync(
    path.join(ROOT, 'knowledge-seeds', `${clientId}.json`),
    JSON.stringify(seed)
  );
}

function deriveColors(primary, accent, isDark) {
  // Parse hex
  const p = hexToRgb(primary);
  const a = hexToRgb(accent);

  const pDarker = darken(p, 0.2);
  const pLighter = lighten(p, 0.1);
  const pMedium = mixWhite(p, 0.4);
  const pLight = mixWhite(p, 0.7);
  const pLightMedium = mixWhite(p, 0.6);
  const pVeryLight = isDark ? darken(p, 0.8) : mixWhite(p, 0.9);
  const aDarker = darken(a, 0.15);

  const base = {
    headerFrom: primary,
    headerVia: rgbToHex(pLighter),
    headerTo: accent,
    toggleFrom: primary,
    toggleVia: rgbToHex(pLighter),
    toggleTo: accent,
    toggleShadow: primary,
    toggleHoverRgb: `${p.r}, ${p.g}, ${p.b}`,
    sendFrom: primary,
    sendTo: accent,
    sendHoverFrom: rgbToHex(pDarker),
    sendHoverTo: rgbToHex(aDarker),
    onlineDotBg: rgbToHex(pLight),
    onlineDotBorder: primary,
    typingDot: rgbToHex(pMedium),
    userMsgFrom: primary,
    userMsgTo: accent,
    userMsgShadow: primary,
    avatarFrom: rgbToHex(isDark ? darken(p, 0.85) : pVeryLight),
    avatarTo: rgbToHex(isDark ? darken(p, 0.75) : pLight),
    avatarBorder: rgbToHex(isDark ? darken(p, 0.6) : pLightMedium),
    avatarIcon: primary,
    linkColor: isDark ? rgbToHex(pLight) : primary,
    linkHover: isDark ? rgbToHex(pLighter) : rgbToHex(pDarker),
    copyHover: primary,
    copyActive: primary,
    chipBorder: rgbToHex(isDark ? darken(p, 0.7) : pLightMedium),
    chipFrom: rgbToHex(isDark ? darken(p, 0.9) : pVeryLight),
    chipTo: rgbToHex(isDark ? darken(p, 0.85) : mixWhite(p, 0.85)),
    chipText: isDark ? rgbToHex(pLight) : rgbToHex(pDarker),
    chipHoverFrom: rgbToHex(isDark ? darken(p, 0.8) : pLight),
    chipHoverTo: rgbToHex(isDark ? darken(p, 0.75) : pLightMedium),
    chipHoverBorder: isDark ? primary : rgbToHex(pMedium),
    focusBorder: rgbToHex(pMedium),
    focusRing: rgbToHex(isDark ? darken(p, 0.85) : pVeryLight),
    imgActiveBorder: rgbToHex(pMedium),
    imgActiveBg: rgbToHex(isDark ? darken(p, 0.9) : pVeryLight),
    imgActiveText: primary,
    imgHoverText: primary,
    imgHoverBorder: rgbToHex(pMedium),
    imgHoverBg: rgbToHex(isDark ? darken(p, 0.9) : pVeryLight),
    cssPrimary: primary,
    cssAccent: accent,
    focusRgb: `${p.r}, ${p.g}, ${p.b}`,
    feedbackActive: primary,
    feedbackHover: rgbToHex(pMedium)
  };

  if (isDark) {
    base.surfaceBg = "#0b1018";
    base.surfaceCard = "#111927";
    base.surfaceBorder = "#1e2d3d";
    base.surfaceInput = "#0f1720";
    base.surfaceInputFocus = "#162232";
    base.textPrimary = "#e2e8f0";
    base.textSecondary = "#64748b";
    base.textMuted = "#475569";
  }

  return base;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16)
  };
}

function rgbToHex({r, g, b}) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function darken({r, g, b}, amount) {
  return { r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) };
}

function lighten({r, g, b}, amount) {
  return { r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount };
}

function mixWhite({r, g, b}, amount) {
  return { r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount };
}
