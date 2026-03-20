'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { Infinity, Palette, Code, Headphones, Shield, Lock, Plug, Zap } from 'lucide-react';

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

/* ─── Enterprise features ─── */
const ENTERPRISE_FEATURES = [
  {
    icon: Infinity,
    title: 'Unlimited Widgets & Messages',
    desc: 'No caps, no throttling. Deploy as many widgets as your business demands with unlimited message throughput.',
    color: 'from-cyan-500/20 to-blue-500/20',
    iconColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-500/30',
  },
  {
    icon: Palette,
    title: 'White-Label Branding',
    desc: 'Custom domain, remove all WinBix branding. Your product, your identity — powered by our infrastructure.',
    color: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400',
    borderHover: 'hover:border-purple-500/30',
  },
  {
    icon: Code,
    title: 'Developer API',
    desc: '1,000 req/min rate limit with full API access. Build anything on top of WinBix with our comprehensive REST API.',
    color: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-400',
    borderHover: 'hover:border-green-500/30',
  },
  {
    icon: Headphones,
    title: 'Dedicated Account Manager',
    desc: 'Your own named contact at WinBix. Onboarding, strategy sessions, and ongoing support whenever you need it.',
    color: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/30',
  },
  {
    icon: Shield,
    title: 'SLA Guarantee',
    desc: '99.99% uptime SLA with financial penalties if we miss. Enterprise-level reliability your customers can count on.',
    color: 'from-yellow-500/20 to-orange-500/20',
    iconColor: 'text-yellow-400',
    borderHover: 'hover:border-yellow-500/30',
  },
  {
    icon: Lock,
    title: 'SSO & Advanced Security',
    desc: 'AES-256 encryption at rest, HMAC-SHA256 webhook signing, SAML/OIDC SSO, and IP whitelisting out of the box.',
    color: 'from-red-500/20 to-rose-500/20',
    iconColor: 'text-red-400',
    borderHover: 'hover:border-red-500/30',
  },
  {
    icon: Plug,
    title: 'Custom Integrations',
    desc: 'Priority plugin development for your ecosystem. Our engineers build the connectors your workflows require.',
    color: 'from-indigo-500/20 to-violet-500/20',
    iconColor: 'text-indigo-400',
    borderHover: 'hover:border-indigo-500/30',
  },
  {
    icon: Zap,
    title: 'Priority Support',
    desc: '1-hour response time SLA. Escalation paths to senior engineers. 24/7 incident coverage for production issues.',
    color: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-400',
    borderHover: 'hover:border-amber-500/30',
  },
];

/* ─── Security items ─── */
const SECURITY_ITEMS = [
  {
    label: 'AES-256 Encryption',
    desc: 'All data encrypted at rest and in transit using industry-standard AES-256.',
    icon: '🔐',
  },
  {
    label: 'GDPR Ready',
    desc: 'Full GDPR compliance with data residency controls and DPA agreements available.',
    icon: '🇪🇺',
  },
  {
    label: 'SOC 2 (Coming Q3)',
    desc: 'SOC 2 Type II certification in progress. Expected Q3 2026.',
    icon: '📋',
  },
  {
    label: 'HMAC-SHA256 Webhooks',
    desc: 'Every webhook payload is signed with HMAC-SHA256 for tamper-proof delivery.',
    icon: '🔏',
  },
  {
    label: 'IP Whitelisting',
    desc: 'Restrict API access to approved IP ranges. Zero-trust ready.',
    icon: '🛡️',
  },
];

export default function EnterprisePage() {
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
            radial-gradient(ellipse 900px 600px at 15% 0%, rgba(59,130,246,0.08), transparent),
            radial-gradient(ellipse 700px 500px at 85% 20%, rgba(99,102,241,0.06), transparent),
            radial-gradient(ellipse 500px 400px at 50% 80%, rgba(139,92,246,0.04), transparent)
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
              background: 'rgba(59,130,246,0.08)',
              borderColor: 'rgba(59,130,246,0.2)',
              color: '#60A5FA',
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#60A5FA' }} />
            Enterprise
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.05}
            className="mb-6 text-5xl leading-[1.1] font-extrabold tracking-tight text-white md:text-7xl"
          >
            Enterprise{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #60A5FA, #818CF8, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              AI Chat
            </span>{' '}
            Platform
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
            Built for scale. <span className="font-medium text-white">Designed for teams.</span> Secured for enterprise.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.15}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="mailto:sales@winbixai.com?subject=Enterprise Plan Inquiry"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              }}
            >
              Contact Sales
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#E2E8F0',
              }}
            >
              Start Free Trial
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="mt-8 text-sm"
            style={{ color: '#64748B' }}
          >
            99.99% SLA &bull; AES-256 encryption &bull; GDPR ready &bull; No credit card required
          </motion.p>
        </section>

        {/* ══════════════════════════════════════════════
            ENTERPRISE FEATURES GRID
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
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Everything your enterprise needs</h2>
            <p className="mx-auto max-w-xl text-lg" style={{ color: '#94A3B8' }}>
              Purpose-built features for large teams, regulated industries, and global deployments.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {ENTERPRISE_FEATURES.map(({ icon: Icon, title, desc, color, iconColor, borderHover }) => (
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
                {/* Card gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                {/* Top shimmer line */}
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
            SECURITY SECTION
        ══════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-28 md:px-8">
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-14"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Background glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(99,102,241,0.03), transparent)',
              }}
            />

            <div className="relative z-10 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
              {/* Left: heading */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0}
                className="lg:w-80 lg:shrink-0"
              >
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
                  style={{
                    background: 'rgba(99,102,241,0.08)',
                    borderColor: 'rgba(99,102,241,0.2)',
                    color: '#818CF8',
                  }}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Security
                </div>
                <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Enterprise-Grade Security</h2>
                <p className="leading-relaxed" style={{ color: '#94A3B8' }}>
                  Security is not an add-on — it is the foundation. Every layer of WinBix is built with enterprise
                  compliance in mind.
                </p>
              </motion.div>

              {/* Right: security items */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
              >
                {SECURITY_ITEMS.map(({ label, desc, icon }) => (
                  <motion.div
                    key={label}
                    variants={cardVariant}
                    className="flex gap-4 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-2xl leading-none">{icon}</span>
                    <div>
                      <p className="mb-1 font-semibold text-white">{label}</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
                        {desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
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
              border: '1px solid rgba(59,130,246,0.15)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(99,102,241,0.04), transparent)',
              }}
            />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                Ready to go{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #60A5FA, #818CF8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  enterprise
                </span>
                ?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg" style={{ color: '#94A3B8' }}>
                Talk to our sales team and get a custom quote. We typically respond within one business hour.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:sales@winbixai.com?subject=Enterprise Plan Inquiry"
                  className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                  }}
                >
                  Contact Sales
                </a>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#E2E8F0',
                  }}
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
