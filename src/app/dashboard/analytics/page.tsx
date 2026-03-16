'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { BarChart3, TrendingUp, MessageSquare, Clock, ThumbsUp, CalendarDays, Hash, Radio } from 'lucide-react';

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
        <h1 className="text-text-primary mb-6 text-2xl font-bold">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 animate-pulse opacity-60" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.widgets.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="text-text-primary mb-6 text-2xl font-bold">Analytics</h1>
        <Card className="p-12 text-center">
          <BarChart3 className="text-text-tertiary mx-auto mb-3 h-10 w-10" />
          <h2 className="text-text-primary mb-2 text-lg font-semibold">No data yet</h2>
          <p className="text-text-tertiary text-sm">Create a widget and start getting chats to see analytics here.</p>
        </Card>
      </div>
    );
  }

  const t = data.totals;
  const activeWidget = selectedWidget ? data.widgets.find((w) => w.clientId === selectedWidget) : null;

  const statCards = [
    {
      label: 'Total Chats',
      value: t.totalChats.toLocaleString(),
      sub: `${t.todayChats} today`,
      icon: <MessageSquare className="h-4 w-4" />,
      changePositive: t.todayChats > 0,
    },
    {
      label: 'Messages',
      value: t.totalMessages.toLocaleString(),
      sub: `${days}-day total`,
      icon: <Hash className="h-4 w-4" />,
      changePositive: true,
    },
    {
      label: 'Satisfaction',
      value: `${t.avgSatisfaction}%`,
      sub: 'avg across widgets',
      icon: <ThumbsUp className="h-4 w-4" />,
      changePositive: t.avgSatisfaction >= 70,
    },
    {
      label: 'This Week',
      value: t.weekChats.toLocaleString(),
      sub: 'chats',
      icon: <CalendarDays className="h-4 w-4" />,
      changePositive: t.weekChats > 0,
    },
  ];

  const dayOptions = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-text-primary text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-1.5">
          {dayOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={days === opt.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDays(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase">{card.label}</p>
                <p className="text-text-primary mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <div className="bg-bg-primary text-text-tertiary flex h-8 w-8 items-center justify-center rounded-lg">
                {card.icon}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {card.changePositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <Clock className="text-text-tertiary h-3 w-3" />
              )}
              <span className="text-text-tertiary text-xs">{card.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Widget Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-tertiary mr-1 text-xs font-medium">Filter:</span>
        <Button variant={!selectedWidget ? 'primary' : 'secondary'} size="sm" onClick={() => setSelectedWidget(null)}>
          All Widgets
        </Button>
        {data.widgets.map((w) => (
          <Button
            key={w.clientId}
            variant={selectedWidget === w.clientId ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedWidget(w.clientId)}
          >
            {w.name || w.clientId}
          </Button>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Chart */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-text-tertiary h-4 w-4" />
            <h3 className="text-text-primary text-sm font-semibold">Daily Chats</h3>
            <Badge className="ml-auto">Last 14 days</Badge>
          </div>
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
                    className="bg-accent flex-1 rounded-t transition-all hover:opacity-80"
                    style={{ height: `${Math.max(h, 2)}%` }}
                    title={`${d.date}: ${d.totalChats} chats`}
                  />
                );
              })}
          </div>
          <div className="text-text-tertiary mt-2 flex items-center justify-between text-[10px]">
            {(activeWidget?.analytics.dailyStats || data.widgets[0]?.analytics.dailyStats || [])
              .slice(-14)
              .filter((_, i, arr) => i === 0 || i === arr.length - 1)
              .map((d, i) => (
                <span key={i}>{d.date.slice(5)}</span>
              ))}
          </div>
        </Card>

        {/* Top Questions */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="text-text-tertiary h-4 w-4" />
            <h3 className="text-text-primary text-sm font-semibold">Top Questions</h3>
          </div>
          <div className="space-y-3">
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || [])
              .slice(0, 5)
              .map((q, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="bg-bg-primary text-text-tertiary flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                      {i + 1}
                    </span>
                    <p className="text-text-secondary truncate text-sm">{q.text}</p>
                  </div>
                  <Badge variant="blue">{q.count}x</Badge>
                </div>
              ))}
            {(activeWidget?.analytics.topQuestions || data.widgets[0]?.analytics.topQuestions || []).length === 0 && (
              <p className="text-text-tertiary text-sm">No questions yet</p>
            )}
          </div>
        </Card>

        {/* Hourly Heatmap */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="text-text-tertiary h-4 w-4" />
            <h3 className="text-text-primary text-sm font-semibold">Peak Hours</h3>
          </div>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
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
                      backgroundColor: `oklch(0.588 0.158 241.966 / ${0.08 + intensity * 0.72})`,
                    }}
                    title={`${h.hour}:00 — ${h.count} chats`}
                  />
                );
              })}
          </div>
          <div className="text-text-tertiary mt-2 flex items-center justify-between text-[10px]">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Radio className="text-text-tertiary h-4 w-4" />
            <h3 className="text-text-primary text-sm font-semibold">Channels</h3>
          </div>
          <div className="space-y-3">
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).map((ch) => (
              <div key={ch.channel}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-text-secondary font-medium capitalize">{ch.channel}</span>
                  <Badge>{ch.percentage}%</Badge>
                </div>
                <div className="bg-bg-primary h-1.5 rounded-full">
                  <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${ch.percentage}%` }} />
                </div>
              </div>
            ))}
            {(activeWidget?.analytics.channelStats || data.widgets[0]?.analytics.channelStats || []).length === 0 && (
              <p className="text-text-tertiary text-sm">No channel data yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
