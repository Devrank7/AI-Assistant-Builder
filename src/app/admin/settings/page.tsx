'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Settings</h1>
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-8 text-center">
        <p className="text-sm text-[var(--admin-text-muted)]">System settings will be available in a future update.</p>
      </div>
    </div>
  );
}
