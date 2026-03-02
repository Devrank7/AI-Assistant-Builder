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
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-white/[0.08] bg-[#0a0a0f]/95 p-4 backdrop-blur-xl md:p-6">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed text-gray-400">
          {t('cookie.text')}{' '}
          <Link
            href="/privacy"
            className="text-[var(--neon-cyan)] underline underline-offset-2 transition-colors hover:text-white"
          >
            {t('cookie.link')}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
