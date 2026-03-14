'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import WidgetGenerator from '@/components/WidgetGenerator';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/components/AuthProvider';
import LandingChat from '@/components/LandingChat';

/* ═══════════════════════════════════════════════════════════════
   THEME CSS — injected at runtime (Tailwind v4 strips custom
   classes from globals.css, so we scope everything under .wb-main)
   ═══════════════════════════════════════════════════════════════ */
const THEME_CSS = `
.wb-main {
  --wb-bg: #060810;
  --wb-blue: #3B82F6;
  --wb-blue-light: #60A5FA;
  --wb-blue-dark: #2563EB;
  --wb-indigo: #818CF8;
  --wb-indigo-dark: #6366F1;
  --wb-text: #E8EAED;
  --wb-text-secondary: #94A3B8;
  --wb-text-muted: #64748B;
  /* Override global neon vars so WidgetGenerator matches */
  --neon-cyan: #3B82F6;
  --neon-purple: #6366F1;
  --neon-pink: #818CF8;
  --accent: #3B82F6;
  background: var(--wb-bg);
}
.wb-main ::selection {
  background: rgba(59,130,246,0.25);
  color: #fff;
}
.wb-main .gradient-text {
  background: linear-gradient(135deg, #60A5FA, #818CF8, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
/* Background layers */
.wb-mesh {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 700px 700px at 10% 0%, rgba(59,130,246,0.07), transparent),
    radial-gradient(ellipse 500px 500px at 90% 80%, rgba(99,102,241,0.05), transparent),
    radial-gradient(ellipse 600px 400px at 50% 40%, rgba(129,140,248,0.025), transparent);
}
.wb-grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  background-size: 72px 72px;
}
/* Nav */
.wb-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}
.wb-nav.scrolled {
  background: rgba(6,8,16,0.88);
  border-bottom-color: rgba(255,255,255,0.06);
}
/* Cards */
.wb-card {
  background: rgba(255,255,255,0.025);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
}
.wb-card:hover {
  background: rgba(255,255,255,0.045);
  border-color: rgba(59,130,246,0.18);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 24px rgba(59,130,246,0.04);
  transform: translateY(-2px);
}
/* Bento cards */
.wb-bento {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
  position: relative;
  overflow: hidden;
}
.wb-bento::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
.wb-bento:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(59,130,246,0.15);
  transform: translateY(-2px);
}
/* Buttons */
.wb-btn-primary {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: #fff;
  font-weight: 700;
  padding: 14px 32px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  box-shadow: 0 4px 20px rgba(59,130,246,0.3);
  display: inline-flex; align-items: center; gap: 8px;
}
.wb-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(59,130,246,0.4);
}
.wb-btn-secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 12px;
  transition: all 0.3s;
  display: inline-flex; align-items: center; gap: 8px;
}
.wb-btn-secondary:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.25);
  color: #fff;
}
/* Section badge */
.wb-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.15);
  border-radius: 100px;
  font-size: 0.75rem; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: #60A5FA;
}
/* Divider */
.wb-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,0.15), rgba(129,140,248,0.1), transparent);
}
/* Login dropdown */
.wb-login-menu {
  position: absolute; top: 100%; right: 0; margin-top: 8px;
  background: rgba(12,16,28,0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 6px; min-width: 200px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.wb-login-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px;
  color: rgba(255,255,255,0.7); font-size: 0.875rem;
  transition: all 0.2s; cursor: pointer; width: 100%;
  text-align: left; background: transparent; border: none;
}
.wb-login-item:hover {
  background: rgba(255,255,255,0.06);
  color: #fff;
}
/* Chat preview */
.wb-chat-preview {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.06);
}
/* Glass override for modals */
.wb-main .glass {
  background: rgba(12,16,28,0.92);
  border-color: rgba(255,255,255,0.08);
}
/* Industry card */
.wb-industry {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; padding: 28px;
  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
  display: block; text-decoration: none;
}
.wb-industry:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(59,130,246,0.2);
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}
/* Stat number */
.wb-stat-num {
  font-size: 2.75rem; font-weight: 800;
  letter-spacing: -0.04em; line-height: 1;
}
@media (min-width: 768px) {
  .wb-stat-num { font-size: 3.25rem; }
}
/* Integration icon wrapper */
.wb-icon-wrap {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.4s;
}
/* CSS-only fade-in animations (survive HMR rebuilds) */
@keyframes wbFadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.wb-anim {
  animation: wbFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both;
}
.wb-anim-d1 { animation-delay: 0.1s; }
.wb-anim-d2 { animation-delay: 0.2s; }
.wb-anim-d3 { animation-delay: 0.3s; }
.wb-anim-d4 { animation-delay: 0.35s; }
.wb-anim-d5 { animation-delay: 0.15s; }
.wb-anim-d6 { animation-delay: 0.25s; }
.wb-anim-hero-right {
  animation: wbFadeUp 0.9s 0.2s cubic-bezier(0.22,1,0.36,1) both;
}
`;

