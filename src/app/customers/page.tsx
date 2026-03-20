'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Star, Quote, Stethoscope, ShoppingBag, Building2, Briefcase, ArrowRight, TrendingUp } from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

/* ─────────────────────────────────────────────
   Animated counter hook (viewport-triggered)
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 2200, startOnMount = false) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(startOnMount);

  const start = () => setStarted(true);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const totalFrames = Math.round((duration / 1000) * 60);
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (frame >= totalFrames) {
        setCount(target);
        clearInterval(timer);
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, start };
}

/* ─────────────────────────────────────────────
   Stat counter card
───────────────────────────────────────────── */
function StatCard({
  value,
  suffix,
  prefix,
  label,
  delay,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const { count, start } = useCountUp(value, 2000);

  useEffect(() => {
    if (inView) start();
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className="flex flex-col items-center gap-2 px-8 py-6"
    >
      <span className="bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
        {prefix}
        {count}
        {suffix}
      </span>
      <span className="text-text-secondary text-sm font-medium tracking-wide">{label}</span>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Star rating row
───────────────────────────────────────────── */
function Stars() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Animation variants
───────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'WinBix AI transformed our customer support. Response times dropped 80%.',
    name: 'Dr. Maria Santos',
    role: 'Dental Clinic Owner',
    gradient: 'from-cyan-500/20 to-blue-600/10',
    borderGlow: 'rgba(6, 182, 212, 0.2)',
  },
  {
    quote: 'We deployed AI widgets for 50+ clients in a week. The agency program is incredible.',
    name: 'Alex Petrov',
    role: 'Digital Agency CEO',
    gradient: 'from-violet-500/20 to-indigo-600/10',
    borderGlow: 'rgba(139, 92, 246, 0.2)',
  },
  {
    quote: 'The analytics and A/B testing helped us optimize our conversion rate by 35%.',
    name: 'Sarah Chen',
    role: 'E-Commerce Director',
    gradient: 'from-emerald-500/20 to-teal-600/10',
    borderGlow: 'rgba(16, 185, 129, 0.2)',
  },
] as const;

const USE_CASES = [
  {
    icon: Stethoscope,
    title: 'Dental Clinics',
    description: 'AI appointment booking & FAQ',
    result: '65% reduction in phone calls',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    glow: 'rgba(6,182,212,0.15)',
  },
  {
    icon: ShoppingBag,
    title: 'E-Commerce',
    description: 'Product recommendations & support',
    result: '35% increase in conversions',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    icon: Building2,
    title: 'Hotels',
    description: 'Multi-language guest assistance',
    result: '4.8★ guest satisfaction',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: 'rgba(16,185,129,0.15)',
  },
  {
    icon: Briefcase,
    title: 'Agencies',
    description: 'White-label AI for clients',
    result: '50+ widgets deployed per agency',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    glow: 'rgba(245,158,11,0.15)',
  },
] as const;

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function CustomersPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060810] text-white">
      {/* Background mesh */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 800px 600px at 15% 0%, rgba(59,130,246,0.07), transparent),
            radial-gradient(ellipse 600px 500px at 85% 70%, rgba(99,102,241,0.05), transparent),
            radial-gradient(ellipse 500px 400px at 50% 45%, rgba(6,182,212,0.03), transparent)
          `,
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.011) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.011) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />

      {/* ── Navigation ── */}
      <div className="relative z-50">
        <MarketingNav />
      </div>

      {/* ── Main content ── */}
      <main className="relative z-10">
        {/* ═══════════════════════════════════════
            HERO
        ═══════════════════════════════════════ */}
        <section className="mx-auto max-w-5xl px-6 pt-32 pb-20 text-center md:pt-40 md:pb-24">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            custom={0.05}
            initial="hidden"
            animate="visible"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/8 px-4 py-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Customer Stories</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={0.12}
            initial="hidden"
            animate="visible"
            className="mb-6 text-5xl font-extrabold tracking-tight text-white md:text-7xl"
          >
            Trusted by businesses{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              worldwide
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={0.2}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-400 md:text-2xl"
          >
            From dental clinics to enterprise agencies — see how businesses of every size deploy AI-powered chat widgets
            that convert visitors into customers.
          </motion.p>
        </section>

        {/* ═══════════════════════════════════════
            STATS BAR
        ═══════════════════════════════════════ */}
        <section className="relative mx-auto max-w-5xl px-6 pb-20">
          <div
            className="overflow-hidden rounded-2xl border"
            style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderColor: 'rgba(255,255,255,0.07)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Top highlight line */}
            <div
              className="h-px w-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), rgba(99,102,241,0.4), transparent)',
              }}
            />
            <div className="grid grid-cols-1 divide-y divide-white/[0.05] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <StatCard value={500} suffix="+" label="Widgets Deployed" delay={0.05} />
              <StatCard value={10} suffix="M+" label="Messages Processed" delay={0.15} />
              <StatCard value={99.9} suffix="%" label="Uptime" delay={0.25} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            TESTIMONIALS
        ═══════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          {/* Section heading */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">What our customers say</h2>
            <p className="text-gray-400">Real results from real businesses using WinBix AI every day.</p>
          </motion.div>

          {/* Cards grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                variants={cardVariant}
                className="group relative overflow-hidden rounded-2xl border p-7 transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
                whileHover={{
                  y: -4,
                  borderColor: t.borderGlow,
                  boxShadow: `0 16px 48px rgba(0,0,0,0.3), 0 0 32px ${t.borderGlow}`,
                  transition: { duration: 0.25 },
                }}
              >
                {/* Gradient overlay */}
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${t.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                {/* Top inset highlight */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                  }}
                />

                <div className="relative z-10 flex h-full flex-col gap-5">
                  {/* Quote icon */}
                  <Quote className="h-6 w-6 text-blue-400/60" />

                  {/* Stars */}
                  <Stars />

                  {/* Quote text */}
                  <p className="flex-1 text-base leading-relaxed text-gray-200">&ldquo;{t.quote}&rdquo;</p>

                  {/* Author */}
                  <div className="flex items-center gap-3 border-t border-white/[0.06] pt-5">
                    {/* Avatar placeholder */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(99,102,241,0.3))',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {t.name
                        .split(' ')
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════
            USE CASES
        ═══════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          {/* Section heading */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">Built for your industry</h2>
            <p className="mx-auto max-w-xl text-gray-400">
              WinBix AI adapts to every business vertical with purpose-built AI flows and industry-specific knowledge.
            </p>
          </motion.div>

          {/* Cards grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <motion.div
                  key={uc.title}
                  variants={cardVariant}
                  className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255,255,255,0.07)',
                  }}
                  whileHover={{
                    y: -4,
                    borderColor: uc.glow,
                    boxShadow: `0 12px 40px rgba(0,0,0,0.3), 0 0 24px ${uc.glow}`,
                    transition: { duration: 0.25 },
                  }}
                >
                  {/* Top highlight */}
                  <div
                    className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${uc.glow}, transparent)`,
                    }}
                  />

                  <div className="relative z-10 flex flex-col gap-4">
                    {/* Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${uc.bg}`}>
                      <Icon className={`h-6 w-6 ${uc.color}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white">{uc.title}</h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-gray-400">{uc.description}</p>

                    {/* Result pill */}
                    <div
                      className="mt-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: uc.glow,
                        border: `1px solid ${uc.glow}`,
                      }}
                    >
                      <TrendingUp className={`h-3 w-3 ${uc.color}`} />
                      <span className={uc.color}>{uc.result}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════
            CTA
        ═══════════════════════════════════════ */}
        <section className="mx-auto max-w-4xl px-6 pb-28">
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative overflow-hidden rounded-3xl border p-12 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.04), rgba(6,182,212,0.03))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(59,130,246,0.18)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 48px rgba(59,130,246,0.06)',
            }}
          >
            {/* Decorative glow orb */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: 'rgba(59,130,246,0.12)' }}
            />
            {/* Top highlight */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), rgba(99,102,241,0.4), transparent)',
              }}
            />

            <div className="relative z-10">
              <p className="mb-3 text-sm font-semibold tracking-widest text-blue-400 uppercase">Get Started</p>
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Join hundreds of businesses
              </h2>
              <p className="mx-auto mb-10 max-w-lg text-lg text-gray-400">
                Deploy your first AI widget in minutes. No coding required. Cancel anytime.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/pricing"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  View Pricing Plans
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-gray-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  Try a Live Demo
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ── */}
      <MarketingFooter />
    </div>
  );
}
