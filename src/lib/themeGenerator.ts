/**
 * Theme Generator
 *
 * Generates a complete theme.json object (50+ fields) from minimal input:
 * primary color + optional accent color + domain.
 *
 * Output satisfies REQUIRED_FIELDS in generate-single-theme.js (lines 43-65)
 * and DARK_REQUIRED (lines 67-71) when isDark=true.
 */

import { darken, lighten, mixWithWhite, rgbToString, generateAccentColor } from './colorUtils';

export interface ThemeInput {
  primaryColor: string;
  accentColor?: string;
  isDark?: boolean;
  domain: string;
  brandName?: string;
  fontUrl?: string | null;
  font?: string;
}

export function generateThemeJson(input: ThemeInput): Record<string, unknown> {
  const {
    primaryColor,
    isDark = false,
    domain,
    brandName,
    fontUrl = null,
    font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } = input;

  const PRIMARY = primaryColor;
  const ACCENT = input.accentColor || generateAccentColor(PRIMARY);

  // Derive primary palette
  const PRIMARY_DARKER = darken(PRIMARY, 18);
  const PRIMARY_LIGHTER = lighten(PRIMARY, 10);
  const PRIMARY_MEDIUM = mixWithWhite(PRIMARY, 40);
  const PRIMARY_LIGHT = mixWithWhite(PRIMARY, 70);
  const PRIMARY_LIGHT_MEDIUM = mixWithWhite(PRIMARY, 60);
  const PRIMARY_VERY_LIGHT = mixWithWhite(PRIMARY, 90);

  // Derive accent palette
  const ACCENT_DARKER = darken(ACCENT, 15);

  const label = `${brandName || domain} — Auto-generated theme`;

  const theme: Record<string, unknown> = {
    // Metadata
    label,
    domain,
    fontUrl,
    font,
    isDark,

    // Layout — "standard" preset
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

    // Header/Toggle gradient
    headerFrom: PRIMARY,
    headerVia: PRIMARY_LIGHTER,
    headerTo: ACCENT,
    toggleFrom: PRIMARY,
    toggleVia: PRIMARY_LIGHTER,
    toggleTo: ACCENT,
    toggleShadow: PRIMARY,
    toggleHoverRgb: rgbToString(PRIMARY),

    // Send button
    sendFrom: PRIMARY,
    sendTo: ACCENT,
    sendHoverFrom: PRIMARY_DARKER,
    sendHoverTo: ACCENT_DARKER,

    // Status indicators
    onlineDotBg: PRIMARY_LIGHT,
    onlineDotBorder: PRIMARY,
    typingDot: PRIMARY_MEDIUM,

    // User messages
    userMsgFrom: PRIMARY,
    userMsgTo: ACCENT,
    userMsgShadow: PRIMARY,

    // Avatar
    avatarFrom: PRIMARY_VERY_LIGHT,
    avatarTo: PRIMARY_LIGHT,
    avatarBorder: PRIMARY_LIGHT_MEDIUM,
    avatarIcon: PRIMARY,

    // Links
    linkColor: PRIMARY,
    linkHover: PRIMARY_DARKER,
    copyHover: PRIMARY,
    copyActive: PRIMARY,

    // Quick reply chips
    chipBorder: PRIMARY_LIGHT_MEDIUM,
    chipFrom: PRIMARY_VERY_LIGHT,
    chipTo: PRIMARY_LIGHT,
    chipText: PRIMARY_DARKER,
    chipHoverFrom: PRIMARY_LIGHT,
    chipHoverTo: PRIMARY_LIGHT_MEDIUM,
    chipHoverBorder: PRIMARY_MEDIUM,

    // Focus states
    focusBorder: PRIMARY_MEDIUM,
    focusRing: PRIMARY_VERY_LIGHT,

    // Image viewer
    imgActiveBorder: PRIMARY_MEDIUM,
    imgActiveBg: PRIMARY_VERY_LIGHT,
    imgActiveText: PRIMARY,
    imgHoverText: PRIMARY,
    imgHoverBorder: PRIMARY_MEDIUM,
    imgHoverBg: PRIMARY_VERY_LIGHT,

    // CSS variables
    cssPrimary: PRIMARY,
    cssAccent: ACCENT,
    focusRgb: rgbToString(PRIMARY),

    // Feedback
    feedbackActive: PRIMARY,
    feedbackHover: PRIMARY_MEDIUM,
  };

  // Dark theme surface colors
  if (isDark) {
    Object.assign(theme, {
      surfaceBg: '#0b1018',
      surfaceCard: '#111927',
      surfaceBorder: '#1e2d3d',
      surfaceInput: '#0f1720',
      surfaceInputFocus: '#162232',
      textPrimary: '#e2e8f0',
      textSecondary: '#64748b',
      textMuted: '#475569',
    });
  }

  return theme;
}

export function generateWidgetConfig(input: {
  clientId: string;
  brandName: string;
  greeting: string;
  language: string;
  contacts?: { phone?: string; email?: string; website?: string };
}): Record<string, unknown> {
  const { clientId, brandName, greeting, language, contacts } = input;

  const isUkrainian = language === 'uk' || language === 'uk-UA';
  const isRussian = language === 'ru' || language === 'ru-RU';
  const isArabic = language === 'ar';

  let quickReplies: string[];
  let inputPlaceholder: string;
  let nudgeMessage: string;

  if (isUkrainian) {
    quickReplies = ['Розкажіть про компанію', 'Які послуги ви надаєте?', "Як з вами зв'язатися?"];
    inputPlaceholder = 'Задайте питання...';
    nudgeMessage = '👋 Вітаємо! Потрібна допомога?';
  } else if (isRussian) {
    quickReplies = ['Расскажите о компании', 'Какие услуги вы предоставляете?', 'Как с вами связаться?'];
    inputPlaceholder = 'Задайте вопрос...';
    nudgeMessage = '👋 Привет! Нужна помощь?';
  } else if (isArabic) {
    quickReplies = ['أخبرني عن شركتكم', 'ما الخدمات التي تقدمونها؟', 'كيف يمكنني التواصل معكم؟'];
    inputPlaceholder = 'اطرح سؤالاً...';
    nudgeMessage = '👋 مرحباً! هل تحتاج مساعدة؟';
  } else {
    quickReplies = ['Tell me about your company', 'What services do you offer?', 'How can I contact you?'];
    inputPlaceholder = 'Ask a question...';
    nudgeMessage = '👋 Hi there! Need any help?';
  }

  const initials = brandName
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const config: Record<string, unknown> = {
    clientId,
    botName: `${brandName} AI`,
    welcomeMessage: greeting,
    inputPlaceholder,
    quickReplies,
    avatar: {
      type: 'initials',
      initials: initials || 'AI',
    },
    design: {
      position: 'bottom-right',
    },
    features: {
      streaming: true,
      sound: true,
      voiceInput: true,
      feedback: true,
      tts: true,
      autoLang: true,
      richCards: true,
      leadForm: true,
      memory: true,
      proactive: {
        delay: 8,
        message: nudgeMessage,
      },
    },
  };

  // Add contacts if any were found
  if (contacts && (contacts.phone || contacts.email || contacts.website)) {
    const contactObj: Record<string, string> = {};
    if (contacts.phone) contactObj.phone = contacts.phone;
    if (contacts.email) contactObj.email = contacts.email;
    if (contacts.website) contactObj.website = contacts.website;
    config.contacts = contactObj;
  }

  return config;
}
