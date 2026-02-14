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
}): Record<string, unknown> {
  const { clientId, brandName, greeting, language } = input;

  const isUkrainian = language === 'uk' || language === 'uk-UA';
  const isRussian = language === 'ru' || language === 'ru-RU';

  let starters: string[];
  if (isUkrainian) {
    starters = ['Розкажіть про компанію', 'Які послуги ви надаєте?', "Як з вами зв'язатися?"];
  } else if (isRussian) {
    starters = ['Расскажите о компании', 'Какие услуги вы предоставляете?', 'Как с вами связаться?'];
  } else {
    starters = ['Tell me about your company', 'What services do you offer?', 'How can I contact you?'];
  }

  return {
    clientId,
    bot: {
      name: `${brandName} AI`,
      greeting,
      tone: 'professional_friendly',
    },
    design: {
      style: 'auto_generated',
      position: 'bottom-right',
    },
    features: {
      streaming: true,
      imageUpload: true,
      quickReplies: {
        enabled: true,
        starters,
      },
      feedback: true,
      sound: true,
      voiceInput: true,
      leads: true,
      integrations: {},
    },
  };
}
