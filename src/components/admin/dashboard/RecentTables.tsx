'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface RecentUser {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface RecentClient {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface RecentTablesProps {
  recentUsers: RecentUser[];
  recentClients: RecentClient[];
  loading: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RecentTables({ recentUsers, recentClients, loading }: RecentTablesProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
            <div className="admin-skeleton mb-4 h-4 w-32" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="admin-skeleton mb-2 h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Recent Users</h3>
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {recentUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => router.push(`/admin/users/${u._id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)]"
            >
              <div>
                <p className="text-sm text-[var(--admin-text-primary)]">{u.email}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{timeAgo(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={u.plan} />
                <StatusBadge status={u.subscriptionStatus} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Recent Clients</h3>
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {recentClients.map((c) => (
            <button
              key={c._id}
              onClick={() => router.push(`/admin/clients/${c._id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)]"
            >
              <div>
                <p className="text-sm text-[var(--admin-text-primary)]">{c.name}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{c.domain || c.clientId}</p>
              </div>
              <StatusBadge status={c.subscriptionStatus} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
