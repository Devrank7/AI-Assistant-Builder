'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ActivityChartProps {
  data: Array<{ date: string; registrations?: number; activeUsers?: number; messages?: number }>;
  loading: boolean;
}

const periods = ['7d', '30d', '90d'] as const;

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('30d');

  const filteredData = (() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return data.slice(-days);
  })();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-4 h-4 w-32" />
        <div className="admin-skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Activity</h3>
        <div className="flex gap-1 rounded-lg bg-[var(--admin-bg-primary)] p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[var(--admin-accent-blue)] text-white'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={filteredData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border-emphasis)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line
            type="monotone"
            dataKey="registrations"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Registrations"
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="#34D399"
            strokeWidth={2}
            dot={false}
            name="Active Users"
          />
          <Line type="monotone" dataKey="messages" stroke="#818CF8" strokeWidth={2} dot={false} name="Messages" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
