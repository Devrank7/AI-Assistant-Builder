'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Playfair_Display, Lato } from 'next/font/google';
import WidgetGenerator from '@/components/WidgetGenerator';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-playfair',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
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
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Instagram DM Mockup Component ─── */
function InstagramDMMockup() {
  const [visibleMessages, setVisibleMessages] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleMessages(1), 500),
      setTimeout(() => setVisibleMessages(2), 1800),
      setTimeout(() => setVisibleMessages(3), 3200),
      setTimeout(() => setVisibleMessages(4), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const messages = [
    { from: 'client', text: 'Hi! Do you have any openings for balayage tomorrow? \u{1F60D}', time: '10:47 PM' },
    {
      from: 'ai',
      text: "Hey girl! \u2728 Yes, we'd love to get you in! We have a 10:30 AM and a 2:00 PM slot open tomorrow for balayage. Which works better for you?",
      time: '10:47 PM',
    },
    { from: 'client', text: '2pm would be perfect!', time: '10:48 PM' },
    {
      from: 'ai',
      text: "You're all set for 2:00 PM tomorrow with our balayage specialist! \u{1F389} We'll send you a reminder in the morning. See you then, babe! \u2764\uFE0F",
      time: '10:48 PM',
    },
  ];

  return (
    <div className="mx-auto max-w-sm">
      {/* Phone frame */}
      <div
        className="rounded-[2rem] border border-gray-200 bg-white p-1 shadow-2xl"
        style={{ boxShadow: '0 25px 60px rgba(183, 110, 121, 0.15)' }}
      >
        {/* Instagram DM header */}
        <div className="rounded-t-[1.75rem] border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#B76E79] to-[#CEAA75]">
              <span className="text-xs font-bold text-white">BS</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">beautystudio_tx</p>
              <p className="text-[10px] font-medium text-green-500">Active now</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Chat body */}
        <div className="min-h-[280px] space-y-3 bg-white px-4 py-4">
          {/* Time stamp */}
          <p className="mb-2 text-center text-[10px] text-gray-400">Today 10:47 PM</p>

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={visibleMessages > i ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'client'
                    ? 'rounded-br-md bg-[#3797F0] text-white'
                    : 'rounded-bl-md bg-gray-100 text-gray-800'
                }`}
              >
                {msg.from === 'ai' && (
                  <span className="mb-0.5 block inline-flex items-center gap-1 text-[10px] font-semibold text-[#B76E79]">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Assistant
                  </span>
                )}
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="rounded-b-[1.75rem] border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1 text-sm text-gray-400">Message...</span>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* "While you were sleeping" badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 5, duration: 0.5 }}
        className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-[#B76E79]/20 bg-[#B76E79]/10 px-4 py-2"
      >
        <span className="text-lg">{'\u{1F634}'}</span>
        <span className="text-sm font-medium text-[#B76E79]">Client booked while you were sleeping</span>
      </motion.div>
    </div>
  );
}

/* ─── Floating Petal Decoration ─── */
function FloatingPetals() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(183,110,121,0.3)' : 'rgba(206,170,117,0.3)'}, transparent)`,
            width: `${80 + i * 40}px`,
            height: `${80 + i * 40}px`,
            left: `${10 + i * 20}%`,
            top: `${5 + i * 15}%`,
          }}
          animate={{
            y: [0, -15, 0],
            x: [0, 8, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────
   MAIN PAGE COMPONENT
   ───────────────────────────────── */
export default function TexasBeautyInstagramPage() {
  return (
    <div className={`beauty-theme ${playfair.variable} ${lato.variable} min-h-screen`}>
      {/* Runtime style injection — ALL beauty theme CSS injected here because
          Tailwind v4 PostCSS strips custom class rules from globals.css */}
      <style>{`
        /* === BEAUTY THEME BASE === */
        .beauty-theme {
          --beauty-rose: #B76E79;
          --beauty-rose-dark: #9C5A64;
          --beauty-rose-light: #D4919A;
          --beauty-blush: #F7CAC9;
          --beauty-cream: #FDF8F4;
          --beauty-gold: #CEAA75;
          --beauty-gold-dark: #B8944F;
          --beauty-champagne: #F5E6D3;
          --beauty-charcoal: #2D2D2D;
          --beauty-warm-gray: #6B5B5B;
          --beauty-soft-white: #FFFAF7;
          --neon-cyan: #B76E79;
          --neon-purple: #9C5A64;
          --neon-pink: #D4919A;
          --accent: #B76E79;
          background: #FDF8F4 !important;
          color: #2D2D2D !important;
        }
        .beauty-theme ::selection {
          background: rgba(183, 110, 121, 0.25);
          color: #2D2D2D;
        }

        /* === GRADIENT TEXT === */
        .gradient-text-rose {
          background: linear-gradient(135deg, #B76E79, #D4919A, #CEAA75);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-text-rose-gold {
          background: linear-gradient(135deg, #CEAA75, #D4AF37, #B76E79);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* === CARDS === */
        .card-beauty {
          background: #FFFFFF;
          border: 1px solid rgba(183, 110, 121, 0.12);
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 12px rgba(183, 110, 121, 0.06);
        }
        .card-beauty:hover {
          border-color: rgba(183, 110, 121, 0.25);
          box-shadow: 0 12px 40px rgba(183, 110, 121, 0.1);
          transform: translateY(-3px);
        }
        .card-beauty-accent {
          background: #FFFFFF;
          border: 1px solid rgba(183, 110, 121, 0.15);
          border-top: 3px solid #B76E79;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 12px rgba(183, 110, 121, 0.06);
        }
        .card-beauty-accent:hover {
          box-shadow: 0 12px 40px rgba(183, 110, 121, 0.12);
          transform: translateY(-3px);
        }

        /* === BUTTONS === */
        .btn-beauty {
          background: linear-gradient(135deg, #B76E79, #D4919A);
          color: #FFFFFF;
          font-weight: 700;
          padding: 14px 32px;
          border-radius: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(183, 110, 121, 0.3);
          display: inline-block;
        }
        .btn-beauty:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(183, 110, 121, 0.45);
        }

        /* === SECTION BACKGROUNDS === */
        .beauty-warm-section {
          background: linear-gradient(180deg, #FFFAF7 0%, #FDF8F4 100%);
        }
        .beauty-blush-section {
          background: linear-gradient(180deg, rgba(247, 202, 201, 0.15) 0%, rgba(253, 248, 244, 0.5) 100%);
        }
        .beauty-dots-bg {
          background-image: radial-gradient(rgba(183, 110, 121, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .beauty-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(183, 110, 121, 0.2), rgba(206, 170, 117, 0.3), rgba(183, 110, 121, 0.2), transparent);
        }

        /* === WIDGET GENERATOR LIGHT OVERRIDES === */
        .beauty-generator-light .glass {
          background: #FFFFFF !important;
          border: 1px solid rgba(183, 110, 121, 0.15) !important;
          box-shadow: 0 4px 24px rgba(183, 110, 121, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .beauty-generator-light .glass label {
          color: #2D2D2D !important;
        }
        .beauty-generator-light .glass input[type="text"],
        .beauty-generator-light .glass input[type="url"] {
          background: #FFFAF7 !important;
          border-color: rgba(183, 110, 121, 0.2) !important;
          color: #2D2D2D !important;
        }
        .beauty-generator-light .glass input[type="text"]::placeholder,
        .beauty-generator-light .glass input[type="url"]::placeholder {
          color: #9C8A8A !important;
        }
        .beauty-generator-light .glass input[type="text"]:focus,
        .beauty-generator-light .glass input[type="url"]:focus {
          border-color: #B76E79 !important;
          box-shadow: 0 0 0 3px rgba(183, 110, 121, 0.1) !important;
        }
        .beauty-generator-light .glass .text-gray-300,
        .beauty-generator-light .glass .text-gray-500,
        .beauty-generator-light .glass .text-gray-600 {
          color: #6B5B5B !important;
        }
        .beauty-generator-light .glass .text-white {
          color: #2D2D2D !important;
        }
        .beauty-generator-light .glass .border-white\\/10,
        .beauty-generator-light .glass .border-white\\/\\[0\\.06\\] {
          border-color: rgba(183, 110, 121, 0.12) !important;
        }
        .beauty-generator-light .glass .bg-white\\/\\[0\\.03\\] {
          background: #FFFAF7 !important;
        }
        .beauty-generator-light .glass button[type="submit"] {
          color: #FFFFFF !important;
          box-shadow: 0 4px 14px rgba(183, 110, 121, 0.3) !important;
        }
        .beauty-generator-light .glass p.text-white {
          color: #2D2D2D !important;
        }
        .beauty-generator-light .glass p.text-xs.text-gray-500 {
          color: #9C8A8A !important;
        }
      `}</style>

      {/* ===== HEADER / NAV ===== */}
      <header className="sticky top-0 z-50 border-b border-[#B76E79]/10 bg-[#FDF8F4]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B76E79] to-[#CEAA75]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#2D2D2D]">WinBix</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#6B5B5B] transition-colors hover:text-[#B76E79]"
            >
              How It Works
            </a>
            <a href="#features" className="text-sm font-medium text-[#6B5B5B] transition-colors hover:text-[#B76E79]">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-[#6B5B5B] transition-colors hover:text-[#B76E79]">
              Pricing
            </a>
            <a href="#demo" className="btn-beauty rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md">
              Get My AI Assistant
            </a>
          </nav>
          <a href="#demo" className="btn-beauty rounded-xl px-5 py-2 text-sm font-semibold text-white md:hidden">
            Get Started
          </a>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24">
        <FloatingPetals />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left — Copy */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B76E79]/20 bg-[#B76E79]/5 px-4 py-1.5">
                <svg className="h-4 w-4 text-[#B76E79]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <span className="text-xs font-semibold tracking-wide text-[#B76E79] uppercase">
                  Instagram AI Assistant for Beauty
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-playfair)] text-4xl leading-tight font-bold text-[#2D2D2D] md:text-5xl lg:text-[3.5rem]">
                Never Lose a Client to an <span className="gradient-text-rose">Unanswered DM</span> Again
              </h1>

              <p className="mt-6 font-[family-name:var(--font-lato)] text-lg leading-relaxed text-[#6B5B5B]">
                Your AI Instagram assistant books appointments, answers questions, and captures clients at 10 PM while
                you&apos;re relaxing. Built specifically for Texas beauty professionals who are tired of losing money to
                missed messages.
              </p>

              {/* Key stats row */}
              <div className="mt-8 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2D2D2D]">69%</p>
                    <p className="text-xs text-[#6B5B5B]">abandon if no reply in 1hr</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                    <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2D2D2D]">$67K</p>
                    <p className="text-xs text-[#6B5B5B]">lost per year in missed DMs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B76E79]/10">
                    <svg className="h-5 w-5 text-[#B76E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#2D2D2D]">40%</p>
                    <p className="text-xs text-[#6B5B5B]">book outside business hours</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#demo"
                  className="btn-beauty inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Booking Clients 24/7
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#B76E79]/20 bg-white px-6 py-4 text-base font-semibold text-[#B76E79] transition-all hover:border-[#B76E79]/40 hover:shadow-md"
                >
                  See How It Works
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
            </motion.div>

            {/* Right — Instagram DM Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <InstagramDMMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF BAR ===== */}
      <div className="beauty-divider" />
      <Section className="bg-white px-6 py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#B76E79]">
              <Counter target={247} suffix="+" />
            </p>
            <p className="mt-1 text-sm text-[#6B5B5B]">Beauty Businesses Trust Us</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B76E79]/10 md:block" />
          <div className="text-center">
            <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#B76E79]">
              <Counter target={18500} suffix="+" />
            </p>
            <p className="mt-1 text-sm text-[#6B5B5B]">Appointments Booked by AI</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B76E79]/10 md:block" />
          <div className="text-center">
            <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#B76E79]">
              <Counter target={2} prefix="<" suffix="s" />
            </p>
            <p className="mt-1 text-sm text-[#6B5B5B]">Average Response Time</p>
          </div>
          <div className="hidden h-8 w-px bg-[#B76E79]/10 md:block" />
          <div className="text-center">
            <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#CEAA75]">24/7</p>
            <p className="mt-1 text-sm text-[#6B5B5B]">Always On, Always Booking</p>
          </div>
        </div>
      </Section>

      {/* ===== THE PROBLEM SECTION ===== */}
      <Section className="beauty-blush-section px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold tracking-wider text-red-400 uppercase">
            The Silent Revenue Killer
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Every Unanswered DM Is a Client Walking to Your Competitor
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-lato)] text-lg text-[#6B5B5B]">
            Your Instagram is your storefront. When someone DMs at 9 PM asking about lash extensions and gets no reply
            until morning, they&apos;ve already booked with someone else.
          </p>
        </div>

        {/* Pain point cards */}
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              emoji: '\u{1F4F1}',
              title: '10 PM on a Tuesday',
              desc: "A new client DMs asking about highlights. You're watching Netflix. By morning, she's found another salon.",
              stat: '$150',
              statLabel: 'lost',
            },
            {
              emoji: '\u{1F485}',
              title: 'Mid-Appointment',
              desc: "You're doing a color correction when 3 DMs come in. You can't answer with foils in your hands. Two of them never message back.",
              stat: '$280',
              statLabel: 'lost',
            },
            {
              emoji: '\u{1F634}',
              title: 'Sunday Morning',
              desc: 'A bride-to-be messages about trial hair and makeup for her wedding. You see it Monday. She already booked a package elsewhere.',
              stat: '$800+',
              statLabel: 'lost',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="card-beauty-accent p-6"
            >
              <span className="text-3xl">{card.emoji}</span>
              <h3 className="mt-3 font-[family-name:var(--font-playfair)] text-lg font-bold text-[#2D2D2D]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B5B5B]">{card.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-red-400">{card.stat}</span>
                <span className="text-sm text-red-300">{card.statLabel}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom impact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-200/50 bg-white p-6 text-center"
        >
          <p className="text-sm font-medium text-[#6B5B5B]">That adds up to roughly</p>
          <p className="mt-1 font-[family-name:var(--font-playfair)] text-4xl font-bold text-red-400">
            $5,500+ / month
          </p>
          <p className="mt-1 text-sm text-[#6B5B5B]">in missed bookings from unanswered DMs alone</p>
        </motion.div>
      </Section>

      {/* ===== HOW IT WORKS ===== */}
      <Section id="how-it-works" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#B76E79]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#B76E79] uppercase">
            Simple Setup
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Up and Running in <span className="gradient-text-rose">3 Simple Steps</span>
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-3">
          {[
            {
              step: '01',
              icon: (
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              ),
              title: 'Connect Your Instagram',
              desc: 'We link your business Instagram account in under 5 minutes. No tech skills required.',
            },
            {
              step: '02',
              icon: (
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              ),
              title: 'We Train Your AI',
              desc: 'Tell us your services, pricing, and hours. Your AI learns your brand voice and booking flow.',
            },
            {
              step: '03',
              icon: (
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ),
              title: 'Watch Bookings Roll In',
              desc: 'Your AI handles DMs 24/7 — answering questions, booking appointments, and capturing leads.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="card-beauty relative p-8 text-center"
            >
              {/* Step number */}
              <span className="absolute top-4 right-4 font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#B76E79]/10">
                {item.step}
              </span>
              {/* Icon */}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B76E79] to-[#D4919A]">
                {item.icon}
              </div>
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#2D2D2D]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B5B5B]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== FEATURES ===== */}
      <Section id="features" className="beauty-warm-section beauty-dots-bg px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#CEAA75]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#CEAA75] uppercase">
            Powerful Features
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Built for <span className="gradient-text-rose-gold">Beauty Professionals</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6B5B5B]">
            Not just another chatbot. An intelligent assistant that understands the beauty industry.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {[
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              ),
              title: '24/7 Instant DM Responses',
              desc: 'Your AI responds to every DM in under 2 seconds. No client left waiting, no booking left on the table. Day or night.',
              accent: '#B76E79',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ),
              title: 'Your Admin Dashboard',
              desc: 'Full control in your hands. Set active hours, manage trigger words, toggle auto-reply on or off. Your AI, your rules.',
              accent: '#CEAA75',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ),
              title: 'Smart Appointment Booking',
              desc: 'AI checks your availability, suggests open slots, confirms the booking, and sends reminders. All in a natural conversation.',
              accent: '#B76E79',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              ),
              title: 'Knows Your Services & Prices',
              desc: 'Trained on your exact menu — balayage, lash lifts, facials, acrylics, whatever you offer. Answers pricing questions accurately.',
              accent: '#CEAA75',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              ),
              title: 'Sounds Like You, Not a Robot',
              desc: "Your AI matches your brand voice — warm, friendly, professional. Clients won't even know it's AI. It feels like texting with your front desk.",
              accent: '#B76E79',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              ),
              title: 'Lead Capture & Insights',
              desc: 'Every conversation is logged. See who reached out, what they asked about, and which services are in highest demand.',
              accent: '#CEAA75',
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="card-beauty flex gap-5 p-6"
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${feature.accent}15`, color: feature.accent }}
              >
                {feature.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2D2D2D]">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6B5B5B]">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== THE SCENARIO SECTION ===== */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left — Scenario Text */}
            <div>
              <span className="mb-4 inline-block rounded-full bg-[#B76E79]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#B76E79] uppercase">
                Real Scenario
              </span>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D]">
                It&apos;s 10:47 PM. You&apos;re In Bed. A Client Just Booked.
              </h2>
              <div className="mt-6 space-y-4 font-[family-name:var(--font-lato)]">
                <p className="leading-relaxed text-[#6B5B5B]">
                  Sarah sees your stunning balayage reel and DMs you instantly. Without your AI assistant, that message
                  sits unread until morning. By then? She&apos;s already booked with @glamhairhtx down the street.
                </p>
                <p className="leading-relaxed text-[#6B5B5B]">
                  <strong className="text-[#2D2D2D]">With your AI assistant:</strong> Sarah gets a warm, on-brand
                  response in 2 seconds. The AI shows available slots, Sarah picks 2 PM tomorrow, and the booking is
                  confirmed. You wake up to a new appointment and $150+ in revenue.
                </p>
              </div>

              {/* Before/After comparison */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="mb-2 text-xs font-bold tracking-wider text-red-400 uppercase">Without AI</p>
                  <ul className="space-y-1.5 text-sm text-[#6B5B5B]">
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-red-400">{'\u2717'}</span> DM sits unread for hours
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-red-400">{'\u2717'}</span> Client books elsewhere
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-red-400">{'\u2717'}</span> You lose $150+
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="mb-2 text-xs font-bold tracking-wider text-emerald-500 uppercase">With AI</p>
                  <ul className="space-y-1.5 text-sm text-[#6B5B5B]">
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-500">{'\u2713'}</span> Instant 2-second reply
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-500">{'\u2713'}</span> Appointment booked
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-emerald-500">{'\u2713'}</span> You earn while sleeping
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right — Revenue visualization */}
            <div className="relative">
              <div className="card-beauty p-8 text-center">
                <p className="mb-2 text-sm font-medium text-[#6B5B5B]">Revenue recovered in the first month</p>
                <p className="gradient-text-rose font-[family-name:var(--font-playfair)] text-5xl font-bold">+$2,400</p>
                <p className="mt-2 text-sm text-[#6B5B5B]">average for Texas beauty businesses</p>

                <div className="beauty-divider my-6" />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#B76E79]">16</p>
                    <p className="text-xs text-[#6B5B5B]">extra bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#CEAA75]">94%</p>
                    <p className="text-xs text-[#6B5B5B]">response rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#B76E79]">4.8{'\u2605'}</p>
                    <p className="text-xs text-[#6B5B5B]">client satisfaction</p>
                  </div>
                </div>
              </div>

              {/* Floating element */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 rounded-2xl border border-[#CEAA75]/20 bg-white p-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#CEAA75]/10">
                    <span className="text-sm">{'\u{1F4B0}'}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2D2D2D]">New Booking</p>
                    <p className="text-[10px] text-[#6B5B5B]">Balayage — $175</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ===== ADMIN PANEL PREVIEW ===== */}
      <Section className="beauty-blush-section px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#CEAA75]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#CEAA75] uppercase">
            Full Control
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Your Dashboard. <span className="gradient-text-rose-gold">Your Rules.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6B5B5B]">
            A beautiful admin panel where you control everything about your AI assistant.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '\u{1F552}', title: 'Active Hours', desc: 'Set when AI responds (e.g., after 6 PM or all day)' },
            { icon: '\u{1F3AF}', title: 'Trigger Words', desc: 'AI responds only to specific keywords if you prefer' },
            {
              icon: '\u{1F504}',
              title: 'Auto-Reply Toggle',
              desc: 'Turn AI on/off with one tap when you want to reply yourself',
            },
            { icon: '\u{1F4AC}', title: 'Conversation Logs', desc: 'Read every DM conversation your AI has handled' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="card-beauty p-5 text-center"
            >
              <span className="text-3xl">{item.icon}</span>
              <h3 className="mt-3 text-sm font-bold text-[#2D2D2D]">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#6B5B5B]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== TESTIMONIALS ===== */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#B76E79]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#B76E79] uppercase">
            Love From Clients
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Texas Beauty Pros Are <span className="gradient-text-rose">Obsessed</span>
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              name: 'Jessica M.',
              role: 'Lash Studio Owner, Houston',
              text: 'I was losing at least 5 clients a week to slow DM replies. Now my AI books them instantly. Last month I made $3,200 more than usual. This thing literally pays for itself.',
              avatar: 'JM',
              stars: 5,
            },
            {
              name: 'Priya K.',
              role: 'Hair Stylist, Dallas',
              text: "The best part? It sounds exactly like me. My clients had no idea it was AI. One said 'you always reply so fast!' I just smiled. Best $80/month I've ever spent.",
              avatar: 'PK',
              stars: 5,
            },
            {
              name: 'Maria L.',
              role: 'Nail Tech & Spa Owner, Austin',
              text: "Sunday nights used to be dead DMs I'd find Monday morning. Now every single one gets answered. My booking rate went from maybe 40% to over 90%. I'm shook.",
              avatar: 'ML',
              stars: 5,
            },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="card-beauty p-6"
            >
              {/* Stars */}
              <div className="mb-3 flex gap-0.5">
                {[...Array(t.stars)].map((_, j) => (
                  <svg key={j} className="h-4 w-4 text-[#CEAA75]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-[#6B5B5B] italic">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#B76E79] to-[#D4919A] text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D2D2D]">{t.name}</p>
                  <p className="text-xs text-[#6B5B5B]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== PRICING ===== */}
      <Section id="pricing" className="beauty-warm-section px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#CEAA75]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#CEAA75] uppercase">
            Investment
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            One Missed Client Costs More Than This
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#6B5B5B]">
            The average Texas salon appointment is $85-$175. Your AI pays for itself with just one extra booking per
            month.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-14 max-w-lg"
        >
          <div
            className="relative rounded-3xl border-2 border-[#B76E79]/30 bg-white p-8 shadow-xl"
            style={{ boxShadow: '0 20px 60px rgba(183, 110, 121, 0.1)' }}
          >
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#B76E79] to-[#D4919A] px-6 py-1.5 text-xs font-bold tracking-wider text-white uppercase shadow-md">
              Most Popular
            </div>

            <div className="pt-4 text-center">
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#2D2D2D]">
                Instagram AI Assistant
              </h3>
              <p className="mt-1 text-sm text-[#6B5B5B]">Everything you need to never miss a DM</p>
            </div>

            {/* Pricing */}
            <div className="my-8 text-center">
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-[#2D2D2D]">$80</span>
                <span className="text-lg text-[#6B5B5B]">/month</span>
              </div>
              <p className="mt-2 text-sm text-[#6B5B5B]">
                + one-time <span className="font-semibold text-[#B76E79]">$300</span> setup & training fee
              </p>
            </div>

            <div className="beauty-divider" />

            {/* Features list */}
            <ul className="mt-6 space-y-3">
              {[
                '24/7 Instagram DM auto-responses',
                'Smart appointment booking',
                'Trained on your services & pricing',
                'Personalized admin dashboard',
                'Active hours & trigger word control',
                'Auto-reply on/off toggle',
                'Conversation logs & analytics',
                'Brand-voice AI that sounds like you',
                'Priority support via DM',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#2D2D2D]">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B76E79]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="#demo"
              className="btn-beauty mt-8 block w-full rounded-xl py-4 text-center text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              Get My AI Assistant Now
            </a>

            {/* Money-back guarantee */}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#6B5B5B]">
              <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              14-day money-back guarantee. No risk.
            </p>
          </div>

          {/* ROI callout below pricing */}
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-center">
            <p className="text-sm font-medium text-emerald-700">
              {'\u{1F4A1}'} <strong>Quick math:</strong> If your average service is $120 and AI books just 2 extra
              clients per month, that&apos;s <strong>$240/month</strong> — a <strong>3x return</strong> on your $80
              investment.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* ===== FAQ ===== */}
      <Section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            Questions? We Got You {'\u{1F485}'}
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {[
            {
              q: "Will my clients know it's AI?",
              a: "Nope! We train the AI to match your exact brand voice and personality. Your clients will think they're talking to you or your receptionist. It's that natural.",
            },
            {
              q: 'What if I want to jump into a conversation myself?',
              a: "Easy! You can toggle auto-reply off anytime from your dashboard. The AI stops, and you take over the DM thread. When you're done, flip it back on.",
            },
            {
              q: 'Does it actually book appointments or just chat?',
              a: 'It actually books! The AI knows your availability, suggests open slots, confirms the time with the client, and logs the booking. You just show up and do what you do best.',
            },
            {
              q: "What if someone asks something the AI doesn't know?",
              a: "The AI will politely let them know you'll follow up personally, and it flags the conversation for you. You'll get a notification so nothing falls through the cracks.",
            },
            {
              q: 'Is the $300 setup fee worth it?',
              a: "We personally train your AI on your specific services, pricing, policies, and brand voice. This isn't a template — it's custom-built for your business. Most clients make back the setup fee in the first week.",
            },
            {
              q: 'Can I cancel anytime?',
              a: "Yes, no contracts. Cancel anytime. But honestly? Once you see the bookings rolling in at 11 PM on a Saturday, you won't want to.",
            },
          ].map((faq, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group card-beauty overflow-hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between p-5 text-left text-base font-semibold text-[#2D2D2D] transition-colors hover:text-[#B76E79]">
                {faq.q}
                <svg
                  className="h-5 w-5 flex-shrink-0 text-[#B76E79] transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-sm leading-relaxed text-[#6B5B5B]">{faq.a}</div>
            </motion.details>
          ))}
        </div>
      </Section>

      {/* ===== WIDGET GENERATOR / DEMO SECTION ===== */}
      <Section id="demo" className="beauty-warm-section beauty-dots-bg px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-block rounded-full bg-[#B76E79]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#B76E79] uppercase">
            Try It Free
          </span>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#2D2D2D] md:text-4xl">
            See Your AI Assistant in <span className="gradient-text-rose">30 Seconds</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#6B5B5B]">
            Enter your website below and we&apos;ll generate a personalized AI demo for your beauty business. No credit
            card needed.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-xl">
          <div className="beauty-generator-light">
            <WidgetGenerator />
          </div>
        </div>
      </Section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden px-6 py-20">
        {/* Rose gold gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#B76E79] to-[#9C5A64]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white md:text-4xl">
            Tonight, Someone Will DM Your Page.
          </h2>
          <p className="mt-4 font-[family-name:var(--font-lato)] text-lg text-white/80">
            The only question is — will your AI answer and book them, or will they go to your competitor?
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-[#B76E79] shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get My AI Assistant
            </a>
          </div>
          <p className="mt-6 text-sm text-white/60">
            $300 setup + $80/mo &bull; Cancel anytime &bull; 14-day money-back guarantee
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[#B76E79]/10 bg-[#FDF8F4] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#B76E79] to-[#CEAA75]">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#2D2D2D]">
                WinBix AI
              </span>
            </div>
            <div className="flex gap-6 text-sm text-[#6B5B5B]">
              <Link href="/privacy" className="transition-colors hover:text-[#B76E79]">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-[#B76E79]">
                Terms
              </Link>
              <a href="mailto:support@winbix-ai.xyz" className="transition-colors hover:text-[#B76E79]">
                Contact
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-[#9C8A8A]">
            &copy; 2026 WinBix AI. Helping Texas beauty professionals never miss a client.
          </p>
        </div>
      </footer>
    </div>
  );
}
