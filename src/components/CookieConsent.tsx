'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n/useTranslation';

export default function CookieConsent() {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Hide on demo and short-link pages
  const isDemo = pathname.startsWith('/demo/') || pathname.startsWith('/d/');

  useEffect(() => {
    if (isDemo) return;
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (!consent) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, [isDemo]);

  const accept = () => {
    try {
      localStorage.setItem('cookie_consent', 'accepted');
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  };

  if (!visible || isDemo) return null;

  return (
    <div className="border-border bg-bg-secondary/95 fixed right-0 bottom-0 left-0 z-50 border-t p-4 backdrop-blur-xl md:p-6">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-text-secondary text-sm leading-relaxed">
          {t('cookie.text')}{' '}
          <Link
            href="/privacy"
            className="text-accent hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            {t('cookie.link')}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="text-text-primary flex-shrink-0 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] px-6 py-2.5 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
