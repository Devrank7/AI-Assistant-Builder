'use client';

import ClientList from '@/components/ClientList';
import Link from 'next/link';
import { PageTransition } from '@/components/ui/motion';

export default function AdminDashboard() {
  return (
    <div className="bg-gradient-animated relative min-h-screen">
      {/* Aurora Background */}
      <div className="aurora" />

      {/* Grid Overlay */}
      <div className="bg-grid pointer-events-none fixed inset-0 z-0 opacity-20" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] opacity-40 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="gradient-text text-lg font-bold">WinBix AI</h1>
                <p className="text-[11px] tracking-wide text-gray-500 uppercase">Management Dashboard</p>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/admin"
                className="rounded-lg bg-[var(--neon-cyan)]/10 px-4 py-2 text-sm font-medium text-[var(--neon-cyan)]"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                Settings
              </Link>
              <Link
                href="#"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                Docs
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Logout
              </Link>
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-pink)] opacity-40 blur-sm" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-pink)] text-xs font-bold text-white">
                  A
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PageTransition className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Page Title */}
        <div className="mb-10">
          <h2 className="mb-3 text-4xl font-bold tracking-tight text-white">
            Client <span className="gradient-text">Dashboard</span>
          </h2>
          <p className="text-lg text-gray-400">Manage and monitor all your widget clients from one place</p>
        </div>

        {/* Client List */}
        <ClientList />
      </PageTransition>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]" />
              <span className="text-sm text-gray-500">WinBix AI</span>
            </div>
            <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
