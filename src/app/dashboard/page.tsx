'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Card, Button, Badge } from '@/components/ui';
import { LayoutGrid, MessageSquare, BarChart3, Clock, Plus, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface AnalyticsData {
  totalWidgets: number;
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  satisfactionPercent: number;
  messagesPerDay: { date: string; count: number }[];
  chatsPerDay: { date: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  channelBreakdown: { channel: string; count: number; percent: number }[];
  topQuestions: { text: string; count: number }[];
  widgetPerformance: { name: string; chats: number; messages: number }[];
}

const CHANNEL_PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
const HOUR_HUE_START = 200;

/* -- helpers -------------------------------------------------- */
function fmtResponseTime(ms: number) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
}
function fmtHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

/* -- custom tooltip ------------------------------------------- */
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string | number;
  formatter?: (v: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-bg-primary rounded-lg border p-2 shadow-md">
      <p className="text-text-tertiary mb-1 text-[10px] font-medium tracking-wide uppercase">
        {formatter ? formatter(label ?? '') : label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary text-xs">{p.name}:</span>
          <span className="text-text-primary text-xs font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* -- stat card ------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
  icon,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card padding="md" className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-text-secondary text-xs font-medium tracking-wider uppercase">{label}</p>
        {loading ? (
          <div className="bg-bg-primary mt-3 h-8 w-20 animate-pulse rounded-md" />
        ) : (
          <p className="text-text-primary mt-2 text-2xl font-bold">{value}</p>
        )}
        {sub && !loading && <p className="text-text-tertiary mt-1 text-xs">{sub}</p>}
      </div>
      <div className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
    </Card>
  );
}

/* ============================================================= */

export default function DashboardOverview() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  // Verify Stripe session after checkout redirect (fallback for webhooks)
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;
    fetch('/api/stripe/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => res.json())
      .then(() => refreshUser())
      .catch(() => {});
    // Remove session_id from URL
    window.history.replaceState({}, '', '/dashboard');
  }, [searchParams, refreshUser]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/analytics?days=${period}`);
      const data = await res.json();
      if (data.success && data.data) setAnalytics(data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const hasPlan = user?.plan && user.plan !== 'none';

  /* merge messages + chats into a combined series for the dual-line area chart */
  const combinedDaily = (analytics?.messagesPerDay || []).map((m, i) => ({
    date: m.date,
    messages: m.count,
    conversations: analytics?.chatsPerDay?.[i]?.count ?? 0,
  }));

  /* radial data for satisfaction gauge */
  const satisfactionData = [{ name: 'Satisfaction', value: analytics?.satisfactionPercent ?? 0, fill: '#8B5CF6' }];

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-12">
      {/* -- HEADER ------------------------------------------- */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-semibold">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Real-time performance across all your widgets.</p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as const).map((d) => (
            <Button key={d} variant={period === d ? 'primary' : 'secondary'} size="sm" onClick={() => setPeriod(d)}>
              {d}d
            </Button>
          ))}
          <Link href={hasPlan ? '/dashboard/builder' : '/plans'}>
            <Button variant="primary" size="md" className="ml-2 gap-1.5">
              <Plus className="h-4 w-4" />
              New Widget
            </Button>
          </Link>
        </div>
      </div>

      {/* -- UPGRADE CTA -------------------------------------- */}
      {user?.plan === 'none' && (
        <Card padding="lg" className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-accent h-5 w-5" />
              <h3 className="text-text-primary text-base font-semibold">Unlock Full Analytics & AI Builder</h3>
            </div>
            <p className="text-text-secondary mt-1.5 max-w-md text-sm">
              Get detailed insights, unlimited widgets, multi-channel integrations, and priority support.
            </p>
          </div>
          <Link href="/plans">
            <Button variant="primary" size="lg" className="gap-2">
              Upgrade Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* -- STAT CARDS --------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Widgets"
          value={analytics?.totalWidgets?.toString() || '0'}
          icon={<LayoutGrid className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Conversations"
          value={analytics?.totalChats?.toLocaleString() || '0'}
          sub={`Last ${period} days`}
          icon={<MessageSquare className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Messages"
          value={analytics?.totalMessages?.toLocaleString() || '0'}
          sub={`Last ${period} days`}
          icon={<BarChart3 className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Avg Response"
          value={fmtResponseTime(analytics?.avgResponseTime || 0)}
          icon={<Clock className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {/* -- ACTIVITY -- area chart ---------------------------- */}
      <Card padding="lg">
        <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">Activity Overview</h3>
        {loading ? (
          <div className="bg-bg-primary h-64 animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={combinedDaily} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="grdMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grdChat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--wb-border, rgba(0,0,0,0.06))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={fmtDate}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip formatter={(v) => fmtDate(String(v))} />} />
              <Area
                type="monotone"
                dataKey="messages"
                name="Messages"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#grdMsg)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#3B82F6' }}
              />
              <Area
                type="monotone"
                dataKey="conversations"
                name="Conversations"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#grdChat)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#8B5CF6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {/* legend */}
        {!loading && (
          <div className="mt-4 flex items-center justify-center gap-6">
            <span className="text-text-secondary flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Messages
            </span>
            <span className="text-text-secondary flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Conversations
            </span>
          </div>
        )}
      </Card>

      {/* -- ROW 2: Peak Hours / Channels / Satisfaction ------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Peak Hours -- 5 cols */}
        <Card padding="lg" className="lg:col-span-5">
          <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">Peak Hours</h3>
          {loading ? (
            <div className="bg-bg-primary h-52 animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.hourlyDistribution || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--wb-border, rgba(0,0,0,0.06))" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickFormatter={fmtHour}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v) => fmtHour(Number(v))} />} />
                <Bar dataKey="count" name="Chats" radius={[4, 4, 0, 0]}>
                  {(analytics?.hourlyDistribution || []).map((entry, i) => {
                    const maxC = Math.max(...(analytics?.hourlyDistribution || []).map((e) => e.count), 1);
                    const intensity = entry.count / maxC;
                    return <Cell key={i} fill={`hsl(${HOUR_HUE_START + i * 6}, 75%, ${35 + intensity * 30}%)`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Channels -- 4 cols */}
        <Card padding="lg" className="lg:col-span-4">
          <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">
            Channel Distribution
          </h3>
          {loading ? (
            <div className="bg-bg-primary h-52 animate-pulse rounded-lg" />
          ) : analytics?.channelBreakdown?.length ? (
            <div className="flex flex-col items-center gap-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={analytics.channelBreakdown}
                    dataKey="count"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    strokeWidth={0}
                    paddingAngle={3}
                  >
                    {analytics.channelBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHANNEL_PALETTE[i % CHANNEL_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {analytics.channelBreakdown.map((ch, i) => (
                  <div key={ch.channel} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] }}
                    />
                    <span className="text-text-secondary text-xs font-medium capitalize">{ch.channel}</span>
                    <span className="text-text-tertiary text-xs font-semibold">{ch.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-text-tertiary flex h-52 items-center justify-center text-xs">No channel data yet</p>
          )}
        </Card>

        {/* Satisfaction -- 3 cols */}
        <Card padding="lg" className="lg:col-span-3">
          <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">Satisfaction</h3>
          {loading ? (
            <div className="bg-bg-primary h-52 animate-pulse rounded-lg" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  data={satisfactionData}
                  startAngle={180}
                  endAngle={0}
                  barSize={10}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={5}
                    fill="#8B5CF6"
                    background={{ fill: 'var(--wb-bg-tertiary, rgba(0,0,0,0.04))' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="-mt-10 text-center">
                <p className="text-text-primary text-2xl font-bold">{analytics?.satisfactionPercent ?? 0}%</p>
                <p className="text-text-tertiary mt-0.5 text-[10px] font-medium tracking-wider uppercase">
                  User Satisfaction
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* -- ROW 3: Widget Performance / Top Questions ---------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Widget Performance */}
        <Card padding="lg">
          <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">Top Widgets</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-bg-primary h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : analytics?.widgetPerformance?.length ? (
            <div className="space-y-3">
              {analytics.widgetPerformance.slice(0, 8).map((w, i) => {
                const maxChats = Math.max(...analytics.widgetPerformance.map((x) => x.chats), 1);
                const pct = (w.chats / maxChats) * 100;
                return (
                  <div
                    key={i}
                    className="hover:bg-bg-primary flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <span className="bg-accent/10 text-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-primary truncate text-sm font-medium">{w.name}</span>
                        <Badge variant="blue" className="ml-2 shrink-0">
                          {w.chats} chats
                        </Badge>
                      </div>
                      <div className="bg-bg-primary mt-1.5 h-1 overflow-hidden rounded-full">
                        <div
                          className="bg-accent h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-tertiary flex h-52 items-center justify-center text-xs">No widget data yet</p>
          )}
        </Card>

        {/* Top Questions / Recent Activity */}
        <Card padding="lg">
          <h3 className="text-text-secondary mb-5 text-xs font-medium tracking-wider uppercase">Recent Activity</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-bg-primary h-9 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : analytics?.topQuestions?.length ? (
            <div className="space-y-2">
              {analytics.topQuestions.slice(0, 8).map((q, i) => {
                const maxQ = analytics.topQuestions[0].count;
                const w = maxQ > 0 ? (q.count / maxQ) * 100 : 0;
                return (
                  <div key={i} className="relative overflow-hidden rounded-lg">
                    {/* background fill bar */}
                    <div
                      className="bg-accent/[0.06] absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                      style={{ width: `${w}%` }}
                    />
                    <div className="relative flex items-center gap-3 px-3 py-2.5">
                      <span className="text-text-tertiary flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold">
                        {i + 1}
                      </span>
                      <span className="text-text-primary min-w-0 flex-1 truncate text-xs">{q.text}</span>
                      <Badge variant="blue" className="shrink-0">
                        {q.count}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-tertiary flex h-52 items-center justify-center text-xs">No questions yet</p>
          )}
        </Card>
      </div>

      {/* -- QUICK ACTIONS ------------------------------------- */}
      <Card padding="lg">
        <h3 className="text-text-secondary mb-4 text-xs font-medium tracking-wider uppercase">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href={hasPlan ? '/dashboard/builder' : '/plans'}>
            <Button variant="primary" size="md" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Builder
            </Button>
          </Link>
          {[
            { label: 'My Widgets', href: '/dashboard/widgets' },
            { label: 'Integrations', href: '/dashboard/integrations' },
            { label: 'Billing', href: '/dashboard/billing' },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Button variant="secondary" size="md">
                {a.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
