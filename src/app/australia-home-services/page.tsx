'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Inter } from 'next/font/google';
import WidgetGenerator from '@/components/WidgetGenerator';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
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
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Hi-vis orange stripe ─── */
function HivisStripe() {
  return <div className="aus-hivis-stripe w-full" />;
}

/* ─── Badge component ─── */
function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'orange' | 'green' }) {
  const styles = {
    blue: 'border-[#2563EB]/20 bg-[#2563EB]/5 text-[#2563EB]',
    orange: 'border-[#FF6B2C]/20 bg-[#FF6B2C]/5 text-[#FF6B2C]',
    green: 'border-[#059669]/20 bg-[#059669]/5 text-[#059669]',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${styles[color]}`}
    >
      {children}
    </span>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
    title: 'Answers every enquiry instantly',
    desc: "2am on a Sunday? Public holiday? Doesn't matter. Every enquiry gets a response in under 5 seconds.",
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
    title: 'Books jobs into your calendar',
    desc: 'Finds the next free slot, books the job, sends a confirmation. Zero phone tag.',
  },
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
    title: 'Filters tyre-kickers out',
    desc: 'Qualifies leads by service area, job type, and budget before they reach you. No more wasted quotes.',
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
    title: 'Knows your services inside out',
    desc: 'Pricing, service areas, availability, FAQs — gives accurate answers that sound like you wrote them.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257m9.86-3.06l4.5 4.5"
        />
      </svg>
    ),
    title: 'Plugs into your job management',
    desc: 'ServiceM8, Tradify, Fergus, AroFlo, Simpro — leads go straight into the tools you already use.',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
        />
      </svg>
    ),
    title: 'SMS alert on every new lead',
    desc: "Get a text the moment someone enquires. You know about every job — even when you're on the tools.",
  },
];

const INTEGRATIONS = [
  'ServiceM8',
  'Tradify',
  'Fergus',
  'AroFlo',
  'Simpro',
  'Xero',
  'Google Calendar',
  'WhatsApp Business',
];

export default function AustraliaHomeServicesPage() {
  return (
    <div
      className={`aus-theme relative min-h-screen overflow-hidden ${inter.variable}`}
      style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
    >
      {/* Light-theme overrides for WidgetGenerator — injected at runtime to bypass Tailwind v4 PostCSS */}
      <style>{`
        .aus-generator-light .glass {
          background: #FFFFFF !important;
          border: 1px solid #E2E8F0 !important;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .aus-generator-light .glass label {
          color: #1E293B !important;
        }
        .aus-generator-light .glass input[type="text"],
        .aus-generator-light .glass input[type="url"] {
          background: #F8FAFC !important;
          border-color: #E2E8F0 !important;
          color: #0F172A !important;
        }
        .aus-generator-light .glass input[type="text"]::placeholder,
        .aus-generator-light .glass input[type="url"]::placeholder {
          color: #94A3B8 !important;
        }
        .aus-generator-light .glass input[type="text"]:focus,
        .aus-generator-light .glass input[type="url"]:focus {
          border-color: #FF6B2C !important;
          box-shadow: 0 0 0 3px rgba(255, 107, 44, 0.1) !important;
        }
        .aus-generator-light .glass .text-gray-300 {
          color: #475569 !important;
        }
        .aus-generator-light .glass .text-gray-500 {
          color: #64748B !important;
        }
        .aus-generator-light .glass .text-gray-600 {
          color: #94A3B8 !important;
        }
        .aus-generator-light .glass .text-white {
          color: #0F172A !important;
        }
        .aus-generator-light .glass .text-gray-400 {
          color: #64748B !important;
        }
        .aus-generator-light .glass .border-white\\/10,
        .aus-generator-light .glass .border-white\\/5,
        .aus-generator-light .glass .border-white\\/\\[0\\.06\\] {
          border-color: #E2E8F0 !important;
        }
        .aus-generator-light .glass .bg-white\\/\\[0\\.03\\] {
          background: #F8FAFC !important;
        }
        .aus-generator-light .glass .bg-gray-600 {
          background: #CBD5E1 !important;
        }
        .aus-generator-light .glass label[title="Custom color"] {
          border-color: #CBD5E1 !important;
        }
        .aus-generator-light .glass button[type="submit"] {
          color: #FFFFFF !important;
          box-shadow: 0 4px 14px rgba(255, 107, 44, 0.3) !important;
        }
        .aus-generator-light .glass button[type="submit"] span,
        .aus-generator-light .glass button[type="submit"] svg {
          color: #FFFFFF !important;
        }
        .aus-generator-light .glass code {
          color: #475569 !important;
        }
        .aus-generator-light .glass h3 {
          color: #0F172A !important;
        }
        .aus-generator-light .glass .border-white\\/60 {
          border-color: #0F172A !important;
        }
      `}</style>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between bg-white px-6 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-[#1E293B]">
            WinBix <span className="text-[#2563EB]">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#generator"
            className="hidden rounded-xl bg-[#FF6B2C] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#EA580C] sm:block"
          >
            Try Free Demo
          </a>
          <a
            href="mailto:winbix.ai@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-[#2563EB]/30 hover:text-[#2563EB]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Contact Us
          </a>
        </div>
      </nav>

      {/* Hi-vis stripe */}
      <HivisStripe />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-white px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="aus-dots-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <Badge color="orange">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF6B2C]" />
              Built for Australian Tradies
            </Badge>
            <h1 className="mt-8 mb-6 text-5xl leading-[1.1] font-black tracking-tight text-[#0F172A] md:text-7xl">
              Your Website Should Be
              <br />
              Your <span className="gradient-text-orange">Best Salesperson</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[#64748B] md:text-2xl">
              <span className="font-bold text-[#0F172A]">76% of tradies have a website that does nothing.</span> Our AI
              turns it into a 24/7 sales machine that answers enquiries, qualifies leads, and books jobs — while
              you&apos;re on the tools.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#generator" className="btn-aus-orange inline-flex items-center gap-2 text-lg">
                Try It Free — 30 Seconds
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
              <a
                href="#compare"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-medium text-[#64748B] transition-all hover:border-[#2563EB]/30 hover:text-[#2563EB]"
              >
                Compare to hipages
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <Section className="border-y border-gray-100 bg-[#F7F6F4] px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <span className="font-medium text-[#94A3B8]">Trusted by tradies in</span>
          {['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra'].map((city) => (
            <span key={city} className="font-bold text-[#475569]">
              {city}
            </span>
          ))}
        </div>
      </Section>

      {/* ═══ STATS ═══ */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                value: <Counter target={15000} prefix="$" suffix="+" />,
                label: 'Lost per year',
                sub: 'Average revenue lost from missed enquiries',
                color: '#FF6B2C',
              },
              {
                value: '85%',
                label: "Won't call back",
                sub: 'Homeowners contact the next tradie who answers',
                color: '#2563EB',
              },
              {
                value: (
                  <>
                    &lt;
                    <Counter target={5} />s
                  </>
                ),
                label: 'AI response time',
                sub: 'Every enquiry answered instantly, 24/7',
                color: '#059669',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="card-aus-orange p-8 text-center"
              >
                <div className="mb-3 text-5xl font-black" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <p className="text-lg font-bold text-[#0F172A]">{stat.label}</p>
                <p className="mt-2 text-sm text-[#94A3B8]">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PLATFORM COMPARISON — THE KILLER SECTION ═══ */}
      <Section className="aus-warm-section px-6 py-20" delay={0.1}>
        <div className="mx-auto max-w-5xl" id="compare">
          <div className="mb-14 text-center">
            <Badge color="orange">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Stop Paying Per Lead
            </Badge>
            <h2 className="mt-6 mb-4 text-3xl font-black text-[#0F172A] md:text-5xl">
              What You&apos;re <span className="gradient-text-orange">Really Paying</span> for Leads
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#64748B]">
              You&apos;re competing against 5-10 tradies for the same lead. And paying whether you win or not.
            </p>
          </div>

          {/* Comparison cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* hipages */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-gray-200 bg-white p-8"
            >
              <div className="mb-4 text-lg font-bold text-[#94A3B8]">hipages</div>
              <div className="mb-1 text-3xl font-black text-[#0F172A]">
                $25–$999<span className="text-lg font-medium text-[#94A3B8]">/mo</span>
              </div>
              <p className="mb-6 text-sm font-semibold text-[#FF6B2C]">+ $10–60 per lead on top</p>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Compete against 5-10 tradies per lead
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Pay whether you win the job or not
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ~50% of leads reported as low quality
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ~$3,360/year wasted on leads that go nowhere
                </li>
              </ul>
            </motion.div>

            {/* Google Ads */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl border border-gray-200 bg-white p-8"
            >
              <div className="mb-4 text-lg font-bold text-[#94A3B8]">Google Ads</div>
              <div className="mb-1 text-3xl font-black text-[#0F172A]">
                $66–$90<span className="text-lg font-medium text-[#94A3B8]"> per lead</span>
              </div>
              <p className="mb-6 text-sm font-semibold text-[#FF6B2C]">+ agency fees on top</p>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  $500–$2,000/month typical budget
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Needs constant management
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Leads still go to voicemail if you can&apos;t answer
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Costs spike in competitive trades
                </li>
              </ul>
            </motion.div>

            {/* WinBix AI */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative rounded-2xl border-2 border-[#FF6B2C] bg-white p-8 shadow-lg shadow-[#FF6B2C]/10"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF6B2C] px-4 py-1 text-xs font-bold text-white">
                BETTER VALUE
              </div>
              <div className="mb-4 text-lg font-bold text-[#FF6B2C]">WinBix AI</div>
              <div className="mb-1 text-3xl font-black text-[#0F172A]">
                Flat rate<span className="text-lg font-medium text-[#94A3B8]">/mo</span>
              </div>
              <p className="mb-6 text-sm font-semibold text-[#059669]">No per-lead fees. Ever.</p>
              <ul className="space-y-3 text-sm text-[#64748B]">
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#059669]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Every lead is exclusively yours
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#059669]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  AI qualifies before reaching you
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#059669]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Captures leads from YOUR website visitors
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#059669]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  No lock-in. Cancel anytime.
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══ PAIN POINTS ═══ */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-black text-[#0F172A] md:text-5xl">
              Why Tradies <span className="gradient-text-orange">Lose Jobs</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[#64748B]">
              It&apos;s not your work quality. It&apos;s response time. The tradie who answers first wins — every time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                num: '01',
                title: 'Under a sink, phone rings',
                desc: 'Hands are full. You miss it. That homeowner calls the next tradie on Google. A $1,200 job — gone in 10 seconds.',
                color: '#FF6B2C',
              },
              {
                num: '02',
                title: '62% of calls come after hours',
                desc: "Evenings, weekends, public holidays — that's when homeowners actually search for tradies. Your phone is off.",
                color: '#2563EB',
              },
              {
                num: '03',
                title: '10+ hours/week on admin',
                desc: "Quoting, scheduling, follow-ups, chasing callbacks. That's time you could spend on billable work or with the family.",
                color: '#059669',
              },
            ].map((item, i) => (
              <motion.div
                key={item.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="card-aus rounded-2xl p-8"
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.num}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#0F172A]">{item.title}</h3>
                <p className="leading-relaxed text-[#64748B]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ WIDGET GENERATOR — THE STAR ═══ */}
      <section className="relative bg-white px-6 py-20">
        <div className="aus-dots-bg pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <Section delay={0.1}>
            <div id="generator" className="scroll-mt-24">
              <div className="mb-14 text-center">
                <Badge color="orange">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  See It Working — Right Now
                </Badge>
                <h2 className="mt-6 mb-4 text-3xl font-black text-[#0F172A] md:text-5xl">
                  Your AI Assistant — <span className="gradient-text-orange">Live in 30 Seconds</span>
                </h2>
                <p className="mx-auto max-w-2xl text-lg text-[#64748B]">
                  Drop in your website URL. Our AI reads every page, learns your services, matches your brand — and
                  builds a working assistant on the spot.{' '}
                  <span className="font-bold text-[#0F172A]">No signup. No credit card.</span>
                </p>
              </div>

              {/* 4-step visual */}
              <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { num: '01', step: 'Reads every page', desc: 'Services, pricing, areas' },
                  { num: '02', step: 'Matches your brand', desc: 'Colours, fonts, tone' },
                  { num: '03', step: 'Learns your business', desc: 'Services, prices, FAQs' },
                  { num: '04', step: 'Ready to chat', desc: 'Handles enquiries like a pro' },
                ].map((s, i) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 text-center"
                  >
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B2C]/10 text-sm font-black text-[#FF6B2C]">
                      {s.num}
                    </div>
                    <p className="text-sm font-bold text-[#0F172A]">{s.step}</p>
                    <p className="mt-1 text-xs text-[#94A3B8]">{s.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* The Generator — with light-theme overrides injected at runtime */}
              <div className="aus-generator-light">
                <WidgetGenerator />
              </div>

              <p className="mt-6 text-center text-sm text-[#94A3B8]">
                Like having a $55K receptionist — without the salary.
              </p>

              {/* Demo disclaimer */}
              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#FF6B2C]/15 bg-[#FFF7ED] p-5">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B2C]/10">
                    <svg className="h-4 w-4 text-[#FF6B2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">This is a live preview of your AI assistant</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                      It already knows your services, brand, and content — generated in 30 seconds with Apple-level
                      design. However, it can&apos;t book jobs or access your scheduling system yet — that requires
                      connecting your private API keys and business data, which we set up together after purchase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-black text-[#0F172A] md:text-5xl">
              What Your AI Assistant <span className="gradient-text-blue">Actually Does</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[#64748B]">
              It never calls in sick, never takes a smoko, and never forgets to follow up.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="card-aus flex gap-5 rounded-2xl p-6"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                  {f.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-bold text-[#0F172A]">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-[#64748B]">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ INTEGRATIONS ═══ */}
      <Section className="aus-warm-section px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="mb-4 text-3xl font-black text-[#0F172A] md:text-4xl">
              Plugs Into Your <span className="gradient-text-blue">Existing Setup</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[#64748B]">
              No need to change your workflow. We connect to the tools you already use.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {INTEGRATIONS.map((name) => (
              <div
                key={name}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-[#475569] shadow-sm transition-all hover:border-[#2563EB]/30 hover:text-[#2563EB]"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ TRUST SIGNALS ═══ */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-black text-[#0F172A] md:text-4xl">
              Built for <span className="gradient-text-blue">Australian Standards</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {[
              { icon: '🔒', title: 'Data Security', desc: 'Enterprise-grade encryption. Your client data stays safe.' },
              {
                icon: '🇦🇺',
                title: 'Australian Hosted',
                desc: 'Your data stays in Australia. GDPR & Privacy Act compliant.',
              },
              { icon: '⚡', title: '99.9% Uptime', desc: 'Never misses a lead, day or night. Reliable as.' },
              { icon: '📱', title: 'Multi-Channel', desc: 'Website, WhatsApp, Facebook, SMS — all unified.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card-aus rounded-2xl p-6 text-center"
              >
                <div className="mb-3 text-3xl">{item.icon}</div>
                <h3 className="mb-2 text-base font-bold text-[#0F172A]">{item.title}</h3>
                <p className="text-sm text-[#94A3B8]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ ROI SECTION ═══ */}
      <Section className="aus-warm-section px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-black text-[#0F172A] md:text-5xl">
              The <span className="gradient-text-orange">Simple Maths</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[#64748B]">Forget the sales pitch. Here are the numbers.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Without WinBix */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <h3 className="text-lg font-bold text-[#0F172A]">Without WinBix AI</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">hipages subscription</span>
                  <span className="font-bold text-[#0F172A]">$300/mo</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">Wasted on bad leads (~50%)</span>
                  <span className="font-bold text-red-500">$150/mo</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">Missed calls (3-5/week)</span>
                  <span className="font-bold text-red-500">$4,800/mo</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#0F172A]">Total cost of inaction</span>
                  <span className="text-xl font-black text-red-500">$5,250/mo</span>
                </div>
              </div>
            </div>

            {/* With WinBix */}
            <div className="rounded-2xl border-2 border-[#059669] bg-[#059669]/[0.02] p-8 shadow-lg shadow-[#059669]/10">
              <div className="mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-lg font-bold text-[#0F172A]">With WinBix AI</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">WinBix AI (flat rate)</span>
                  <span className="font-bold text-[#0F172A]">From $199/mo</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">Extra jobs captured (3-5/mo)</span>
                  <span className="font-bold text-[#059669]">+$3,600–$6,000</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-[#64748B]">Time saved (10+ hrs/week)</span>
                  <span className="font-bold text-[#059669]">Priceless</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#0F172A]">Net result</span>
                  <span className="text-xl font-black text-[#059669]">+$3,400–$5,800/mo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-[#059669]/10 p-5 text-center">
            <p className="text-lg font-black text-[#059669]">
              ROI: 18x – 30x return on investment. Pays for itself in the first week.
            </p>
          </div>
        </div>
      </Section>

      {/* ═══ CTA ═══ */}
      <Section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-12 text-center md:p-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 107, 44, 0.2) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-black text-white md:text-5xl">
                Ready to Stop <span className="gradient-text-hivis">Missing Jobs</span>?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">
                Try it free. See exactly how many enquiries you&apos;re missing — and start capturing them today.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href="#generator" className="btn-aus-orange inline-flex items-center gap-2 text-lg">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Try It Free — 30 Seconds
                </a>
                <a
                  href="mailto:winbix.ai@gmail.com"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] px-8 py-4 text-lg font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/40 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  Contact Us
                </a>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                No credit card required. No lock-in contracts. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-[#94A3B8] md:flex-row">
          <p>&copy; {new Date().getFullYear()} WinBix AI. All rights reserved.</p>
          <a
            href="mailto:winbix.ai@gmail.com"
            className="inline-flex items-center gap-2 transition-colors hover:text-[#64748B]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Contact Us
          </a>
        </div>
      </footer>
    </div>
  );
}
