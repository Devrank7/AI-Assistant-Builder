'use client';

import { StatCard } from '@/components/admin/ui/StatCard';

interface KPIData {
  totalUsers: number;
  totalClients: number;
  mrr: number;
  activeChatsToday: number;
  pastDueCount: number;
  trends: { users: number; clients: number };
}

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Users"
        value={data ? data.totalUsers.toLocaleString() : '—'}
        trend={data ? { value: Math.abs(data.trends.users), positive: data.trends.users >= 0 } : undefined}
        loading={loading}
      />
      <StatCard
        label="Total Clients"
        value={data ? data.totalClients.toLocaleString() : '—'}
        trend={data ? { value: Math.abs(data.trends.clients), positive: data.trends.clients >= 0 } : undefined}
        loading={loading}
      />
      <StatCard
        label="MRR"
        value={data ? `$${data.mrr.toLocaleString()}` : '—'}
        subtext={data && data.pastDueCount > 0 ? `${data.pastDueCount} past due` : undefined}
        loading={loading}
      />
      <StatCard
        label="Active Chats Today"
        value={data ? data.activeChatsToday.toLocaleString() : '—'}
        loading={loading}
      />
    </div>
  );
}
