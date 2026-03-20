'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { BadgePercent, Layout, Users, Headphones, Gift, Terminal } from 'lucide-react';

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.4, 0.25, 1], delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

/* ─── Benefits ─── */
const BENEFITS = [
  {
    icon: BadgePercent,
    title: 'Bulk Pricing',
    desc: '10+ widgets = 30% discount. The more you deploy, the more you save — automatically.',
    color: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-400',
    borderHover: 'hover:border-green-500/30',
  },
  {
    icon: Layout,
    title: 'White-Label Dashboard',
    desc: 'Your brand, your clients. Fully white-labeled dashboard so your agency owns the experience.',
    color: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/30',
  },
  {
    icon: Users,
    title: 'Client Management',
    desc: 'Deploy and manage AI widgets for multiple clients from one central dashboard — no juggling accounts.',
    color: 'from-purple-500/20 to-violet-500/20',
    iconColor: 'text-purple-400',
    borderHover: 'hover:border-purple-500/30',
  },
  {
    icon: Headphones,
    title: 'Priority Support',
    desc: 'Dedicated agency support line. Fast-tracked responses so you can keep your clients happy.',
    color: 'from-cyan-500/20 to-sky-500/20',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/30',
  },
  {
    icon: Gift,
    title: 'Revenue Sharing',
    desc: 'Earn commissions on every referral. Build a recurring revenue stream by growing with WinBix.',
    color: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
    borderHover: 'hover:border-pink-500/30',
  },
  {
    icon: Terminal,
    title: 'API Access',
    desc: 'Automate widget deployment with our full REST API. Provision clients programmatically at any scale.',
    color: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/30',
  },
];

/* ─── How it works ─── */
const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Sign Up',
    desc: 'Apply for the agency program. Get approved within 24 hours and access your agency dashboard.',
    color: 'rgba(59,130,246,0.1)',
    textColor: '#60A5FA',
  },
  {
    step: '02',
    title: 'Build',
    desc: 'Customize widgets for your clients using our white-label builder. Apply their branding in minutes.',
    color: 'rgba(99,102,241,0.1)',
    textColor: '#818CF8',
  },
  {
    step: '03',
    title: 'Deploy',
    desc: 'Publish widgets to client sites with a single script tag. Manage everything from your dashboard.',
    color: 'rgba(139,92,246,0.1)',
    textColor: '#A78BFA',
  },
];

/* ─── Agency tiers ─── */
const AGENCY_TIERS = [
  {
    name: 'Agency Starter',
    price: '$199',
    period: '/mo',
    widgets: '10 widgets',
    features: [
      '10 client widgets',
      'White-label dashboard',
      'Bulk pricing (10% off)',
      'Priority email support',
      'Agency analytics',
    ],
    highlight: false,
    cta: 'Get Started',
  },
  {
    name: 'Agency Pro',
    price: '$499',
    period: '/mo',
    widgets: '50 widgets',
    features: [
      '50 client widgets',
      'White-label + custom domain',
      'Bulk pricing (30% off)',
      'Dedicated support manager',
      'Revenue sharing program',
      'API access',
    ],
    highlight: true,
    cta: 'Get Started',
  },
  {
    name: 'Agency Enterprise',
    price: 'Custom',
    period: '',
    widgets: 'Unlimited',
    features: [
      'Unlimited widgets',
      'Full white-label suite',
      'Maximum bulk discounts',
      'SLA guarantee',
      'Custom integrations',
      'Dedicated account team',
    ],
    highlight: false,
    cta: 'Contact Sales',
  },
];

