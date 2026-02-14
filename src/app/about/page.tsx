'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import WidgetGenerator from '@/components/WidgetGenerator';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/* ─── Floating Orb ─── */
function FloatingOrb({
  size,
  color,
  top,
  left,
  delay,
}: {
  size: number;
  color: string;
  top: string;
  left: string;
  delay: number;
}) {
  return (
    <div
      className="animate-float-slow pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        opacity: 0.3,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

/* ─── Particle Field ─── */
function ParticleField() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
      }))
    );
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="animate-pulse-glow absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
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
      } else {
        setCount(Math.floor(start));
      }
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

/* ─── Section wrapper with fade-in ─── */
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
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function AboutPage() {
  const { t } = useTranslation('about');
  const { t: tc } = useTranslation('common');

  return (
    <div className="bg-gradient-animated relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="aurora" />
      <ParticleField />
      <FloatingOrb size={500} color="rgba(124, 58, 237, 0.15)" top="-5%" left="-5%" delay={0} />
      <FloatingOrb size={400} color="rgba(0, 229, 255, 0.12)" top="40%" left="75%" delay={3} />
      <FloatingOrb size={350} color="rgba(255, 45, 135, 0.1)" top="70%" left="20%" delay={6} />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />

      {/* Navigation */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-white transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
              />
            </svg>
          </div>
          <span className="text-lg font-bold">WinBix AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            {tc('nav.home')}
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        {/* ═══════════════════════════════════════════ */}
        {/* HERO */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pt-12 pb-20 text-center md:pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
              WinBix <span className="gradient-text">AI</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-400 md:text-2xl">
              {t('hero.subtitle')} <span className="text-white">{t('hero.highlight')}</span>
            </p>
          </motion.div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* PROBLEM → SOLUTION */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('problem.title.before')}
              <span className="text-red-400">{t('problem.title.accent')}</span>
              {t('problem.title.after')}
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">{t('problem.desc')}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass group rounded-2xl border-white/5 p-8 text-center transition-all duration-500 hover:border-cyan-500/30 hover:bg-white/[0.06]"
            >
              <div className="mb-4 text-5xl font-bold text-[var(--neon-cyan)]">
                +<AnimatedCounter target={30} suffix="-40" />
              </div>
              <p className="text-lg font-medium text-white">{t('metrics.records.label')}</p>
              <p className="mt-2 text-sm text-gray-500">{t('metrics.records.sub')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass group rounded-2xl border-white/5 p-8 text-center transition-all duration-500 hover:border-purple-500/30 hover:bg-white/[0.06]"
            >
              <div className="mb-4 text-5xl font-bold text-[var(--neon-purple)]">24/7</div>
              <p className="text-lg font-medium text-white">{t('metrics.uptime.label')}</p>
              <p className="mt-2 text-sm text-gray-500">{t('metrics.uptime.sub')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass group rounded-2xl border-white/5 p-8 text-center transition-all duration-500 hover:border-pink-500/30 hover:bg-white/[0.06]"
            >
              <div className="mb-4 text-5xl font-bold text-[var(--neon-pink)]">
                &lt;
                <AnimatedCounter target={3} />с
              </div>
              <p className="text-lg font-medium text-white">{t('metrics.speed.label')}</p>
              <p className="mt-2 text-sm text-gray-500">{t('metrics.speed.sub')}</p>
            </motion.div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* HOW IT WORKS */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('how.title.before')}
              <span className="gradient-text">{t('how.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{t('how.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass group relative rounded-2xl border-white/5 p-8 transition-all duration-500 hover:border-cyan-500/20"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-2xl font-bold text-[var(--neon-cyan)]">
                01
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step1.title')}</h3>
              <p className="leading-relaxed text-gray-400">{t('how.step1.desc')}</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass group relative rounded-2xl border-white/5 p-8 transition-all duration-500 hover:border-purple-500/20"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 text-2xl font-bold text-[var(--neon-purple)]">
                02
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step2.title')}</h3>
              <p className="leading-relaxed text-gray-400">{t('how.step2.desc')}</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass group relative rounded-2xl border-white/5 p-8 transition-all duration-500 hover:border-pink-500/20"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-2xl font-bold text-[var(--neon-pink)]">
                03
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">{t('how.step3.title')}</h3>
              <p className="leading-relaxed text-gray-400">{t('how.step3.desc')}</p>
            </motion.div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* TRY IT YOURSELF */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('try.title.before')}
              <span className="gradient-text">{t('try.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{t('try.desc')}</p>
          </div>
          <WidgetGenerator />
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* WHAT THE ASSISTANT CAN DO */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('features.title.before')}
              <span className="gradient-text">{t('features.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{t('features.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { icon: '💬', title: t('features.chat.title'), desc: t('features.chat.desc') },
              { icon: '📋', title: t('features.booking.title'), desc: t('features.booking.desc') },
              { icon: '🌐', title: t('features.lang.title'), desc: t('features.lang.desc') },
              { icon: '📊', title: t('features.analytics.title'), desc: t('features.analytics.desc') },
              { icon: '🎨', title: t('features.design.title'), desc: t('features.design.desc') },
              { icon: '🔗', title: t('features.channels.title'), desc: t('features.channels.desc') },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass flex gap-5 rounded-2xl border-white/5 p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-2xl">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* CRM / CALENDAR INTEGRATIONS */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('integrations.title.before')}
              <span className="gradient-text">{t('integrations.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">{t('integrations.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* CRM */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass group relative overflow-hidden rounded-2xl border-white/5 p-8 transition-all duration-500 hover:border-cyan-500/30 hover:bg-white/[0.06]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
                  <svg
                    className="h-7 w-7 text-[var(--neon-cyan)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-6.364-6.364L4.5 8.257m9.86-3.06l4.5 4.5"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.crm.title')}</h3>
                <p className="leading-relaxed text-gray-400">{t('integrations.crm.desc')}</p>
              </div>
            </motion.div>

            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass group relative overflow-hidden rounded-2xl border-white/5 p-8 transition-all duration-500 hover:border-purple-500/30 hover:bg-white/[0.06]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                  <svg
                    className="h-7 w-7 text-[var(--neon-purple)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.calendar.title')}</h3>
                <p className="leading-relaxed text-gray-400">{t('integrations.calendar.desc')}</p>
              </div>
            </motion.div>

            {/* Auto-booking — special accent card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass group relative overflow-hidden rounded-2xl border-2 border-[var(--neon-cyan)]/20 p-8 transition-all duration-500 hover:border-[var(--neon-cyan)]/40 hover:bg-white/[0.06]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/5 via-[var(--neon-purple)]/5 to-transparent" />
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-purple)]/10">
                  <svg
                    className="h-7 w-7 text-[var(--neon-cyan)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{t('integrations.booking.title')}</h3>
                <p className="leading-relaxed text-gray-400">{t('integrations.booking.desc')}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--neon-cyan)]/10 px-3 py-1 text-xs font-medium text-[var(--neon-cyan)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--neon-cyan)]" />
                  AI-powered
                </div>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* FOUNDERS */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('team.title.before')}
              <span className="gradient-text">{t('team.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">{t('team.desc')}</p>
          </div>

          <div className="glass mx-auto max-w-3xl rounded-2xl border-white/5 p-8 md:p-12">
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              {t('team.bio1')
                .split(/\{(daniil|misha|serzha)\}/g)
                .map((part, i) => {
                  if (part === 'daniil')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.daniil')}
                      </span>
                    );
                  if (part === 'misha')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.misha')}
                      </span>
                    );
                  if (part === 'serzha')
                    return (
                      <span key={i} className="font-semibold text-white">
                        {t('team.serzha')}
                      </span>
                    );
                  return <span key={i}>{part}</span>;
                })}
            </p>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              {t('team.bio2')
                .split(/\{winbix\}/g)
                .map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="font-semibold text-[var(--neon-cyan)]">WinBix AI</span>}
                  </span>
                ))}
            </p>
            <p className="text-lg leading-relaxed text-gray-300">{t('team.bio3')}</p>

            {/* Founder avatars */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
              {[
                { name: t('team.daniil'), role: 'Co-founder', gradient: 'from-cyan-500 to-blue-600' },
                { name: t('team.misha'), role: 'Co-founder', gradient: 'from-purple-500 to-pink-600' },
                { name: t('team.serzha'), role: 'Co-founder', gradient: 'from-pink-500 to-orange-500' },
              ].map((founder) => (
                <div key={founder.name} className="text-center">
                  <div
                    className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${founder.gradient} text-2xl font-bold text-white shadow-lg`}
                  >
                    {founder.name[0]}
                  </div>
                  <p className="font-semibold text-white">{founder.name}</p>
                  <p className="text-sm text-gray-500">{founder.role}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* CASE STUDIES */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              {t('cases.title.before')}
              <span className="gradient-text">{t('cases.title.accent')}</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">{t('cases.desc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                number: '01',
                borderColor: 'hover:border-cyan-500/30',
                accentColor: 'text-[var(--neon-cyan)]',
                gradientBg: 'from-cyan-500/10 to-transparent',
              },
              {
                number: '02',
                borderColor: 'hover:border-purple-500/30',
                accentColor: 'text-[var(--neon-purple)]',
                gradientBg: 'from-purple-500/10 to-transparent',
              },
              {
                number: '03',
                borderColor: 'hover:border-pink-500/30',
                accentColor: 'text-[var(--neon-pink)]',
                gradientBg: 'from-pink-500/10 to-transparent',
              },
            ].map((cs, i) => (
              <motion.div
                key={cs.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`glass group rounded-2xl border-white/5 transition-all duration-500 ${cs.borderColor}`}
              >
                {/* Screenshot placeholder */}
                <div
                  className={`flex h-48 items-center justify-center rounded-t-2xl bg-gradient-to-b ${cs.gradientBg}`}
                >
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">{t('cases.screenshot')}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className={`mb-3 text-sm font-bold ${cs.accentColor}`}>
                    {t('cases.case')} {cs.number}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{t('cases.name')}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-400">{t('cases.body')}</p>

                  {/* Feedback quote */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-sm text-gray-400 italic">&ldquo;{t('cases.quote')}&rdquo;</p>
                    <p className="mt-2 text-xs text-gray-600">{t('cases.author')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* CTA */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-16">
          <div className="glass relative overflow-hidden rounded-3xl border-white/5 p-12 text-center md:p-16">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5" />

            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                {t('cta.title.before')}
                <span className="gradient-text">{t('cta.title.accent')}</span>?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">{t('cta.desc')}</p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="https://t.me/winbix_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30"
                >
                  <span>{t('cta.telegram')}</span>
                  <svg
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>

                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-lg font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  {t('cta.demo')}
                </Link>
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════════ */}
        <div className="glow-line mt-8 mb-8 h-px" />
        <footer className="flex flex-col items-center justify-between gap-4 text-sm text-gray-600 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.privacy')}
            </Link>
            <Link href="/terms" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.terms')}
            </Link>
            <Link href="/" className="text-gray-500 transition-colors hover:text-gray-300">
              {tc('footer.home')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
