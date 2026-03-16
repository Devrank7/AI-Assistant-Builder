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
} from 'lucide-react';

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

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="bg-bg-primary relative min-h-screen">
      {/* ════════════════════════════════════════════
          NAVIGATION
          ════════════════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 px-6 py-4 transition-all duration-200 md:px-12 ${
          navScrolled ? 'border-border bg-bg-primary/80 border-b backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollTo('hero')} className="text-text-primary flex items-center gap-2.5">
            <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">WinBix AI</span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: 'Features', id: 'features' },
              { label: 'How It Works', id: 'how-it-works' },
              { label: 'Industries', id: 'industries' },
              { label: 'Pricing', id: 'pricing' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Link href="/about" className="text-text-tertiary hover:text-text-primary text-sm transition-colors">
              {tc('nav.about')}
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
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
                    setAuthModalTab('signup');
                    setShowAuthModal(true);
                  }}
                >
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

            <Button size="sm" className="hidden md:inline-flex" onClick={() => scrollTo('try-it')}>
              Try Free Demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════ */}
      <section id="hero" className="px-6 pt-20 pb-24 md:px-12 md:pt-32 md:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="border-border bg-bg-secondary text-text-secondary mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium">
            <span className="bg-accent h-1.5 w-1.5 rounded-full" />
            AI-Powered Customer Assistant
          </div>

          <h1 className="text-text-primary mb-6 text-3xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl">
            Turn your website into a <span className="text-accent">24/7 sales machine</span>
          </h1>

          <p className="text-text-secondary mx-auto mb-10 max-w-2xl text-lg">{t('hero.tagline')}</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => scrollTo('try-it')} className="h-12 px-8 text-base">
              Get Free Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="lg" onClick={() => scrollTo('how-it-works')} className="h-12 px-8 text-base">
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FEATURES
          ════════════════════════════════════════════ */}
      <section id="features" className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Capabilities</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {ta('features.title.before')}
              <span className="text-accent">{ta('features.title.accent')}</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">{ta('features.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: MessageSquare,
                title: ta('features.chat.title'),
                desc: ta('features.chat.desc'),
              },
              {
                icon: ClipboardList,
                title: ta('features.booking.title'),
                desc: ta('features.booking.desc'),
              },
              {
                icon: Globe,
                title: ta('features.lang.title'),
                desc: ta('features.lang.desc'),
              },
              {
                icon: BarChart3,
                title: ta('features.analytics.title'),
                desc: ta('features.analytics.desc'),
              },
              {
                icon: Paintbrush,
                title: ta('features.design.title'),
                desc: ta('features.design.desc'),
              },
              {
                icon: Link2,
                title: ta('features.channels.title'),
                desc: ta('features.channels.desc'),
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="border-border bg-bg-secondary hover:border-accent/30 rounded-xl border p-6 transition-colors"
                >
                  <div className="bg-accent/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-2 text-base font-semibold">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Process</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {ta('how.title.before')}
              <span className="text-accent">{ta('how.title.accent')}</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">{ta('how.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { num: '01', title: ta('how.step1.title'), desc: ta('how.step1.desc') },
              { num: '02', title: ta('how.step2.title'), desc: ta('how.step2.desc') },
              { num: '03', title: ta('how.step3.title'), desc: ta('how.step3.desc') },
            ].map((step) => (
              <div key={step.num} className="border-border bg-bg-secondary rounded-xl border p-6">
                <div className="bg-accent/10 text-accent mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold">
                  {step.num}
                </div>
                <h3 className="text-text-primary mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TRY IT — Widget Generator
          ════════════════════════════════════════════ */}
      <section id="try-it" className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Live Demo</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {ta('try.title.before')}
              <span className="text-accent">{ta('try.title.accent')}</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">{ta('try.desc')}</p>
          </div>
          <WidgetGenerator />
        </div>
      </section>

      {/* ════════════════════════════════════════════
          INTEGRATIONS
          ════════════════════════════════════════════ */}
      <section className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Integrations</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {ta('integrations.title.before')}
              <span className="text-accent">{ta('integrations.title.accent')}</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-2xl text-lg">{ta('integrations.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: Link2,
                title: ta('integrations.crm.title'),
                desc: ta('integrations.crm.desc'),
              },
              {
                icon: CalendarDays,
                title: ta('integrations.calendar.title'),
                desc: ta('integrations.calendar.desc'),
              },
              {
                icon: Sparkles,
                title: ta('integrations.booking.title'),
                desc: ta('integrations.booking.desc'),
                accent: true,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`bg-bg-secondary rounded-xl border p-6 transition-colors ${
                    item.accent ? 'border-accent/20 hover:border-accent/40' : 'border-border hover:border-accent/30'
                  }`}
                >
                  <div className="bg-accent/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-2 text-base font-semibold">{item.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
                  {item.accent && (
                    <div className="bg-accent/10 text-accent mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                      <Sparkles className="h-3 w-3" />
                      AI-powered
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          INDUSTRIES
          ════════════════════════════════════════════ */}
      <section id="industries" className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Solutions</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Tailored for <span className="text-accent">Your Industry</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">
              Pre-built solutions optimized for your specific market and customer needs
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: '/consulting',
                icon: Briefcase,
                title: 'Consulting & Coaching',
                desc: 'Lead capture for coaches, consultants, and info-businesses',
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
                desc: 'Quote requests and appointment booking for tradespeople',
              },
              {
                href: '/texas-beauty-instagram',
                icon: Scissors,
                title: 'Beauty & Instagram',
                desc: 'Social media automation and booking for salons',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group border-border bg-bg-secondary hover:border-accent/30 rounded-xl border p-6 transition-colors"
                >
                  <div className="bg-accent/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="text-accent h-5 w-5" />
                  </div>
                  <h3 className="text-text-primary mb-2 text-sm font-semibold">{item.title}</h3>
                  <p className="text-text-secondary mb-4 text-sm">{item.desc}</p>
                  <span className="text-accent group-hover:text-accent flex items-center gap-1.5 text-sm font-medium transition-colors">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SOCIAL PROOF
          ════════════════════════════════════════════ */}
      <section className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Trusted</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Trusted by Businesses <span className="text-accent">Worldwide</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">
              Join hundreds of companies automating customer conversations with WinBix AI
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { value: '500+', label: 'Widgets Deployed', sub: 'Across 20+ industries' },
              { value: '50K+', label: 'Conversations', sub: 'Handled by AI assistants' },
              { value: '98%', label: 'Satisfaction Rate', sub: 'From business owners' },
            ].map((stat) => (
              <div key={stat.label} className="border-border bg-bg-secondary rounded-xl border p-8 text-center">
                <div className="text-text-primary mb-2 text-4xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-text-primary text-sm font-medium">{stat.label}</p>
                <p className="text-text-tertiary mt-1 text-xs">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PRICING
          ════════════════════════════════════════════ */}
      <section id="pricing" className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-accent mb-3 text-sm font-medium tracking-wide uppercase">Pricing</p>
            <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Simple, Transparent <span className="text-accent">Pricing</span>
            </h2>
            <p className="text-text-secondary mx-auto max-w-xl text-lg">
              Start with a free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Basic Plan */}
            <div className="border-border bg-bg-secondary rounded-xl border p-8">
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold">$29</span>
                  <span className="text-text-tertiary">/mo</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
                  Perfect for small businesses getting started with AI chat
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
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
              >
                Start Free Trial
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="border-accent/30 bg-bg-secondary relative rounded-xl border p-8">
              <div className="absolute top-5 right-5">
                <span className="bg-accent/10 text-accent rounded-full px-3 py-1 text-xs font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-text-primary mb-2 text-lg font-bold">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-text-primary text-4xl font-extrabold">$79</span>
                  <span className="text-text-tertiary">/mo</span>
                </div>
                <p className="text-text-secondary mt-2 text-sm">
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
                  <li key={f} className="text-text-secondary flex items-center gap-3 text-sm">
                    <Check className="text-accent h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full justify-center"
                onClick={() => {
                  setAuthModalTab('signup');
                  setShowAuthModal(true);
                }}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-text-tertiary mt-6 text-center text-sm">
            Need more details?{' '}
            <Link href="/plans" className="text-accent transition-colors hover:underline">
              View full plan comparison
            </Link>
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          CTA
          ════════════════════════════════════════════ */}
      <section className="border-border border-t px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-text-primary mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to <span className="text-accent">Get Started</span>?
          </h2>
          <p className="text-text-secondary mx-auto mb-10 max-w-xl text-lg">
            Deploy your AI-powered chat widget in minutes and start converting visitors into customers today.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base"
              onClick={() => {
                setAuthModalTab('signup');
                setShowAuthModal(true);
              }}
            >
              Sign Up Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="lg" className="h-12 px-8 text-base" onClick={() => scrollTo('try-it')}>
              Try Live Demo
            </Button>
          </div>
        </div>
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
                AI assistants for your business that work around the clock.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">Product</h4>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Features', id: 'features' },
                  { label: 'How It Works', id: 'how-it-works' },
                  { label: 'Industries', id: 'industries' },
                  { label: 'Live Demo', id: 'try-it' },
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
          LANDING CHATBOT — real widget (dogfooding)
          ════════════════════════════════════════════ */}
      <Script src="/quickwidgets/winbix-ai/script.js" strategy="lazyOnload" />
    </div>
  );
}
