'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Activity,
  AlertCircle,
  Loader2,
  BarChart3,
  Zap,
  ArrowRight,
  ChevronDown,
  Eye,
  Clock,
} from 'lucide-react';

interface Prediction {
  _id: string;
  sessionId: string;
  visitorId: string;
  exitProbability: number;
  engagementScore: number;
  recommendedAction: 'nudge' | 'offer' | 'none';
  actionTaken: boolean;
  outcome?: string;
  createdAt: string;
}

interface AccuracyData {
  overall: number;
  byAction: {
    nudge: { total: number; correct: number; rate: number };
    offer: { total: number; correct: number; rate: number };
    none: { total: number; correct: number; rate: number };
  };
  totalPredictions: number;
  interventionsTriggered: number;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await fetch(`/api/predictions?range=${timeRange}`);
      const json = await res.json();
      if (json.success) {
        setPredictions(json.data || []);
      } else {
        setError(json.error || 'Failed to load predictions');
      }
    } catch {
      setError('Failed to fetch predictions');
    }
  }, [timeRange]);

  const fetchAccuracy = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/accuracy');
      const json = await res.json();
      if (json.success) {
        setAccuracy(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPredictions(), fetchAccuracy()]).finally(() => setLoading(false));
  }, [fetchPredictions, fetchAccuracy]);

  const avgEngagement =
    predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + p.engagementScore, 0) / predictions.length)
      : 0;

  const interventions = predictions.filter((p) => p.actionTaken).length;
  const accuracyRate = accuracy?.overall ?? 0;

  const actionColor = (action: string) => {
    switch (action) {
      case 'nudge':
        return 'bg-blue-500/20 text-blue-400';
      case 'offer':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'none':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const exitProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'text-red-400';
    if (prob >= 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const engagementColor = (score: number) => {
    if (score >= 70) return 'text-green-400 bg-green-500/10';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  // Group predictions by hour for the timeline chart
  const timelineData = (() => {
    const grouped: Record<string, { count: number; avgEngagement: number; avgExit: number }> = {};
    predictions.forEach((p) => {
      const hour = new Date(p.createdAt).toISOString().slice(0, 13);
      if (!grouped[hour]) grouped[hour] = { count: 0, avgEngagement: 0, avgExit: 0 };
      grouped[hour].count++;
      grouped[hour].avgEngagement += p.engagementScore;
      grouped[hour].avgExit += p.exitProbability;
    });
    return Object.entries(grouped)
      .map(([hour, data]) => ({
        hour: new Date(hour).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
        }),
        count: data.count,
        avgEngagement: Math.round(data.avgEngagement / data.count),
        avgExit: Math.round((data.avgExit / data.count) * 100),
      }))
      .slice(-24);
  })();

  const maxCount = Math.max(...timelineData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Engagement Predictions</h1>
            <p className="text-sm text-gray-400">AI-powered visitor behavior forecasting</p>
          </div>
        </div>
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="appearance-none rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 pr-8 text-sm text-white focus:border-blue-500/50 focus:outline-none"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-2.5 right-2.5 h-4 w-4 text-gray-400" />
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Avg Engagement Score',
            value: avgEngagement,
            suffix: '%',
            icon: Activity,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Interventions Triggered',
            value: interventions,
            suffix: '',
            icon: Zap,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: 'Accuracy Rate',
            value: accuracyRate,
            suffix: '%',
            icon: Target,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-sm text-gray-400">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {card.value}
              {card.suffix}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading predictions...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-60" />
          <p>{error}</p>
          <button
            onClick={() => {
              setError('');
              setLoading(true);
              Promise.all([fetchPredictions(), fetchAccuracy()]).finally(() => setLoading(false));
            }}
            className="mt-3 text-sm text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Timeline Chart */}
          {timelineData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Predictions Over Time</h3>
              </div>
              <div className="flex h-32 items-end gap-1">
                {timelineData.map((d, i) => (
                  <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                    <div
                      className="min-h-[2px] w-full rounded-t bg-blue-500/40 transition-colors hover:bg-blue-500/60"
                      style={{ height: `${(d.count / maxCount) * 100}%` }}
                    />
                    <div className="absolute bottom-full z-10 mb-2 hidden rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                      {d.hour}: {d.count} predictions, {d.avgEngagement}% eng, {d.avgExit}% exit
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{timelineData[0]?.hour}</span>
                <span>{timelineData[timelineData.length - 1]?.hour}</span>
              </div>
            </motion.div>
          )}

          {/* Accuracy By Action */}
          {accuracy && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Accuracy by Action Type</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(['nudge', 'offer', 'none'] as const).map((action) => {
                  const data = accuracy.byAction[action];
                  return (
                    <div key={action} className="rounded-xl bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${actionColor(action)}`}
                        >
                          {action}
                        </span>
                        <span className="text-xs text-gray-400">{data.total} total</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{data.rate}%</div>
                      <div className="mt-1 text-xs text-gray-400">{data.correct} correct predictions</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${data.rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Predictions List */}
          {predictions.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-gray-400">
              <TrendingUp className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No predictions available yet</p>
              <p className="mt-1 text-sm">Predictions will appear as visitors interact with your widget</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Recent Predictions</h3>
                <span className="text-xs text-gray-400">({predictions.length} total)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs text-gray-400">
                      <th className="pb-3 font-medium">Visitor</th>
                      <th className="pb-3 font-medium">Exit Probability</th>
                      <th className="pb-3 font-medium">Engagement</th>
                      <th className="pb-3 font-medium">Recommended</th>
                      <th className="pb-3 font-medium">Action Taken</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.slice(0, 20).map((pred, index) => (
                      <motion.tr
                        key={pred._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-white/[0.04] last:border-0"
                      >
                        <td className="py-3">
                          <span className="font-mono text-xs text-white">{pred.visitorId}</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-sm font-semibold ${exitProbabilityColor(pred.exitProbability)}`}>
                            {Math.round(pred.exitProbability * 100)}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${engagementColor(pred.engagementScore)}`}
                          >
                            {pred.engagementScore}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${actionColor(pred.recommendedAction)}`}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {pred.recommendedAction}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs ${pred.actionTaken ? 'text-green-400' : 'text-gray-500'}`}>
                            {pred.actionTaken ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {new Date(pred.createdAt).toLocaleString()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
