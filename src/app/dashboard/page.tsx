'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
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

/* ── colour tokens ─────────────────────────────────────── */
const ACCENT = {
  blue: { from: '#2563eb', to: '#7c3aed', glow: 'rgba(37,99,235,0.35)' },
  emerald: { from: '#059669', to: '#0d9488', glow: 'rgba(5,150,105,0.35)' },
  violet: { from: '#7c3aed', to: '#db2777', glow: 'rgba(124,58,237,0.35)' },
  amber: { from: '#d97706', to: '#ea580c', glow: 'rgba(217,119,6,0.35)' },
};

const CHANNEL_PALETTE = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777'];
const HOUR_HUE_START = 200;

/* ── helpers ────────────────────────────────────────────── */
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

/* ── custom tooltip ─────────────────────────────────────── */
function GlassTooltip({
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
    <div className="rounded-xl border border-white/10 bg-[#0c0c14]/90 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
        {formatter ? formatter(label ?? '') : label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-gray-300">{p.name}:</span>
          <span className="text-xs font-bold text-white">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ── stat card ──────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: typeof ACCENT.blue;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e16] transition-all duration-300 hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/30">
      {/* top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
      />
      {/* glow orb */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: accent.glow, opacity: 0.18 }}
      />

      <div className="relative flex items-start justify-between p-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-500 uppercase">{label}</p>
          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded-lg bg-white/5" />
          ) : (
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">{value}</p>
          )}
          {sub && !loading && <p className="mt-1 text-[11px] text-gray-600">{sub}</p>}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            boxShadow: `0 4px 20px ${accent.glow}`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── chart card shell ──────────────────────────────────── */