export default function AgencyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#060810', color: '#E8EAED' }}>
      {/* ── Background mesh ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(ellipse 800px 600px at 80% 0%, rgba(99,102,241,0.08), transparent),
            radial-gradient(ellipse 700px 500px at 10% 30%, rgba(59,130,246,0.06), transparent),
            radial-gradient(ellipse 600px 400px at 50% 90%, rgba(139,92,246,0.04), transparent)
          `,
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* ── Nav ── */}
      <div className="relative z-50">
        <MarketingNav />
      </div>

      <main className="relative z-10">
        {/* ══════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pt-32 pb-24 text-center md:px-8 md:pt-40 md:pb-32">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'rgba(99,102,241,0.08)',
              borderColor: 'rgba(99,102,241,0.2)',
              color: '#818CF8',
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#818CF8' }} />
            Agency Program
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.05}
            className="mb-6 text-5xl leading-[1.1] font-extrabold tracking-tight text-white md:text-7xl"
          >
            WinBix{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818CF8, #A78BFA, #C4B5FD)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Agency
            </span>{' '}
            Program
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed md:text-2xl"
            style={{ color: '#94A3B8' }}
          >
            Deploy AI widgets for your clients at scale.{' '}
            <span className="font-medium text-white">White-labeled. Profitable. Yours.</span>
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.15}>
            <a
              href="mailto:agency@winbixai.com?subject=Agency Program Application"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              }}
            >
              Apply for Agency Program
            </a>
          </motion.div>

          {/* Trust */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="mt-8 text-sm"
            style={{ color: '#64748B' }}
          >
            30% bulk discount &bull; White-label dashboard &bull; Revenue sharing &bull; Free to apply
          </motion.p>
        </section>

        {/* ══════════════════════════════════════════════
            BENEFITS GRID
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-28 md:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Why agencies choose WinBix</h2>
            <p className="mx-auto max-w-xl text-lg" style={{ color: '#94A3B8' }}>
              Everything you need to add AI chat as a high-margin service line for your clients.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {BENEFITS.map(({ icon: Icon, title, desc, color, iconColor, borderHover }) => (
              <motion.div
                key={title}
                variants={cardVariant}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${borderHover}`}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-28 md:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">How it works</h2>
            <p className="mx-auto max-w-xl text-lg" style={{ color: '#94A3B8' }}>
              Three simple steps from sign-up to revenue.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connecting line (desktop only) */}
            <div
              aria-hidden="true"
              className="absolute top-10 right-1/6 left-1/6 hidden h-px lg:block"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.3), transparent)',
              }}
            />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 gap-8 md:grid-cols-3"
            >
              {HOW_IT_WORKS.map(({ step, title, desc, color, textColor }) => (
                <motion.div
                  key={step}
                  variants={cardVariant}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step circle */}
                  <div
                    className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-extrabold"
                    style={{ background: color, color: textColor, border: `1px solid ${textColor}20` }}
                  >
                    {step}
                  </div>

                  {/* Card */}
                  <div
                    className="w-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
                      {desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            AGENCY TIERS
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-28 md:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Agency tiers</h2>
            <p className="mx-auto max-w-xl text-lg" style={{ color: '#94A3B8' }}>
              Start small or go all-in — every tier includes white-labeling and bulk pricing.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {AGENCY_TIERS.map(({ name, price, period, widgets, features, highlight, cta }) => (
              <motion.div
                key={name}
                variants={cardVariant}
                className="relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: highlight
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                    : 'rgba(255,255,255,0.025)',
                  border: highlight ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* Shimmer top */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: highlight
                      ? 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                  }}
                />

                {/* Popular badge */}
                {highlight && (
                  <div
                    className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818CF8',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#818CF8' }} />
                    Most Popular
                  </div>
                )}

                {/* Tier info */}
                <h3 className="mb-1 text-lg font-bold text-white">{name}</h3>
                <p className="mb-4 text-sm font-medium" style={{ color: highlight ? '#818CF8' : '#60A5FA' }}>
                  {widgets}
                </p>

                {/* Price */}
                <div className="mb-6 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{price}</span>
                  {period && (
                    <span className="mb-1 text-lg" style={{ color: '#64748B' }}>
                      {period}
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm" style={{ color: '#94A3B8' }}>
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          background: highlight ? 'rgba(99,102,241,0.2)' : 'rgba(59,130,246,0.15)',
                          color: highlight ? '#818CF8' : '#60A5FA',
                        }}
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {cta === 'Contact Sales' ? (
                  <a
                    href="mailto:agency@winbixai.com?subject=Agency Enterprise Inquiry"
                    className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#E2E8F0',
                    }}
                  >
                    {cta}
                  </a>
                ) : (
                  <a
                    href="mailto:agency@winbixai.com?subject=Agency Program Application"
                    className="block w-full rounded-xl py-3 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                    style={
                      highlight
                        ? {
                            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                          }
                        : {
                            background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.25)',
                            color: '#93C5FD',
                          }
                    }
                  >
                    {cta}
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════
            BOTTOM CTA
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-4xl px-6 pb-28 text-center md:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="relative overflow-hidden rounded-3xl p-12"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(99,102,241,0.15)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.04), transparent)',
              }}
            />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                Ready to grow your{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #818CF8, #A78BFA)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  agency
                </span>
                ?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg" style={{ color: '#94A3B8' }}>
                Apply today and get approved within 24 hours. No upfront cost, no risk.
              </p>

              <a
                href="mailto:agency@winbixai.com?subject=Agency Program Application"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}
              >
                Apply for Agency Program
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
