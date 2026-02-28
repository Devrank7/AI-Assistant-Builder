'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Playfair_Display } from 'next/font/google';
import WidgetGenerator from '@/components/WidgetGenerator';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
});

const serif = { fontFamily: 'var(--font-playfair), Georgia, serif' };

/* ─── Animated counter ─── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
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
      {count}
      {suffix}
    </span>
  );
}

/* ─── Section fade-in ─── */
function Section({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Gold divider ─── */
function GoldDivider() {
  return <div className="dubai-divider mx-auto my-0 max-w-2xl" />;
}

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
    title: 'Qualifies leads automatically',
    desc: 'Filters by budget, property type, nationality, and timeline. Your agents only speak to serious buyers.',
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
    title: 'Books property viewings',
    desc: 'Finds open slots on your calendar and schedules viewings. Zero back-and-forth.',
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
    title: 'Speaks 8+ languages',
    desc: "Arabic, English, Russian, Hindi, Chinese, French — auto-detects and responds in the buyer's language.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"
        />
      </svg>
    ),
    title: 'Multi-property knowledge',
    desc: 'Knows every listing — prices, floor plans, payment plans, ROI data, and community details.',
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
    title: 'Works across all channels',
    desc: 'Website, WhatsApp, Telegram, Instagram — one AI agent handling every channel simultaneously.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257"
        />
      </svg>
    ),
    title: 'Sends leads to your CRM',
    desc: 'PropSpace, Bitrix24, HubSpot, Zoho — qualified leads flow straight into your pipeline.',
  },
];

const SCENARIOS = [
  {
    time: '11:47 PM',
    location: 'Moscow, Russia',
    message:
      'A buyer messages about a 2BR in Dubai Marina. Your AI responds in Russian, shares floor plans, and books a viewing for tomorrow.',
  },
  {
    time: '3:15 AM',
    location: 'Mumbai, India',
    message:
      'An investor asks about off-plan ROI in Business Bay. Your AI calculates returns, explains payment plans, and captures the lead.',
  },
  {
    time: '7:30 AM',
    location: 'London, UK',
    message:
      'A family enquires about villas in Arabian Ranches. Your AI qualifies budget, shares listings, and connects them to your agent.',
  },
];

