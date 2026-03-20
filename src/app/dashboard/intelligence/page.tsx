'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  BarChart3,
  ChevronDown,
  Loader2,
  ShieldAlert,
  Target,
  Users,
  MessageCircle,
  Lightbulb,
} from 'lucide-react';

interface DashboardData {
  summary: {
    avgBuyingSignal: number;
    avgChurnRisk: number;
    escalationRate: number;
    satisfaction: number;
    totalConversations: number;
    totalInsights: number;
  };
  topIntents: Array<{ label: string; count: number }>;
  sentimentDistribution: { positive: number; negative: number; neutral: number };
  insightsByType: Record<string, number>;
  competitorMentions: Array<{ label: string; count: number }>;
  featureRequests: Array<{ label: string; count: number }>;
  escalationCount: number;
}

interface Signal {
  _id: string;
  type: string;
  label: string;
  confidence: number;
  details: string;
  sessionId: string;
  createdAt: string;
}

const INTENT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
];

const TYPE_LABELS: Record<string, string> = {
  intent: 'Intent',
  buying_signal: 'Buying Signal',
  churn_indicator: 'Churn Risk',
  competitor_mention: 'Competitor',
  complaint: 'Complaint',
  feature_request: 'Feature Request',
  positive_feedback: 'Positive Feedback',
  escalation_needed: 'Escalation',
  upsell_opportunity: 'Upsell',
};

