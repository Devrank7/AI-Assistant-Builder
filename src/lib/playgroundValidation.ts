// src/lib/playgroundValidation.ts

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

export function isValidRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

export interface PlaygroundConfig {
  botName?: string;
  greeting?: string;
  quickReplies?: string[];
  tone?: 'friendly' | 'professional' | 'casual';
}

// theme.json color field names that accept hex values
export const COLOR_FIELDS = [
  'headerFrom',
  'headerVia',
  'headerTo',
  'toggleFrom',
  'toggleVia',
  'toggleTo',
  'toggleShadow',
  'toggleHoverRgb',
  'sendFrom',
  'sendTo',
  'sendHoverFrom',
  'sendHoverTo',
  'onlineDotBg',
  'onlineDotBorder',
  'typingDot',
  'userMsgFrom',
  'userMsgTo',
  'userMsgShadow',
  'avatarFrom',
  'avatarTo',
  'avatarBorder',
  'avatarIcon',
  'linkColor',
  'linkHover',
  'copyHover',
  'copyActive',
  'chipBorder',
  'chipFrom',
  'chipTo',
  'chipText',
  'chipHoverFrom',
  'chipHoverTo',
  'chipHoverBorder',
  'focusBorder',
  'focusRing',
  'cssPrimary',
  'cssAccent',
  'feedbackActive',
  'feedbackHover',
  'imgActiveBorder',
  'imgActiveBg',
  'imgActiveText',
  'imgHoverText',
  'imgHoverBorder',
  'imgHoverBg',
] as const;

// Fields that map to CSS variables (live-updatable without rebuild)
export const CSS_VARIABLE_FIELDS = [
  'headerFrom',
  'headerTo',
  'toggleFrom',
  'toggleTo',
  'sendFrom',
  'sendTo',
  'userMsgFrom',
  'userMsgTo',
  'avatarFrom',
  'avatarTo',
  'linkColor',
  'chipBorder',
  'chipFrom',
  'focusBorder',
  'cssPrimary',
  'cssAccent',
] as const;

// Fields that require a full rebuild (not CSS-variable-only)
export const REBUILD_ONLY_FIELDS = [
  'font',
  'fontUrl',
  'widgetW',
  'widgetH',
  'toggleSize',
  'toggleRadius',
  'headerPad',
] as const;

// Google Fonts supported in the playground
export const GOOGLE_FONTS = [
  { name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Open Sans', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { name: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'Raleway', url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap' },
  { name: 'Rubik', url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap' },
  {
    name: 'Source Sans 3',
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  { name: 'Work Sans', url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap' },
  { name: 'DM Sans', url: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Manrope', url: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap' },
  {
    name: 'Plus Jakarta Sans',
    url: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  },
  { name: 'Outfit', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
] as const;

export const TONE_DIRECTIVES: Record<string, string> = {
  friendly: 'Respond in a warm, friendly tone. Use casual language and be approachable.',
  professional: 'Respond in a professional, formal tone. Be precise and business-like.',
  casual: 'Respond in a relaxed, casual tone. Keep it short and conversational.',
};

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTheme(theme: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of COLOR_FIELDS) {
    const val = theme[field];
    if (val !== undefined && typeof val === 'string' && !isValidHex(val)) {
      errors.push({ field, message: `Invalid hex color: ${val}` });
    }
  }
  return errors;
}

export function validateConfig(config: PlaygroundConfig): ValidationError[] {
  const errors: ValidationError[] = [];
  if (config.botName !== undefined) {
    if (typeof config.botName !== 'string' || config.botName.trim().length > 30) {
      errors.push({ field: 'botName', message: 'Bot name must be max 30 characters' });
    }
  }
  if (config.greeting !== undefined) {
    if (typeof config.greeting !== 'string' || config.greeting.length > 200) {
      errors.push({ field: 'greeting', message: 'Greeting must be max 200 characters' });
    }
  }
  if (config.quickReplies !== undefined) {
    if (!Array.isArray(config.quickReplies) || config.quickReplies.length > 5) {
      errors.push({ field: 'quickReplies', message: 'Max 5 quick replies allowed' });
    } else {
      config.quickReplies.forEach((qr, i) => {
        if (typeof qr !== 'string' || qr.length > 80) {
          errors.push({ field: `quickReplies[${i}]`, message: 'Each quick reply max 80 chars' });
        }
      });
    }
  }
  if (config.tone !== undefined) {
    if (!['friendly', 'professional', 'casual'].includes(config.tone)) {
      errors.push({ field: 'tone', message: 'Tone must be friendly, professional, or casual' });
    }
  }
  return errors;
}

// Default theme for widgets that don't have one yet
export const DEFAULT_THEME: Record<string, unknown> = {
  label: 'Default Theme',
  domain: '',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  isDark: false,
  widgetW: '370px',
  widgetH: '540px',
  widgetMaxW: '370px',
  widgetMaxH: '540px',
  toggleSize: 'w-[58px] h-[58px]',
  toggleRadius: 'rounded-full',
  headerPad: 'px-6 py-5',
  nameSize: 'text-[15px]',
  headerAccent: '',
  avatarHeaderRound: 'rounded-lg',
  chatAvatarRound: 'rounded-lg',
  hasShine: false,
  headerFrom: '#1a1a2e',
  headerVia: '#16213e',
  headerTo: '#16213e',
  toggleFrom: '#1a1a2e',
  toggleVia: '#16213e',
  toggleTo: '#16213e',
  toggleShadow: '#1a1a2e',
  toggleHoverRgb: '26, 26, 46',
  sendFrom: '#0f3460',
  sendTo: '#533483',
  sendHoverFrom: '#0d2d55',
  sendHoverTo: '#472d72',
  onlineDotBg: '#10b981',
  onlineDotBorder: '#059669',
  typingDot: '#10b981',
  userMsgFrom: '#0f3460',
  userMsgTo: '#533483',
  userMsgShadow: '#0f3460',
  avatarFrom: '#e8e0f0',
  avatarTo: '#d4c8e2',
  avatarBorder: '#c0b0d4',
  avatarIcon: '#1a1a2e',
  linkColor: '#0f3460',
  linkHover: '#0d2d55',
  copyHover: '#0f3460',
  copyActive: '#0f3460',
  chipBorder: '#d4c8e2',
  chipFrom: '#f5f0fa',
  chipTo: '#e8e0f0',
  chipText: '#1a1a2e',
  chipHoverFrom: '#e8e0f0',
  chipHoverTo: '#d4c8e2',
  chipHoverBorder: '#533483',
  focusBorder: '#533483',
  focusRing: '#f5f0fa',
  imgActiveBorder: '#533483',
  imgActiveBg: '#f5f0fa',
  imgActiveText: '#1a1a2e',
  imgHoverText: '#1a1a2e',
  imgHoverBorder: '#d4c8e2',
  imgHoverBg: '#f5f0fa',
  cssPrimary: '#0f3460',
  cssAccent: '#533483',
  focusRgb: '15, 52, 96',
  feedbackActive: '#0f3460',
  feedbackHover: '#533483',
};
