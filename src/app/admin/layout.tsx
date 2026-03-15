'use client';

import { Sidebar } from '@/components/admin/Sidebar';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--admin-bg-primary)]">
      <Sidebar />
      <div className="ml-[var(--admin-sidebar-width)]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[var(--admin-header-height)] items-center justify-end border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)]/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent-blue)] text-xs font-medium text-white">
                A
              </div>
              <span className="text-sm text-[var(--admin-text-secondary)]">Admin</span>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
