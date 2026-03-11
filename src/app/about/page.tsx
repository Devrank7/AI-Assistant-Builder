'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WidgetGenerator from '@/components/WidgetGenerator';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/* ═══════════════════════════════════════════════════════════════
   THEME CSS — scoped under .wb-about (same pattern as homepage)
   ═══════════════════════════════════════════════════════════════ */
const THEME_CSS = `
.wb-about {
  --wb-bg: #060810;
  --wb-blue: #3B82F6;
  --wb-blue-light: #60A5FA;
  --wb-blue-dark: #2563EB;
  --wb-indigo: #818CF8;
  --wb-indigo-dark: #6366F1;
  --wb-text: #E8EAED;
  --wb-text-secondary: #94A3B8;
  --wb-text-muted: #64748B;
  --neon-cyan: #3B82F6;
  --neon-purple: #6366F1;
  --neon-pink: #818CF8;
  --accent: #3B82F6;
  background: var(--wb-bg);
}
.wb-about ::selection {
  background: rgba(59,130,246,0.25);
  color: #fff;
}
.wb-about .gradient-text {
  background: linear-gradient(135deg, #60A5FA, #818CF8, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
/* Background */
.wb-about-mesh {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 700px 700px at 10% 0%, rgba(59,130,246,0.07), transparent),
    radial-gradient(ellipse 500px 500px at 90% 80%, rgba(99,102,241,0.05), transparent),
    radial-gradient(ellipse 600px 400px at 50% 40%, rgba(129,140,248,0.025), transparent);
}
.wb-about-grid {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  background-size: 72px 72px;
}
/* Nav */
.wb-about-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}
.wb-about-nav.scrolled {
  background: rgba(6,8,16,0.88);
  border-bottom-color: rgba(255,255,255,0.06);
}
/* Cards */
.wb-about-card {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
}
.wb-about-card:hover {
  background: rgba(255,255,255,0.045);
  border-color: rgba(59,130,246,0.18);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 24px rgba(59,130,246,0.04);
  transform: translateY(-2px);
}
/* Bento card */
.wb-about-bento {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
  position: relative;
  overflow: hidden;
}
.wb-about-bento::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
.wb-about-bento:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(59,130,246,0.15);
  transform: translateY(-2px);
}
/* Badge */
.wb-about-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.15);
  border-radius: 100px;
  font-size: 0.75rem; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: #60A5FA;
}
/* Buttons */
.wb-about-btn-primary {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: #fff;
  font-weight: 700;
  padding: 14px 32px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 4px 20px rgba(59,130,246,0.3);
  display: inline-flex; align-items: center; gap: 8px;
  text-decoration: none;
}
.wb-about-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(59,130,246,0.4);
}
/* Divider */
.wb-about-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,0.15), rgba(129,140,248,0.1), transparent);
}
/* Stat number */
.wb-about-stat {
  font-size: 2.75rem; font-weight: 800;
  letter-spacing: -0.04em; line-height: 1;
}
@media (min-width: 768px) {
  .wb-about-stat { font-size: 3.25rem; }
}
/* Step number */
.wb-step-num {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; font-weight: 800;
  transition: all 0.4s;
}
/* Icon box */
.wb-icon-box {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.4s;
}
/* CSS-only fade-in animations (survive HMR) */
@keyframes wbAboutFadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.wb-a-anim {
  animation: wbAboutFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both;
}
.wb-a-d1 { animation-delay: 0.1s; }
.wb-a-d2 { animation-delay: 0.2s; }
.wb-a-d3 { animation-delay: 0.3s; }
.wb-a-d4 { animation-delay: 0.35s; }
.wb-a-d5 { animation-delay: 0.15s; }
.wb-a-d6 { animation-delay: 0.25s; }
/* Glass override for WidgetGenerator */
.wb-about .glass {
  background: rgba(12,16,28,0.92);
  border-color: rgba(255,255,255,0.08);
}
`;

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export default function AboutPage() {
  const { t } = useTranslation('about');
  const { t: tc } = useTranslation('common');
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="wb-about relative min-h-screen overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />

      {/* Background layers */}
      <div className="wb-about-mesh" />
      <div className="wb-about-grid" />

      {/* ── Navigation ── */}
      <nav
        className={`wb-about-nav flex items-center justify-between px-6 py-4 md:px-12 ${navScrolled ? 'scrolled' : ''}`}
      >
        <Link href="/" className="flex items-center gap-3 text-white transition-opacity hover:opacity-80">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">WinBix AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            {tc('nav.home')}
          </Link>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        {/* ═══════════════════════════════════════════ */}
        {/* HERO                                       */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pt-16 pb-20 text-center md:pt-24">
          <div className="wb-about-badge mx-auto mb-6">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#60A5FA]" />
            About Us
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
            WinBix <span className="gradient-text">AI</span>
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[var(--wb-text-secondary)] md:text-2xl">
            {t('hero.subtitle')} <span className="font-medium text-white">{t('hero.highlight')}</span>
          </p>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* PROBLEM → METRICS                          */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('problem.title.before')}
              <span className="text-red-400">{t('problem.title.accent')}</span>
              {t('problem.title.after')}
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--wb-text-secondary)]">
              {t('problem.desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Metric 1 */}
            <div className="wb-about-bento wb-a-anim wb-a-d1 text-center">
              <div className="wb-about-stat mb-4 text-[var(--wb-blue)]">
                +<AnimatedCounter target={30} suffix="-40" />
              </div>
              <p className="text-lg font-medium text-white">{t('metrics.records.label')}</p>
              <p className="mt-2 text-sm text-[var(--wb-text-muted)]">{t('metrics.records.sub')}</p>
            </div>

            {/* Metric 2 */}
            <div className="wb-about-bento wb-a-anim wb-a-d2 text-center">
              <div className="wb-about-stat mb-4 text-[var(--wb-indigo)]">24/7</div>
              <p className="text-lg font-medium text-white">{t('metrics.uptime.label')}</p>
              <p className="mt-2 text-sm text-[var(--wb-text-muted)]">{t('metrics.uptime.sub')}</p>
            </div>

            {/* Metric 3 */}
            <div className="wb-about-bento wb-a-anim wb-a-d3 text-center">
              <div className="wb-about-stat mb-4 text-[var(--wb-indigo-dark)]">
                &lt;
                <AnimatedCounter target={3} />s
              </div>
              <p className="text-lg font-medium text-white">{t('metrics.speed.label')}</p>
              <p className="mt-2 text-sm text-[var(--wb-text-muted)]">{t('metrics.speed.sub')}</p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* HOW IT WORKS                               */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-16 text-center">
            <div className="wb-about-badge mx-auto mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              How It Works
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('how.title.before')}
              <span className="gradient-text">{t('how.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[var(--wb-text-secondary)]">{t('how.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="wb-about-bento wb-a-anim wb-a-d1">
              <div className="wb-step-num mb-6" style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA' }}>
                01
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step1.title')}</h3>
              <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('how.step1.desc')}</p>
            </div>

            {/* Step 2 */}
            <div className="wb-about-bento wb-a-anim wb-a-d2">
              <div className="wb-step-num mb-6" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
                02
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step2.title')}</h3>
              <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('how.step2.desc')}</p>
            </div>

            {/* Step 3 */}
            <div className="wb-about-bento wb-a-anim wb-a-d3">
              <div className="wb-step-num mb-6" style={{ background: 'rgba(129,140,248,0.1)', color: '#A78BFA' }}>
                03
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step3.title')}</h3>
              <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('how.step3.desc')}</p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* TRY IT YOURSELF                            */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-12 text-center">
            <div className="wb-about-badge mx-auto mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Live Demo
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('try.title.before')}
              <span className="gradient-text">{t('try.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[var(--wb-text-secondary)]">{t('try.desc')}</p>
          </div>
          <WidgetGenerator />
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* FEATURES                                   */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-16 text-center">
            <div className="wb-about-badge mx-auto mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Capabilities
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('features.title.before')}
              <span className="gradient-text">{t('features.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[var(--wb-text-secondary)]">{t('features.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { icon: '💬', title: t('features.chat.title'), desc: t('features.chat.desc') },
              { icon: '📋', title: t('features.booking.title'), desc: t('features.booking.desc') },
              { icon: '🌐', title: t('features.lang.title'), desc: t('features.lang.desc') },
              { icon: '📊', title: t('features.analytics.title'), desc: t('features.analytics.desc') },
              { icon: '🎨', title: t('features.design.title'), desc: t('features.design.desc') },
              { icon: '🔗', title: t('features.channels.title'), desc: t('features.channels.desc') },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`wb-about-card wb-a-anim flex gap-5 p-6 ${i % 2 === 0 ? `wb-a-d${Math.min(i / 2 + 1, 3)}` : `wb-a-d${Math.min((i - 1) / 2 + 1, 3)}`}`}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-2xl">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* INTEGRATIONS                               */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-16 text-center">
            <div className="wb-about-badge mx-auto mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Integrations
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('integrations.title.before')}
              <span className="gradient-text">{t('integrations.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--wb-text-secondary)]">{t('integrations.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* CRM */}
            <div className="wb-about-bento wb-a-anim wb-a-d1 group">
              <div className="wb-icon-box mb-6" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <svg className="h-7 w-7 text-[var(--wb-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257m9.86-3.06l4.5 4.5"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.crm.title')}</h3>
              <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('integrations.crm.desc')}</p>
            </div>

            {/* Calendar */}
            <div className="wb-about-bento wb-a-anim wb-a-d2 group">
              <div className="wb-icon-box mb-6" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <svg className="h-7 w-7 text-[var(--wb-indigo)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.calendar.title')}</h3>
              <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('integrations.calendar.desc')}</p>
            </div>

            {/* Auto-booking — accent card */}
            <div className="wb-about-bento wb-a-anim wb-a-d3 group" style={{ borderColor: 'rgba(59,130,246,0.15)' }}>
              <div
                className="absolute inset-0 rounded-[20px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(99,102,241,0.03), transparent)',
                }}
              />
              <div className="relative z-10">
                <div
                  className="wb-icon-box mb-6"
                  style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))' }}
                >
                  <svg className="h-7 w-7 text-[var(--wb-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.booking.title')}</h3>
                <p className="leading-relaxed text-[var(--wb-text-secondary)]">{t('integrations.booking.desc')}</p>
                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA' }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#60A5FA' }} />
                  AI-powered
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* FOUNDERS                                   */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-24">
          <div className="mb-16 text-center">
            <div className="wb-about-badge mx-auto mb-4">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Team
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('team.title.before')}
              <span className="gradient-text">{t('team.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--wb-text-secondary)]">{t('team.desc')}</p>
          </div>

          <div className="wb-about-bento mx-auto max-w-3xl" style={{ padding: '32px', borderRadius: '20px' }}>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              {t('team.bio1')
                .split(/\{(daniil|misha|serzha)\}/g)
                .map((part: string, i: number) => {
                  if (part === 'daniil')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.daniil')}
                      </span>
                    );
                  if (part === 'misha')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.misha')}
                      </span>
                    );
                  if (part === 'serzha')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.serzha')}
                      </span>
                    );
                  return <span key={i}>{part}</span>;
                })}
            </p>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              {t('team.bio2')
                .split(/\{winbix\}/g)
                .map((part: string, i: number, arr: string[]) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="font-semibold text-[var(--wb-blue)]">WinBix AI</span>}
                  </span>
                ))}
            </p>
            <p className="text-lg leading-relaxed text-gray-300">{t('team.bio3')}</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* CTA                                        */}
        {/* ═══════════════════════════════════════════ */}
        <section className="wb-a-anim pb-16">
          <div className="wb-about-bento relative text-center" style={{ padding: '48px 32px', borderRadius: '24px' }}>
            <div
              className="absolute inset-0 rounded-[24px]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(99,102,241,0.03), rgba(129,140,248,0.02))',
              }}
            />

            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                {t('cta.title.before')}
                <span className="gradient-text">{t('cta.title.accent')}</span>?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-[var(--wb-text-secondary)]">{t('cta.desc')}</p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href="mailto:winbix.ai@gmail.com" className="wb-about-btn-primary text-lg">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  {t('cta.email')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* FOOTER                                     */}
        {/* ═══════════════════════════════════════════ */}
        <div className="wb-about-divider mt-8 mb-8" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-[var(--wb-text-muted)] md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition-colors hover:text-gray-300">
              {tc('footer.privacy')}
            </Link>
            <Link href="/terms" className="transition-colors hover:text-gray-300">
              {tc('footer.terms')}
            </Link>
            <Link href="/" className="transition-colors hover:text-gray-300">
              {tc('footer.home')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
