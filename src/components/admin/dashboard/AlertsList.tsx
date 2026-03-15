'use client';

import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  severity: 'danger' | 'warning' | 'info';
}

interface AlertsListProps {
  alerts: Alert[];
  loading: boolean;
}

const severityBorder: Record<string, string> = {
  danger: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export function AlertsList({ alerts, loading }: AlertsListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-4 h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton mb-3 h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Alerts &amp; Actions</h3>
      {alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--admin-text-muted)]">All clear — no alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 10).map((alert) => (
            <button
              key={alert.id}
              onClick={() => router.push(alert.link)}
              className={`w-full rounded-lg border-l-2 bg-[var(--admin-bg-primary)] px-4 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)] ${severityBorder[alert.severity] ?? ''}`}
            >
              <p className="text-sm font-medium text-[var(--admin-text-primary)]">{alert.title}</p>
              <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{alert.message}</p>
            </button>
          ))}
          {alerts.length > 10 && (
            <button
              onClick={() => router.push('/admin/subscriptions?status=past_due')}
              className="mt-2 text-sm text-[var(--admin-accent-blue)] hover:underline"
            >
              View all ({alerts.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
