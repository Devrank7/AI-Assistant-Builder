'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Button, Badge } from '@/components/ui';
import { AnimatedNumber, MotionList, MotionItem } from '@/components/ui/motion';
import {
  LayoutGrid,
  MessageSquare,
  BarChart3,
  Clock,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
  Globe,
  ThumbsUp,
} from 'lucide-react';
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

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
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

/* ── Constants ── */
const CHANNEL_PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

/* ── Helpers ── */
function fmtResponseTime(ms: number) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
}
function fmtHour(h: number) {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ── Animations ── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};

/* ── Custom Tooltip ── */
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
    <div
      className="rounded-xl border border-gray-200/60 bg-white/90 px-3.5 py-2.5 shadow-xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#111118]/90"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      <p className="mb-1.5 text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
        {formatter ? formatter(label ?? '') : label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full shadow-sm" style={{ background: p.color }} />
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{p.name}</span>
          <span className="ml-auto text-[11px] font-bold text-gray-900 dark:text-white">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat Card ── */
const STAT_GRADIENTS = [
  { from: '#3B82F6', to: '#60A5FA', glow: 'rgba(59,130,246,0.15)' },
  { from: '#8B5CF6', to: '#A78BFA', glow: 'rgba(139,92,246,0.15)' },
  { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.15)' },
  { from: '#F59E0B', to: '#FBBF24', glow: 'rgba(245,158,11,0.15)' },
];

function StatCard({
  label,
  value,
  numericValue,
  sub,
  icon,
  loading,
  gradientIndex = 0,
  suffix,
}: {
  label: string;
  value: string;
  numericValue?: number;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
  gradientIndex?: number;
  suffix?: string;
}) {
  const g = STAT_GRADIENTS[gradientIndex % STAT_GRADIENTS.length];

  return (
    <motion.div
      variants={staggerItem}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12]"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
      }}
    >
      {/* Subtle gradient accent line at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }}
      />

      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          ) : numericValue !== undefined ? (
            <AnimatedNumber
              value={numericValue}
              suffix={suffix}
              className={`${syne.className} mt-2 block text-3xl font-bold text-gray-900 dark:text-white`}
            />
          ) : (
            <p className={`${syne.className} mt-2 text-3xl font-bold text-gray-900 dark:text-white`}>{value}</p>
          )}
          {sub && !loading && <p className="mt-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>

        {/* Icon container with gradient */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${g.from}15, ${g.to}20)`,
            color: g.from,
            boxShadow: `0 0 0 1px ${g.from}15`,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Glass Section Card ── */
function SectionCard({
  title,
  children,
  className = '',
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 dark:border-white/[0.06] dark:bg-[#111118] ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Skeleton ── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04] ${className}`} />;
}

/* ── Premium Empty State ── */
function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  color = 'blue',
  illustration,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  color?: 'blue' | 'violet' | 'emerald' | 'amber';
  illustration?: 'chart' | 'bars' | 'pie' | 'gauge' | 'list' | 'chat';
}) {
  const colorMap = {
    blue: {
      bg: 'rgba(59,130,246,0.06)',
      border: 'rgba(59,130,246,0.12)',
      text: '#3B82F6',
      glow: 'rgba(59,130,246,0.08)',
    },
    violet: {
      bg: 'rgba(139,92,246,0.06)',
      border: 'rgba(139,92,246,0.12)',
      text: '#8B5CF6',
      glow: 'rgba(139,92,246,0.08)',
    },
    emerald: {
      bg: 'rgba(16,185,129,0.06)',
      border: 'rgba(16,185,129,0.12)',
      text: '#10B981',
      glow: 'rgba(16,185,129,0.08)',
    },
    amber: {
      bg: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.12)',
      text: '#F59E0B',
      glow: 'rgba(245,158,11,0.08)',
    },
  };
  const c = colorMap[color];

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {/* Animated illustration */}
      <div className="relative mb-5">
        {/* Outer breathing ring */}
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
            animation: 'emptyPulse 3s ease-in-out infinite',
          }}
        />
        {/* Icon container */}
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            boxShadow: `0 0 20px ${c.glow}`,
          }}
        >
          <span style={{ color: c.text }}>
            <Icon className="h-6 w-6" />
          </span>
        </div>

        {/* Decorative floating dots */}
        {illustration && (
          <>
            <div
              className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full"
              style={{ background: c.text, opacity: 0.3, animation: 'emptyFloat 2.5s ease-in-out infinite' }}
            />
            <div
              className="absolute -bottom-1 -left-2 h-1 w-1 rounded-full"
              style={{ background: c.text, opacity: 0.2, animation: 'emptyFloat 3s ease-in-out infinite 0.5s' }}
            />
            <div
              className="absolute -right-3 bottom-1 h-1 w-1 rounded-full"
              style={{ background: c.text, opacity: 0.15, animation: 'emptyFloat 2.8s ease-in-out infinite 1s' }}
            />
          </>
        )}
      </div>

      {/* Text */}
      <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">{description}</p>

      {/* CTA */}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <button
            className="mt-4 flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: c.bg,
              color: c.text,
              border: `1px solid ${c.border}`,
            }}
          >
            <Plus className="h-3 w-3" />
            {ctaLabel}
          </button>
        </Link>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes emptyPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }
        @keyframes emptyFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}