export default function DubaiRealEstatePage() {
  return (
    <div className={`dubai-theme relative min-h-screen overflow-hidden ${playfair.variable}`}>
      {/* Background layers */}
      <div className="dubai-bg-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle,rgba(197,165,90,0.06)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute top-[60%] left-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(197,165,90,0.04)_0%,transparent_60%)]" />

      {/* Nav */}
      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-3 text-white transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C5A55A] to-[#8B6914] shadow-lg shadow-[#C5A55A]/20">
            <svg className="h-5 w-5 text-[#0A1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-wide text-white">
            WinBix <span className="text-[#C5A55A]">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#generator"
            className="hidden rounded-xl bg-[#C5A55A]/10 px-4 py-2 text-sm font-medium text-[#C5A55A] transition-all hover:bg-[#C5A55A]/20 sm:block"
          >
            Try Demo
          </a>
          <a
            href="https://www.linkedin.com/in/danyl-shcherbakov-87b285370/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2 text-sm font-medium text-gray-400 backdrop-blur-sm transition-all hover:border-[#C5A55A]/20 hover:text-white"
          >
            Contact Us
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 md:px-10">
        {/* ═══════════════════════════════════════════ */}
        {/* HERO                                       */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pt-20 pb-12 text-center md:pt-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#C5A55A]/20 bg-[#C5A55A]/[0.06] px-5 py-2 text-sm tracking-wide text-[#C5A55A]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C5A55A]" />
              Built for Dubai Real Estate
            </div>
            <h1
              className="mb-8 text-5xl leading-[1.1] font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
              style={serif}
            >
              Your AI Sales Agent
              <br />
              <span className="gradient-text-gold">That Never Sleeps</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
              Respond to every property enquiry in under <span className="font-semibold text-white">5 seconds</span>.{' '}
              <br className="hidden md:block" />
              In Arabic, English, Russian, or Hindi. <span className="font-semibold text-white">24/7.</span>
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#generator" className="btn-gold inline-flex items-center gap-2.5 text-lg">
                See It In Action
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/danyl-shcherbakov-87b285370/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-4 text-base font-medium text-gray-400 transition-all hover:border-[#C5A55A]/20 hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Contact Us
              </a>
            </div>
          </motion.div>
        </Section>

        {/* Social proof bar */}
        <Section className="pb-20">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-600">
            <span>Serving agents in</span>
            {['Downtown Dubai', 'Palm Jumeirah', 'Dubai Marina', 'Business Bay', 'JVC', 'Arabian Ranches'].map(
              (area) => (
                <span key={area} className="font-medium text-gray-400">
                  {area}
                </span>
              )
            )}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* STATS                                      */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                value: (
                  <>
                    &lt;
                    <Counter target={5} />s
                  </>
                ),
                label: 'Response time',
                sub: 'While competitors take 2-4 hours',
                color: '#C5A55A',
              },
              {
                value: '8+',
                label: 'Languages',
                sub: 'Arabic, English, Russian, Hindi, Chinese & more',
                color: '#D4AF37',
              },
              {
                value: '24/7',
                label: 'Always online',
                sub: "International buyers don't wait for office hours",
                color: '#E8C860',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="glass-dubai card-gold-top rounded-2xl p-10 text-center"
              >
                <div className="mb-4 text-6xl font-bold tracking-tight" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <p className="text-lg font-semibold text-white">{stat.label}</p>
                <p className="mt-2 text-sm text-gray-500">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* PAIN POINTS                                */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-5xl" style={serif}>
              Why Dubai Agents <span className="gradient-text-gold">Lose Deals</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
              12,000+ licensed brokers compete for every lead in Dubai. <br className="hidden md:block" />
              The agent who responds first — wins. Every time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                num: '01',
                title: 'Time zone blindspot',
                desc: "Buyers in Moscow, Mumbai, London, and Beijing message at 11 PM Dubai time. By morning, they've moved on to 3 other agents.",
              },
              {
                num: '02',
                title: 'Meta leads go silent',
                desc: 'Facebook and Instagram leads fill out forms — then ignore calls from UAE numbers. They expect instant messaging, not phone follow-ups.',
              },
              {
                num: '03',
                title: 'Unqualified leads drain hours',
                desc: 'Your agents spend time on visa tourists and window shoppers. Without pre-qualification, serious buyers get delayed.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="glass-dubai card-gold-top rounded-2xl p-8"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#C5A55A]/10 text-xl font-bold text-[#C5A55A]">
                  {item.num}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{item.title}</h3>
                <p className="leading-relaxed text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* REAL SCENARIOS                             */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-5xl" style={serif}>
              What Happens <span className="gradient-text-gold">While You Sleep</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Your AI agent works every time zone, every language, every channel.
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
                className="glass-dubai flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:gap-8"
              >
                <div className="flex flex-shrink-0 flex-col items-center md:w-40">
                  <span className="text-2xl font-bold text-[#C5A55A]">{s.time}</span>
                  <span className="mt-1 text-xs text-gray-500">{s.location}</span>
                </div>
                <div className="h-px w-full bg-[#C5A55A]/10 md:h-12 md:w-px" />
                <p className="leading-relaxed text-gray-300">{s.message}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* WIDGET GENERATOR — THE STAR               */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24" delay={0.1}>
          <div id="generator" className="scroll-mt-24">
            {/* Premium framing */}
            <div className="glass-dubai gold-shimmer relative overflow-hidden rounded-3xl px-6 py-16 md:px-12 md:py-20">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C5A55A]/[0.03] via-transparent to-[#C5A55A]/[0.03]" />

              <div className="relative z-10">
                <div className="mb-16 text-center">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C5A55A]/30 bg-[#C5A55A]/10 px-5 py-2 text-sm font-semibold tracking-wide text-[#C5A55A]">
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
                  <h2 className="mb-5 text-3xl font-bold text-white md:text-5xl" style={serif}>
                    See Your AI Agent — <span className="gradient-text-gold">Live in 30 Seconds</span>
                  </h2>
                  <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
                    Enter your website URL. Our AI crawls every page, learns your listings, matches your brand — and
                    builds a ready-to-use sales agent. No signup. No payment.
                  </p>
                </div>

                {/* 4-step visual */}
                <div className="mx-auto mb-14 grid max-w-3xl grid-cols-2 gap-5 md:grid-cols-4">
                  {[
                    { num: '01', step: 'Crawls every page', desc: 'Listings, services, areas, prices' },
                    { num: '02', step: 'Matches your brand', desc: 'Colours, fonts, design language' },
                    { num: '03', step: 'Learns your business', desc: 'Properties, payment plans, ROI' },
                    { num: '04', step: 'Deploys instantly', desc: 'Handles leads in 8+ languages' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="rounded-xl border border-[#C5A55A]/15 bg-[#0A1628]/60 p-5 text-center"
                    >
                      <div className="mb-2 text-sm font-bold text-[#C5A55A]">{s.num}</div>
                      <p className="text-sm font-semibold text-white">{s.step}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* The Generator itself */}
                <WidgetGenerator />

                <p className="mt-8 text-center text-sm text-gray-600 italic">
                  Like having Apple&apos;s design team and a top sales agent merged into one — ready in 30 seconds.
                </p>

                {/* Demo disclaimer */}
                <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#C5A55A]/20 bg-[#0A1628]/80 p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#C5A55A]/10">
                      <svg className="h-4 w-4 text-[#C5A55A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">This is a live preview of your AI agent</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        It already knows your listings, brand, and content — generated in 30 seconds with Apple-level
                        design. However, it can&apos;t access your CRM or lead management system yet — that requires
                        connecting your private API keys and data, which we configure together after onboarding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* FEATURES                                   */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-5xl" style={serif}>
              What Your AI Agent <span className="gradient-text-gold">Can Do</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              More than a chatbot. A full-time digital sales agent that knows your properties inside out.
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
                className="glass-dubai flex gap-5 rounded-2xl p-7"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#C5A55A]/20 bg-[#C5A55A]/[0.06] text-[#C5A55A]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="mb-1.5 text-base font-bold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* INTEGRATIONS                               */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-4xl" style={serif}>
              Connects to <span className="gradient-text-gold">Your Tools</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Every qualified lead flows straight into the CRM and calendar your team already uses.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              'PropSpace',
              'Bitrix24',
              'Bayut',
              'Property Finder',
              'Google Calendar',
              'WhatsApp Business',
              'HubSpot',
              'Zoho CRM',
            ].map((name) => (
              <div
                key={name}
                className="rounded-lg border border-[#C5A55A]/10 bg-[#C5A55A]/[0.03] px-5 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-[#C5A55A]/25 hover:bg-[#C5A55A]/[0.06] hover:text-white"
              >
                {name}
              </div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* TRUST SIGNALS                              */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-4xl" style={serif}>
              Built for the <span className="gradient-text-gold">UAE Market</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {[
              { icon: '🏛️', label: 'RERA-Aware', desc: 'Consistent, compliant messaging — no rogue promises' },
              { icon: '🔒', label: 'Data Security', desc: 'Enterprise-grade encryption for all client data' },
              { icon: '🌐', label: 'Multi-Channel', desc: 'WhatsApp, Website, Telegram, Instagram — unified' },
              { icon: '⚡', label: '99.9% Uptime', desc: 'Never misses a lead, day or night' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-dubai card-gold-top rounded-2xl p-6 text-center"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <p className="text-sm font-bold text-[#C5A55A]">{item.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        <GoldDivider />

        {/* ═══════════════════════════════════════════ */}
        {/* CTA                                        */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="py-24">
          <div className="glass-dubai relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C5A55A]/[0.04] via-transparent to-[#C5A55A]/[0.04]" />
            <div className="relative z-10">
              <h2 className="mb-5 text-3xl font-bold text-white md:text-5xl" style={serif}>
                Ready to <span className="gradient-text-gold">Close More Deals</span>?
              </h2>
              <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-gray-400">
                We&apos;ll create a custom AI sales agent for your agency in 24 hours. Free demo included — see the
                results before you invest.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href="#generator" className="btn-gold inline-flex items-center gap-2.5 text-lg">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Try Free Demo Now
                </a>
                <a
                  href="https://www.linkedin.com/in/danyl-shcherbakov-87b285370/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-medium text-gray-400 transition-all hover:border-[#C5A55A]/20 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-medium text-gray-400 transition-all hover:border-[#C5A55A]/20 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-base font-medium text-gray-400 transition-all hover:border-[#C5A55A]/20 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ FOOTER ═══ */}
        <div className="glow-line-gold mt-4 mb-8 h-px" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <p>&copy; {new Date().getFullYear()} WinBix AI. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a
              href="https://www.linkedin.com/in/danyl-shcherbakov-87b285370/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 transition-colors hover:text-[#C5A55A]"
              title="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a href="#" className="text-gray-500 transition-colors hover:text-[#C5A55A]" title="WhatsApp">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
            <a href="#" className="text-gray-500 transition-colors hover:text-[#C5A55A]" title="Facebook">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
