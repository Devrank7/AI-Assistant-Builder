'use client';

import { useState, useEffect, useCallback } from 'react';

interface WidgetAnalytics {
  clientId: string;
  name: string;
  widgetType: string;
  analytics: {
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
    avgResponseTimeMs: number;
    satisfactionPercent: number;
    feedbackCount: number;
    dailyStats: { date: string; totalChats: number; totalMessages: number }[];
    hourlyDistribution: { hour: number; count: number }[];
    topQuestions: { text: string; count: number }[];
    channelStats: { channel: string; count: number; percentage: number }[];
  };
  quickStats: { today: number; week: number; month: number };
}

interface AnalyticsData {
  totals: {
    totalChats: number;
    totalMessages: number;
    avgSatisfaction: number;
    todayChats: number;
    weekChats: number;
    monthChats: number;
  };
  widgets: WidgetAnalytics[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/advanced?days=${days}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.widgets.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-12 text-center">
          <h2 className="mb-2 text-lg font-semibold text-white">No data yet</h2>
          <p className="text-gray-500">Create a widget and start getting chats to see analytics here.</p>
        </div>
      </div>
    );
  }

  const t = data.totals;
  const activeWidget = selectedWidget ? data.widgets.find((w) => w.clientId === selectedWidget) : null;

  const statCards = [
    { label: 'Total Chats', value: t.totalChats.toLocaleString(), sub: `${t.todayChats} today` },
    { label: 'Messages', value: t.totalMessages.toLocaleString(), sub: `${days}-day total` },
    { label: 'Satisfaction', value: `${t.avgSatisfaction}%`, sub: 'avg across widgets' },
    { label: 'This Week', value: t.weekChats.toLocaleString(), sub: 'chats' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#12121a] p-5">
            <p className="text-xs font-medium text-gray-500 uppercase">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-gray-600">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Widget Selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedWidget(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!selectedWidget ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          All Widgets
        </button>
        {data.widgets.map((w) => (
          <button
            key={w.clientId}
            onClick={() => setSelectedWidget(w.clientId)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedWidget === w.clientId ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            {w.name || w.clientId}
          </button>
        ))}
      </div>

      {/* Per-Widget Cards or Aggregate */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Chart */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Daily Chats</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {(activeWidget?.analytics.dailyStats || data.widgets[0]?.analytics.dailyStats || [])
              .slice(-14)
              .map((d, i) => {
                const max = Math.max(
                  ...(activeWidget?.analytics.dailyStats || data.widgets[0]?.analytics.dailyStats || [])
                    .slice(-14)
                    .map((s) => s.totalChats),
                  1
                );
                const h = (d.totalChats / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${d.date}: ${d.totalChats} chats`}
                  />
                );
              })}
          </div>
          <p className="mt-2 text-xs text-gray-600">Last 14 days</p>
        </div>

        {/* Top Questions */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Top Questions</h3>
          <div className="space-y-2">
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || [])
              .slice(0, 5)
              .map((q, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="max-w-[80%] truncate text-sm text-gray-400">{q.text}</p>
                  <span className="text-xs font-medium text-gray-600">{q.count}x</span>
                </div>
              ))}
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || []).length === 0 && (
              <p className="text-sm text-gray-600">No questions yet</p>
            )}
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Peak Hours</h3>
          <div className="grid grid-cols-12 gap-1">
            {(activeWidget?.analytics.hourlyDistribution || data.widgets[0]?.analytics.hourlyDistribution || [])
              .slice(0, 24)
              .map((h) => {
                const max = Math.max(
                  ...(
                    activeWidget?.analytics.hourlyDistribution ||
                    data.widgets[0]?.analytics.hourlyDistribution ||
                    []
                  ).map((x) => x.count),
                  1
                );
                const intensity = h.count / max;
                return (
                  <div
                    key={h.hour}
                    className="aspect-square rounded"
                    style={{
                      background: `rgba(6,182,212,${0.1 + intensity * 0.7})`,
                    }}
                    title={`${h.hour}:00 — ${h.count} chats`}
                  />
                );
              })}
          </div>
          <p className="mt-2 text-xs text-gray-600">0h-23h activity</p>
        </div>

        {/* Channel Distribution */}
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Channels</h3>
          <div className="space-y-3">
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).map((ch) => (
              <div key={ch.channel}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-400 capitalize">{ch.channel}</span>
                  <span className="text-gray-600">{ch.percentage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5">
                  <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${ch.percentage}%` }} />
                </div>
              </div>
            ))}
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).length === 0 && (
              <p className="text-sm text-gray-600">No channel data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
