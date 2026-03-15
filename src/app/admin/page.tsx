'use client';

import { useState, useEffect } from 'react';
import { KPICards } from '@/components/admin/dashboard/KPICards';
import { ActivityChart } from '@/components/admin/dashboard/ActivityChart';
import { AlertsList } from '@/components/admin/dashboard/AlertsList';
import { RecentTables } from '@/components/admin/dashboard/RecentTables';

interface DashboardData {
  kpi: {
    totalUsers: number;
    totalClients: number;
    mrr: number;
    activeChatsToday: number;
    pastDueCount: number;
    trends: { users: number; clients: number };
  };
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    severity: 'danger' | 'warning' | 'info';
  }>;
  recentUsers: Array<{
    _id: string;
    email: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    createdAt: string;
  }>;
  recentClients: Array<{
    _id: string;
    clientId: string;
    name: string;
    domain: string;
    subscriptionStatus: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; registrations?: number; messages?: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/analytics?days=30'),
        ]);
        if (statsRes.ok) {
          const json = await statsRes.json();
          setData(json.data);
        }
        if (analyticsRes.ok) {
          const json = await analyticsRes.json();
          const analyticsData = json.data;
          // Merge messagesPerDay and userGrowth into ActivityChart format
          const dateMap = new Map<string, { date: string; registrations?: number; messages?: number }>();
          analyticsData.messagesPerDay?.forEach((d: { date: string; count: number }) => {
            const entry = dateMap.get(d.date) || { date: d.date };
            entry.messages = d.count;
            dateMap.set(d.date, entry);
          });
          analyticsData.userGrowth?.forEach((d: { date: string; count: number }) => {
            const entry = dateMap.get(d.date) || { date: d.date };
            entry.registrations = d.count;
            dateMap.set(d.date, entry);
          });
          setChartData(Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Dashboard</h1>
      <KPICards data={data?.kpi ?? null} loading={loading} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityChart data={chartData} loading={loading} />
        <AlertsList alerts={data?.alerts ?? []} loading={loading} />
      </div>
      <RecentTables recentUsers={data?.recentUsers ?? []} recentClients={data?.recentClients ?? []} loading={loading} />
    </div>
  );
}