/* ─── Fade-in Section (CSS-only, survives HMR) ─── */
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}) {
  return (
    <section id={id} className={`wb-anim ${className}`}>
      {children}
    </section>
  );
}

/* ─── Animated Counter ─── */
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

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation('home');
  const { t: ta } = useTranslation('about');
  const { t: tc } = useTranslation('common');

  const { user } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [navScrolled, setNavScrolled] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Scroll listener for nav ── */
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Open auth modal from URL param ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'login') {
      setAuthModalTab('login');
      setShowAuthModal(true);
    }
  }, []);

  /* ── Auth handlers (unchanged) ── */
  const handleAdminLogin = useCallback(async () => {
    if (!adminToken.trim()) {
      setError(t('admin.modal.error.empty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken }),
      });
      const data = await res.json();
      if (data.success) router.push('/admin');
      else setError(data.error || t('admin.modal.error.invalid'));
    } catch {
      setError(t('auth.failed'));
    } finally {
      setLoading(false);
    }
  }, [adminToken, router, t]);

  const handleClientLogin = useCallback(async () => {
    if (!clientToken.trim()) {
      setError(t('client.modal.error.empty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: clientToken }),
      });
      const data = await res.json();
      if (data.success) router.push(`/cabinet?token=${encodeURIComponent(clientToken)}`);
      else setError(data.error || t('client.modal.error.invalid'));
    } catch {
      setError(t('auth.failed'));
    } finally {
      setLoading(false);
    }
  }, [clientToken, router, t]);

  const closeModals = () => {
    setShowAdminModal(false);
    setShowClientModal(false);
    setAdminToken('');
    setClientToken('');
    setError('');
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="wb-main relative min-h-screen overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />

      {/* Background layers */}
      <div className="wb-mesh" />
      <div className="wb-grid-bg" />

      {/* ════════════════════════════════════════════
          NAVIGATION
          ════════════════════════════════════════════ */}
      <nav className={`wb-nav px-6 py-4 md:px-12 ${navScrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
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
          </button>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => scrollTo('features')} className="text-sm text-gray-400 transition hover:text-white">
              Features
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo('industries')}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Industries
            </button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-gray-400 transition hover:text-white">
              Pricing
            </button>
            <Link href="/about" className="text-sm text-gray-400 transition hover:text-white">
              {tc('nav.about')}
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Auth buttons */}
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/25"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthModalTab('signup');
                    setShowAuthModal(true);
                  }}
                  className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white sm:inline-flex"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('login');
                    setShowAuthModal(true);
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
                >
                  Log In
                </button>
              </>
            )}

            <button
              onClick={() => scrollTo('try-it')}
              className="wb-btn-primary hidden !px-5 !py-2.5 !text-sm md:inline-flex"
            >
              Try Free Demo
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════ */}
      <section id="hero" className="relative z-10 px-6 pt-20 pb-16 md:px-12 md:pt-32 md:pb-28">
        {/* Subtle glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: text */}
          <div className="wb-anim">
            <div className="wb-badge mb-6">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              AI-Powered Customer Assistant
            </div>

            <h1 className="mb-6 text-4xl leading-[1.1] font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem]">
              Turn Your Website Into a <span className="gradient-text">24/7 Sales Machine</span>
            </h1>

            <p className="mb-8 max-w-lg text-lg leading-relaxed text-gray-400">{t('hero.tagline')}</p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => scrollTo('try-it')} className="wb-btn-primary text-base">
                Get Free Demo
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button onClick={() => scrollTo('how-it-works')} className="wb-btn-secondary text-base">
                See How It Works
              </button>
            </div>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { icon: '✦', label: t('badge.ai') },
                { icon: '◉', label: t('badge.rag') },
                { icon: '⚡', label: t('badge.records') },
                { icon: '📊', label: t('badge.analytics') },
              ].map((b) => (
                <span
                  key={b.label}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400"
                >
                  <span>{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: chat widget preview */}
          <div className="wb-anim-hero-right hidden lg:block">
            <div className="wb-chat-preview mx-auto max-w-sm">
              {/* Chat header */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AI Assistant</p>
                  <p className="text-xs text-white/60">Online now</p>
                </div>
                <div className="ml-auto flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-3 bg-[#0A0F1A] p-5">
                {/* Bot message */}
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-300">
                    Hi! How can I help you today? I know everything about our services, prices, and schedule.
                  </p>
                </div>

                {/* User message */}
                <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600/20 px-4 py-3">
                  <p className="text-sm text-gray-200">What are your prices?</p>
                </div>

                {/* Bot message */}
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-300">
                    Our plans start from <span className="font-medium text-blue-400">$49/month</span>. Want me to help
                    you find the right one?
                  </p>
                </div>

                {/* Quick replies */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                    View pricing
                  </span>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                    Book a call
                  </span>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                    Learn more
                  </span>
                </div>
              </div>

              {/* Chat input */}
              <div className="border-t border-white/[0.06] bg-[#0A0F1A] px-5 py-3">
                <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
                  <span className="text-sm text-gray-500">Type a message...</span>
                  <svg className="ml-auto h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          STATS
          ════════════════════════════════════════════ */}
      <Section className="relative z-10 px-6 pb-24 md:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <div className="wb-anim wb-anim-d1 wb-card p-8 text-center">
            <div className="wb-stat-num mb-3 text-blue-400">
              +<AnimatedCounter target={30} suffix="-40" />
            </div>
            <p className="text-base font-medium text-white">{ta('metrics.records.label')}</p>
            <p className="mt-1 text-sm text-gray-500">{ta('metrics.records.sub')}</p>
          </div>

          <div className="wb-anim wb-anim-d2 wb-card p-8 text-center">
            <div className="wb-stat-num mb-3 text-indigo-400">24/7</div>
            <p className="text-base font-medium text-white">{ta('metrics.uptime.label')}</p>
            <p className="mt-1 text-sm text-gray-500">{ta('metrics.uptime.sub')}</p>
          </div>

          <div className="wb-anim wb-anim-d3 wb-card p-8 text-center">
            <div className="wb-stat-num mb-3 text-purple-400">
              &lt;
              <AnimatedCounter target={3} />s
            </div>
            <p className="text-base font-medium text-white">{ta('metrics.speed.label')}</p>
            <p className="mt-1 text-sm text-gray-500">{ta('metrics.speed.sub')}</p>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          FEATURES — Bento Grid
          ════════════════════════════════════════════ */}
      <Section id="features" className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Capabilities</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {ta('features.title.before')}
              <span className="gradient-text">{ta('features.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{ta('features.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* AI Chat — spans 2 rows on desktop */}
            <div className="wb-anim wb-anim-d1 wb-bento md:row-span-2">
              <div className="wb-icon-wrap mb-5 bg-blue-500/10">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">{ta('features.chat.title')}</h3>
              <p className="leading-relaxed text-gray-400">{ta('features.chat.desc')}</p>
              <div className="mt-6 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Responds in real-time, 24/7
                </div>
              </div>
            </div>

            {/* Lead Collection */}
            <div className="wb-anim wb-anim-d5 wb-bento">
              <div className="wb-icon-wrap mb-5 bg-indigo-500/10">
                <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{ta('features.booking.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('features.booking.desc')}</p>
            </div>

            {/* Multilingual */}
            <div className="wb-anim wb-anim-d2 wb-bento">
              <div className="wb-icon-wrap mb-5 bg-purple-500/10">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{ta('features.lang.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('features.lang.desc')}</p>
            </div>

            {/* Analytics */}
            <div className="wb-anim wb-anim-d6 wb-bento">
              <div className="wb-icon-wrap mb-5 bg-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{ta('features.analytics.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('features.analytics.desc')}</p>
            </div>

            {/* Custom Design */}
            <div className="wb-anim wb-anim-d3 wb-bento">
              <div className="wb-icon-wrap mb-5 bg-pink-500/10">
                <svg className="h-6 w-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{ta('features.design.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('features.design.desc')}</p>
            </div>

            {/* Omnichannel — full width */}
            <div className="wb-anim wb-anim-d4 wb-bento md:col-span-2">
              <div className="flex items-start gap-5">
                <div className="wb-icon-wrap flex-shrink-0 bg-cyan-500/10">
                  <svg className="h-6 w-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257m9.86-3.06l4.5 4.5"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{ta('features.channels.title')}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{ta('features.channels.desc')}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['Website', 'Telegram', 'WhatsApp', 'Instagram'].map((ch) => (
                      <span
                        key={ch}
                        className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════ */}
      <Section id="how-it-works" className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Process</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {ta('how.title.before')}
              <span className="gradient-text">{ta('how.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{ta('how.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { num: '01', color: 'blue', title: ta('how.step1.title'), desc: ta('how.step1.desc') },
              { num: '02', color: 'indigo', title: ta('how.step2.title'), desc: ta('how.step2.desc') },
              { num: '03', color: 'purple', title: ta('how.step3.title'), desc: ta('how.step3.desc') },
            ].map((step, i) => (
              <div
                key={step.num}
                className={`wb-anim wb-card relative p-8 ${i === 0 ? 'wb-anim-d1' : i === 1 ? 'wb-anim-d2' : 'wb-anim-d3'}`}
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${
                    step.color === 'blue'
                      ? 'bg-blue-500/10 text-blue-400'
                      : step.color === 'indigo'
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  {step.num}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
                <p className="leading-relaxed text-gray-400">{step.desc}</p>

                {/* Connecting arrow (hidden on mobile) */}
                {i < 2 && (
                  <div className="absolute top-1/2 -right-4 hidden -translate-y-1/2 text-gray-600 md:block">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          TRY IT — Widget Generator
          ════════════════════════════════════════════ */}
      <Section id="try-it" className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Live Demo</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {ta('try.title.before')}
              <span className="gradient-text">{ta('try.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{ta('try.desc')}</p>
          </div>
          <WidgetGenerator />
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          INTEGRATIONS
          ════════════════════════════════════════════ */}
      <Section className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Integrations</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {ta('integrations.title.before')}
              <span className="gradient-text">{ta('integrations.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">{ta('integrations.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* CRM */}
            <div className="wb-anim wb-anim-d1 wb-card group p-8">
              <div className="wb-icon-wrap mb-6 bg-blue-500/10">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257m9.86-3.06l4.5 4.5"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-white">{ta('integrations.crm.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('integrations.crm.desc')}</p>
            </div>

            {/* Calendar */}
            <div className="wb-anim wb-anim-d2 wb-card group p-8">
              <div className="wb-icon-wrap mb-6 bg-indigo-500/10">
                <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-white">{ta('integrations.calendar.title')}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{ta('integrations.calendar.desc')}</p>
            </div>

            {/* Auto-booking — accent card */}
            <div className="wb-anim wb-anim-d3 wb-card group relative overflow-hidden border-blue-500/20 p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-indigo-500/[0.03] to-transparent" />
              <div className="relative z-10">
                <div className="wb-icon-wrap mb-6 bg-gradient-to-br from-blue-500/15 to-indigo-500/10">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">{ta('integrations.booking.title')}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{ta('integrations.booking.desc')}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                  AI-powered
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          INDUSTRIES
          ════════════════════════════════════════════ */}
      <Section id="industries" className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Solutions</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Tailored for <span className="gradient-text">Your Industry</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Pre-built solutions optimized for your specific market and customer needs
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: '/consulting',
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
                    />
                  </svg>
                ),
                title: 'Consulting & Coaching',
                desc: 'Lead capture for coaches, consultants, and info-businesses',
                color: 'emerald',
              },
              {
                href: '/dubai-realestate',
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21"
                    />
                  </svg>
                ),
                title: 'Real Estate',
                desc: 'Property inquiries and virtual tour scheduling',
                color: 'amber',
              },
              {
                href: '/australia-home-services',
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                ),
                title: 'Home Services',
                desc: 'Quote requests and appointment booking for tradespeople',
                color: 'blue',
              },
              {
                href: '/texas-beauty-instagram',
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                ),
                title: 'Beauty & Instagram',
                desc: 'Social media automation and booking for salons',
                color: 'pink',
              },
            ].map((item, i) => (
              <div
                key={item.href}
                className={`wb-anim ${i === 0 ? 'wb-anim-d1' : i === 1 ? 'wb-anim-d5' : i === 2 ? 'wb-anim-d2' : 'wb-anim-d6'}`}
              >
                <Link href={item.href} className="wb-industry group">
                  <div
                    className={`wb-icon-wrap mb-5 ${
                      item.color === 'emerald'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : item.color === 'amber'
                          ? 'bg-amber-500/10 text-amber-400'
                          : item.color === 'blue'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-pink-500/10 text-pink-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mb-4 text-sm text-gray-400">{item.desc}</p>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-blue-400 transition group-hover:text-blue-300">
                    Learn more
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          SOCIAL PROOF
          ════════════════════════════════════════════ */}
      <Section className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Trusted</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Trusted by Businesses <span className="gradient-text">Worldwide</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Join hundreds of companies automating customer conversations with WinBix AI
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { value: '500+', label: 'Widgets Deployed', sub: 'Across 20+ industries', color: 'text-blue-400' },
              { value: '50K+', label: 'Conversations', sub: 'Handled by AI assistants', color: 'text-indigo-400' },
              { value: '98%', label: 'Satisfaction Rate', sub: 'From business owners', color: 'text-purple-400' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`wb-anim wb-card p-8 text-center ${i === 0 ? 'wb-anim-d1' : i === 1 ? 'wb-anim-d2' : 'wb-anim-d3'}`}
              >
                <div className={`wb-stat-num mb-3 ${stat.color}`}>{stat.value}</div>
                <p className="text-base font-medium text-white">{stat.label}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          PRICING
          ════════════════════════════════════════════ */}
      <Section id="pricing" className="relative z-10 px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-4 flex justify-center">
              <span className="wb-badge">Pricing</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Simple, Transparent <span className="gradient-text">Pricing</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">Start with a free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Basic Plan */}
            <div className="wb-anim wb-anim-d1 wb-card relative p-8">
              <div className="mb-6">
                <h3 className="mb-2 text-xl font-bold text-white">Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$29</span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Perfect for small businesses getting started with AI chat</p>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  '1 AI chat widget',
                  '1,000 conversations/mo',
                  'Knowledge base training',
                  'Lead collection',
                  'Email support',
                  'Basic analytics',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
                className="wb-btn-secondary w-full justify-center text-base"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro Plan */}
            <div className="wb-anim wb-anim-d2 wb-card relative overflow-hidden border-blue-500/20 p-8">
              {/* Popular badge */}
              <div className="absolute top-5 right-5">
                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400">
                  Most Popular
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-indigo-500/[0.03] to-transparent" />
              <div className="relative z-10">
                <div className="mb-6">
                  <h3 className="mb-2 text-xl font-bold text-white">Pro</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">$79</span>
                    <span className="text-gray-400">/mo</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    For growing businesses that need advanced AI capabilities
                  </p>
                </div>
                <ul className="mb-8 space-y-3">
                  {[
                    'Unlimited AI widgets',
                    'Unlimited conversations',
                    'Advanced analytics & reports',
                    'CRM integrations',
                    'Omnichannel (Telegram, WhatsApp, Instagram)',
                    'Priority support',
                    'Custom branding',
                    'API access',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setAuthModalTab('signup');
                    setShowAuthModal(true);
                  }}
                  className="wb-btn-primary w-full justify-center text-base"
                >
                  Start Free Trial
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Need more details?{' '}
            <Link href="/plans" className="text-blue-400 transition hover:text-blue-300">
              View full plan comparison
            </Link>
          </p>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          CTA
          ════════════════════════════════════════════ */}
      <Section className="relative z-10 px-6 pb-20 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="wb-card relative overflow-hidden p-12 text-center md:p-16">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-indigo-500/[0.04] to-purple-500/[0.03]" />

            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Ready to <span className="gradient-text">Get Started</span>?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">
                Deploy your AI-powered chat widget in minutes and start converting visitors into customers today.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={() => {
                    setAuthModalTab('signup');
                    setShowAuthModal(true);
                  }}
                  className="wb-btn-primary text-base"
                >
                  Sign Up Free
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button onClick={() => scrollTo('try-it')} className="wb-btn-secondary text-base">
                  Try Live Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.06] px-6 pt-16 pb-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                    />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">WinBix AI</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                AI assistants for your business that work around the clock.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase">Product</h4>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => scrollTo('features')}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollTo('industries')}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  Industries
                </button>
                <button
                  onClick={() => scrollTo('try-it')}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  Live Demo
                </button>
                <button
                  onClick={() => scrollTo('pricing')}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  Pricing
                </button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <Link href="/privacy" className="text-sm text-gray-500 transition hover:text-white">
                  {tc('footer.privacy')}
                </Link>
                <Link href="/terms" className="text-sm text-gray-500 transition hover:text-white">
                  {tc('footer.terms')}
                </Link>
                <Link href="/about" className="text-sm text-gray-500 transition hover:text-white">
                  {tc('nav.about')}
                </Link>
              </div>
            </div>

            {/* Access */}
            <div>
              <h4 className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase">Access</h4>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowAdminModal(true);
                    setError('');
                  }}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  {t('admin.title')}
                </button>
                <button
                  onClick={() => {
                    setShowClientModal(true);
                    setError('');
                  }}
                  className="text-left text-sm text-gray-500 transition hover:text-white"
                >
                  {t('client.title')}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="wb-divider mb-6" />
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-gray-600 md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════
          AUTH MODAL
          ════════════════════════════════════════════ */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />

      {/* ════════════════════════════════════════════
          ADMIN MODAL
          ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-transparent blur-xl" />
              <div className="glass relative rounded-2xl border-indigo-500/20 p-8">
                <button
                  onClick={closeModals}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{t('admin.modal.title')}</h2>
                  <p className="mt-2 text-sm text-gray-400">{t('admin.modal.desc')}</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <input
                    type="password"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder={t('admin.modal.placeholder')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 transition-all focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    autoFocus
                  />
                  <motion.button
                    onClick={handleAdminLogin}
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.97 }}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>{t('auth.verifying')}</span>
                      </div>
                    ) : (
                      t('admin.modal.button')
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          CLIENT MODAL
          ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent blur-xl" />
              <div className="glass relative rounded-2xl border-blue-500/20 p-8">
                <button
                  onClick={closeModals}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{t('client.modal.title')}</h2>
                  <p className="mt-2 text-sm text-gray-400">{t('client.modal.desc')}</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <input
                    type="text"
                    value={clientToken}
                    onChange={(e) => setClientToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
                    placeholder={t('client.modal.placeholder')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    autoFocus
                  />
                  <motion.button
                    onClick={handleClientLogin}
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.97 }}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>{t('auth.verifying')}</span>
                      </div>
                    ) : (
                      t('client.modal.button')
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          LANDING CHATBOT — dogfooding the product
          ════════════════════════════════════════════ */}
      <LandingChat />
    </div>
  );
}
