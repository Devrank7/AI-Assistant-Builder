'use client';

import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <div className="bg-gradient-animated relative min-h-screen">
      <div className="aurora" />
      <div className="bg-grid pointer-events-none fixed inset-0 z-0 opacity-20" />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 transition-colors hover:text-white">
              &larr; Dashboard
            </Link>
            <div>
              <h1 className="gradient-text text-lg font-bold">Settings</h1>
              <p className="text-[11px] tracking-wide text-gray-500 uppercase">Billing & Subscriptions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <div className="glass-card p-8 text-center">
          <p className="mb-4 text-lg text-white">
            Billing is now managed through Stripe. Users manage their subscriptions from their dashboard.
          </p>
          <p className="text-sm text-gray-400">Configure Stripe plans and pricing in your Stripe Dashboard.</p>
        </div>
      </div>
    </div>
  );
}
