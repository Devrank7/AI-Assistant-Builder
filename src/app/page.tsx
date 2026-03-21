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
  Brain,
  Mic,
  Users,
  TrendingUp,
  Layers,
  Workflow,
  ChevronRight,
  Star,
  Minus,
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
    document.querySelectorAll('ai-chat-winbix-ai, ai-chat-winbix-ai-light').forEach((el) => el.remove());
    document.querySelectorAll('script[src*="winbix-ai"]').forEach((el) => el.remove());

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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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
              { label: 'Enterprise', id: 'enterprise' },
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    setAuthModalTab('login');
                    setShowAuthModal(true);
                  }}
                >
                  Log In
                </Button>
                <button
                  onClick={() => scrollTo('demo')}
                  className="bg-accent inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(59,130,246,0.35)]"
                >
                  Build Your AI — Free
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HERO — Apple-level emotional impact
          ════════════════════════════════════════════ */}
      <section id="hero" className="relative px-6 pt-10 pb-24 md:px-12 md:pt-16 md:pb-36">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb-1 bg-accent/[0.07] absolute -top-[30%] -left-[15%] h-[70vh] w-[70vh] rounded-full blur-[120px]" />
          <div className="orb-2 absolute -right-[10%] -bottom-[20%] h-[50vh] w-[50vh] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
          <div className="orb-3 bg-accent/[0.04] absolute top-[10%] right-[20%] h-[30vh] w-[30vh] rounded-full blur-[80px]" />
          <div className="landing-grid absolute inset-0 opacity-[0.4]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Badge — full width */}
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <div className="border-accent/20 bg-accent/[0.06] text-accent mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
                <span
                  className="bg-accent h-1.5 w-1.5 rounded-full"
                  style={{ animation: 'pulse-ring 2s ease-in-out infinite' }}
                />
                The AI Sales Platform for 2026
              </div>
            </motion.div>
          </motion.div>

          {/* Two-column: headline+copy left, chat mockup right (aligned to top) */}
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_380px] lg:gap-14 xl:grid-cols-[1fr_420px]">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.h1
                variants={fadeUp}
                className={`${syne.className} text-text-primary mb-7 text-[2.75rem] leading-[1.08] font-extrabold tracking-[-0.035em] sm:text-5xl md:text-[3.5rem] lg:text-[3.75rem]`}
              >
                Your website never sleeps{' '}
                <span className="relative">
                  <span className="text-accent relative z-10">again.</span>
                  <span className="bg-accent/10 absolute -inset-x-2 bottom-0 z-0 h-3 rounded-sm" />
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-text-secondary mb-5 max-w-xl text-[18px] leading-relaxed">
                Paste your URL. In 30 seconds, get an AI employee that knows every page of your business, speaks your
                customers&apos; language, and closes deals at 3 AM.
              </motion.p>

              <motion.p variants={fadeUp} className="text-text-tertiary mb-8 max-w-xl text-[15px]">
                No code. No training. No monthly hiring costs. Just revenue.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => scrollTo('demo')}
                  className="group bg-accent relative inline-flex h-13 items-center gap-2.5 overflow-hidden rounded-xl px-8 text-base font-semibold text-white shadow-[0_2px_24px_rgba(59,130,246,0.3)] transition-all hover:-translate-y-px hover:shadow-[0_6px_36px_rgba(59,130,246,0.4)] active:translate-y-0"
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative">Build Your AI — Free</span>
                  <ArrowRight className="relative h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
                </button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-13 px-6 text-base"
                  onClick={() => scrollTo('how-it-works')}
                >
                  See It Work
                </Button>
              </motion.div>

              {/* Social proof mini — real metrics feel */}
              <motion.div variants={fadeUp} className="border-border mt-12 flex items-center gap-6 border-t pt-7">
                <div>
                  <div className="text-text-primary text-2xl font-bold tracking-tight">500+</div>
                  <div className="text-text-tertiary text-xs">businesses automated</div>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <div className="text-text-primary text-2xl font-bold tracking-tight">24/7</div>
                  <div className="text-text-tertiary text-xs">always-on selling</div>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <div className="text-text-primary text-2xl font-bold tracking-tight">4x</div>
                  <div className="text-text-tertiary text-xs">more leads captured</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Live chat mockup — aligned to headline top */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
              className="relative hidden lg:block"
            >
              <div className="bg-accent/[0.08] absolute -inset-8 rounded-3xl blur-3xl" />

              <div className="border-border bg-bg-secondary/90 relative rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.1)] backdrop-blur-sm dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                {/* Header */}
                <div className="border-border flex items-center gap-3 border-b px-6 py-4">
                  <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-text-primary text-sm font-semibold">AI Sales Agent</div>
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      Trained on your business — responds instantly
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 px-6 py-5">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    className="flex justify-end"
                  >
                    <div className="bg-accent max-w-[75%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed text-white">
                      What&apos;s the price for a full website redesign?
                    </div>
                  </motion.div>

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

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.7, duration: 0.4 }}
                    className="flex justify-start"
                  >
                    <div className="bg-bg-tertiary text-text-primary max-w-[80%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed">
                      Our website redesign packages start at <strong>$2,500</strong> for small businesses and{' '}
                      <strong>$5,000+</strong> for enterprise. I can schedule a free 15-min discovery call — would{' '}
                      <strong>tomorrow at 2 PM</strong> work?
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.3, duration: 0.3 }}
                    className="flex gap-2 pl-1"
                  >
                    <span className="border-accent/30 bg-accent/[0.06] text-accent rounded-full border px-3 py-1.5 text-xs font-medium">
                      Book the call
                    </span>
                    <span className="border-accent/30 bg-accent/[0.06] text-accent rounded-full border px-3 py-1.5 text-xs font-medium">
                      See portfolio first
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

              {/* Floating notification — social proof on mockup */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 4, duration: 0.5 }}
                className="border-border bg-bg-primary absolute -right-2 -bottom-14 rounded-xl border px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <div className="text-text-primary text-xs font-semibold">Lead captured</div>
                    <div className="text-text-tertiary text-[10px]">Discovery call booked for tomorrow</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          THE COST OF DOING NOTHING
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
              The Reality
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mx-auto mb-6 max-w-3xl text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Every minute without AI is money <span className="text-red-500 dark:text-red-400">walking away</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto mb-16 max-w-2xl text-lg">
              Your website gets visitors at 11 PM, on weekends, on holidays. Nobody&apos;s there to answer. Your
              competitor&apos;s AI is.
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
                num: '67%',
                text: 'of leads arrive outside business hours. Without AI, they bounce to a competitor.',
                color: 'text-red-500 dark:text-red-400',
              },
              {
                num: '$4,200/mo',
                text: 'is what 24/7 human support costs. WinBix AI does the same work for $79/mo.',
                color: 'text-orange-500 dark:text-orange-400',
              },
              {
                num: '4x',
                text: 'more leads captured by businesses using AI chat vs. static contact forms.',
                color: 'text-green-500 dark:text-green-400',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="border-border bg-bg-secondary rounded-xl border p-8 text-center"
              >
                <div className={`mb-3 text-4xl font-extrabold tracking-tight ${stat.color}`}>{stat.num}</div>
                <p className="text-text-secondary text-sm leading-relaxed">{stat.text}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 text-center"
          >
            <div className="via-accent mx-auto mb-4 h-12 w-px bg-gradient-to-b from-transparent to-transparent" />
            <p className={`${syne.className} text-text-primary text-xl font-bold`}>
              What if your website could sell itself?
            </p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          30 SECONDS DEMO — The Crown Jewel
          ════════════════════════════════════════════ */}
      <section id="demo" className="relative overflow-hidden bg-gray-50 dark:bg-[#080810]">
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
        <div className="pointer-events-none absolute inset-0 dark:hidden">
          <div className="absolute top-1/4 left-1/3 h-[600px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-400/[0.08] blur-[180px]" />
          <div className="absolute right-1/4 bottom-1/3 h-[500px] w-[600px] translate-x-1/4 rounded-full bg-indigo-400/[0.06] blur-[160px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pt-10 pb-16 md:px-12 md:pt-14 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-10 text-center"
          >
            <motion.div variants={fadeUp} className="pointer-events-none mb-[-3.5rem] select-none md:mb-[-5rem]">
              <div
                className={`${syne.className} text-[10rem] leading-none font-extrabold tracking-tighter text-gray-900/[0.04] md:text-[16rem] dark:text-white/[0.04]`}
              >
                30
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-4 py-1.5 text-xs font-semibold tracking-widest text-blue-600 uppercase backdrop-blur-sm dark:text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                Seconds to Live
              </span>
            </motion.div>

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
              className="mx-auto mb-4 max-w-lg text-lg leading-relaxed text-gray-500 dark:text-white/40"
            >
              No training data. No prompt engineering. No technical skills.
            </motion.p>
            <motion.p variants={fadeUp} className="mx-auto mb-10 max-w-lg text-base text-gray-400 dark:text-white/25">
              Our AI reads your entire website, understands your business, and deploys a custom sales assistant —
              automatically. Try it right now.
            </motion.p>

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

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as const }}
          >
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -inset-6 rounded-[28px] bg-blue-500/[0.07] blur-[60px]" />
              <div className="absolute -inset-4 rounded-3xl bg-indigo-500/[0.04] blur-[40px]" />
              <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0c0c1a]/85 dark:shadow-black/50">
                <WidgetGenerator />
              </div>
            </div>
          </motion.div>

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
              { icon: <Clock className="h-3.5 w-3.5" />, text: 'Keep it forever on Free plan' },
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
          NOT JUST A CHATBOT — The Difference
          ════════════════════════════════════════════ */}
      <section className="border-border relative overflow-hidden border-t px-6 py-20 md:px-12 md:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-accent/[0.03] absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Beyond Chatbots
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-5 text-3xl leading-snug font-bold tracking-tight md:text-4xl lg:text-[2.75rem]`}
            >
              Other tools <span className="text-text-tertiary">chat</span>.
              <br />
              WinBix AI <span className="text-accent">works</span>.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-2xl text-lg">
              Most AI chatbots answer questions. WinBix AI books appointments, qualifies leads, processes payments, and
              syncs with your CRM — autonomously.
            </motion.p>
          </motion.div>

          {/* Comparison: Old way vs WinBix */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            {/* Old Way */}
            <motion.div variants={fadeUp} className="border-border bg-bg-secondary rounded-xl border p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.06] px-3 py-1 text-xs font-semibold text-red-500 dark:text-red-400">
                Traditional Chatbots
              </div>
              <ul className="space-y-4">
                {[
                  'Pre-written scripts that feel robotic',
                  "Can only answer — can't take action",
                  'Weeks of training and setup',
                  'One channel only (usually web)',
                  'Generic responses, no business context',
                  'Breaks when customers go off-script',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <span className="text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* WinBix Way */}
            <motion.div
              variants={fadeUp}
              className="border-accent/30 bg-bg-secondary rounded-xl border p-8 shadow-[0_0_40px_rgba(59,130,246,0.04)]"
            >
              <div className="border-accent/20 bg-accent/[0.06] text-accent mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3 w-3" />
                WinBix AI Agents
              </div>
              <ul className="space-y-4">
                {[
                  'Understands context, handles complex questions',
                  'Books, pays, notifies — real business actions',
                  '30-second setup from your URL',
                  'Web, Telegram, WhatsApp, Instagram — unified',
                  'Trained on YOUR data, sounds like YOUR brand',
                  'Adapts to any conversation, learns over time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="text-accent mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-text-primary">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* What your AI can actually DO */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.h3
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-8 text-center text-xl leading-snug font-bold md:text-2xl`}
            >
              Actions your AI takes — <span className="text-accent">automatically</span>
            </motion.h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: CalendarDays,
                  title: 'Books appointments',
                  desc: 'Checks your calendar, finds availability, books the slot, sends confirmation. Zero human involvement.',
                  tag: 'Calendar',
                },
                {
                  icon: ClipboardList,
                  title: 'Qualifies & routes leads',
                  desc: 'Asks the right questions, scores the lead, pushes to HubSpot or Sheets, pings your sales team on Slack.',
                  tag: 'CRM',
                },
                {
                  icon: Shield,
                  title: 'Processes payments',
                  desc: 'Customer picks a service, AI generates a Stripe link, payment confirmed, receipt sent. All inside chat.',
                  tag: 'Payments',
                },
                {
                  icon: Globe,
                  title: 'Speaks 4 languages',
                  desc: 'English, Ukrainian, Russian, Arabic — auto-detected. No translation setup needed. Native-quality.',
                  tag: 'Multilingual',
                },
                {
                  icon: Send,
                  title: 'Sends follow-ups',
                  desc: 'After a lead drops off, AI sends a follow-up via email or Telegram. Recovers deals you would have lost.',
                  tag: 'Automation',
                },
                {
                  icon: Workflow,
                  title: 'Any API, any workflow',
                  desc: 'If it has a REST API, your AI can use it. Custom multi-step workflows without writing a single line of code.',
                  tag: 'Custom',
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
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES — Enterprise Power
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
              Platform
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Enterprise power. <span className="text-accent">Startup simplicity.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              Everything from AI chat to conversation intelligence to multi-agent orchestration — in one platform.
            </motion.p>
          </motion.div>

          {/* Bento grid — 2 large + 4 small */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {[
              {
                icon: Brain,
                title: 'AI That Learns',
                desc: 'Auto-evolving knowledge base. Your AI re-crawls your site weekly, detects changes, and updates itself. Zero maintenance.',
                span: 'md:col-span-7',
              },
              {
                icon: Mic,
                title: 'Voice Conversations',
                desc: 'Real-time voice agent in the widget. Customers speak, AI responds. WebRTC quality.',
                span: 'md:col-span-5',
              },
              {
                icon: Users,
                title: 'Multi-Agent System',
                desc: 'Sales Agent hands off to Support Agent, then to Billing. Automatic intent routing.',
                span: 'md:col-span-4',
              },
              {
                icon: BarChart3,
                title: 'Conversation Intelligence',
                desc: 'Buying signals, churn risk, competitor mentions, sentiment analysis — all automatic.',
                span: 'md:col-span-4',
              },
              {
                icon: Layers,
                title: 'Omnichannel Inbox',
                desc: 'Web, Telegram, WhatsApp, Instagram — every conversation in one unified thread.',
                span: 'md:col-span-4',
              },
            ].map((f) => {
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

          {/* Extra row */}
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
                title: 'Your Brand, Your Widget',
                desc: 'Colors, fonts, avatar, behavior — fully customizable. AI Builder lets you design visually.',
              },
              {
                icon: Lock,
                title: 'Enterprise SSO & Security',
                desc: 'SAML/OIDC SSO. AES-256 encryption. Role-based access. Audit logs. SOC 2 ready.',
              },
              {
                icon: Link2,
                title: '10+ Native Integrations',
                desc: 'HubSpot, Salesforce, Stripe, Google Calendar, Calendly, Sheets, Telegram, WhatsApp, and more.',
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
          HOW IT WORKS — Three Steps
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
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Three steps. <span className="text-accent">That&apos;s it.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="relative grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            <div className="from-accent/30 via-accent/20 to-accent/30 pointer-events-none absolute top-16 right-[16.7%] left-[16.7%] hidden h-px bg-gradient-to-r md:block" />

            {[
              {
                num: '01',
                title: 'Paste Your Website URL',
                desc: 'That\u2019s the only input. Our AI reads every page — services, pricing, FAQ, team — and builds a complete knowledge base.',
              },
              {
                num: '02',
                title: 'AI Creates Your Assistant',
                desc: '30 seconds. Custom-trained AI that speaks your brand voice, knows your products, and handles edge cases humans miss.',
              },
              {
                num: '03',
                title: 'Embed One Line of Code',
                desc: 'Copy-paste a script tag. Your AI starts converting visitors into leads, bookings, and sales. Across every channel.',
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
          ENTERPRISE — For serious businesses
          ════════════════════════════════════════════ */}
      <section id="enterprise" className="border-border relative overflow-hidden border-t px-6 py-20 md:px-12 md:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-accent/[0.04] absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-16 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Enterprise
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-5 text-3xl leading-snug font-bold tracking-tight md:text-4xl lg:text-[2.75rem]`}
            >
              Built for companies that <span className="text-accent">don&apos;t compromise</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-2xl text-lg">
              SSO. White-label. Unlimited agents. Custom domains. SLA guarantees. Everything a Fortune 500 expects — at
              a price a startup can afford.
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
                icon: Lock,
                title: 'SSO & RBAC',
                desc: 'SAML 2.0, OIDC, Okta, Azure AD. Role-based access with full audit trail.',
              },
              {
                icon: Paintbrush,
                title: 'White-Label',
                desc: 'Your brand, your domain. Remove all WinBix branding. Resell to your clients.',
              },
              {
                icon: Users,
                title: 'Multi-Agent',
                desc: 'Sales, Support, Billing agents that hand off conversations automatically.',
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                desc: 'Funnel analysis, cohort retention, revenue attribution, churn prediction.',
              },
              {
                icon: Brain,
                title: 'AI Training Studio',
                desc: 'Upload ideal conversations. AI learns your response style. Human-in-the-loop.',
              },
              {
                icon: Mic,
                title: 'Voice Agent',
                desc: 'Real-time voice conversations via WebRTC. Speak to your AI like a human.',
              },
              {
                icon: Globe,
                title: 'Custom Domains',
                desc: 'Serve your widget from chat.yourdomain.com with auto-SSL certificates.',
              },
              {
                icon: Shield,
                title: '99.9% SLA',
                desc: 'Guaranteed uptime. Dedicated support. 1-hour response time on Enterprise.',
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="group border-border bg-bg-secondary hover:border-accent/25 rounded-xl border p-6 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.06)]"
                >
                  <div className="bg-accent/[0.08] group-hover:bg-accent/[0.14] mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-1.5 text-sm font-semibold">{f.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          COMPETITOR COMPARISON
          ════════════════════════════════════════════ */}
      <section className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="mb-14 text-center"
          >
            <motion.p variants={fadeUp} className="text-accent mb-3 text-sm font-semibold tracking-widest uppercase">
              Comparison
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Why teams <span className="text-accent">switch to WinBix</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="border-border overflow-hidden rounded-xl border"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-secondary border-border border-b">
                  <th className="text-text-tertiary px-6 py-4 text-left text-xs font-semibold tracking-wider uppercase">
                    Feature
                  </th>
                  <th className="text-accent px-6 py-4 text-center text-xs font-bold tracking-wider uppercase">
                    WinBix AI
                  </th>
                  <th className="text-text-tertiary px-6 py-4 text-center text-xs font-semibold tracking-wider uppercase">
                    Intercom
                  </th>
                  <th className="text-text-tertiary hidden px-6 py-4 text-center text-xs font-semibold tracking-wider uppercase md:table-cell">
                    Tidio
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Setup time', winbix: '30 seconds', intercom: '2-4 weeks', tidio: '1-2 days' },
                  { feature: 'Starting price', winbix: '$0/mo', intercom: '$39/seat/mo', tidio: '$29/mo' },
                  { feature: 'AI agent actions', winbix: true, intercom: true, tidio: false },
                  { feature: 'Voice AI in widget', winbix: true, intercom: false, tidio: false },
                  { feature: 'Multi-agent system', winbix: true, intercom: false, tidio: false },
                  { feature: 'Auto-learning knowledge', winbix: true, intercom: false, tidio: false },
                  { feature: 'Conversation intelligence', winbix: true, intercom: true, tidio: false },
                  { feature: 'WhatsApp + Instagram', winbix: true, intercom: true, tidio: true },
                  { feature: 'White-label / reseller', winbix: true, intercom: false, tidio: false },
                  { feature: 'No-code AI builder', winbix: true, intercom: false, tidio: true },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`border-border border-b last:border-b-0 ${i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/50'}`}
                  >
                    <td className="text-text-primary px-6 py-3.5 font-medium">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.winbix === 'boolean' ? (
                        row.winbix ? (
                          <Check className="text-accent mx-auto h-4.5 w-4.5" />
                        ) : (
                          <Minus className="text-text-tertiary mx-auto h-4.5 w-4.5" />
                        )
                      ) : (
                        <span className="text-accent font-semibold">{row.winbix}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {typeof row.intercom === 'boolean' ? (
                        row.intercom ? (
                          <Check className="text-text-tertiary mx-auto h-4 w-4" />
                        ) : (
                          <Minus className="text-text-tertiary mx-auto h-4 w-4" />
                        )
                      ) : (
                        <span className="text-text-secondary">{row.intercom}</span>
                      )}
                    </td>
                    <td className="hidden px-6 py-3.5 text-center md:table-cell">
                      {typeof row.tidio === 'boolean' ? (
                        row.tidio ? (
                          <Check className="text-text-tertiary mx-auto h-4 w-4" />
                        ) : (
                          <Minus className="text-text-tertiary mx-auto h-4 w-4" />
                        )
                      ) : (
                        <span className="text-text-secondary">{row.tidio}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-text-tertiary mt-6 text-center text-xs"
          >
            Comparison based on publicly available information as of March 2026. Pricing reflects entry-level plans.
          </motion.p>
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
              Industries
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={`${syne.className} text-text-primary mb-4 text-3xl leading-snug font-bold tracking-tight md:text-4xl`}
            >
              Pre-configured for <span className="text-accent">your niche</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              Industry-specific AI personas with domain knowledge built in. Deploy in seconds, not weeks.
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
                title: 'Consulting & Coaching',
                desc: 'Lead qualification, discovery call booking, proposal delivery',
              },
              {
                href: '/dubai-realestate',
                icon: Building2,
                title: 'Real Estate',
                desc: 'Property matching, viewing scheduling, investor inquiries',
              },
              {
                href: '/australia-home-services',
                icon: Home,
                title: 'Home Services',
                desc: 'Instant quotes, emergency dispatch, seasonal campaigns',
              },
              {
                href: '/texas-beauty-instagram',
                icon: Scissors,
                title: 'Beauty & Wellness',
                desc: 'Online booking, social media DMs, loyalty programs',
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
                      See demo
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
              { value: 500, suffix: '+', label: 'Widgets Live', sub: 'Across 20+ industries' },
              { value: 50, suffix: 'K+', label: 'Monthly Conversations', sub: 'And growing every day' },
              { value: 98, suffix: '%', label: 'Customer Satisfaction', sub: 'From real business owners' },
              { value: 30, prefix: '<', suffix: 's', label: 'Time to Deploy', sub: 'URL to live AI assistant' },
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
          PRICING — Three tiers
          ════════════════════════════════════════════ */}
      <section id="pricing" className="border-border border-t px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto max-w-5xl">
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
              Start free. <span className="text-accent">Pay when you grow.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-text-secondary mx-auto max-w-xl text-lg">
              No credit card. No contracts. No surprises. Upgrade or cancel in one click.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            {/* Free */}
            <motion.div variants={fadeUp} className="border-border bg-bg-secondary rounded-xl border p-8">
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold tracking-tight">$0</span>
                  <span className="text-text-tertiary">/forever</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
                  Try WinBix with no risk. One widget, real AI, no expiration.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  '1 AI widget',
                  '100 conversations/mo',
                  'Knowledge base training',
                  'Web channel',
                  'Basic analytics',
                ].map((f) => (
                  <li key={f} className="text-text-secondary flex items-center gap-3 text-sm">
                    <Check className="text-accent h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full justify-center" onClick={openSignup}>
                Get Started Free
              </Button>
            </motion.div>

            {/* Pro — Popular */}
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
                  Unlimited AI power with omnichannel and integrations.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  'Unlimited widgets & messages',
                  'All 4 channels (Web, TG, WA, IG)',
                  'CRM + Sheets + Calendar sync',
                  'Agent personas & A/B tests',
                  'Conversation intelligence',
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

            {/* Enterprise */}
            <motion.div variants={fadeUp} className="border-border bg-bg-secondary rounded-xl border p-8">
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Enterprise</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold tracking-tight">$299</span>
                  <span className="text-text-tertiary">/mo</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
                  White-label, SSO, SLA, and everything in Pro — unlimited.
                </p>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  'Everything in Pro',
                  'SSO (SAML/OIDC)',
                  'White-label branding',
                  'Custom domain + SSL',
                  'Multi-agent orchestration',
                  'Voice AI agent',
                  'AI Training Studio',
                  '99.9% SLA guarantee',
                ].map((f) => (
                  <li key={f} className="text-text-secondary flex items-center gap-3 text-sm">
                    <Check className="text-accent h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="w-full justify-center" onClick={openSignup}>
                Contact Sales
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-text-tertiary mt-6 text-center text-sm"
          >
            All plans include 14-day free trial.{' '}
            <Link href="/plans" className="text-accent transition-colors hover:underline">
              View full plan comparison
            </Link>
          </motion.p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA — Emotional close
          ════════════════════════════════════════════ */}
      <section className="border-border relative overflow-hidden border-t px-6 py-24 md:px-12 md:py-36">
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-accent/[0.07] absolute top-1/2 left-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />
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
            className={`${syne.className} text-text-primary mb-6 text-3xl leading-[1.15] font-bold tracking-tight md:text-4xl lg:text-5xl`}
          >
            While you read this,
            <br />
            someone visited your site
            <br />
            <span className="text-accent">and left.</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-text-secondary mx-auto mb-5 max-w-xl text-lg">
            They had a question. Nobody answered. They went to your competitor.
          </motion.p>

          <motion.p variants={fadeUp} className="text-text-tertiary mx-auto mb-10 max-w-md text-base">
            It takes 30 seconds to make sure that never happens again.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => scrollTo('demo')}
              className="group bg-accent relative inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-xl px-10 text-[17px] font-semibold text-white shadow-[0_2px_30px_rgba(59,130,246,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_6px_40px_rgba(59,130,246,0.45)] active:translate-y-0"
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">Build Your AI — Free</span>
              <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>

          <motion.p variants={fadeUp} className="text-text-tertiary mt-7 text-xs">
            Free forever plan available. No credit card. Cancel anytime.
          </motion.p>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════ */}
      <footer className="border-border border-t px-6 pt-16 pb-8 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="text-text-primary text-base font-bold">WinBix AI</span>
              </div>
              <p className="text-text-tertiary text-sm leading-relaxed">
                AI employees that sell, support, and schedule — 24/7, across every channel.
              </p>
            </div>

            <div>
              <h4 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">Product</h4>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Features', id: 'features' },
                  { label: 'Live Demo', id: 'demo' },
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Enterprise', id: 'enterprise' },
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
