'use client';

import { useState, useEffect, useCallback } from 'react';
import { Charts } from '@/components/admin/analytics/Charts';
import { useToast } from '@/components/ui/Toast';

interface DayDataPoint {
  date: string;
  count: number;
}

interface ChannelDataPoint {
  channel: string;
  count: number;
}

interface ClientDataPoint {
  name: string;
  sessions: number;
}

interface AnalyticsData {
  messagesPerDay: DayDataPoint[];
  userGrowth: DayDataPoint[];
  messagesByChannel: ChannelDataPoint[];
  topClients: ClientDataPoint[];
  avgConversationLength: number;
  totalSessions: number;
}

type Period = 30 | 90;

export default function AnalyticsPage() {
  const { toastError } = useToast();
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? null);
      } else {
        toastError('Failed to load analytics');
      }
    } catch {
      toastError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, toastError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Analytics</h1>

        {/* Period Toggle */}
        <div className="flex items-center rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-1">
          {([30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[var(--admin-accent-blue)] text-white'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      <Charts data={data} loading={loading} />
    </div>
  );
}
