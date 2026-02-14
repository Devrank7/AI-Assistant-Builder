export const LANGUAGES = {
  ru: { name: 'Русский', dir: 'ltr' as const },
  en: { name: 'English', dir: 'ltr' as const },
  uk: { name: 'Українська', dir: 'ltr' as const },
  pl: { name: 'Polski', dir: 'ltr' as const },
  ar: { name: 'العربية', dir: 'rtl' as const },
} as const;

export type Lang = keyof typeof LANGUAGES;
export const DEFAULT_LANG: Lang = 'ru';
export const SUPPORTED_LANGS = Object.keys(LANGUAGES) as Lang[];

/** Map browser locale codes to our supported languages */
export function mapBrowserLocale(locale: string): Lang | null {
  const code = locale.toLowerCase().split('-')[0];
  if (code in LANGUAGES) return code as Lang;
  return null;
}
