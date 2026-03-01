import { useMemo } from 'react';
import { useLanguage } from './context';
import type { Lang } from './config';

// Import all locale files
import * as ruCommon from './locales/ru/common';
import * as ruHome from './locales/ru/home';
import * as ruAbout from './locales/ru/about';
import * as ruGenerator from './locales/ru/generator';

import * as enCommon from './locales/en/common';
import * as enHome from './locales/en/home';
import * as enAbout from './locales/en/about';
import * as enGenerator from './locales/en/generator';

import * as ukCommon from './locales/uk/common';
import * as ukHome from './locales/uk/home';
import * as ukAbout from './locales/uk/about';
import * as ukGenerator from './locales/uk/generator';

import * as plCommon from './locales/pl/common';
import * as plHome from './locales/pl/home';
import * as plAbout from './locales/pl/about';
import * as plGenerator from './locales/pl/generator';

import * as arCommon from './locales/ar/common';
import * as arHome from './locales/ar/home';
import * as arAbout from './locales/ar/about';
import * as arGenerator from './locales/ar/generator';

type Namespace = 'common' | 'home' | 'about' | 'generator';

const translations: Record<Lang, Record<Namespace, Record<string, string>>> = {
  ru: { common: ruCommon.default, home: ruHome.default, about: ruAbout.default, generator: ruGenerator.default },
  en: { common: enCommon.default, home: enHome.default, about: enAbout.default, generator: enGenerator.default },
  uk: { common: ukCommon.default, home: ukHome.default, about: ukAbout.default, generator: ukGenerator.default },
  pl: { common: plCommon.default, home: plHome.default, about: plAbout.default, generator: plGenerator.default },
  ar: { common: arCommon.default, home: arHome.default, about: arAbout.default, generator: arGenerator.default },
};

export function useTranslation(namespace: Namespace) {
  const { lang } = useLanguage();

  const t = useMemo(() => {
    const ns = translations[lang]?.[namespace] || translations.en[namespace];
    return (key: string): string => ns[key] || translations.en[namespace]?.[key] || key;
  }, [lang, namespace]);

  return { t, lang };
}
