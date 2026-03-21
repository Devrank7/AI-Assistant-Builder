'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  BookOpen,
  Globe,
  BarChart3,
  Plug,
  Users,
  Sparkles,
  Code,
  Palette,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

/* ── Animation variants ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.25, 0.4, 0.25, 1] as const,
      delay: i * 0.08,
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

/* ── Feature data ───────────────────────────────────────── */
const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI Chat Widgets',
    description:
      'Deploy in minutes with custom branding and Shadow DOM isolation for conflict-free embedding on any website.',
    bullets: ['Deploy in minutes', 'Custom branding', 'Shadow DOM isolation'],
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description:
      'Auto-crawl your website and power answers with RAG retrieval. Automatically detects knowledge gaps for continuous improvement.',
    bullets: ['Auto-crawl websites', 'RAG-powered answers', 'Knowledge gap detection'],
    accent: 'from-violet-500 to-purple-600',
  },
  {
    icon: Globe,
    title: 'Multi-Channel',
    description:
      'One knowledge base, every channel. Engage customers across web chat, Telegram, WhatsApp, and Instagram DMs seamlessly.',
    bullets: ['Web chat', 'Telegram & WhatsApp', 'Instagram DMs'],
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & A/B Testing',
    description:
      'Real-time metrics with statistical significance testing. AI quality scores highlight where your bot excels and where it needs work.',
    bullets: ['Real-time metrics', 'Statistical significance', 'AI quality scores'],
    accent: 'from-orange-500 to-amber-500',
  },
  {
    icon: Plug,
    title: 'Integration Hub',
    description:
      'Connect to 10+ integrations out of the box. Webhooks and custom event triggers let you wire WinBix into any workflow.',
    bullets: ['10+ integrations', 'Webhooks', 'Custom event triggers'],
    accent: 'from-pink-500 to-rose-500',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Granular roles and permissions, a full audit log, and org management so your team can collaborate safely at scale.',
    bullets: ['Roles & permissions', 'Audit log', 'Org management'],
    accent: 'from-indigo-500 to-blue-600',
  },
  {
    icon: Sparkles,
    title: 'AI Builder',
    description:
      'A visual no-code builder with live preview so anyone on your team can create, iterate, and publish chat agents without writing a line of code.',
    bullets: ['Visual builder', 'No-code customization', 'Live preview'],
    accent: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Code,
    title: 'Developer API',
    description:
      'Full REST API v1 with API key management and interactive docs. Build custom integrations or embed WinBix into your own product.',
    bullets: ['REST API v1', 'API keys', 'Interactive docs'],
    accent: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Palette,
    title: 'White-Label',
    description:
      'Ship under your own brand. Custom domain support, full branding control, and the option to hide WinBix branding entirely.',
    bullets: ['Custom branding', 'Custom domain', 'Hide WinBix branding'],
    accent: 'from-fuchsia-500 to-pink-600',
  },
] as const;

/* ── Comparison data ────────────────────────────────────── */
type ComparisonValue = string | boolean;

const COMPARISON_ROWS: Array<{
  feature: string;
  winbix: ComparisonValue;
  generic: ComparisonValue;
  custom: ComparisonValue;
}> = [
  { feature: 'Setup Time', winbix: '< 5 minutes', generic: '1–2 days', custom: '4–12 weeks' },
  { feature: 'AI Quality', winbix: 'GPT-4 / Gemini Pro', generic: 'Basic rules', custom: 'Varies' },
  { feature: 'Multi-Channel', winbix: true, generic: false, custom: false },
  { feature: 'API Access', winbix: true, generic: false, custom: true },
  { feature: 'White-Label', winbix: true, generic: false, custom: true },
  { feature: 'Price', winbix: 'From $0/mo', generic: '$50–300/mo', custom: '$10k+ upfront' },
];

/* ── Cell helpers ───────────────────────────────────────── */
function ComparisonCell({ value, highlight = false }: { value: ComparisonValue; highlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center justify-center">
        <Check className={`h-5 w-5 ${highlight ? 'text-accent' : 'text-emerald-500'}`} strokeWidth={2.5} />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center">
        <X className="text-text-tertiary h-5 w-5" strokeWidth={2} />
      </span>
    );
  }
  return <span className={`text-sm font-medium ${highlight ? 'text-accent' : 'text-text-secondary'}`}>{value}</span>;
}