export default function IntelligencePage() {
  const [widgets, setWidgets] = useState<Array<{ clientId: string; name?: string }>>([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalType, setSignalType] = useState('');
  const [signalPage, setSignalPage] = useState(1);
  const [signalTotal, setSignalTotal] = useState(0);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      const d = await res.json();
      if (d.success && d.data) {
        setWidgets(d.data);
        if (d.data.length > 0 && !selectedWidget) {
          setSelectedWidget(d.data[0].clientId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch widgets:', err);
    }
  }, [selectedWidget]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedWidget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/intelligence/dashboard?clientId=${selectedWidget}&days=${days}`);
      const d = await res.json();
      if (d.success) setData(d.data);
    } catch (err) {
      console.error('Failed to fetch intelligence data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWidget, days]);

  const fetchSignals = useCallback(async () => {
    if (!selectedWidget) return;
    try {
      const typeParam = signalType ? `&type=${signalType}` : '';
      const res = await fetch(
        `/api/intelligence/signals?clientId=${selectedWidget}&days=${days}&page=${signalPage}&limit=10${typeParam}`
      );
      const d = await res.json();
      if (d.success) {
        setSignals(d.data.signals || []);
        setSignalTotal(d.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    }
  }, [selectedWidget, days, signalPage, signalType]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  useEffect(() => {
    fetchDashboard();
    fetchSignals();
  }, [fetchDashboard, fetchSignals]);

  const totalIntents = data?.topIntents.reduce((s, i) => s + i.count, 0) || 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">Conversation Intelligence</h1>
          <p className="text-text-secondary mt-1 text-sm">AI-powered insights from your customer conversations</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="bg-bg-secondary border-border text-text-primary appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm"
            >
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId}>
                  {w.name || w.clientId}
                </option>
              ))}
            </select>
            <ChevronDown className="text-text-tertiary pointer-events-none absolute top-2.5 right-2 h-4 w-4" />
          </div>

          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-bg-secondary border-border text-text-primary rounded-lg border px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-text-tertiary flex items-center justify-center py-20">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading intelligence data...
        </div>
      ) : !data ? (
        <div className="text-text-tertiary py-20 text-center">
          <Brain className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>No intelligence data available yet.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: 'Avg Buying Signal',
                value: `${data.summary.avgBuyingSignal}%`,
                icon: TrendingUp,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
              {
                label: 'Avg Churn Risk',
                value: `${data.summary.avgChurnRisk}%`,
                icon: AlertTriangle,
                color: 'text-red-400',
                bg: 'bg-red-500/10',
              },
              {
                label: 'Escalation Rate',
                value: `${data.summary.escalationRate}%`,
                icon: ShieldAlert,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
              {
                label: 'Satisfaction',
                value: `${data.summary.satisfaction}%`,
                icon: ThumbsUp,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-bg-secondary/60 border-border rounded-xl border p-4 backdrop-blur-md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-text-primary text-2xl font-bold">{card.value}</div>
                <div className="text-text-tertiary text-xs">{card.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Intent Distribution (Pie Chart with CSS) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <Target className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Intent Distribution</h3>
              </div>

              {data.topIntents.length === 0 ? (
                <div className="text-text-tertiary py-8 text-center text-sm">No intent data yet</div>
              ) : (
                <div className="space-y-2">
                  {data.topIntents.slice(0, 8).map((intent, i) => {
                    const pct = Math.round((intent.count / totalIntents) * 100);
                    return (
                      <div key={intent.label} className="flex items-center gap-3">
                        <div className="text-text-secondary w-32 truncate text-xs">
                          {intent.label.replace(/_/g, ' ')}
                        </div>
                        <div className="bg-bg-tertiary h-2 flex-1 overflow-hidden rounded-full">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className={`h-full rounded-full ${INTENT_COLORS[i % INTENT_COLORS.length]}`}
                          />
                        </div>
                        <span className="text-text-tertiary w-10 text-right text-xs">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Sentiment Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Sentiment Distribution</h3>
              </div>

              <div className="flex items-center gap-6 py-4">
                {[
                  {
                    label: 'Positive',
                    value: data.sentimentDistribution.positive,
                    color: 'bg-emerald-500',
                    textColor: 'text-emerald-400',
                  },
                  {
                    label: 'Neutral',
                    value: data.sentimentDistribution.neutral,
                    color: 'bg-gray-500',
                    textColor: 'text-gray-400',
                  },
                  {
                    label: 'Negative',
                    value: data.sentimentDistribution.negative,
                    color: 'bg-red-500',
                    textColor: 'text-red-400',
                  },
                ].map((s) => {
                  const total =
                    data.sentimentDistribution.positive +
                    data.sentimentDistribution.neutral +
                    data.sentimentDistribution.negative;
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <div key={s.label} className="flex-1 text-center">
                      <div className={`text-2xl font-bold ${s.textColor}`}>{pct}%</div>
                      <div className="text-text-tertiary text-xs">{s.label}</div>
                      <div className="bg-bg-tertiary mx-auto mt-2 h-2 w-full max-w-[100px] overflow-hidden rounded-full">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sentiment bar */}
              <div className="bg-bg-tertiary mt-2 flex h-3 overflow-hidden rounded-full">
                {(() => {
                  const total =
                    data.sentimentDistribution.positive +
                    data.sentimentDistribution.neutral +
                    data.sentimentDistribution.negative;
                  if (total === 0) return <div className="h-full w-full bg-gray-600" />;
                  return (
                    <>
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(data.sentimentDistribution.positive / total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-gray-500"
                        style={{ width: `${(data.sentimentDistribution.neutral / total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${(data.sentimentDistribution.negative / total) * 100}%` }}
                      />
                    </>
                  );
                })()}
              </div>
            </motion.div>

            {/* Churn Risk Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h3 className="text-text-primary text-sm font-semibold">Churn Risk Signals</h3>
              </div>

              {(data.insightsByType['churn_indicator'] || 0) === 0 ? (
                <div className="text-text-tertiary py-6 text-center text-sm">No churn signals detected</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-text-secondary text-sm">
                    <span className="font-semibold text-red-400">{data.insightsByType['churn_indicator']}</span> churn
                    indicators detected in the last {days} days
                  </div>
                  <div className="text-text-tertiary text-xs">
                    Combined with <span className="font-medium">{data.insightsByType['complaint'] || 0}</span>{' '}
                    complaints and <span className="font-medium">{data.insightsByType['cancellation'] || 0}</span>{' '}
                    cancellation signals.
                  </div>
                </div>
              )}
            </motion.div>

            {/* Competitor Mentions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <Users className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Competitor Mentions</h3>
              </div>

              {data.competitorMentions.length === 0 ? (
                <div className="text-text-tertiary py-6 text-center text-sm">No competitor mentions detected</div>
              ) : (
                <div className="space-y-2">
                  {data.competitorMentions.map((cm) => (
                    <div key={cm.label} className="flex items-center justify-between">
                      <span className="text-text-secondary text-sm">{cm.label}</span>
                      <span className="bg-bg-tertiary text-text-tertiary rounded-full px-2 py-0.5 text-xs">
                        {cm.count} mentions
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Feature Requests */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md lg:col-span-2"
            >
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h3 className="text-text-primary text-sm font-semibold">Feature Requests</h3>
              </div>

              {data.featureRequests.length === 0 ? (
                <div className="text-text-tertiary py-6 text-center text-sm">No feature requests detected yet</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.featureRequests.map((fr) => (
                    <div
                      key={fr.label}
                      className="bg-bg-tertiary flex items-center justify-between rounded-lg px-3 py-2"
                    >
                      <span className="text-text-secondary text-sm">{fr.label}</span>
                      <span className="text-text-tertiary text-xs">{fr.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Individual Signals Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary/60 border-border rounded-xl border p-5 backdrop-blur-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Recent Signals</h3>
                <span className="text-text-tertiary text-xs">({signalTotal} total)</span>
              </div>

              <select
                value={signalType}
                onChange={(e) => {
                  setSignalType(e.target.value);
                  setSignalPage(1);
                }}
                className="bg-bg-tertiary border-border text-text-primary rounded-lg border px-3 py-1.5 text-xs"
              >
                <option value="">All types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {signals.length === 0 ? (
              <div className="text-text-tertiary py-8 text-center text-sm">No signals found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-text-tertiary border-border border-b text-xs">
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Label</th>
                        <th className="pb-2 font-medium">Confidence</th>
                        <th className="pb-2 font-medium">Details</th>
                        <th className="pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signals.map((signal) => (
                        <tr key={signal._id} className="border-border border-b last:border-0">
                          <td className="py-2">
                            <span className="bg-bg-tertiary text-text-secondary rounded px-2 py-0.5 text-xs">
                              {TYPE_LABELS[signal.type] || signal.type}
                            </span>
                          </td>
                          <td className="text-text-primary py-2 text-xs">{signal.label}</td>
                          <td className="py-2">
                            <span
                              className={`text-xs font-medium ${signal.confidence >= 0.8 ? 'text-emerald-400' : signal.confidence >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}
                            >
                              {Math.round(signal.confidence * 100)}%
                            </span>
                          </td>
                          <td className="text-text-tertiary max-w-[200px] truncate py-2 text-xs">{signal.details}</td>
                          <td className="text-text-tertiary py-2 text-xs">
                            {new Date(signal.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setSignalPage((p) => Math.max(1, p - 1))}
                    disabled={signalPage <= 1}
                    className="text-text-secondary hover:text-text-primary text-xs disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-text-tertiary text-xs">Page {signalPage}</span>
                  <button
                    onClick={() => setSignalPage((p) => p + 1)}
                    disabled={signals.length < 10}
                    className="text-text-secondary hover:text-text-primary text-xs disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
