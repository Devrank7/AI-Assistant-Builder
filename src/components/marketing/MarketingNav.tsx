'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Customers', href: '/customers' },
  { label: 'Enterprise', href: '/enterprise' },
  { label: 'Changelog', href: '/changelog' },
] as const;

const menuVariants = {
  closed: { opacity: 0, y: -8, pointerEvents: 'none' as const },
  open: {
    opacity: 1,
    y: 0,
    pointerEvents: 'auto' as const,
    transition: { duration: 0.2, ease: [0.25, 0.4, 0.25, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

const navVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] },
  },
};

export default function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/pricing') return pathname === '/pricing';
    if (href.startsWith('/#')) return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <motion.header
      variants={navVariants}
      initial="hidden"
      animate="visible"
      className={[
        'fixed inset-x-0 top-0 z-50 transition-shadow duration-300',
        scrolled
          ? 'bg-bg-primary/80 border-border border-b shadow-sm backdrop-blur-md'
          : 'bg-bg-primary/60 border-b border-transparent backdrop-blur-sm',
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-8">
        {/* ── Logo ── */}
        <Link
          href="/"
          className="focus-visible:ring-accent flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm">
            <span className="text-sm font-extrabold tracking-tight text-white">W</span>
          </div>
          <span className="text-text-primary text-sm font-bold tracking-tight">
            WinBix <span className="text-accent">AI</span>
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={[
                'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150',
                isActive(href)
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              ].join(' ')}
            >
              {label}
              {isActive(href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="bg-bg-tertiary absolute inset-0 -z-10 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* ── Desktop CTA ── */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/pricing?auth=login"
            className="text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150"
          >
            Sign In
          </Link>
          <Link
            href="/pricing"
            className="bg-accent hover:bg-accent-hover inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="text-text-secondary hover:text-text-primary hover:bg-bg-tertiary flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Mobile slide-out menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="exit"
            className="border-border bg-bg-primary/95 border-t backdrop-blur-md md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive(href)
                      ? 'bg-bg-tertiary text-text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  ].join(' ')}
                >
                  {label}
                </Link>
              ))}

              <div className="border-border-subtle mt-3 flex flex-col gap-2 border-t pt-3">
                <Link
                  href="/pricing?auth=login"
                  className="text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl px-4 py-3 text-center text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/pricing"
                  className="bg-accent hover:bg-accent-hover rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