/* ── Page ───────────────────────────────────────────────── */
export default function FeaturesPage() {
  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      <MarketingNav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        {/* Ambient background blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 800px 600px at 50% -10%, rgba(59,130,246,0.08), transparent),' +
              'radial-gradient(ellipse 500px 500px at 80% 60%, rgba(99,102,241,0.05), transparent)',
          }}
        />

        <div className="mx-auto max-w-4xl px-6 text-center md:px-8">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const }}
            className="border-accent/20 bg-accent-subtle text-accent mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider uppercase"
          >
            <span className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
            Platform Features
          </motion.div>

          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-6 text-4xl leading-tight font-bold tracking-tight md:text-6xl"
          >
            Everything you need to{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              deploy AI chat agents
            </span>
          </motion.h1>

          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-text-secondary mx-auto max-w-2xl text-lg leading-relaxed md:text-xl"
          >
            From no-code builder to developer API — one platform for all your AI customer engagement needs
          </motion.p>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────── */}
      <section className="relative pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ scale: 1.025, y: -4 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] as const }}
                  className="group border-border bg-bg-secondary relative flex flex-col gap-4 rounded-2xl border p-6 shadow-sm transition-shadow duration-300 hover:shadow-md"
                  style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Top-edge gradient line on hover */}
                  <div
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r ${feature.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  {/* Icon */}
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} shadow-sm`}
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className="text-text-primary mb-2 text-base font-semibold">{feature.title}</h3>
                    <p className="text-text-secondary mb-4 text-sm leading-relaxed">{feature.description}</p>

                    {/* Bullets */}
                    <ul className="space-y-1.5">
                      {feature.bullets.map((b) => (
                        <li key={b} className="text-text-secondary flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${feature.accent}`}
                          >
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────── */}
      <section className="bg-bg-secondary py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.25, 0.4, 0.25, 1] as const }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">WinBix vs Alternatives</h2>
            <p className="text-text-secondary">
              See why teams choose WinBix AI over generic chatbots and costly custom builds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const, delay: 0.1 }}
            className="border-border overflow-x-auto rounded-2xl border"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-bg-primary border-b">
                  <th className="text-text-tertiary px-6 py-4 text-left text-xs font-semibold tracking-wider uppercase">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                        <span className="text-xs font-extrabold text-white">W</span>
                      </div>
                      <span className="text-accent text-xs font-bold">WinBix AI</span>
                    </div>
                  </th>
                  <th className="text-text-tertiary px-6 py-4 text-center text-xs font-semibold tracking-wider uppercase">
                    Generic Chatbot
                  </th>
                  <th className="text-text-tertiary px-6 py-4 text-center text-xs font-semibold tracking-wider uppercase">
                    Custom Build
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-border hover:bg-bg-tertiary border-b transition-colors duration-150 last:border-0 ${i % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-primary'}`}
                  >
                    <td className="text-text-primary px-6 py-4 font-medium">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      <ComparisonCell value={row.winbix} highlight />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ComparisonCell value={row.generic} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ComparisonCell value={row.custom} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        {/* Background radial */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: 'radial-gradient(ellipse 700px 500px at 50% 50%, rgba(59,130,246,0.07), transparent)',
          }}
        />

        <div className="mx-auto max-w-3xl px-6 text-center md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const }}
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
              Start building{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                for free
              </span>
            </h2>
            <p className="text-text-secondary mb-10 text-lg">
              Deploy your first AI chat agent in under 5 minutes. No credit card required.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/pricing"
                className="bg-accent hover:bg-accent-hover group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              >
                Start Building for Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/pricing"
                className="border-border hover:border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-tertiary inline-flex items-center gap-2 rounded-xl border px-8 py-4 text-base font-medium transition-all duration-200"
              >
                View Pricing
              </Link>
            </div>

            {/* Trust line */}
            <p className="text-text-tertiary mt-8 text-sm">
              Free plan available · No credit card required · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
