'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, AlertTriangle, ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface FunnelStage {
  name: string;
  count: number;
  dropOff: number;
  conversionRate: number;
}

interface CohortRow {
  cohortWeek: string;
  totalUsers: number;
  retention: number[];
}

interface ChurnPrediction {
  visitorId: string;
  name?: string;
  email?: string;
  churnRisk: number;
  lastActiveAt: string;
  messageCount: number;
  warningSignals: string[];
}

interface RevenueData {
  totalRevenue: number;
  byChannel: { channel: string; revenue: number; percentage: number }[];
  topConvertingIntents: { intent: string; conversions: number; revenue: number }[];
}

interface Widget {
  clientId: string;
  username: string;
}

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

function getRetentionColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500/80';
  if (pct >= 50) return 'bg-green-500/50';
  if (pct >= 30) return 'bg-yellow-500/50';
  if (pct >= 10) return 'bg-orange-500/50';
  return 'bg-red-500/50';
}

function getChurnBarColor(risk: number): string {
  if (risk >= 80) return 'bg-red-500';
  if (risk >= 60) return 'bg-orange-500';
  return 'bg-yellow-500';
}

const channelColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

export default function AdvancedAnalyticsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loading, setLoading] = useState(false);

  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  useEffect(() => {
    fetch('/api/widgets')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length) {
          setWidgets(d.data);
          setSelectedClientId(d.data[0].clientId);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAll = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const [funnelRes, cohortRes, predRes, revRes] = await Promise.all([
        fetch(`/api/analytics/funnels?clientId=${selectedClientId}&days=30`).then((r) => r.json()),
        fetch(`/api/analytics/cohorts?clientId=${selectedClientId}&weeks=8`).then((r) => r.json()),
        fetch(`/api/analytics/predictions?clientId=${selectedClientId}`).then((r) => r.json()),
        fetch(`/api/analytics/revenue?clientId=${selectedClientId}&days=30`).then((r) => r.json()),
      ]);
      if (funnelRes.success) setFunnel(funnelRes.data || []);
      if (cohortRes.success) setCohorts(cohortRes.data || []);
      if (predRes.success) setChurnPredictions(predRes.data || []);
      if (revRes.success) setRevenue(revRes.data || null);
    } catch {
      // Failed
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const maxFunnelCount = funnel.length > 0 ? Math.max(...funnel.map((s) => s.count), 1) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          href="/dashboard/analytics"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Analytics
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
              Advanced Analytics
            </h1>
            <p className="mt-1 text-gray-400">Funnels, cohorts, predictions, and revenue attribution</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pr-8 pl-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
              >
                {widgets.map((w) => (
                  <option key={w.clientId} value={w.clientId} className="bg-gray-900">
                    {w.username}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 1: Conversion Funnel */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Conversion Funnel</h2>
            </div>
            {funnel.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No funnel data available</p>
            ) : (
              <div className="space-y-3">
                {funnel.map((stage, i) => {
                  const width = Math.max((stage.count / maxFunnelCount) * 100, 4);
                  const greenToRed = Math.round(120 - (i / (funnel.length - 1)) * 120);
                  return (
                    <div key={stage.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-300">{stage.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white">{stage.count.toLocaleString()}</span>
                          {i > 0 && <span className="text-xs text-red-400">-{stage.dropOff}%</span>}
                          <span className="text-xs text-gray-500">{stage.conversionRate}%</span>
                        </div>
                      </div>
                      <div className="h-6 overflow-hidden rounded-md bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className="h-full rounded-md"
                          style={{ backgroundColor: `hsl(${greenToRed}, 70%, 50%)` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Section 2: Cohort Retention Matrix */}
          <motion.div
            custom={1}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Cohort Retention</h2>
            </div>
            {cohorts.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No cohort data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="pb-2 text-left text-gray-500">Cohort</th>
                      <th className="pb-2 text-center text-gray-500">Users</th>
                      {Array.from({ length: 8 }, (_, i) => (
                        <th key={i} className="pb-2 text-center text-gray-500">
                          W{i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((cohort) => (
                      <tr key={cohort.cohortWeek}>
                        <td className="py-1 font-mono text-gray-400">{cohort.cohortWeek}</td>
                        <td className="py-1 text-center text-gray-300">{cohort.totalUsers}</td>
                        {Array.from({ length: 8 }, (_, i) => {
                          const val = cohort.retention[i];
                          if (val === undefined) {
                            return <td key={i} className="py-1" />;
                          }
                          return (
                            <td key={i} className="py-1 text-center">
                              <div
                                className={`mx-auto flex h-7 w-10 items-center justify-center rounded ${getRetentionColor(val)}`}
                                title={`${val}% retention`}
                              >
                                <span className="text-[10px] font-medium text-white">{val}%</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Section 3: Revenue Attribution */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Revenue Attribution</h2>
            </div>
            {!revenue ? (
              <p className="py-8 text-center text-gray-500">No revenue data available</p>
            ) : (
              <div className="space-y-6">
                {/* Total revenue card */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                  <p className="text-sm text-emerald-300">Total Revenue (30d)</p>
                  <p className="mt-1 text-3xl font-bold text-white">${revenue.totalRevenue.toLocaleString()}</p>
                </div>

                {/* Channel pie chart (CSS-based) */}
                {revenue.byChannel.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-400">By Channel</h3>
                    <div className="space-y-2">
                      {revenue.byChannel.map((ch, i) => (
                        <div key={ch.channel} className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${channelColors[i % channelColors.length]}`} />
                          <span className="w-20 text-sm text-gray-300">{ch.channel}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${channelColors[i % channelColors.length]}`}
                              style={{ width: `${ch.percentage}%` }}
                            />
                          </div>
                          <span className="w-16 text-right font-mono text-sm text-white">${ch.revenue}</span>
                          <span className="w-10 text-right text-xs text-gray-500">{ch.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top converting intents */}
                {revenue.topConvertingIntents.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-400">Top Converting Intents</h3>
                    <div className="space-y-2">
                      {revenue.topConvertingIntents.slice(0, 5).map((intent) => {
                        const maxConv = Math.max(...revenue.topConvertingIntents.map((i) => i.conversions), 1);
                        return (
                          <div key={intent.intent} className="flex items-center gap-3">
                            <span className="w-32 truncate text-sm text-gray-300">{intent.intent}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-purple-500"
                                style={{ width: `${(intent.conversions / maxConv) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-sm text-white">{intent.conversions}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Section 4: Churn Predictions */}
          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={stagger}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Churn Predictions</h2>
            </div>
            {churnPredictions.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No high-risk visitors detected</p>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {churnPredictions.map((pred) => (
                  <div key={pred.visitorId} className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{pred.name || pred.email || pred.visitorId}</p>
                        {pred.email && pred.name && <p className="text-xs text-gray-500">{pred.email}</p>}
                      </div>
                      <span className="font-mono text-lg font-bold text-red-400">{pred.churnRisk}</span>
                    </div>
                    {/* Risk bar */}
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${getChurnBarColor(pred.churnRisk)}`}
                        style={{ width: `${pred.churnRisk}%` }}
                      />
                    </div>
                    {/* Warning signals */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pred.warningSignals.map((signal, si) => (
                        <span
                          key={si}
                          className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Last active: {pred.lastActiveAt ? new Date(pred.lastActiveAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
