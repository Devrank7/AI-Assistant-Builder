'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface OverviewSectionProps {
  client: {
    clientId: string;
    domain?: string;
    type: string;
    subscriptionStatus: string;
    ownerId?: string;
    ownerEmail?: string;
    totalSessions?: number;
    createdAt: string;
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function OverviewSection({ client }: OverviewSectionProps) {
  const router = useRouter();

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Client ID</dt>
        <dd className="font-mono text-sm text-[var(--admin-text-primary)]">{client.clientId}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Domain</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{client.domain || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Type</dt>
        <dd>
          <StatusBadge status={client.type} />
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Status</dt>
        <dd>
          <StatusBadge status={client.subscriptionStatus} />
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Owner</dt>
        <dd>
          {client.ownerId ? (
            <button
              onClick={() => router.push(`/admin/users/${client.ownerId}`)}
              className="text-sm text-[var(--admin-accent-blue)] hover:underline"
            >
              {client.ownerEmail || client.ownerId}
            </button>
          ) : (
            <span className="text-sm text-[var(--admin-text-muted)]">—</span>
          )}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Total Sessions</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{(client.totalSessions ?? 0).toLocaleString()}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Created</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{formatDate(client.createdAt)}</dd>
      </div>
    </dl>
  );
}
