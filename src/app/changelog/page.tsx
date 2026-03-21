'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { Rocket, Sparkles, Wrench, ArrowUp, Calendar } from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

/* ─── Types ─── */
type BadgeType = 'new' | 'improved' | 'fixed';

interface ChangeEntry {
  type: BadgeType;
  title: string;
  description: string;
}

interface ReleaseMonth {
  month: string;
  entries: ChangeEntry[];
}

/* ─── Static release data ─── */
const RELEASES: ReleaseMonth[] = [
  {
    month: 'March 2026',
    entries: [
      {
        type: 'new',
        title: 'Developer API Platform',
        description: 'REST API v1 with API key management and interactive documentation',
      },
      {
        type: 'new',
        title: 'Integration Hub v2',
        description: 'Webhook management, extended events, widget bindings, retry with exponential backoff',
      },
      {
        type: 'new',
        title: 'Enterprise Dashboard',
        description: 'A/B test statistical significance, AI quality metrics, white-label settings, team audit log',
      },
      {
        type: 'improved',
        title: 'Onboarding & Growth',
        description: 'Referral program, automated email sequences, smart notifications',
      },
    ],
  },
  {
    month: 'February 2026',
    entries: [
      {
        type: 'new',
        title: 'Contact CRM',
        description: 'Lead scoring, contact management, multi-channel tracking',
      },
      {
        type: 'new',
        title: 'Unified Inbox',
        description: 'Conversation threads, real-time updates, channel badges',
      },
      {
        type: 'new',
        title: 'Flow Builder',
        description: 'Visual automation editor with trigger-action flows',
      },
      {
        type: 'improved',
        title: 'Dashboard',
        description: 'Empty states with animations, improved navigation',
      },
    ],
  },
  {
    month: 'January 2026',
    entries: [
      {
        type: 'new',
        title: 'Multi-Channel Support',
        description: 'Telegram bots, WhatsApp (WHAPI), Instagram DM assistants',
      },
      {
        type: 'new',
        title: 'AI Builder',
        description: 'Visual widget builder powered by Gemini AI',
      },
      {
        type: 'new',
        title: 'Analytics Dashboard',
        description: 'Real-time conversation metrics, daily trends',
      },
      {
        type: 'new',
        title: 'Widget Builder v2',
        description: 'Component-based architecture, CSS custom properties',
      },
    ],
  },
  {
    month: 'December 2025',
    entries: [
      {
        type: 'new',
        title: 'Initial Launch',
        description: 'AI chat widgets with knowledge base, Preact + Shadow DOM',
      },
      {
        type: 'new',
        title: 'Admin Panel',
        description: 'Client management, knowledge uploads, AI settings',
      },
      {
        type: 'new',
        title: 'Payment Integration',
        description: 'WayForPay, Cryptomus, NowPayments',
      },
    ],
  },
];

/* ─── Badge config ─── */
const BADGE_CONFIG: Record<BadgeType, { label: string; className: string; icon: ReactNode }> = {
  new: {
    label: 'New',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    icon: <Rocket className="h-3 w-3" />,
  },
  improved: {
    label: 'Improved',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    icon: <ArrowUp className="h-3 w-3" />,
  },
  fixed: {
    label: 'Fixed',
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    icon: <Wrench className="h-3 w-3" />,
  },
};

/* ─── Animations ─── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const entryVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

/* ─── MonthSection ─── */
function MonthSection({ release, index }: { release: ReleaseMonth; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="relative grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
      {/* ── Date column ── */}
      <div className="flex items-start gap-2 md:sticky md:top-24 md:self-start md:pt-2">
        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cl-accent)]" />
        <span className="text-text-primary text-sm font-semibold">{release.month}</span>
      </div>

      {/* ── Content column ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="relative rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 backdrop-blur-md"
        style={{
          background: index % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.018)',
        }}
      >
        {/* top highlight line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          }}
        />

        <ul className="space-y-5">
          {release.entries.map((entry) => {
            const badge = BADGE_CONFIG[entry.type];
            return (
              <motion.li
                key={entry.title}
                variants={entryVariants}
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4"
              >
                {/* Badge */}
                <span
                  className={[
                    'inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
                    badge.className,
                  ].join(' ')}
                >
                  {badge.icon}
                  {badge.label}
                </span>

                {/* Text */}
                <div>
                  <p className="text-text-primary text-sm leading-snug font-semibold">{entry.title}</p>
                  <p className="text-text-secondary mt-0.5 text-sm leading-relaxed">{entry.description}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}

/* ─── Page ─── */
export default function ChangelogPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="bg-bg-primary relative min-h-screen overflow-x-hidden">
      {/* subtle mesh background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 700px 600px at 20% -10%, rgba(59,130,246,0.055), transparent),' +
            'radial-gradient(ellipse 500px 500px at 80% 90%, rgba(99,102,241,0.04), transparent)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.011) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.011) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* ── Nav ── */}
      <MarketingNav />

      {/* ── Main content ── */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-28 pb-24 md:px-8">
        {/* ── Hero ── */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 24 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.25, 0.4, 0.25, 1] as const }}
          className="mb-16 text-center"
        >
          {/* Eyebrow badge */}
          <div
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'rgba(59,130,246,0.07)',
              borderColor: 'rgba(59,130,246,0.18)',
              color: '#60A5FA',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Changelog
          </div>

          <h1 className="text-text-primary mb-4 text-5xl font-extrabold tracking-tight md:text-6xl">
            What&apos;s{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #60A5FA, #818CF8, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              New
            </span>
          </h1>
          <p className="text-text-secondary mx-auto max-w-xl text-lg leading-relaxed">
            Latest updates and improvements to WinBix AI
          </p>
        </motion.div>

        {/* ── Timeline ── */}
        <div className="flex flex-col gap-10">
          {RELEASES.map((release, i) => (
            <MonthSection key={release.month} release={release} index={i} />
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <MarketingFooter />
    </div>
  );
}