function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e16] p-6 ${className}`}>
      <h3 className="mb-5 text-[11px] font-bold tracking-[0.16em] text-gray-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

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
  const satisfactionData = [{ name: 'Satisfaction', value: analytics?.satisfactionPercent ?? 0, fill: '#7c3aed' }];

  return (
    <div className="relative mx-auto max-w-[1400px] space-y-8 pb-12">
      {/* ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/[0.04] blur-[120px]" />

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">Real-time performance across all your widgets.</p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all ${
                period === d
                  ? 'bg-white/[0.08] text-white shadow-inner shadow-white/5'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {d}d
            </button>
          ))}
          <Link
            href={hasPlan ? '/dashboard/builder' : '/plans'}
            className="group ml-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-[12px] font-bold tracking-wide text-white uppercase shadow-xl shadow-blue-600/25 transition-all hover:shadow-blue-600/40"
          >
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Widget
          </Link>
        </div>
      </div>

      {/* ── UPGRADE CTA ────────────────────────────────── */}
      {user?.plan === 'none' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 via-indigo-950/40 to-violet-950/50 p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-500/20 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-violet-500/15 blur-[60px]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">Unlock Full Analytics & AI Builder</h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">
                Get detailed insights, unlimited widgets, multi-channel integrations, and priority support.
              </p>
            </div>
            <Link
              href="/plans"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-7 py-3 text-sm font-bold text-white shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/50"
            >
              Upgrade Now
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* ── STAT CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Widgets"
          value={analytics?.totalWidgets?.toString() || '0'}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
          }
          accent={ACCENT.blue}
          loading={loading}
        />
        <StatCard
          label="Conversations"
          value={analytics?.totalChats?.toLocaleString() || '0'}
          sub={`Last ${period} days`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          }
          accent={ACCENT.emerald}
          loading={loading}
        />
        <StatCard
          label="Messages"
          value={analytics?.totalMessages?.toLocaleString() || '0'}
          sub={`Last ${period} days`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          }
          accent={ACCENT.violet}
          loading={loading}
        />
        <StatCard
          label="Avg Response"
          value={fmtResponseTime(analytics?.avgResponseTime || 0)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent={ACCENT.amber}
          loading={loading}
        />
      </div>

      {/* ── ACTIVITY — dual-line area chart ─────────────── */}
      <Panel title="Activity Overview" className="lg:col-span-2">
        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={combinedDaily} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="grdMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grdChat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#4b5563' }}
                tickFormatter={fmtDate}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip formatter={(v) => fmtDate(String(v))} />} />
              <Area
                type="monotone"
                dataKey="messages"
                name="Messages"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#grdMsg)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }}
              />
              <Area
                type="monotone"
                dataKey="conversations"
                name="Conversations"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#grdChat)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#7c3aed' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {/* legend */}
        {!loading && (
          <div className="mt-4 flex items-center justify-center gap-6">
            <span className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="h-2 w-2 rounded-full bg-blue-600" /> Messages
            </span>
            <span className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="h-2 w-2 rounded-full bg-violet-600" /> Conversations
            </span>
          </div>
        )}
      </Panel>

      {/* ── ROW 2: Peak Hours · Channels · Satisfaction ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Peak Hours — 5 cols */}
        <Panel title="Peak Hours" className="lg:col-span-5">
          {loading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.03]" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.hourlyDistribution || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: '#4b5563' }}
                  tickFormatter={fmtHour}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis tick={{ fontSize: 9, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip formatter={(v) => fmtHour(Number(v))} />} />
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
        </Panel>

        {/* Channels — 4 cols */}
        <Panel title="Channel Distribution" className="lg:col-span-4">
          {loading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.03]" />
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
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {analytics.channelBreakdown.map((ch, i) => (
                  <div key={ch.channel} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHANNEL_PALETTE[i % CHANNEL_PALETTE.length] }}
                    />
                    <span className="text-[11px] font-medium text-gray-400 capitalize">{ch.channel}</span>
                    <span className="text-[11px] font-bold text-gray-600">{ch.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex h-52 items-center justify-center text-xs text-gray-700">No channel data yet</p>
          )}
        </Panel>

        {/* Satisfaction — 3 cols */}
        <Panel title="Satisfaction" className="lg:col-span-3">
          {loading ? (
            <div className="h-52 animate-pulse rounded-xl bg-white/[0.03]" />
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
                    fill="#7c3aed"
                    background={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="-mt-10 text-center">
                <p className="text-3xl font-extrabold text-white">{analytics?.satisfactionPercent ?? 0}%</p>
                <p className="mt-0.5 text-[10px] font-medium tracking-wider text-gray-600 uppercase">
                  User Satisfaction
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* ── ROW 3: Widget Performance · Top Questions ──── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Widget Performance */}
        <Panel title="Widget Performance">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : analytics?.widgetPerformance?.length ? (
            <div className="space-y-3">
              {analytics.widgetPerformance.slice(0, 8).map((w, i) => {
                const maxChats = Math.max(...analytics.widgetPerformance.map((x) => x.chats), 1);
                const pct = (w.chats / maxChats) * 100;
                return (
                  <div key={i} className="group relative">
                    <div className="flex items-center gap-4 rounded-xl bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/20 to-blue-600/20 text-[11px] font-bold text-violet-400">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium text-gray-200">{w.name}</span>
                          <span className="ml-2 shrink-0 text-xs font-bold text-blue-400">{w.chats} chats</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex h-52 items-center justify-center text-xs text-gray-700">No widget data yet</p>
          )}
        </Panel>

        {/* Top Questions */}
        <Panel title="Top Questions">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : analytics?.topQuestions?.length ? (
            <div className="space-y-2">
              {analytics.topQuestions.slice(0, 8).map((q, i) => {
                const maxQ = analytics.topQuestions[0].count;
                const w = maxQ > 0 ? (q.count / maxQ) * 100 : 0;
                return (
                  <div key={i} className="group relative overflow-hidden rounded-xl">
                    {/* background fill bar */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-blue-600/[0.08] to-transparent transition-all duration-500"
                      style={{ width: `${w}%` }}
                    />
                    <div className="relative flex items-center gap-3 px-4 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-gray-600">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-300">{q.text}</span>
                      <span className="shrink-0 text-xs font-bold text-blue-400">{q.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex h-52 items-center justify-center text-xs text-gray-700">No questions yet</p>
          )}
        </Panel>
      </div>

      {/* ── QUICK ACTIONS ──────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e16] p-6">
        <h2 className="mb-4 text-[11px] font-bold tracking-[0.16em] text-gray-500 uppercase">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={hasPlan ? '/dashboard/builder' : '/plans'}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-[12px] font-bold text-white uppercase shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/35"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            AI Builder
          </Link>
          {[
            { label: 'My Widgets', href: '/dashboard/widgets' },
            { label: 'Integrations', href: '/dashboard/integrations' },
            { label: 'Billing', href: '/dashboard/billing' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[12px] font-semibold text-gray-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