/* Check if data arrays are all zeros */
function hasNonZeroData(arr: { count: number }[] | undefined): boolean {
  if (!arr?.length) return false;
  return arr.some((item) => item.count > 0);
}

/* ════════════════════════════════════════════════════════════════════ */

export default function DashboardOverview() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  /* Stripe session verification */
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

  const combinedDaily = (analytics?.messagesPerDay || []).map((m, i) => ({
    date: m.date,
    messages: m.count,
    conversations: analytics?.chatsPerDay?.[i]?.count ?? 0,
  }));

  const satisfactionData = [{ name: 'Satisfaction', value: analytics?.satisfactionPercent ?? 0, fill: '#8B5CF6' }];

  return (
    <div className="mx-auto max-w-[1400px] space-y-7 pb-16">
      {/* ── HEADER ── */}
      <motion.div {...fadeUp} className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Dashboard
          </p>
          <h1
            className={`${syne.className} text-2xl font-bold tracking-tight text-gray-900 md:text-3xl dark:text-white`}
          >
            {getGreeting()}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
            Real-time performance across all your widgets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-50/80 p-0.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`relative rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                  period === d
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.1] dark:text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <Link href={hasPlan ? '/dashboard/builder' : '/plans'}>
            <Button variant="primary" size="md" className="ml-1 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Widget
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── UPGRADE CTA ── */}
      {user?.plan === 'none' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
          className="relative overflow-hidden rounded-2xl border border-blue-200/40 bg-gradient-to-r from-blue-50 via-white to-violet-50 p-6 dark:border-blue-500/10 dark:from-blue-950/20 dark:via-[#111118] dark:to-violet-950/20"
        >
          {/* Decorative gradient orb */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/5" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className={`${syne.className} text-base font-bold text-gray-900 dark:text-white`}>
                  Unlock Full Analytics & AI Builder
                </h3>
                <p className="mt-1 max-w-md text-[13px] text-gray-500 dark:text-gray-400">
                  Get detailed insights, unlimited widgets, multi-channel integrations, and priority support.
                </p>
              </div>
            </div>
            <Link href="/plans">
              <Button variant="primary" size="lg" className="gap-2 whitespace-nowrap">
                Upgrade Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── STAT CARDS ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Active Widgets"
          value={analytics?.totalWidgets?.toString() || '0'}
          numericValue={analytics?.totalWidgets}
          icon={<LayoutGrid className="h-5 w-5" />}
          loading={loading}
          gradientIndex={0}
        />
        <StatCard
          label="Conversations"
          value={analytics?.totalChats?.toLocaleString() || '0'}
          numericValue={analytics?.totalChats}
          sub={`Last ${period} days`}
          icon={<MessageSquare className="h-5 w-5" />}
          loading={loading}
          gradientIndex={1}
        />
        <StatCard
          label="Messages"
          value={analytics?.totalMessages?.toLocaleString() || '0'}
          numericValue={analytics?.totalMessages}
          sub={`Last ${period} days`}
          icon={<BarChart3 className="h-5 w-5" />}
          loading={loading}
          gradientIndex={2}
        />
        <StatCard
          label="Avg Response"
          value={fmtResponseTime(analytics?.avgResponseTime || 0)}
          icon={<Clock className="h-5 w-5" />}
          loading={loading}
          gradientIndex={3}
        />
      </motion.div>

      {/* ── ACTIVITY CHART ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
      >
        <SectionCard
          title="Activity Overview"
          action={
            !loading && (
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Messages
                </span>
                <span className="flex items-center gap-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-violet-500" /> Conversations
                </span>
              </div>
            )
          }
        >
          {loading ? (
            <Skeleton className="h-72" />
          ) : !combinedDaily.length || !combinedDaily.some((d) => d.messages > 0 || d.conversations > 0) ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Your chat activity will appear here once your widgets start receiving messages"
              ctaLabel="Create Widget"
              ctaHref={hasPlan ? '/dashboard/builder' : '/plans'}
              color="blue"
              illustration="chart"
            />
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={combinedDaily} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovGrdMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ovGrdChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--wb-border, rgba(0,0,0,0.06))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 500 }}
                  tickFormatter={fmtDate}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v) => fmtDate(String(v))} />} />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Messages"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#ovGrdMsg)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#3B82F6' }}
                />
                <Area
                  type="monotone"
                  dataKey="conversations"
                  name="Conversations"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fill="url(#ovGrdChat)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#8B5CF6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </motion.div>

      {/* ── ROW 2: Peak Hours / Channels / Satisfaction ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Peak Hours — 5 cols */}
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
        >
          <SectionCard title="Peak Hours" className="h-full">
            {loading ? (
              <Skeleton className="h-56" />
            ) : !hasNonZeroData(analytics?.hourlyDistribution) ? (
              <EmptyState
                icon={Clock}
                title="No peak data"
                description="Hourly chat distribution will show when conversations start flowing"
                color="amber"
                illustration="bars"
              />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={analytics?.hourlyDistribution || []}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--wb-border, rgba(0,0,0,0.06))"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 500 }}
                    tickFormatter={fmtHour}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmtHour(Number(v))} />} />
                  <Bar dataKey="count" name="Chats" radius={[6, 6, 0, 0]}>
                    {(analytics?.hourlyDistribution || []).map((entry, i) => {
                      const maxC = Math.max(...(analytics?.hourlyDistribution || []).map((e) => e.count), 1);
                      const intensity = entry.count / maxC;
                      return (
                        <Cell key={i} fill={`hsl(220, 80%, ${45 + intensity * 20}%)`} opacity={0.3 + intensity * 0.7} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </motion.div>

        {/* Channels — 4 cols */}
        <motion.div
          className="lg:col-span-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
        >
          <SectionCard title="Channels" className="h-full">
            {loading ? (
              <Skeleton className="h-56" />
            ) : analytics?.channelBreakdown?.length ? (
              <div className="flex flex-col items-center gap-5">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={analytics.channelBreakdown}
                      dataKey="count"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
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
                      <span className="text-[11px] font-medium text-gray-500 capitalize dark:text-gray-400">
                        {ch.channel}
                      </span>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{ch.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Globe}
                title="No channels yet"
                description="Connect Telegram, WhatsApp, or Instagram to see channel distribution"
                ctaLabel="Add Integrations"
                ctaHref="/dashboard/integrations"
                color="emerald"
                illustration="pie"
              />
            )}
          </SectionCard>
        </motion.div>

        {/* Satisfaction — 3 cols */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
        >
          <SectionCard title="Satisfaction" className="h-full">
            {loading ? (
              <Skeleton className="h-56" />
            ) : !analytics?.satisfactionPercent ? (
              <EmptyState
                icon={ThumbsUp}
                title="No feedback yet"
                description="Satisfaction scores will appear once users rate their conversations"
                color="violet"
                illustration="gauge"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={170}>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    data={satisfactionData}
                    startAngle={180}
                    endAngle={0}
                    barSize={12}
                  >
                    <defs>
                      <linearGradient id="ovSatGrd" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#A78BFA" />
                      </linearGradient>
                    </defs>
                    <RadialBar
                      dataKey="value"
                      cornerRadius={6}
                      fill="url(#ovSatGrd)"
                      background={{ fill: 'var(--wb-bg-tertiary, rgba(0,0,0,0.04))' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="-mt-10 text-center">
                  {analytics?.satisfactionPercent !== undefined ? (
                    <AnimatedNumber
                      value={analytics.satisfactionPercent}
                      suffix="%"
                      className={`${syne.className} text-3xl font-bold text-gray-900 dark:text-white`}
                    />
                  ) : (
                    <p className={`${syne.className} text-3xl font-bold text-gray-900 dark:text-white`}>0%</p>
                  )}
                  <p className="mt-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
                    User Satisfaction
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </motion.div>
      </div>

      {/* ── ROW 3: Widget Performance / Top Questions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Widget Performance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
        >
          <SectionCard
            title="Top Widgets"
            action={
              analytics?.widgetPerformance?.length ? (
                <Link
                  href="/dashboard/widgets"
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 transition-colors hover:text-blue-600"
                >
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : null
            }
          >
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : analytics?.widgetPerformance?.length ? (
              <div className="space-y-2">
                {analytics.widgetPerformance.slice(0, 6).map((w, i) => {
                  const maxChats = Math.max(...analytics.widgetPerformance.map((x) => x.chats), 1);
                  const pct = (w.chats / maxChats) * 100;
                  return (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl px-3.5 py-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Progress bar bg */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-xl bg-blue-50/80 transition-all duration-700 dark:bg-blue-500/[0.04]"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center gap-3.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${STAT_GRADIENTS[i % 4].from}12, ${STAT_GRADIENTS[i % 4].to}18)`,
                            color: STAT_GRADIENTS[i % 4].from,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800 dark:text-gray-200">
                          {w.name}
                        </span>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            {w.chats} chats
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{w.messages} msgs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={LayoutGrid}
                title="No widgets yet"
                description="Create your first AI widget to see performance metrics here"
                ctaLabel="Create Widget"
                ctaHref={hasPlan ? '/dashboard/builder' : '/plans'}
                color="blue"
                illustration="list"
              />
            )}
          </SectionCard>
        </motion.div>

        {/* Top Questions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
        >
          <SectionCard
            title="Trending Questions"
            action={
              analytics?.topQuestions?.length ? (
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 transition-colors hover:text-blue-600"
                >
                  Analytics <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : null
            }
          >
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : analytics?.topQuestions?.length ? (
              <div className="space-y-1.5">
                {analytics.topQuestions.slice(0, 7).map((q, i) => {
                  const maxQ = analytics.topQuestions[0].count;
                  const w = maxQ > 0 ? (q.count / maxQ) * 100 : 0;
                  return (
                    <div key={i} className="group relative overflow-hidden rounded-xl transition-colors duration-200">
                      <div
                        className="absolute inset-y-0 left-0 rounded-xl bg-violet-50/70 transition-all duration-500 dark:bg-violet-500/[0.04]"
                        style={{ width: `${w}%` }}
                      />
                      <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-100/80 text-[9px] font-bold text-violet-500 dark:bg-violet-500/10 dark:text-violet-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-gray-700 dark:text-gray-300">
                          {q.text}
                        </span>
                        <span className="shrink-0 rounded-md bg-violet-100/60 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                          {q.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No questions yet"
                description="Popular customer questions will surface here as your widget handles conversations"
                color="violet"
                illustration="chat"
              />
            )}
          </SectionCard>
        </motion.div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const }}
      >
        <SectionCard title="Quick Actions">
          <div className="flex flex-wrap gap-2.5">
            <Link href={hasPlan ? '/dashboard/builder' : '/plans'}>
              <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]">
                <Sparkles className="h-3.5 w-3.5" />
                AI Builder
              </button>
            </Link>
            {[
              { label: 'My Widgets', href: '/dashboard/widgets', icon: LayoutGrid },
              { label: 'Analytics', href: '/dashboard/analytics', icon: Activity },
              { label: 'Integrations', href: '/dashboard/integrations', icon: Zap },
              { label: 'Billing', href: '/dashboard/billing', icon: ArrowUpRight },
            ].map((a) => (
              <Link key={a.href} href={a.href}>
                <button className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-[12px] font-semibold text-gray-600 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-400 dark:hover:border-white/[0.12] dark:hover:text-gray-200">
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              </Link>
            ))}
          </div>
        </SectionCard>
      </motion.div>
    </div>
  );
}
