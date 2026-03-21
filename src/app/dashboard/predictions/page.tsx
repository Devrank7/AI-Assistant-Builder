'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertCircle,
  Loader2,
  BarChart3,
  Zap,
  ChevronDown,
  Users,
  Flame,
  Clock,
  Calendar,
  RefreshCw,
  Send,
  Star,
  ArrowUpRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// Types
interface Widget {
  clientId: string;
  username?: string;
  website?: string;
}
interface ChurnContact {
  contactId: string;
  name: string | null;
  email: string | null;
  channel: string;
  riskScore: number;
  daysSinceLastSeen: number;
  lastSeenAt: string;
  totalConversations: number;
  totalMessages: number;
  churnSignals: string[];
  recommendedAction: string;
}
interface HotLead {
  contactId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  conversionProbability: number;
  leadScore: number;
  leadTemp: string;
  buyingSignals: string[];
  lastSeenAt: string;
  totalConversations: number;
  totalMessages: number;
  recommendedAction: string;
}
interface FDay {
  date: string;
  label: string;
  predicted: number;
  historical: number;
}
interface WForecast {
  days: FDay[];
  totalPredicted: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}
interface HSlot {
  hour: number;
  label: string;
  count: number;
  predicted: number;
}
interface DCount {
  day: string;
  count: number;
}
interface PHForecast {
  hourlyDistribution: HSlot[];
  peakHour: number;
  peakDay: string;
  weekdayDistribution: DCount[];
}
interface FData {
  weekly: WForecast;
  peakHours: PHForecast;
}
interface AccData {
  overall: number;
  totalPredictions: number;
  accurate: number;
  inaccurate: number;
  accuracyRate: number;
  byAction: Record<string, { total: number; correct: number; rate: number }>;
}
// Helpers
function timeAgo(d: string) {
  if (!d) return '';
  const t = Date.now() - new Date(d).getTime(),
    m = Math.floor(t / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function ini(n: string | null) {
  if (!n) return '?';
  return n
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
const rC = (s: number) => (s >= 70 ? 'text-red-400' : s >= 40 ? 'text-amber-400' : 'text-yellow-400');
const rBg = (s: number) =>
  s >= 70
    ? 'bg-red-500/15 border-red-500/20'
    : s >= 40
      ? 'bg-amber-500/15 border-amber-500/20'
      : 'bg-yellow-500/15 border-yellow-500/20';
const pC = (p: number) => (p >= 70 ? 'text-emerald-400' : p >= 50 ? 'text-blue-400' : 'text-cyan-400');
const pBg = (p: number) =>
  p >= 70
    ? 'bg-emerald-500/15 border-emerald-500/20'
    : p >= 50
      ? 'bg-blue-500/15 border-blue-500/20'
      : 'bg-cyan-500/15 border-cyan-500/20';
const chI = (c: string) => (c === 'telegram' ? '✈️' : c === 'whatsapp' ? '💬' : c === 'instagram' ? '📸' : '🌐');
// Gauge
function Gauge({ value, color }: { value: number; color: string }) {
  const r = 20,
    circ = 2 * Math.PI * r,
    pct = Math.min(value / 100, 1);
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        className={color}
      />
      <text x="26" y="30" textAnchor="middle" className="fill-white text-[10px] font-bold">
        {value}
      </text>
    </svg>
  );
}
// HeatCell
function HCell({ value, max }: { value: number; max: number }) {
  const op = 0.1 + (max > 0 ? value / max : 0) * 0.85;
  return (
    <div
      className="h-5 w-full rounded-sm"
      style={{ backgroundColor: `rgba(99,102,241,${op})` }}
      title={`${value} chats`}
    />
  );
}

export default function PredictionsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [sel, setSel] = useState('');
  const [wLoad, setWLoad] = useState(true);
  const [churn, setChurn] = useState<ChurnContact[]>([]);
  const [leads, setLeads] = useState<HotLead[]>([]);
  const [forecast, setForecast] = useState<FData | null>(null);
  const [acc, setAcc] = useState<AccData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'churn' | 'leads' | 'forecast' | 'accuracy'>('churn');
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [pri, setPri] = useState<Set<string>>(new Set());

  const fetchWidgets = useCallback(async () => {
    try {
      const r = await fetch('/api/clients');
      const d = await r.json();
      const list = d.data ?? [];
      setWidgets(list);
      if (list.length > 0) setSel((p) => p || list[0].clientId);
    } catch (e) {
      console.error(e);
    } finally {
      setWLoad(false);
    }
  }, []);
  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const fetchAll = useCallback(async () => {
    if (!sel) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [cr, lr, fr, ar] = await Promise.all([
        fetch(`/api/predictions/churn?clientId=${sel}`),
        fetch(`/api/predictions/leads?clientId=${sel}`),
        fetch(`/api/predictions/forecast?clientId=${sel}`),
        fetch(`/api/predictions/accuracy?clientId=${sel}`),
      ]);
      const [cj, lj, fj, aj] = await Promise.all([cr.json(), lr.json(), fr.json(), ar.json()]);
      if (cj.success) setChurn(cj.data ?? []);
      if (lj.success) setLeads(lj.data ?? []);
      if (fj.success) setForecast(fj.data ?? null);
      if (aj.success) setAcc(aj.data ?? null);
    } catch {
      setError('Failed to load prediction data');
    } finally {
      setLoading(false);
    }
  }, [sel]);
  useEffect(() => {
    if (sel) fetchAll();
  }, [fetchAll, sel]);

  const highRisk = churn.filter((c) => c.riskScore >= 70).length;
  const hotCount = leads.filter((l) => l.conversionProbability >= 70).length;
  const wkTotal = forecast?.weekly.totalPredicted ?? 0;
  const pkHour = forecast?.peakHours.peakHour ?? 0;
  const maxH = Math.max(...(forecast?.peakHours.hourlyDistribution.map((h) => h.count) ?? [1]), 1);
  const maxW = Math.max(...(forecast?.weekly.days.map((d) => d.predicted) ?? [1]), 1);

  const TABS = [
    { id: 'churn' as const, label: 'Churn Risk', icon: AlertTriangle, count: churn.length },
    { id: 'leads' as const, label: 'Hot Leads', icon: Flame, count: leads.length },
    { id: 'forecast' as const, label: 'Forecast', icon: BarChart3, count: null },
    { id: 'accuracy' as const, label: 'Accuracy', icon: Target, count: null },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Predictions</h1>
            <p className="text-sm text-gray-400">Churn risk, hot leads and volume forecasts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            {wLoad ? (
              <div className="flex h-10 w-44 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <select
                  value={sel}
                  onChange={(e) => setSel(e.target.value)}
                  className="h-10 w-52 appearance-none rounded-xl border border-white/[0.08] bg-white/[0.05] pr-8 pl-4 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  {widgets.length === 0 && <option value="">No widgets</option>}
                  {widgets.map((w) => (
                    <option key={w.clientId} value={w.clientId}>
                      {w.username ?? w.website ?? w.clientId}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-3 right-2.5 h-4 w-4 text-gray-400" />
              </>
            )}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading || !sel}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-gray-300 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'High Risk',
            value: highRisk,
            icon: AlertTriangle,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            sub: `${churn.length} monitored`,
          },
          {
            label: 'Hot Leads',
            value: hotCount,
            icon: Flame,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            sub: `${leads.length} total`,
          },
          {
            label: 'Predicted/Week',
            value: wkTotal,
            icon: Calendar,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            sub:
              forecast?.weekly.trend === 'up'
                ? `↑${forecast.weekly.trendPercent}% trend`
                : forecast?.weekly.trend === 'down'
                  ? `↓${forecast?.weekly.trendPercent}% trend`
                  : 'Stable trend',
          },
          {
            label: 'Peak Hour',
            value: `${String(pkHour).padStart(2, '0')}:00`,
            icon: Clock,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            sub: forecast?.peakHours.peakDay ? `Busiest: ${forecast.peakHours.peakDay}` : 'No data',
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <span className="text-xs text-gray-400">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : c.value}
            </div>
            <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {!sel && !wLoad && (
        <div className="py-20 text-center text-gray-400">
          <Target className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-lg font-medium text-white">Select a widget</p>
          <p className="mt-1 text-sm">Choose a widget above to see AI predictions</p>
        </div>
      )}
      {error && !loading && sel && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={fetchAll} className="ml-auto text-xs text-red-300 hover:underline">
            Retry
          </button>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
          Analyzing data…
        </div>
      )}

      {!loading && !error && sel && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${tab === t.id ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? 'bg-white/10' : 'bg-white/[0.05]'}`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* CHURN TAB */}
            {tab === 'churn' && (
              <motion.div
                key="churn"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {churn.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] py-16 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400 opacity-60" />
                    <p className="font-medium text-white">No churn risk detected</p>
                    <p className="mt-1 text-sm text-gray-400">All contacts appear healthy</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium text-white">{churn.length}</span> contacts at risk
                      {highRisk > 0 && <span className="ml-2 text-red-400">• {highRisk} critical</span>}
                    </p>
                    {churn.map((c) => (
                      <div key={c.contactId} className={`rounded-2xl border p-4 backdrop-blur ${rBg(c.riskScore)}`}>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-bold text-white">
                            {ini(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white">
                                {c.name ?? c.email ?? `Contact …${c.contactId.slice(-6)}`}
                              </span>
                              <span className="text-lg">{chI(c.channel)}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last seen {timeAgo(c.lastSeenAt)}
                              </span>
                              <span>{c.totalConversations} conv.</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {c.churnSignals.map((s, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-gray-300"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                              <ChevronRight className="mr-0.5 inline h-3 w-3" />
                              {c.recommendedAction}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-center gap-2">
                            <Gauge value={c.riskScore} color={rC(c.riskScore)} />
                            <span className={`text-xs font-semibold ${rC(c.riskScore)}`}>
                              {c.riskScore >= 70 ? 'Critical' : c.riskScore >= 40 ? 'High' : 'Medium'}
                            </span>
                            <button
                              onClick={() => setNudged((p) => new Set(p).add(c.contactId))}
                              disabled={nudged.has(c.contactId)}
                              className="flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-50"
                            >
                              {nudged.has(c.contactId) ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Sent
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  Nudge
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {/* LEADS TAB */}
            {tab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {leads.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] py-16 text-center">
                    <Flame className="mx-auto mb-3 h-10 w-10 text-amber-400 opacity-60" />
                    <p className="font-medium text-white">No hot leads detected</p>
                    <p className="mt-1 text-sm text-gray-400">Leads appear as contacts show buying signals</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium text-white">{leads.length}</span> leads
                      {hotCount > 0 && <span className="ml-2 text-emerald-400">• {hotCount} ready to convert</span>}
                    </p>
                    {leads.map((l) => (
                      <div
                        key={l.contactId}
                        className={`rounded-2xl border p-4 backdrop-blur ${pBg(l.conversionProbability)}`}
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-bold text-white">
                            {ini(l.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white">
                                {l.name ?? l.email ?? `Lead …${l.contactId.slice(-6)}`}
                              </span>
                              <span className="text-lg">{chI(l.channel)}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${l.leadTemp === 'hot' ? 'bg-red-500/20 text-red-300' : l.leadTemp === 'warm' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}
                              >
                                {l.leadTemp}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                              <span>
                                Score: <span className="font-medium text-white">{l.leadScore}</span>
                              </span>
                              <span>{l.totalConversations} conv.</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeAgo(l.lastSeenAt)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {l.buyingSignals.map((s, i) => (
                                <span
                                  key={i}
                                  className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                                >
                                  <Star className="h-2.5 w-2.5" />
                                  {s}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                              <ChevronRight className="mr-0.5 inline h-3 w-3" />
                              {l.recommendedAction}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-center gap-2">
                            <Gauge value={l.conversionProbability} color={pC(l.conversionProbability)} />
                            <span className={`text-xs font-semibold ${pC(l.conversionProbability)}`}>
                              {l.conversionProbability}% prob
                            </span>
                            <button
                              onClick={() => setPri((p) => new Set(p).add(l.contactId))}
                              disabled={pri.has(l.contactId)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              {pri.has(l.contactId) ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Done
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-3 w-3" />
                                  Prioritize
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {/* FORECAST TAB */}
            {tab === 'forecast' && (
              <motion.div
                key="forecast"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* Weekly */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">7-Day Volume Forecast</h3>
                    </div>
                    {forecast?.weekly.trend === 'up' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <TrendingUp className="h-3 w-3" />+{forecast.weekly.trendPercent}%
                      </span>
                    )}
                    {forecast?.weekly.trend === 'down' && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <TrendingDown className="h-3 w-3" />-{forecast.weekly.trendPercent}%
                      </span>
                    )}
                    {forecast?.weekly.trend === 'stable' && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Minus className="h-3 w-3" />
                        Stable
                      </span>
                    )}
                  </div>
                  {!forecast?.weekly.days.length ? (
                    <div className="py-8 text-center text-sm text-gray-400">Not enough data to forecast</div>
                  ) : (
                    <>
                      <div className="flex h-40 items-end gap-2">
                        {forecast.weekly.days.map((day, i) => {
                          const h = maxW > 0 ? (day.predicted / maxW) * 100 : 0;
                          const hh = maxW > 0 ? (day.historical / maxW) * 100 : 0;
                          return (
                            <div key={i} className="group relative flex flex-1 flex-col items-center">
                              <div className="absolute bottom-full z-10 mb-1 hidden rounded-lg border border-white/[0.08] bg-gray-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-xl group-hover:block">
                                <div className="font-medium">
                                  {day.label} · {day.date}
                                </div>
                                <div className="text-blue-300">Predicted: {day.predicted}</div>
                                <div className="text-gray-400">Avg: {day.historical}</div>
                              </div>
                              <div className="relative w-full" style={{ height: '100%' }}>
                                <div
                                  className="absolute bottom-0 w-full rounded-t-sm bg-white/[0.08]"
                                  style={{ height: `${hh}%` }}
                                />
                                <div
                                  className="absolute bottom-0 w-full rounded-t bg-blue-500/60 transition-all group-hover:bg-blue-500/80"
                                  style={{ height: `${h}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-gray-500">
                        {forecast.weekly.days.map((d, i) => (
                          <span key={i} className="flex-1 text-center">
                            {d.label}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-500/60" />
                          Predicted
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-4 rounded-sm bg-white/[0.08]" />
                          Historical avg
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {/* Peak hours */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Peak Hours Heatmap</h3>
                    {forecast?.peakHours.peakHour !== undefined && (
                      <span className="ml-auto text-xs text-gray-400">
                        Peak: {String(forecast.peakHours.peakHour).padStart(2, '0')}:00 on {forecast.peakHours.peakDay}
                      </span>
                    )}
                  </div>
                  {!forecast?.peakHours.hourlyDistribution.length ? (
                    <div className="py-8 text-center text-sm text-gray-400">Not enough chat data</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-1">
                        {forecast.peakHours.hourlyDistribution.map((s) => (
                          <div key={s.hour} className="group relative">
                            <HCell value={s.count} max={maxH} />
                            <div className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                              {s.label}: {s.count}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-12 gap-1 text-center">
                        {forecast.peakHours.hourlyDistribution
                          .filter((_, i) => i % 4 === 0)
                          .map((s) => (
                            <span key={s.hour} className="col-span-4 text-[10px] text-gray-500">
                              {s.label}
                            </span>
                          ))}
                      </div>
                      {/* Day bars */}
                      <div className="mt-5 border-t border-white/[0.05] pt-4">
                        <p className="mb-3 text-xs font-medium text-gray-400">By day of week</p>
                        <div className="flex h-16 items-end gap-2">
                          {forecast.peakHours.weekdayDistribution.map((d) => {
                            const mx = Math.max(...forecast.peakHours.weekdayDistribution.map((x) => x.count), 1);
                            return (
                              <div key={d.day} className="group relative flex flex-1 flex-col items-center">
                                <div
                                  className="w-full rounded-t bg-indigo-500/50 group-hover:bg-indigo-500/80"
                                  style={{ height: `${(d.count / mx) * 100}%` }}
                                />
                                <div className="absolute bottom-full z-10 mb-1 hidden rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                                  {d.day}: {d.count}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                          {forecast.peakHours.weekdayDistribution.map((d) => (
                            <span key={d.day} className="flex-1 text-center">
                              {d.day}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
                        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                        <div>
                          <p className="text-xs font-medium text-purple-300">Agent Scheduling Tip</p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            Ensure agents are available at{' '}
                            <span className="font-medium text-white">
                              {String(forecast.peakHours.peakHour).padStart(2, '0')}:00
                            </span>{' '}
                            on <span className="font-medium text-white">{forecast.peakHours.peakDay}</span>.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ACCURACY TAB */}
            {tab === 'accuracy' && (
              <motion.div
                key="accuracy"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Prediction Accuracy</h3>
                  </div>
                  {!acc || acc.totalPredictions === 0 ? (
                    <div className="py-8 text-center">
                      <Activity className="mx-auto mb-3 h-10 w-10 text-gray-500 opacity-50" />
                      <p className="text-sm text-gray-400">No accuracy data yet</p>
                      <p className="mt-1 text-xs text-gray-500">Requires prediction feedback signals</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 flex items-center gap-6">
                        <svg width="100" height="100" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={`${(acc.overall / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            className="text-emerald-400"
                          />
                          <text x="50" y="45" textAnchor="middle" className="fill-white text-lg font-bold">
                            {acc.overall}%
                          </text>
                          <text x="50" y="60" textAnchor="middle" className="fill-gray-400 text-[8px]">
                            accuracy
                          </text>
                        </svg>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-gray-400">Correct:</span>
                            <span className="font-medium text-white">{acc.accurate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-400" />
                            <span className="text-gray-400">Incorrect:</span>
                            <span className="font-medium text-white">{acc.inaccurate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-400" />
                            <span className="text-gray-400">Total:</span>
                            <span className="font-medium text-white">{acc.totalPredictions}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mb-2 flex justify-between text-xs text-gray-400">
                        <span>Calibration</span>
                        <span>{acc.overall}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${acc.overall}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      {acc.byAction && (
                        <div className="mt-5 grid grid-cols-3 gap-3">
                          {(['nudge', 'offer', 'none'] as const).map((a) => {
                            const d = acc.byAction?.[a] ?? { total: 0, correct: 0, rate: 0 };
                            const cls =
                              a === 'nudge'
                                ? 'bg-blue-500/20 text-blue-400'
                                : a === 'offer'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-gray-500/20 text-gray-400';
                            return (
                              <div key={a} className="rounded-xl bg-white/[0.03] p-3">
                                <div className="mb-2 flex justify-between">
                                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${cls}`}>{a}</span>
                                  <span className="text-xs text-gray-500">{d.total}</span>
                                </div>
                                <div className="text-xl font-bold text-white">{d.rate}%</div>
                                <div className="mt-0.5 text-xs text-gray-400">{d.correct} correct</div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.rate}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">How Predictions Work</h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-400">
                    {[
                      {
                        icon: AlertTriangle,
                        color: 'text-red-400',
                        title: 'Churn Risk',
                        desc: 'Contacts inactive 7+ days, low engagement, negative language scored 0–100.',
                      },
                      {
                        icon: Flame,
                        color: 'text-amber-400',
                        title: 'Hot Leads',
                        desc: 'High lead score + warm/hot temp + buying-intent keywords scored by conversion probability.',
                      },
                      {
                        icon: Calendar,
                        color: 'text-blue-400',
                        title: 'Weekly Forecast',
                        desc: 'Day-of-week averages from 90-day history with trend adjustment from last 4 weeks.',
                      },
                      {
                        icon: Activity,
                        color: 'text-purple-400',
                        title: 'Peak Hours',
                        desc: 'Hourly distribution of chat logs over last 90 days to surface highest-traffic windows.',
                      },
                    ].map((x, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <x.icon className={`mt-0.5 h-4 w-4 shrink-0 ${x.color}`} />
                        <div>
                          <span className="font-medium text-white">{x.title} — </span>
                          {x.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
