'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Lang, DEFAULT_LANG, LANGUAGES, SUPPORTED_LANGS } from './config';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  dir: 'ltr',
});

export function useLanguage() {
  return useContext(LanguageContext);
}

function detectLanguage(urlLang: string | null): Lang {
  // 1. URL parameter
  if (urlLang && SUPPORTED_LANGS.includes(urlLang as Lang)) {
    return urlLang as Lang;
  }

  // 2. localStorage (user's explicit choice)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('preferred_lang');
    if (stored && SUPPORTED_LANGS.includes(stored as Lang)) {
      return stored as Lang;
    }
  }

  // 3. Default — always English unless user explicitly changes
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const urlLang = searchParams.get('lang');
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(detectLanguage(urlLang));
    setMounted(true);
  }, [urlLang]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('preferred_lang', newLang);

    // Update URL parameter without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Update document attributes
  useEffect(() => {
    if (!mounted) return;
    const dir = LANGUAGES[lang].dir;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, mounted]);

  const dir = LANGUAGES[lang].dir;

  return <LanguageContext.Provider value={{ lang, setLang, dir }}>{children}</LanguageContext.Provider>;
}
