'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EB_Garamond, DM_Sans } from 'next/font/google';
import WidgetGenerator from '@/components/WidgetGenerator';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-garamond',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

/* ─── Animated counter ─── */
function Counter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
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
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Section reveal ─── */
function Section({
  children,
  id,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Elegant divider ─── */
function Divider() {
  return <div className="consult-divider mx-auto my-0 max-w-3xl" />;
}

/* ─── Data ─── */
const PAIN_POINTS = [
  {
    num: '01',
    title: "You're the bottleneck",
    desc: "Every prospect waits for YOU to respond. You're on a plane, in a session, at dinner — and another $15K engagement just ghosted because you took 6 hours to reply.",
  },
  {
    num: '02',
    title: 'Weekends consumed by admin',
    desc: '"Can you send me your pricing?" "What\'s included in the mentoring?" "Do you work with SaaS startups?" — the same 20 questions, every single week. Your expertise is wasted on FAQ duty.',
  },
  {
    num: '03',
    title: 'Your competitors already have AI',
    desc: "The consulting firm down the road responds in 8 seconds. You respond in 8 hours. Clients don't compare quality first — they compare responsiveness. The fast advisor wins.",
  },
];

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
        />
      </svg>
    ),
    title: 'Qualifies prospects instantly',
    desc: 'Budget, timeline, company size, goals — your AI asks the right questions before you ever get on a call. Only serious prospects reach your calendar.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
    title: 'Books discovery calls',
    desc: 'Syncs with your calendar, finds open slots, and books calls directly. Zero back-and-forth. The prospect goes from "interested" to "scheduled" in under a minute.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
        />
      </svg>
    ),
    title: 'Knows your methodology',
    desc: 'Your frameworks, case studies, pricing tiers, engagement models — your AI speaks with the same authority and precision that built your reputation.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3"
        />
      </svg>
    ),
    title: 'Speaks any language',
    desc: 'English, German, French, Arabic, Spanish — auto-detects and responds fluently. Your international clients get the same premium experience, 24/7.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
    title: 'Omnichannel presence',
    desc: 'Website, WhatsApp, Telegram, LinkedIn — one AI handling every touchpoint simultaneously. Your prospects reach you wherever they prefer.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
    title: 'Feeds your CRM pipeline',
    desc: 'HubSpot, Salesforce, Pipedrive, Notion — qualified leads flow directly into your pipeline with full context. No manual data entry.',
  },
];

const SCENARIOS = [
  {
    time: '11:47 PM',
    tz: 'London, UK',
    message:
      'A CEO messages about executive coaching for their leadership team. Your AI explains your methodology, shares relevant case studies, and books a discovery call for Thursday.',
  },
  {
    time: '6:30 AM',
    tz: 'Singapore',
    message:
      'A startup founder asks about scaling from $2M to $10M ARR. Your AI qualifies their stage, budget, and timeline — then schedules a strategy call with you.',
  },
  {
    time: '2:15 PM',
    tz: 'New York, USA',
    message:
      'A VP of Operations enquires about business process optimization. Your AI shares your pricing tiers, explains the engagement model, and captures the lead.',
  },
];

