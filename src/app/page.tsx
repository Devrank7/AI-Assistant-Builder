'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import WidgetGenerator from '@/components/WidgetGenerator';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import Script from 'next/script';
import { Button } from '@/components/ui';
import {
  MessageSquare,
  Zap,
  BarChart3,
  Globe,
  Paintbrush,
  Link2,
  ClipboardList,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Check,
  Briefcase,
  Building2,
  Home,
  Scissors,
  Lock,
  Key,
  X,
  Bot,
  Shield,
  Clock,
  Send,
} from 'lucide-react';

/* ── Display font for headings ── */
const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

/* ── Animated number counter ── */
function Counter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const steps = 50;
          const inc = value / steps;
          let cur = 0;
          const timer = setInterval(() => {
            cur += inc;
            if (cur >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(cur));
            }
          }, 30);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── Stagger animation presets ── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ═══════════════════════════════════════════════════════════════
   THEME-AWARE CHAT WIDGET
   ═══════════════════════════════════════════════════════════════ */
function LandingChatWidget() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Remove any existing widget elements and scripts
    document.querySelectorAll('ai-chat-winbix-ai, ai-chat-winbix-ai-light').forEach((el) => el.remove());
    document.querySelectorAll('script[src*="winbix-ai"]').forEach((el) => el.remove());

    // Load the correct widget for current theme
    const script = document.createElement('script');
    script.src =
      resolvedTheme === 'dark' ? '/quickwidgets/winbix-ai/script.js' : '/quickwidgets/winbix-ai-light/script.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll('ai-chat-winbix-ai, ai-chat-winbix-ai-light').forEach((el) => el.remove());
    };
  }, [resolvedTheme]);

  return null;
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

  /* ── Auth handlers ── */
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

  const openSignup = () => {
    setAuthModalTab('signup');
    setShowAuthModal(true);
  };

  /* ═══════════════════════════════════════════════════════════
     FEATURES DATA
     ═══════════════════════════════════════════════════════════ */
  const features = [
    {
      icon: MessageSquare,
      title: 'Intelligent Conversations',
      desc: 'AI trained on your specific business data. Every answer is accurate, on-brand, and tailored to your customers.',
      span: 'md:col-span-7',
    },
    {
      icon: Zap,
      title: '30-Second Setup',
      desc: 'Paste your URL. Our AI analyzes your website, learns your business, and deploys a custom assistant instantly.',
      span: 'md:col-span-5',
    },
    {
      icon: Globe,
      title: '4 Languages',
      desc: 'English, Ukrainian, Russian, Arabic — detected automatically.',
      span: 'md:col-span-4',
    },
    {
      icon: BarChart3,
      title: 'Deep Analytics',
      desc: 'Track every conversation, conversion, and customer insight in real time.',
      span: 'md:col-span-4',
    },
    {
      icon: Link2,
      title: 'Omnichannel',
      desc: 'Web chat, Telegram, WhatsApp, Instagram — one AI, every channel.',
      span: 'md:col-span-4',
    },
  ];

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="bg-bg-primary relative min-h-screen overflow-x-hidden">
      {/* ── Landing-specific styles ── */}
      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .orb-1 { animation: float-orb 20s ease-in-out infinite; }
        .orb-2 { animation: float-orb 25s ease-in-out infinite reverse; }
        .orb-3 { animation: float-orb 18s ease-in-out infinite 5s; }
        .landing-grid {
          background-image:
            linear-gradient(var(--wb-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--wb-border) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 100%);
        }
      `}</style>

      {/* ════════════════════════════════════════════
          NAVIGATION
          ════════════════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 px-6 py-3.5 transition-all duration-300 md:px-12 ${
          navScrolled ? 'border-border bg-bg-primary/80 border-b shadow-sm backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button onClick={() => scrollTo('hero')} className="text-text-primary flex items-center gap-2.5">
            <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">WinBix AI</span>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: 'Features', id: 'features' },
              { label: 'Demo', id: 'demo' },
              { label: 'Industries', id: 'industries' },
              { label: 'Pricing', id: 'pricing' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-text-tertiary hover:text-text-primary text-[13px] transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Link href="/about" className="text-text-tertiary hover:text-text-primary text-[13px] transition-colors">
              {tc('nav.about')}
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            {user ? (
              <Button size="sm" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={openSignup}>
                  Sign Up
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAuthModalTab('login');
                    setShowAuthModal(true);
                  }}
                >
                  Log In
                </Button>
              </>
            )}
            <Button size="sm" className="hidden md:inline-flex" onClick={() => scrollTo('demo')}>
              Try Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════ */}
      <section id="hero" className="relative px-6 pt-16 pb-20 md:px-12 md:pt-28 md:pb-32">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-1 bg-accent/[0.06] absolute -top-[30%] -left-[15%] h-[70vh] w-[70vh] rounded-full blur-[120px]" />
          <div className="orb-2 absolute -right-[10%] -bottom-[20%] h-[50vh] w-[50vh] rounded-full bg-indigo-500/[0.04] blur-[100px]" />
          <div className="orb-3 bg-accent/[0.03] absolute top-[10%] right-[20%] h-[30vh] w-[30vh] rounded-full blur-[80px]" />
          <div className="landing-grid absolute inset-0 opacity-[0.4]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            {/* Left: Copy */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl lg:max-w-none">
              <motion.div variants={fadeUp}>
                <div className="border-accent/20 bg-accent/[0.06] text-accent mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
                  <span
                    className="bg-accent h-1.5 w-1.5 rounded-full"
                    style={{ animation: 'pulse-ring 2s ease-in-out infinite' }}
                  />
                  AI-Powered Sales Automation
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className={`${syne.className} text-text-primary mb-6 text-[2.5rem] leading-[1.18] font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]`}
              >
                AI that sells
                <br />
                while you{' '}
                <span className="relative">
                  <span className="text-accent relative z-10">sleep</span>
                  <span className="bg-accent/10 absolute -inset-x-2 bottom-0 z-0 h-3 rounded-sm" />
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-text-secondary mb-8 max-w-xl text-[17px] leading-relaxed">
                Paste your website URL. In 30 seconds, get a custom AI assistant that knows your business, speaks 4
                languages, and converts visitors into paying customers — around the clock.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => scrollTo('demo')}
                  className="group bg-accent relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-xl px-7 text-[15px] font-semibold text-white shadow-[0_2px_20px_rgba(59,130,246,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_4px_30px_rgba(59,130,246,0.4)] active:translate-y-0"
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative">Try It Free — 30 Seconds</span>
                  <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-12 px-6 text-[15px]"
                  onClick={() => scrollTo('how-it-works')}
                >
                  See How It Works
                </Button>
              </motion.div>

              {/* Social proof mini */}
              <motion.div variants={fadeUp} className="border-border mt-10 flex items-center gap-6 border-t pt-6">
                <div>
                  <div className="text-text-primary text-xl font-bold tracking-tight">500+</div>
                  <div className="text-text-tertiary text-xs">businesses</div>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <div className="text-text-primary text-xl font-bold tracking-tight">50K+</div>
                  <div className="text-text-tertiary text-xs">conversations/mo</div>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <div className="text-text-primary text-xl font-bold tracking-tight">98%</div>
                  <div className="text-text-tertiary text-xs">satisfaction</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Chat mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
              className="relative hidden lg:block"
            >
              {/* Glow */}
              <div className="bg-accent/[0.08] absolute -inset-8 rounded-3xl blur-3xl" />

              {/* Widget mockup */}
              <div className="border-border bg-bg-secondary/90 relative rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-sm dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                {/* Header */}
                <div className="border-border flex items-center gap-3 border-b px-6 py-4">
                  <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-text-primary text-sm font-semibold">AI Sales Assistant</div>
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      Online — responds instantly
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 px-6 py-5">
                  {/* User message */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="flex justify-end"
                  >
                    <div className="bg-accent max-w-[75%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed text-white">
                      Hi! Do you have appointments available this week?
                    </div>
                  </motion.div>

                  {/* Typing indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: 1.5, duration: 1.2, times: [0, 0.1, 0.85, 1] }}
                    className="flex items-center gap-1.5 px-2"
                  >
                    <div className="flex gap-1">
                      <span className="bg-text-tertiary h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
                      <span className="bg-text-tertiary h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
                      <span className="bg-text-tertiary h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
                    </div>
                  </motion.div>

                  {/* AI response */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.7, duration: 0.4 }}
                    className="flex justify-start"
                  >
                    <div className="bg-bg-tertiary text-text-primary max-w-[80%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed">
                      Absolutely! We have openings on <strong>Wednesday at 2:00 PM</strong> and{' '}
                      <strong>Thursday at 10:00 AM</strong>. Shall I book one for you? I can also send a confirmation to
                      your email.
                    </div>
                  </motion.div>

                  {/* Quick action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.3, duration: 0.3 }}
                    className="flex gap-2 pl-1"
                  >
                    <span className="border-accent/30 bg-accent/[0.06] text-accent rounded-full border px-3 py-1 text-xs font-medium">
                      Book Wednesday
                    </span>
                    <span className="border-accent/30 bg-accent/[0.06] text-accent rounded-full border px-3 py-1 text-xs font-medium">
                      Book Thursday
                    </span>
                  </motion.div>
                </div>

                {/* Input bar */}
                <div className="border-border border-t px-5 py-3">
                  <div className="bg-bg-tertiary flex items-center gap-2 rounded-xl px-4 py-2.5">
                    <span className="text-text-tertiary flex-1 text-sm">Type your message...</span>
                    <Send className="text-text-tertiary h-4 w-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PAIN POINTS — The Problem
          ════════════════════════════════════════════ */}
      <section className="border-border relative border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              The Problem
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mx-auto mb-6 max-w-3xl text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Right now, your website is <span className="text-red-500 dark:text-red-400">losing you money</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto mb-16 max-w-2xl text-lg">
              Every unanswered question is a lost customer. Every delayed response is revenue walking out the door.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-5 sm:grid-cols-3"
          >
            {[
              {
                num: '53%',
                text: 'of customers leave if they don\u2019t get an instant response',
                color: 'text-red-500 dark:text-red-400',
              },
              {
                num: '$4,200',
                text: 'average monthly cost for 24/7 human support staff',
                color: 'text-orange-500 dark:text-orange-400',
              },
              {
                num: '3%',
                text: 'conversion rate on traditional contact forms',
                color: 'text-amber-500 dark:text-amber-400',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border-border bg-bg-secondary rounded-xl border p-8 text-center"
              >
                <div className={`mb-2 text-4xl font-extrabold tracking-tight ${stat.color}`}>{stat.num}</div>
                <p className="text-text-secondary text-sm leading-relaxed">{stat.text}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Transition to solution */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="via-accent mx-auto mb-4 h-12 w-px bg-gradient-to-b from-transparent to-transparent" />
            <p className={`${syne.className} text-text-primary text-xl font-bold`}>There&apos;s a better way.</p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          30 SECONDS DEMO — Apple-Level Showcase
          ════════════════════════════════════════════ */}
      <section id="demo" className="relative overflow-hidden bg-gray-50 dark:bg-[#080810]">
        {/* ── Atmospheric background layers (dark only) ── */}
        <div className="pointer-events-none absolute inset-0 hidden dark:block">
          <div className="absolute top-1/4 left-1/3 h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-600/[0.07] blur-[180px]" />
          <div className="absolute right-1/4 bottom-1/3 h-[500px] w-[600px] translate-x-1/4 rounded-full bg-indigo-600/[0.05] blur-[160px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
        {/* ── Light mode accents ── */}
        <div className="pointer-events-none absolute inset-0 dark:hidden">
          <div className="absolute top-1/4 left-1/3 h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-400/[0.08] blur-[180px]" />
          <div className="absolute right-1/4 bottom-1/3 h-[500px] w-[600px] translate-x-1/4 rounded-full bg-indigo-400/[0.06] blur-[160px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pt-10 pb-16 md:px-12 md:pt-14 md:pb-24">
          {/* ── Section header with dramatic "30" watermark ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-10 text-center"
          >
            {/* Giant "30" watermark */}
            <motion.div variants={fadeUp} className="pointer-events-none mb-[-3.5rem] select-none md:mb-[-5rem]">
              <div
                className={`${syne.className} text-[10rem] leading-none font-extrabold tracking-tighter text-gray-900/[0.04] md:text-[16rem] dark:text-white/[0.04]`}
              >
                30
              </div>
            </motion.div>

            {/* "Seconds" badge — sits just below the watermark */}
            <motion.div variants={fadeUp} className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-4 py-1.5 text-xs font-semibold tracking-widest text-blue-600 uppercase backdrop-blur-sm dark:text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                Seconds
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} mb-5 text-4xl leading-[1.15] font-bold tracking-tight text-gray-900 md:text-[3.5rem] dark:text-white`}
            >
              One URL.{' '}
              <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">
                Your AI is live.
              </span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-gray-500 dark:text-white/40"
            >
              Paste your website link. Our AI scans every page, learns your business, and deploys a custom assistant —
              automatically.
            </motion.p>

            {/* Process steps */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 md:gap-6">
              {[
                { num: '01', label: 'Paste URL' },
                { num: '02', label: 'Pick style' },
                { num: '03', label: 'Go live' },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center gap-3 md:gap-5">
                  {i > 0 && (
                    <div className="hidden h-px w-10 bg-gradient-to-r from-gray-300 to-transparent md:block dark:from-white/[0.08]" />
                  )}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200/60 text-[10px] font-bold text-gray-400 tabular-nums ring-1 ring-gray-200 dark:bg-white/[0.04] dark:text-white/25 dark:ring-white/[0.06]">
                      {step.num}
                    </span>
                    <span className="text-[13px] font-medium text-gray-400 dark:text-white/30">{step.label}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Widget Generator — glass card with ambient glow ── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as const }}
          >
            <div className="relative mx-auto max-w-xl">
              {/* Ambient glow layers */}
              <div className="absolute -inset-6 rounded-[28px] bg-blue-500/[0.07] blur-[60px]" />
              <div className="absolute -inset-4 rounded-3xl bg-indigo-500/[0.04] blur-[40px]" />
              {/* Glass card shell */}
              <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0c0c1a]/85 dark:shadow-black/50">
                <WidgetGenerator />
              </div>
            </div>
          </motion.div>

          {/* ── Trust indicators ── */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:mt-12"
          >
            {[
              { icon: <Shield className="h-3.5 w-3.5" />, text: 'No credit card required' },
              { icon: <Sparkles className="h-3.5 w-3.5" />, text: 'No coding needed' },
              { icon: <Clock className="h-3.5 w-3.5" />, text: 'Ready in 30 seconds' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-white/20"
              >
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES — Bento Grid
          ════════════════════════════════════════════ */}
      <section id="features" className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-14 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Capabilities
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Everything you need to <span className="text-accent">convert more</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              A complete AI sales platform, not just a chatbot.
            </motion.p>
          </motion.div>

          {/* Bento grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className={`group border-border bg-bg-secondary hover:border-accent/25 rounded-xl border p-7 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)] ${f.span}`}
                >
                  <div className="bg-accent/[0.08] group-hover:bg-accent/[0.14] mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-2 text-base font-semibold">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Extra feature row */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {[
              {
                icon: Paintbrush,
                title: 'Custom Branding',
                desc: 'Your colors, your logo, your style. The widget looks like it was built by your team.',
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                desc: 'End-to-end encryption. GDPR compliant. Your customer data stays yours.',
              },
              {
                icon: ClipboardList,
                title: 'Lead Collection',
                desc: 'Automatically capture contact info, qualify leads, and sync to your CRM.',
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="group border-border bg-bg-secondary hover:border-accent/25 rounded-xl border p-7 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)]"
                >
                  <div className="bg-accent/[0.08] group-hover:bg-accent/[0.14] mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-2 text-base font-semibold">{f.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Process
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Three steps. <span className="text-accent">Zero friction.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="relative grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            {/* Connecting line (desktop only) */}
            <div className="from-accent/30 via-accent/20 to-accent/30 pointer-events-none absolute top-16 right-[16.7%] left-[16.7%] hidden h-px bg-gradient-to-r md:block" />

            {[
              {
                num: '01',
                title: 'Paste Your URL',
                desc: 'Enter your website address. That\u2019s it. Our AI reads every page, learns your services, pricing, and FAQ.',
              },
              {
                num: '02',
                title: 'AI Builds Your Assistant',
                desc: 'In 30 seconds, we create a custom AI trained on your business. It knows your products, speaks your tone, handles edge cases.',
              },
              {
                num: '03',
                title: 'Embed & Convert',
                desc: 'Copy one line of code to your website. Your AI assistant starts converting visitors into leads and bookings immediately.',
              },
            ].map((step) => (
              <motion.div key={step.num} variants={fadeUp} className="relative text-center md:text-left">
                <div className="border-accent/20 bg-accent/[0.08] mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border md:mx-0">
                  <span className={`${syne.className} text-accent text-lg font-bold`}>{step.num}</span>
                </div>
                <h3 className="text-text-primary mb-3 text-lg font-semibold">{step.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          UNLIMITED INTEGRATIONS — The Power Section
          ════════════════════════════════════════════ */}
      <section className="border-border relative overflow-hidden border-t px-6 py-20 md:px-12 md:py-28">
        {/* Subtle background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-accent/[0.03] absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-0 h-[300px] w-[300px] rounded-full bg-indigo-500/[0.03] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Unlimited Power
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-5 text-3xl leading-snug font-bold tracking-tight md:text-4xl lg:text-[2.75rem]`}
            >
              Connects to <span className="text-accent">any API</span>. Automates{' '}
              <span className="text-accent">any workflow</span>.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-3xl text-lg">
              WinBix AI agents aren&apos;t just chatbots — they&apos;re autonomous workers that connect to your CRM,
              payment system, calendar, and any other API. Build complex automations without writing a single line of
              code.
            </motion.p>
          </motion.div>

          {/* Hero integration card — the big visual */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="border-accent/20 bg-bg-secondary mb-6 rounded-2xl border p-8 md:p-10"
          >
            <div className="grid items-center gap-10 md:grid-cols-2">
              {/* Left: Text */}
              <div>
                <div className="border-accent/20 bg-accent/[0.06] text-accent mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  No-Code AI Agents
                </div>
                <h3 className={`${syne.className} text-text-primary mb-4 text-2xl leading-snug font-bold md:text-3xl`}>
                  Your AI assistant does the work — not just the talking
                </h3>
                <p className="text-text-secondary mb-6 text-[15px] leading-relaxed">
                  Unlike simple chatbots that only answer questions, WinBix AI agents take{' '}
                  <strong className="text-text-primary">real actions</strong>. They check your calendar and book
                  appointments. They look up orders in your CRM. They process payments. They send confirmations via
                  email or SMS. All automatically, all in real-time, all without code.
                </p>
                <ul className="space-y-3">
                  {[
                    'Connect to any REST API — CRM, ERP, payment gateway, custom backend',
                    'Multi-step workflows: AI chains actions together intelligently',
                    'Zero programming required — configure everything through the dashboard',
                    'Works across all channels: web chat, Telegram, WhatsApp, Instagram',
                  ].map((item) => (
                    <li key={item} className="text-text-secondary flex items-start gap-3 text-sm">
                      <Check className="text-accent mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Visual — API connection diagram */}
              <div className="relative">
                <div className="bg-accent/[0.04] absolute -inset-4 rounded-2xl blur-2xl" />
                <div className="relative space-y-3">
                  {/* Central AI hub */}
                  <div className="border-accent/30 bg-accent/10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                    <Bot className="text-accent h-8 w-8" />
                  </div>
                  <div className="from-accent/40 to-accent/10 mx-auto h-6 w-px bg-gradient-to-b" />

                  {/* Connected services grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'CRM', sub: 'HubSpot, Salesforce, Pipedrive', icon: ClipboardList },
                      { label: 'Payments', sub: 'Stripe, PayPal, LiqPay', icon: Shield },
                      { label: 'Calendar', sub: 'Google, Calendly, Cal.com', icon: CalendarDays },
                      { label: 'Messaging', sub: 'Email, SMS, Slack', icon: Send },
                      { label: 'Google Sheets', sub: 'Lead tracking, reports', icon: BarChart3 },
                      { label: 'Custom API', sub: 'Any REST endpoint', icon: Link2 },
                    ].map((svc) => {
                      const SvcIcon = svc.icon;
                      return (
                        <div
                          key={svc.label}
                          className="border-border bg-bg-primary hover:border-accent/20 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="mb-2 flex items-center gap-2.5">
                            <div className="bg-accent/[0.08] flex h-8 w-8 items-center justify-center rounded-lg">
                              <SvcIcon className="text-accent h-4 w-4" />
                            </div>
                            <span className="text-text-primary text-sm font-semibold">{svc.label}</span>
                          </div>
                          <p className="text-text-tertiary text-xs">{svc.sub}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Use cases — What your AI agent can actually do */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="mt-6"
          >
            <motion.h3
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-8 text-center text-xl leading-snug font-bold md:text-2xl`}
            >
              What your AI agent can do — <span className="text-accent">right now</span>
            </motion.h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  emoji: '',
                  icon: CalendarDays,
                  title: 'Book appointments automatically',
                  desc: 'Customer asks for availability → AI checks your calendar in real-time → books the slot → sends confirmation email. Done.',
                  tag: 'Calendar API',
                },
                {
                  emoji: '',
                  icon: ClipboardList,
                  title: 'Qualify & route leads to CRM',
                  desc: 'AI asks qualifying questions, scores the lead, creates a contact in HubSpot or Google Sheets, and notifies your sales team on Slack.',
                  tag: 'CRM + Slack',
                },
                {
                  emoji: '',
                  icon: Shield,
                  title: 'Process payments in chat',
                  desc: 'Customer picks a service → AI generates a payment link → payment is confirmed → receipt is sent automatically. No page redirects.',
                  tag: 'Payment API',
                },
                {
                  emoji: '',
                  icon: Globe,
                  title: 'Check order status',
                  desc: 'Customer provides order number → AI queries your database or shipping API → returns real-time tracking info. Handles 90% of support tickets.',
                  tag: 'Custom API',
                },
                {
                  emoji: '',
                  icon: Send,
                  title: 'Send documents & files',
                  desc: 'Contracts, price lists, brochures — AI identifies what the customer needs and sends the right document from your library automatically.',
                  tag: 'File Storage',
                },
                {
                  emoji: '',
                  icon: Sparkles,
                  title: 'Custom multi-step workflows',
                  desc: 'Chain any combination of actions: verify identity → check eligibility → create application → schedule callback → send confirmation.',
                  tag: 'Any API',
                },
              ].map((uc) => {
                const UcIcon = uc.icon;
                return (
                  <motion.div
                    key={uc.title}
                    variants={fadeUp}
                    className="group border-border bg-bg-secondary hover:border-accent/25 rounded-xl border p-6 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="bg-accent/[0.08] group-hover:bg-accent/[0.14] flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                        <UcIcon className="text-accent h-5 w-5" />
                      </div>
                      <span className="border-border bg-bg-tertiary text-text-tertiary rounded-full border px-2.5 py-0.5 text-[10px] font-medium">
                        {uc.tag}
                      </span>
                    </div>
                    <h4 className="text-text-primary mb-2 text-sm font-semibold">{uc.title}</h4>
                    <p className="text-text-secondary text-xs leading-relaxed">{uc.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Bottom emphasis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="border-accent/20 bg-accent/[0.04] mt-12 rounded-xl border p-8 text-center"
          >
            <p className={`${syne.className} text-text-primary mb-3 text-lg font-bold md:text-xl`}>
              If it has an API, your AI agent can use it.
            </p>
            <p className="text-text-secondary mx-auto max-w-2xl text-sm">
              No developers needed. No code. No technical knowledge. You describe what you want in plain language, our
              AI builder creates the integration. From simple lead forms to complex multi-step enterprise workflows — it
              all works out of the box.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          INDUSTRIES
          ════════════════════════════════════════════ */}
      <section id="industries" className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-14 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Solutions
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Built for <span className="text-accent">your industry</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              Pre-configured AI assistants optimized for your specific market.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                href: '/consulting',
                icon: Briefcase,
                title: 'Consulting',
                desc: 'Lead capture and qualification for coaches and consultants',
              },
              {
                href: '/dubai-realestate',
                icon: Building2,
                title: 'Real Estate',
                desc: 'Property inquiries and virtual tour scheduling',
              },
              {
                href: '/australia-home-services',
                icon: Home,
                title: 'Home Services',
                desc: 'Quote requests and appointment booking',
              },
              {
                href: '/texas-beauty-instagram',
                icon: Scissors,
                title: 'Beauty & Salons',
                desc: 'Social media automation and online booking',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.href} variants={fadeUp}>
                  <Link
                    href={item.href}
                    className="group border-border bg-bg-secondary hover:border-accent/25 block rounded-xl border p-6 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)]"
                  >
                    <div className="bg-accent/[0.08] group-hover:bg-accent/[0.14] mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                      <Icon className="text-accent h-5 w-5" />
                    </div>
                    <h3 className="text-text-primary mb-1.5 text-sm font-semibold">{item.title}</h3>
                    <p className="text-text-secondary mb-4 text-xs leading-relaxed">{item.desc}</p>
                    <span className="text-accent flex items-center gap-1.5 text-xs font-medium">
                      Explore
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SOCIAL PROOF — Large Counters
          ════════════════════════════════════════════ */}
      <section className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: 500, suffix: '+', label: 'Widgets Deployed', sub: 'Across 20+ industries' },
              { value: 50, suffix: 'K+', label: 'Conversations', sub: 'Handled monthly' },
              { value: 98, suffix: '%', label: 'Satisfaction', sub: 'From business owners' },
              { value: 30, prefix: '<', suffix: 's', label: 'Setup Time', sub: 'URL to live assistant' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div
                  className={`${syne.className} text-text-primary mb-1 text-4xl font-extrabold tracking-tight md:text-5xl`}
                >
                  <Counter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                </div>
                <p className="text-text-primary text-sm font-medium">{stat.label}</p>
                <p className="text-text-tertiary mt-0.5 text-xs">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PRICING
          ════════════════════════════════════════════ */}
      <section id="pricing" className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-14 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Pricing
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Start free. <span className="text-accent">Scale when ready.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              No credit card required. Cancel anytime. Upgrade or downgrade in one click.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            {/* Basic */}
            <motion.div variants={fadeUp} className="border-border bg-bg-secondary rounded-xl border p-8">
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold tracking-tight">$29</span>
                  <span className="text-text-tertiary">/mo</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
                  Everything a small business needs to start converting visitors.
                </p>
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
                  <li key={f} className="text-text-secondary flex items-center gap-3 text-sm">
                    <Check className="text-accent h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full justify-center" onClick={openSignup}>
                Start Free Trial
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              variants={fadeUp}
              className="border-accent/30 bg-bg-secondary relative rounded-xl border p-8 shadow-[0_0_40px_rgba(59,130,246,0.06)]"
            >
              <div className="absolute top-5 right-5">
                <span className="border-accent/20 bg-accent/[0.08] text-accent rounded-full border px-3 py-1 text-xs font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold tracking-tight">$79</span>
                  <span className="text-text-tertiary">/mo</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
                  For businesses ready to scale with advanced AI and omnichannel.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  'Unlimited AI widgets',
                  'Unlimited conversations',
                  'Advanced analytics & A/B tests',
                  'CRM & Google Sheets sync',
                  'Telegram, WhatsApp, Instagram',
                  'Priority support',
                  'Custom branding',
                  'API access',
                ].map((f) => (
                  <li key={f} className="text-text-secondary flex items-center gap-3 text-sm">
                    <Check className="text-accent h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openSignup}
                className="group bg-accent relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_16px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_4px_24px_rgba(59,130,246,0.35)]"
              >
                <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative">Start Free Trial</span>
                <ArrowRight className="relative h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-text-tertiary mt-6 text-center text-sm"
          >
            Need enterprise volume?{' '}
            <Link href="/plans" className="text-accent transition-colors hover:underline">
              View full plan comparison
            </Link>
          </motion.p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA
          ════════════════════════════════════════════ */}
      <section className="border-border relative overflow-hidden border-t px-6 py-24 md:px-12 md:py-32">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-accent/[0.06] absolute top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="relative mx-auto max-w-3xl text-center"
        >
          <motion.h2
            variants={fadeUp}
            className={`${syne.className} text-text-primary mb-5 text-3xl leading-snug font-bold tracking-tight md:text-4xl lg:text-5xl`}
          >
            Your competitors already use AI.
            <br />
            <span className="text-accent">Do you?</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-text-secondary mx-auto mb-10 max-w-xl text-lg">
            Every day without an AI assistant is another day of lost leads, unanswered questions, and revenue going to
            your competitors.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={openSignup}
              className="group bg-accent relative inline-flex h-13 items-center gap-2.5 overflow-hidden rounded-xl px-8 text-base font-semibold text-white shadow-[0_2px_24px_rgba(59,130,246,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_36px_rgba(59,130,246,0.4)] active:translate-y-0"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Get Started Free</span>
              <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <Button variant="ghost" size="lg" className="h-12 px-8 text-base" onClick={() => scrollTo('demo')}>
              Try Live Demo
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="text-text-tertiary mt-6 text-xs">
            Free trial — no credit card required — cancel anytime
          </motion.p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════ */}
      <footer className="border-border border-t px-6 pt-16 pb-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="text-text-primary text-base font-bold">WinBix AI</span>
              </div>
              <p className="text-text-tertiary text-sm leading-relaxed">
                AI assistants that sell, support, and schedule — while you focus on what matters.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">Product</h4>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Features', id: 'features' },
                  { label: 'Live Demo', id: 'demo' },
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Industries', id: 'industries' },
                  { label: 'Pricing', id: 'pricing' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="text-text-tertiary hover:text-text-primary text-left text-sm transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <Link href="/privacy" className="text-text-tertiary hover:text-text-primary text-sm transition-colors">
                  {tc('footer.privacy')}
                </Link>
                <Link href="/terms" className="text-text-tertiary hover:text-text-primary text-sm transition-colors">
                  {tc('footer.terms')}
                </Link>
                <Link href="/about" className="text-text-tertiary hover:text-text-primary text-sm transition-colors">
                  {tc('nav.about')}
                </Link>
              </div>
            </div>

            {/* Access */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">Access</h4>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowAdminModal(true);
                    setError('');
                  }}
                  className="text-text-tertiary hover:text-text-primary text-left text-sm transition-colors"
                >
                  {t('admin.title')}
                </button>
                <button
                  onClick={() => {
                    setShowClientModal(true);
                    setError('');
                  }}
                  className="text-text-tertiary hover:text-text-primary text-left text-sm transition-colors"
                >
                  {t('client.title')}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-border border-t pt-6">
            <div className="text-text-tertiary flex flex-col items-center justify-between gap-3 text-xs md:flex-row">
              <p>
                &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
              </p>
              <LanguageSwitcher />
            </div>
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
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 5 }}
              transition={{ duration: 0.15 }}
              className="border-border bg-bg-primary relative w-full max-w-md rounded-xl border p-8 shadow-lg"
            >
              <button
                onClick={closeModals}
                className="text-text-tertiary hover:bg-bg-secondary hover:text-text-primary absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8 text-center">
                <div className="bg-accent/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Lock className="text-accent h-6 w-6" />
                </div>
                <h2 className="text-text-primary text-xl font-bold">{t('admin.modal.title')}</h2>
                <p className="text-text-secondary mt-2 text-sm">{t('admin.modal.desc')}</p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder={t('admin.modal.placeholder')}
                  className="border-border bg-bg-secondary text-text-primary placeholder-text-tertiary focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                  autoFocus
                />
                <Button className="w-full justify-center" onClick={handleAdminLogin} disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.verifying')}</span>
                    </div>
                  ) : (
                    t('admin.modal.button')
                  )}
                </Button>
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
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 5 }}
              transition={{ duration: 0.15 }}
              className="border-border bg-bg-primary relative w-full max-w-md rounded-xl border p-8 shadow-lg"
            >
              <button
                onClick={closeModals}
                className="text-text-tertiary hover:bg-bg-secondary hover:text-text-primary absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8 text-center">
                <div className="bg-accent/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Key className="text-accent h-6 w-6" />
                </div>
                <h2 className="text-text-primary text-xl font-bold">{t('client.modal.title')}</h2>
                <p className="text-text-secondary mt-2 text-sm">{t('client.modal.desc')}</p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
                  placeholder={t('client.modal.placeholder')}
                  className="border-border bg-bg-secondary text-text-primary placeholder-text-tertiary focus:border-accent w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none"
                  autoFocus
                />
                <Button className="w-full justify-center" onClick={handleClientLogin} disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{t('auth.verifying')}</span>
                    </div>
                  ) : (
                    t('client.modal.button')
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          LANDING CHATBOT — dogfooding (theme-aware)
          ════════════════════════════════════════════ */}
      <LandingChatWidget />
    </div>
  );
}
