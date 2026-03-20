'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, Button, Badge } from '@/components/ui';
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Clock,
  ThumbsUp,
  CalendarDays,
  Hash,
  Radio,
  Brain,
  AlertTriangle,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

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

interface KnowledgeGap {
  text: string;
  count: number;
}

interface AiQualityData {
  resolutionRate: number;
  totalAnswered: number;
  totalUnanswered: number;
  knowledgeGaps: KnowledgeGap[];
}

/* ── Animations ── */
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const } },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [aiQuality, setAiQuality] = useState<AiQualityData | null>(null);
  const [aiQualityLoading, setAiQualityLoading] = useState(true);

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

  const fetchAiQuality = useCallback(async () => {
    setAiQualityLoading(true);
    try {
      const res = await fetch(`/api/analytics/ai-quality?days=${days}`);
      const json = await res.json();
      if (json.success) setAiQuality(json.data);
    } catch {
      // ignore
    } finally {
      setAiQualityLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
    fetchAiQuality();
  }, [fetchData, fetchAiQuality]);

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

      {/* Advanced Analytics Link */}
      <Link
        href="/dashboard/analytics/advanced"
        className="border-border-primary bg-bg-secondary hover:border-border-secondary flex items-center justify-between rounded-xl border p-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-text-primary font-medium">Advanced Analytics</p>
            <p className="text-text-secondary text-sm">
              Funnels, cohort retention, churn predictions, revenue attribution
            </p>
          </div>
        </div>
        <ArrowRight className="text-text-tertiary h-5 w-5" />
      </Link>

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

      {/* AI Quality Metrics */}
      <motion.div {...fadeIn}>
        <div className="mb-4 flex items-center gap-2">
          <Brain className="text-text-tertiary h-5 w-5" />
          <h2 className="text-text-primary text-lg font-semibold">AI Quality Metrics</h2>
        </div>

        {aiQualityLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-48 animate-pulse opacity-60" />
            <Card className="h-48 animate-pulse opacity-60" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Resolution Rate Card */}
            <Card className="bg-bg-secondary border-border">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="text-text-tertiary h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Resolution Rate</h3>
              </div>
              <div className="flex items-center gap-6">
                {/* Circular SVG progress ring */}
                <div className="relative shrink-0">
                  {(() => {
                    const rate = aiQuality?.resolutionRate ?? 0;
                    const radius = 44;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (rate / 100) * circumference;
                    const ringColor =
                      rate > 80
                        ? '#10b981' // emerald-500
                        : rate >= 50
                          ? '#f59e0b' // amber-500
                          : '#ef4444'; // red-500
                    return (
                      <svg width={108} height={108} className="-rotate-90">
                        <circle
                          cx={54}
                          cy={54}
                          r={radius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={8}
                          className="text-border opacity-30"
                        />
                        <circle
                          cx={54}
                          cy={54}
                          r={radius}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth={8}
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                    );
                  })()}
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                    style={{
                      color:
                        (aiQuality?.resolutionRate ?? 0) > 80
                          ? '#10b981'
                          : (aiQuality?.resolutionRate ?? 0) >= 50
                            ? '#f59e0b'
                            : '#ef4444',
                    }}
                  >
                    {aiQuality?.resolutionRate ?? 0}%
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-text-secondary text-sm">
                    AI successfully resolved{' '}
                    <span className="text-text-primary font-semibold">{aiQuality?.totalAnswered ?? 0}</span> of{' '}
                    <span className="text-text-primary font-semibold">
                      {((aiQuality?.totalAnswered ?? 0) + (aiQuality?.totalUnanswered ?? 0)).toLocaleString()}
                    </span>{' '}
                    questions in the last {days} days.
                  </p>
                  <div className="flex items-center gap-1.5">
                    {(aiQuality?.resolutionRate ?? 0) > 80 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-text-tertiary text-xs">
                      {(aiQuality?.resolutionRate ?? 0) > 80
                        ? 'Great performance — keep your knowledge base updated'
                        : (aiQuality?.resolutionRate ?? 0) >= 50
                          ? 'Average performance — review unanswered questions below'
                          : 'Low performance — expand your knowledge base'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Knowledge Gaps Card */}
            <Card className="bg-bg-secondary border-border">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-text-tertiary h-4 w-4" />
                  <h3 className="text-text-primary text-sm font-semibold">Knowledge Gaps</h3>
                </div>
                <Link
                  href="/dashboard/builder"
                  className="text-text-tertiary hover:text-text-primary flex items-center gap-1 text-xs transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  Knowledge Base
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {!aiQuality || aiQuality.knowledgeGaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <BookOpen className="text-text-tertiary mb-2 h-8 w-8 opacity-50" />
                  <p className="text-text-primary text-sm font-medium">No gaps found</p>
                  <p className="text-text-tertiary mt-1 text-xs">Your AI is answering all questions successfully.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {aiQuality.knowledgeGaps.slice(0, 6).map((gap, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="bg-bg-primary text-text-tertiary flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                          {i + 1}
                        </span>
                        <p className="text-text-secondary truncate text-sm">{gap.text}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="blue">{gap.count}x</Badge>
                        <Link
                          href="/dashboard/builder"
                          className="text-text-tertiary hover:text-text-primary flex items-center gap-0.5 text-[10px] transition-colors"
                          title="Add to Knowledge Base"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span className="hidden sm:inline">Add</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
