'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'API Docs', href: '/docs/api' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Customers', href: '/customers' },
      { label: 'Agency Program', href: '/agency' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'REST API', href: '/docs/api' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1] as const,
      staggerChildren: 0.07,
    },
  },
};

const columnVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

export default function MarketingFooter() {
  return (
    <footer className="bg-bg-secondary border-border border-t">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        {/* ── Main grid ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FOOTER_COLUMNS.map(({ heading, links }) => (
            <motion.div key={heading} variants={columnVariants}>
              <h3 className="text-text-tertiary mb-4 text-xs font-semibold tracking-widest uppercase">{heading}</h3>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-text-secondary hover:text-text-primary text-sm transition-colors duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Bottom bar ── */}
        <div className="border-border text-text-secondary flex flex-col items-center justify-between gap-4 border-t py-6 text-xs sm:flex-row">
          {/* Wordmark */}
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600">
              <span className="text-[10px] font-extrabold text-white">W</span>
            </div>
            <span className="text-text-primary group-hover:text-accent font-semibold transition-colors duration-150">
              WinBix AI
            </span>
          </Link>

          <p className="text-text-tertiary text-center">&copy; 2026 WinBix AI. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-text-primary transition-colors duration-150">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors duration-150">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
