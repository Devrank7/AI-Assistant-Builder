'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          На главную
        </Link>
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
              Мы создаём AI-ассистентов, которые превращают ваш сайт в машину продаж.{' '}
              <span className="text-white">24 часа в сутки. 7 дней в неделю. Без выходных.</span>
            </p>
          </motion.div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* PROBLEM → SOLUTION */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Сколько клиентов вы <span className="text-red-400">теряете</span> каждую ночь?
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400">
              Ваш сайт работает 24/7. А ваш менеджер — нет. Клиент заходит в 23:00, не находит ответ на свой вопрос, и
              уходит к конкуренту. Знакомо? Мы это исправили.
            </p>
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
              <p className="text-lg font-medium text-white">записей в месяц</p>
              <p className="mt-2 text-sm text-gray-500">дополнительно к вашим текущим</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass group rounded-2xl border-white/5 p-8 text-center transition-all duration-500 hover:border-purple-500/30 hover:bg-white/[0.06]"
            >
              <div className="mb-4 text-5xl font-bold text-[var(--neon-purple)]">24/7</div>
              <p className="text-lg font-medium text-white">без перерывов</p>
              <p className="mt-2 text-sm text-gray-500">отвечает мгновенно в любое время</p>
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
              <p className="text-lg font-medium text-white">время ответа</p>
              <p className="mt-2 text-sm text-gray-500">быстрее любого менеджера</p>
            </motion.div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* HOW IT WORKS */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Как это <span className="gradient-text">работает</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Три простых шага — и ваш сайт начинает продавать за вас
            </p>
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
              <h3 className="mb-3 text-xl font-bold text-white">Анализируем ваш бизнес</h3>
              <p className="leading-relaxed text-gray-400">
                Изучаем ваш сайт, услуги, цены и целевую аудиторию. Понимаем, какие вопросы задают ваши клиенты чаще
                всего.
              </p>
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
              <h3 className="mb-3 text-xl font-bold text-white">Создаём AI-ассистента</h3>
              <p className="leading-relaxed text-gray-400">
                Обучаем его на базе знаний вашего бизнеса. Он знает ваши услуги, цены, расписание — и говорит на языке
                ваших клиентов.
              </p>
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
              <h3 className="mb-3 text-xl font-bold text-white">Устанавливаем за 5 минут</h3>
              <p className="leading-relaxed text-gray-400">
                Одна строчка кода на вашем сайте — и AI-ассистент начинает работать. Отвечает клиентам, записывает на
                приём, собирает заявки.
              </p>
            </motion.div>
          </div>
        </Section>

        {/* ═══════════════════════════════════════════ */}
        {/* WHAT THE ASSISTANT CAN DO */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Ваш новый <span className="gradient-text">менеджер</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">
              Он не устаёт, не берёт отпуск и не опаздывает. Вот что он умеет:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              {
                icon: '💬',
                title: 'Отвечает на вопросы клиентов',
                desc: 'Знает всё о ваших услугах, ценах и расписании. Отвечает мгновенно — днём и ночью.',
              },
              {
                icon: '📋',
                title: 'Записывает на приём',
                desc: 'Собирает контактные данные и заявки. Вы получаете готового клиента утром.',
              },
              {
                icon: '🌐',
                title: 'Говорит на любом языке',
                desc: 'Украинский, русский, английский, польский — подстраивается под вашу аудиторию.',
              },
              {
                icon: '📊',
                title: 'Показывает аналитику',
                desc: 'Вы видите, сколько людей обратились, какие вопросы задают, и что можно улучшить.',
              },
              {
                icon: '🎨',
                title: 'Выглядит как часть вашего сайта',
                desc: 'Мы подбираем цвета, шрифты и стиль под ваш бренд. Виджет вписывается идеально.',
              },
              {
                icon: '🔗',
                title: 'Работает во всех каналах',
                desc: 'Сайт, Telegram, WhatsApp, Instagram — один ассистент для всех каналов.',
              },
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
        {/* FOUNDERS */}
        {/* ═══════════════════════════════════════════ */}
        <Section className="pb-24">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Команда <span className="gradient-text">WinBix</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">
              Три предпринимателя, одна миссия — сделать AI доступным для каждого бизнеса
            </p>
          </div>

          <div className="glass mx-auto max-w-3xl rounded-2xl border-white/5 p-8 md:p-12">
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              Мы — <span className="font-semibold text-white">Даниил</span>,{' '}
              <span className="font-semibold text-white">Миша</span> и{' '}
              <span className="font-semibold text-white">Серёжа</span>. Три предпринимателя, которые увидели одну и ту
              же проблему: бизнесы теряют десятки клиентов каждый месяц просто потому, что некому ответить на вопрос в
              нерабочее время.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              Мы создали <span className="font-semibold text-[var(--neon-cyan)]">WinBix AI</span>, чтобы решить эту
              проблему раз и навсегда. Наш AI-ассистент — это не просто чат-бот. Это полноценный менеджер, который знает
              ваш бизнес изнутри, умеет отвечать на сложные вопросы и доводит клиента до записи.
            </p>
            <p className="text-lg leading-relaxed text-gray-300">
              Мы уже помогли десяткам бизнесов автоматизировать общение с клиентами. И каждый день наша система
              становится умнее.
            </p>

            {/* Founder avatars */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
              {[
                { name: 'Даниил', role: 'Co-founder', gradient: 'from-cyan-500 to-blue-600' },
                { name: 'Миша', role: 'Co-founder', gradient: 'from-purple-500 to-pink-600' },
                { name: 'Серёжа', role: 'Co-founder', gradient: 'from-pink-500 to-orange-500' },
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
              Наши <span className="gradient-text">кейсы</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg text-gray-400">Реальные результаты наших клиентов</p>
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
                    <p className="mt-2 text-sm text-gray-600">Скриншот скоро</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className={`mb-3 text-sm font-bold ${cs.accentColor}`}>Кейс {cs.number}</div>
                  <h3 className="mb-2 text-lg font-bold text-white">Название бизнеса</h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-400">
                    Описание результатов и то, как AI-ассистент помог увеличить количество записей и автоматизировать
                    общение с клиентами.
                  </p>

                  {/* Feedback quote */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-sm text-gray-400 italic">&ldquo;Отзыв клиента будет здесь...&rdquo;</p>
                    <p className="mt-2 text-xs text-gray-600">— Имя, должность</p>
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
                Хотите <span className="gradient-text">так же</span>?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">
                Мы создадим AI-ассистента для вашего бизнеса за 24 часа. Бесплатная демо-версия — чтобы вы увидели
                результат до оплаты.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="https://t.me/winbix_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30"
                >
                  <span>Написать в Telegram</span>
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
                  Попробовать демо
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
          <p>&copy; {new Date().getFullYear()} WinBix AI. Все права защищены.</p>
          <Link href="/" className="text-gray-500 transition-colors hover:text-gray-300">
            На главную
          </Link>
        </footer>
      </div>
    </div>
  );
}