const OBJECTIONS = [
  {
    q: '"My clients expect to talk to ME, not a bot."',
    a: "They still will. Your AI handles the first 3 minutes — qualifying, answering FAQs, booking calls. By the time you get on Zoom, they're already sold on working with you. You show up prepared, not scrambling.",
  },
  {
    q: '"I\'m a premium service. AI feels cheap."',
    a: "McKinsey uses AI. Bain uses AI. Deloitte uses AI. Your prospect doesn't think less of you for responding in 5 seconds at midnight — they think you're exceptional. Slow responses feel cheap. Instant ones feel premium.",
  },
  {
    q: '"I only need 2-3 clients a month."',
    a: "Exactly. So you can't afford to lose a single one to a delayed response. When you only close 2-3 per month, every lost prospect is a $10K-$50K mistake. AI ensures zero slip through the cracks.",
  },
];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function ConsultingLandingPage() {
  return (
    <div className={`consult-theme ${garamond.variable} ${dmSans.variable} min-h-screen`}>
      {/* Runtime style injection — theme CSS injected inline because
          Tailwind v4 PostCSS strips custom class rules from globals.css */}
      <style>{`
        /* === CONSULTING THEME BASE === */
        .consult-theme {
          --consult-midnight: #0B1120;
          --consult-navy: #111827;
          --consult-charcoal: #1A2332;
          --consult-emerald: #10B981;
          --consult-emerald-dark: #059669;
          --consult-emerald-light: #34D399;
          --consult-slate: #94A3B8;
          --consult-muted: #64748B;
          --consult-surface: rgba(255, 255, 255, 0.03);
          background: #0B1120 !important;
          color: #E2E8F0 !important;
        }
        .consult-theme ::selection {
          background: rgba(16, 185, 129, 0.3);
          color: #fff;
        }

        /* === GRADIENT TEXT === */
        .gradient-text-emerald {
          background: linear-gradient(135deg, #10B981, #34D399, #6EE7B7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* === GLASS CARDS === */
        .glass-consult {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px) saturate(1.2);
          -webkit-backdrop-filter: blur(24px) saturate(1.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-consult:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.06);
        }
        .card-emerald-top {
          position: relative;
          overflow: hidden;
        }
        .card-emerald-top::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #10B981, #34D399, #10B981);
        }

        /* === BUTTONS === */
        .btn-consult {
          background: linear-gradient(135deg, #10B981, #059669);
          color: #0B1120;
          font-weight: 700;
          padding: 16px 36px;
          border-radius: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }
        .btn-consult:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.45);
        }

        /* === DIVIDER === */
        .consult-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.12), rgba(52, 211, 153, 0.25), rgba(16, 185, 129, 0.12), transparent);
        }

        /* === BACKGROUND GRID === */
        .consult-bg-grid {
          background-image:
            linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* === SHIMMER === */
        @keyframes consult-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .consult-shimmer {
          background: linear-gradient(90deg,
            rgba(16, 185, 129, 0) 0%,
            rgba(16, 185, 129, 0.06) 25%,
            rgba(52, 211, 153, 0.1) 50%,
            rgba(16, 185, 129, 0.06) 75%,
            rgba(16, 185, 129, 0) 100%
          );
          background-size: 200% 100%;
          animation: consult-shimmer 8s linear infinite;
        }

        /* === GLOW LINE === */
        .glow-line-emerald {
          position: relative;
          height: 1px;
        }
        .glow-line-emerald::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.4), transparent);
          filter: blur(1px);
          opacity: 0.6;
        }

        /* === EDITORIAL QUOTE LINE === */
        .editorial-line {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #10B981, #34D399);
        }

        /* === PROSE OVERRIDE FOR GENERATOR === */
        .consult-generator .glass {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(16, 185, 129, 0.12) !important;
        }
        .consult-generator .glass:hover {
          border-color: rgba(16, 185, 129, 0.25) !important;
        }
      `}</style>

      {/* Background layers */}
      <div className="consult-bg-grid pointer-events-none fixed inset-0 opacity-40" />
      <div className="pointer-events-none fixed -top-40 right-[-12%] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.04)_0%,transparent_55%)]" />
      <div className="pointer-events-none fixed top-[55%] left-[-12%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.03)_0%,transparent_55%)]" />

      {/* ═══ NAV ═══ */}
      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] shadow-lg shadow-emerald-500/20">
            <svg className="h-5 w-5 text-[#0B1120]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-[family-name:var(--font-dm-sans)] text-lg font-bold tracking-wide text-white">
            WinBix <span className="text-emerald-400">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#generator"
            className="hidden rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 sm:block"
          >
            Try Demo
          </a>
        </div>
      </nav>

      {/* ═══ CONTENT ═══ */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 md:px-10">
        {/* ═══════════════════════════════════════════ */}
        {/* HERO                                       */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pt-20 pb-12 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-2 font-[family-name:var(--font-dm-sans)] text-sm tracking-wide text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Built for Consultants, Coaches &amp; Advisors
            </div>
            <h1 className="mb-8 font-[family-name:var(--font-garamond)] text-5xl leading-[1.1] font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
              Stop Losing Clients
              <br />
              <span className="gradient-text-emerald">While You Sleep</span>
            </h1>
            <p className="mx-auto max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-gray-400 md:text-xl">
              Your next <span className="font-semibold text-white">$25,000 engagement</span> just messaged at 11 PM.
              <br className="hidden md:block" />
              Without AI, they&apos;ll hire your competitor by morning.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#generator" className="btn-consult inline-flex items-center gap-2.5 text-lg">
                See It On Your Website
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
            </div>
          </motion.div>
        </Section>

        {/* Social proof */}
        <Section className="pb-20">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-[family-name:var(--font-dm-sans)] text-sm text-gray-600">
            <span>Trusted by advisors in</span>
            {[
              'Management Consulting',
              'Executive Coaching',
              'Business Strategy',
              'Leadership Development',
              'Financial Advisory',
            ].map((area) => (
              <span key={area} className="font-medium text-gray-400">
                {area}
              </span>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* THE HARD TRUTH — STATS                     */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <div className="editorial-line mx-auto mb-8" />
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
              The Numbers <span className="gradient-text-emerald">Don&apos;t Lie</span>
            </h2>
            <p className="mx-auto max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-gray-400">
              Every hour of delayed response costs you revenue. Here&apos;s the reality of the consulting market right
              now.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                value: (
                  <>
                    <Counter target={78} suffix="%" />
                  </>
                ),
                label: 'of prospects choose the first responder',
                sub: 'Harvard Business Review, 2023',
              },
              {
                value: (
                  <>
                    &lt;
                    <Counter target={5} />
                    min
                  </>
                ),
                label: 'optimal response window',
                sub: 'After 5 minutes, engagement drops 400%',
              },
              {
                value: (
                  <>
                    $<Counter target={147} />K
                  </>
                ),
                label: 'avg. lost revenue per year',
                sub: 'From delayed or missed prospect inquiries',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="glass-consult card-emerald-top rounded-2xl p-10 text-center"
              >
                <div className="mb-4 font-[family-name:var(--font-garamond)] text-6xl font-bold tracking-tight text-emerald-400">
                  {stat.value}
                </div>
                <p className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold text-white">{stat.label}</p>
                <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-sm text-gray-500">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* PAIN POINTS                                */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
              Why Expert Advisors <span className="gradient-text-emerald">Lose Deals</span>
            </h2>
            <p className="mx-auto max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-gray-400">
              You didn&apos;t build a six-figure practice to spend it answering &ldquo;What do you charge?&rdquo; at
              midnight.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PAIN_POINTS.map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="glass-consult card-emerald-top rounded-2xl p-8"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 font-[family-name:var(--font-garamond)] text-xl font-bold text-emerald-400">
                  {item.num}
                </div>
                <h3 className="mb-3 font-[family-name:var(--font-garamond)] text-xl font-bold text-white">
                  {item.title}
                </h3>
                <p className="font-[family-name:var(--font-dm-sans)] leading-relaxed text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* REAL SCENARIOS                             */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
              What Happens <span className="gradient-text-emerald">While You&apos;re Offline</span>
            </h2>
            <p className="mx-auto max-w-xl font-[family-name:var(--font-dm-sans)] text-lg text-gray-400">
              Your AI advisor works every timezone, every language, every channel. No breaks. No delays.
            </p>
          </div>
          <div className="space-y-4">
            {SCENARIOS.map((s, i) => (
              <motion.div
                key={s.time}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-consult flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:gap-8"
              >
                <div className="flex flex-shrink-0 flex-col items-center md:w-40">
                  <span className="font-[family-name:var(--font-garamond)] text-2xl font-bold text-emerald-400">
                    {s.time}
                  </span>
                  <span className="mt-1 font-[family-name:var(--font-dm-sans)] text-xs text-gray-500">{s.tz}</span>
                </div>
                <div className="h-px w-full bg-emerald-500/10 md:h-12 md:w-px" />
                <p className="font-[family-name:var(--font-dm-sans)] leading-relaxed text-gray-300">{s.message}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* WIDGET GENERATOR — THE STAR               */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24" delay={0.1}>
          <div id="generator" className="scroll-mt-24">
            <div className="glass-consult consult-shimmer relative overflow-hidden rounded-3xl px-6 py-16 md:px-12 md:py-20">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-emerald-500/[0.02]" />

              <div className="relative z-10">
                <div className="mb-16 text-center">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 font-[family-name:var(--font-dm-sans)] text-sm font-semibold tracking-wide text-emerald-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    What Sets Us Apart
                  </div>
                  <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
                    See Your AI Advisor — <span className="gradient-text-emerald">Live in 30 Seconds</span>
                  </h2>
                  <p className="mx-auto max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-gray-400">
                    Enter your website URL. Our AI crawls every page, learns your services, methodology, and pricing —
                    then builds a ready-to-deploy advisor. No signup. No payment. No commitment.
                  </p>
                </div>

                {/* 4-step visual */}
                <div className="mx-auto mb-14 grid max-w-3xl grid-cols-2 gap-5 md:grid-cols-4">
                  {[
                    { num: '01', step: 'Scans your website', desc: 'Services, methodology, case studies' },
                    { num: '02', step: 'Matches your brand', desc: 'Colors, tone, visual identity' },
                    { num: '03', step: 'Learns your expertise', desc: 'Pricing, frameworks, testimonials' },
                    { num: '04', step: 'Deploys instantly', desc: 'Qualifies and books 24/7' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="rounded-xl border border-emerald-500/15 bg-[#0B1120]/60 p-5 text-center"
                    >
                      <div className="mb-2 font-[family-name:var(--font-garamond)] text-sm font-bold text-emerald-400">
                        {s.num}
                      </div>
                      <p className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-white">
                        {s.step}
                      </p>
                      <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs leading-relaxed text-gray-500">
                        {s.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* The Generator */}
                <div className="consult-generator">
                  <WidgetGenerator />
                </div>

                <p className="mt-8 text-center font-[family-name:var(--font-dm-sans)] text-sm text-gray-600 italic">
                  Your AI advisor — trained on your exact expertise — ready before you finish your coffee.
                </p>

                {/* Demo disclaimer */}
                <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-emerald-500/20 bg-[#0B1120]/80 p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-dm-sans)] text-sm font-semibold text-white">
                        This is a live preview of your AI advisor
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-dm-sans)] text-xs leading-relaxed text-gray-400">
                        It already knows your services, methodology, and content — generated in 30 seconds. However, it
                        can&apos;t access your calendar or CRM yet — that requires connecting your private API keys,
                        which we configure together after onboarding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* FEATURES                                   */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
              What Your AI Advisor <span className="gradient-text-emerald">Can Do</span>
            </h2>
            <p className="mx-auto max-w-xl font-[family-name:var(--font-dm-sans)] text-lg text-gray-400">
              Not a generic chatbot. A knowledgeable extension of you that understands your business deeply.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-consult flex gap-5 rounded-2xl p-7"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400">
                  {f.icon}
                </div>
                <div>
                  <h3 className="mb-1.5 font-[family-name:var(--font-dm-sans)] text-base font-bold text-white">
                    {f.title}
                  </h3>
                  <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-gray-400">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* OBJECTION HANDLING                          */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <div className="editorial-line mx-auto mb-8" />
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
              &ldquo;But My Business <span className="gradient-text-emerald">Is Different&rdquo;</span>
            </h2>
            <p className="mx-auto max-w-xl font-[family-name:var(--font-dm-sans)] text-lg text-gray-400">
              Every consultant thinks that. Here&apos;s why they&apos;re wrong.
            </p>
          </div>
          <div className="space-y-6">
            {OBJECTIONS.map((obj, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-consult rounded-2xl p-8"
              >
                <p className="mb-4 font-[family-name:var(--font-garamond)] text-xl font-bold text-emerald-400 italic">
                  {obj.q}
                </p>
                <p className="font-[family-name:var(--font-dm-sans)] leading-relaxed text-gray-300">{obj.a}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* INTEGRATIONS                               */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-4xl">
              Connects to <span className="gradient-text-emerald">Your Stack</span>
            </h2>
            <p className="mx-auto max-w-xl font-[family-name:var(--font-dm-sans)] text-lg text-gray-400">
              Every qualified prospect flows straight into the tools you already use.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              'HubSpot',
              'Salesforce',
              'Pipedrive',
              'Calendly',
              'Google Calendar',
              'Zoom',
              'WhatsApp Business',
              'Notion',
              'Zoho CRM',
              'Slack',
            ].map((name) => (
              <div
                key={name}
                className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] px-5 py-2.5 font-[family-name:var(--font-dm-sans)] text-sm font-medium text-gray-300 transition-all hover:border-emerald-500/25 hover:bg-emerald-500/[0.06] hover:text-white"
              >
                {name}
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* TRUST SIGNALS                              */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-4xl">
              Enterprise-Grade, <span className="gradient-text-emerald">Advisor-Approved</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {[
              { icon: '🛡️', label: 'SOC 2 Ready', desc: 'Enterprise-grade data security and encryption' },
              { icon: '🔒', label: 'Client Confidential', desc: 'Your knowledge base is private and encrypted' },
              { icon: '🌐', label: 'Multi-Channel', desc: 'Website, WhatsApp, Telegram, LinkedIn — unified' },
              { icon: '⚡', label: '99.9% Uptime', desc: 'Never misses a prospect, 365 days a year' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-consult card-emerald-top rounded-2xl p-6 text-center"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <p className="font-[family-name:var(--font-dm-sans)] text-sm font-bold text-emerald-400">
                  {item.label}
                </p>
                <p className="mt-1.5 font-[family-name:var(--font-dm-sans)] text-xs leading-relaxed text-gray-500">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════════ */}
        {/* FINAL CTA                                  */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="glass-consult relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-emerald-500/[0.03]" />
            <div className="relative z-10">
              <h2 className="mb-5 font-[family-name:var(--font-garamond)] text-3xl font-bold text-white md:text-5xl">
                Your Competitors Are Already <span className="gradient-text-emerald">Using AI</span>
              </h2>
              <p className="mx-auto mb-6 max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-gray-400">
                Every day without AI is another prospect lost to someone faster. Every unanswered inquiry is a
                five-figure engagement walking away.
              </p>
              <p className="mx-auto mb-12 max-w-xl font-[family-name:var(--font-dm-sans)] text-base text-gray-500">
                We&apos;ll create a custom AI advisor for your practice in 24 hours. Free demo included — see the
                results before you invest a single dollar.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href="#generator" className="btn-consult inline-flex items-center gap-2.5 text-lg">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Try Free Demo Now
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ FOOTER ═══ */}
        <div className="glow-line-emerald mt-4 mb-8 h-px" />
        <footer className="text-center font-[family-name:var(--font-dm-sans)] text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} WinBix AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
