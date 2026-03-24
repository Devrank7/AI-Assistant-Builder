'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowUp, FileText, Scale, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
};

/* ── Reusable section / subtitle for legal content ── */
export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  /* Auto-generate id from text: "1. General Provisions" → "section-1" */
  const autoId = (() => {
    if (id) return id;
    const text = typeof children === 'string' ? children : '';
    const match = text.match(/^(\d+)\./);
    return match ? `section-${match[1]}` : undefined;
  })();

  return (
    <motion.h2
      id={autoId}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      custom={0}
      className="group mt-14 mb-5 scroll-mt-28 first:mt-0"
    >
      <span
        className={`${syne.className} text-text-primary block text-[1.65rem] leading-tight font-bold tracking-[-0.02em] md:text-[1.85rem]`}
      >
        {children}
      </span>
      <span className="bg-accent mt-2.5 block h-[3px] w-10 rounded-full opacity-60" />
    </motion.h2>
  );
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h3
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      variants={fadeUp}
      custom={0}
      className="text-text-primary mt-8 mb-3 text-lg font-semibold"
    >
      {children}
    </motion.h3>
  );
}

/* ── Table of Contents item ── */
function TocItem({
  number,
  title,
  targetId,
  active,
  onClick,
}: {
  number: string;
  title: string;
  targetId: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] leading-snug transition-all duration-200 ${
        active
          ? 'bg-accent/8 text-accent font-medium'
          : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50'
      }`}
    >
      <span
        className={`mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold transition-colors ${
          active ? 'bg-accent/15 text-accent' : 'bg-bg-tertiary text-text-tertiary group-hover:text-text-secondary'
        }`}
      >
        {number}
      </span>
      <span className="line-clamp-2">{title}</span>
    </button>
  );
}

/* ── Main Layout ── */
interface LegalLayoutProps {
  children: React.ReactNode;
  titleBefore: string;
  titleAccent: string;
  lastUpdated: string;
  icon: 'privacy' | 'terms';
  siblingLink: { href: string; label: string };
  sections: Array<{ id: string; number: string; title: string }>;
}

export default function LegalLayout({
  children,
  titleBefore,
  titleAccent,
  lastUpdated,
  icon,
  siblingLink,
  sections,
}: LegalLayoutProps) {
  const { t: tc } = useTranslation('common');
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /* Scroll listeners */
  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Intersection observer for active section tracking */
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    const timer = setTimeout(() => {
      sections.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const IconComponent = icon === 'privacy' ? FileText : Scale;

  return (
    <div className="bg-bg-primary relative min-h-screen">
      {/* ── Decorative background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, var(--wb-accent) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/3 -left-32 h-[400px] w-[400px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, var(--wb-accent) 0%, transparent 70%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(var(--wb-border) 1px, transparent 1px), linear-gradient(90deg, var(--wb-border) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, black 20%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav
        className={`sticky top-0 z-50 px-6 py-3.5 transition-all duration-300 md:px-12 ${
          navScrolled ? 'border-border bg-bg-primary/80 border-b shadow-sm backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-text-primary flex items-center gap-2.5">
            <div className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">WinBix AI</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <Link
              href={siblingLink.href}
              className="text-text-tertiary hover:text-text-primary hidden text-[13px] transition-colors md:block"
            >
              {siblingLink.label}
            </Link>
            <Link
              href="/"
              className="bg-accent hover:bg-accent/90 ml-1 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-colors"
            >
              {tc('nav.home')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero header ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-8 md:px-12 md:pt-20 md:pb-12">
        <motion.div initial="hidden" animate="visible" className="mx-auto max-w-3xl lg:mx-0 lg:max-w-2xl">
          {/* Breadcrumb */}
          <motion.div variants={fadeUp} custom={0} className="text-text-tertiary mb-6 flex items-center gap-2 text-sm">
            <Link href="/" className="hover:text-text-secondary transition-colors">
              WinBix AI
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-text-secondary">
              {titleBefore}
              {titleAccent}
            </span>
          </motion.div>

          {/* Icon + Title */}
          <motion.div variants={fadeUp} custom={1} className="mb-4 flex items-start gap-4">
            <div className="bg-accent/10 mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl">
              <IconComponent className="text-accent h-6 w-6" />
            </div>
            <h1
              className={`${syne.className} text-text-primary text-4xl font-extrabold tracking-[-0.035em] md:text-5xl`}
            >
              {titleBefore}
              <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                {titleAccent}
              </span>
            </h1>
          </motion.div>

          <motion.p variants={fadeUp} custom={2} className="text-text-tertiary pl-16 text-sm">
            {lastUpdated}
          </motion.p>
        </motion.div>
      </div>

      {/* ── Divider ── */}
      <div className="border-border relative mx-auto max-w-7xl border-t px-6 md:px-12">
        <div
          className="absolute top-0 left-1/2 h-px w-1/3 -translate-x-1/2"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--wb-accent), transparent)',
            opacity: 0.3,
          }}
        />
      </div>

      {/* ── Content area with sidebar TOC ── */}
      <div className="relative z-10 mx-auto flex max-w-7xl gap-12 px-6 pt-10 pb-20 md:px-12">
        {/* Sidebar TOC — desktop */}
        {sections.length > 0 && (
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-text-tertiary mb-3 px-3 text-[11px] font-semibold tracking-wider uppercase">
                Contents
              </p>
              {sections.map((s) => (
                <TocItem
                  key={s.id}
                  number={s.number}
                  title={s.title}
                  targetId={s.id}
                  active={activeSection === s.id}
                  onClick={() => scrollToSection(s.id)}
                />
              ))}
            </div>
          </aside>
        )}

        {/* Main content */}
        <div ref={contentRef} className="max-w-3xl min-w-0 flex-1">
          <div className="legal-content space-y-4 text-base leading-relaxed">{children}</div>

          {/* Footer */}
          <div className="border-border mt-16 mb-8 border-t">
            <div
              className="mx-auto h-px w-1/4"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--wb-accent), transparent)',
                opacity: 0.3,
              }}
            />
          </div>
          <footer className="text-text-tertiary flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
            <p>
              &copy; {new Date().getFullYear()} WinBix AI. {tc('footer.rights')}
            </p>
            <div className="flex gap-6">
              <Link href={siblingLink.href} className="text-text-tertiary hover:text-text-primary transition-colors">
                {siblingLink.label}
              </Link>
              <Link href="/" className="text-text-tertiary hover:text-text-primary transition-colors">
                {tc('footer.home')}
              </Link>
            </div>
          </footer>
        </div>
      </div>

      {/* ── Scroll to top ── */}
      <motion.button
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        className="bg-accent fixed right-6 bottom-6 z-40 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-colors hover:brightness-110"
        style={{ pointerEvents: showScrollTop ? 'auto' : 'none' }}
      >
        <ArrowUp className="h-4 w-4" />
      </motion.button>

      {/* ── Legal content styling ── */}
      <style>{`
        .legal-content p {
          color: var(--wb-text-secondary);
        }
        .legal-content ul, .legal-content ol {
          color: var(--wb-text-secondary);
        }
        .legal-content li {
          color: var(--wb-text-secondary);
        }
        .legal-content a {
          color: var(--wb-accent);
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .legal-content a:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.875rem;
        }
        .legal-content thead tr {
          border-bottom: 2px solid var(--wb-border);
        }
        .legal-content thead th {
          color: var(--wb-text-primary);
          font-weight: 600;
          padding: 0.75rem 1rem 0.75rem 0;
          text-align: left;
        }
        .legal-content tbody tr {
          border-bottom: 1px solid var(--wb-border);
        }
        .legal-content tbody td {
          color: var(--wb-text-secondary);
          padding: 0.75rem 1rem 0.75rem 0;
        }
        .legal-content .font-mono {
          color: var(--wb-text-primary);
          background: var(--wb-bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }
        .legal-content strong, .legal-content .text-white {
          color: var(--wb-text-primary) !important;
          -webkit-text-fill-color: var(--wb-text-primary) !important;
        }
      `}</style>
    </div>
  );
}
