'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingDown,
  Target,
  BarChart3,
  Loader2,
  AlertTriangle,
  Gift,
  Minus,
  Activity,
  Gauge,
} from 'lucide-react';

interface Signal {
  type: string;
  value: number;
  weight: number;
}

interface Prediction {
  _id: string;
  visitorId: string;
  sessionId: string;
  exitProbability: number;
  engagementScore: number;
  signals: Signal[];
  recommendedAction: 'nudge' | 'offer' | 'none';
  nudgeMessage?: string;
  predictedAt: string;
  wasAccurate?: boolean;
}

interface AccuracyStats {
  total: number;
  accurate: number;
  inaccurate: number;
  accuracyRate: number;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const SIGNAL_LABELS: Record<string, string> = {
  scroll_depth: 'Scroll Depth',
  time_on_page: 'Time on Page',
  mouse_idle: 'Mouse Idle',
  tab_switch: 'Tab Switch',
  rapid_scroll: 'Rapid Scroll',
};

const SIGNAL_WEIGHTS: Record<string, number> = {
  scroll_depth: 0.2,
  time_on_page: 0.25,
  mouse_idle: 0.3,
  tab_switch: 0.15,
  rapid_scroll: 0.1,
};

const ACTION_ICONS: Record<string, typeof AlertTriangle> = {
  nudge: AlertTriangle,
  offer: Gift,
  none: Minus,
};

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [nudgeThreshold, setNudgeThreshold] = useState(40);
  const [offerThreshold, setOfferThreshold] = useState(70);

  const fetchData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    try {
      const [predRes, accRes] = await Promise.all([
        fetch(`/api/predictions?clientId=${clientId}`),
        fetch(`/api/predictions/accuracy?clientId=${clientId}`),
      ]);
      const predJson = await predRes.json();
      const accJson = await accRes.json();
      if (predJson.success) setPredictions(predJson.data || []);
      if (accJson.success) setAccuracy(accJson.data || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      setLoading(true);
      fetchData();
    }
  }, [clientId, fetchData]);

  const getExitColor = (prob: number) => {
    if (prob > 0.7) return 'text-red-400';
    if (prob > 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getExitBg = (prob: number) => {
    if (prob > 0.7) return 'bg-red-500';
    if (prob > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-500/20 p-2">
          <Brain className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Predictive Engagement</h1>
          <p className="text-sm text-gray-400">AI-powered exit prediction and smart nudges</p>
        </div>
      </motion.div>

      {/* Client Selector */}
      <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label className="mb-2 block text-sm text-gray-400">Client ID</label>
        <input
          type="text"
          placeholder="Enter client ID..."
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
      </motion.div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : clientId ? (
        <>
          {/* Stats Cards */}
          <motion.div variants={stagger} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Total Predictions</span>
              </div>
              <p className="text-2xl font-bold text-white">{predictions.length}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <Target className="h-4 w-4" />
                <span className="text-xs">Accuracy Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{accuracy?.accuracyRate ?? 0}%</p>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Avg Exit Prob</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {predictions.length > 0
                  ? Math.round((predictions.reduce((s, p) => s + p.exitProbability, 0) / predictions.length) * 100)
                  : 0}
                %
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Nudges Triggered</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {predictions.filter((p) => p.recommendedAction !== 'none').length}
              </p>
            </motion.div>
          </motion.div>

          {/* Signal Weights Visualization */}
          <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              Signal Weights
            </h3>
            <div className="space-y-3">
              {Object.entries(SIGNAL_WEIGHTS).map(([type, weight]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-300">{SIGNAL_LABELS[type]}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${weight * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm text-gray-400">{(weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Nudge Threshold Config */}
          <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Gauge className="h-5 w-5 text-amber-400" />
              Nudge Trigger Thresholds
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-300">Nudge Threshold</span>
                  <span className="text-yellow-400">{nudgeThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={nudgeThreshold}
                  onChange={(e) => setNudgeThreshold(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-300">Offer Threshold</span>
                  <span className="text-red-400">{offerThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={offerThreshold}
                  onChange={(e) => setOfferThreshold(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Prediction Feed */}
          <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-lg font-semibold text-white">Real-Time Prediction Feed</h3>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {predictions.length === 0 && (
                <p className="py-8 text-center text-gray-400">No predictions yet for this client</p>
              )}
              {predictions.map((pred) => {
                const ActionIcon = ACTION_ICONS[pred.recommendedAction] || Minus;
                return (
                  <div
                    key={pred._id}
                    className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/5 p-3"
                  >
                    {/* Exit Probability Gauge */}
                    <div className="min-w-[60px] text-center">
                      <div className={`text-lg font-bold ${getExitColor(pred.exitProbability)}`}>
                        {Math.round(pred.exitProbability * 100)}%
                      </div>
                      <div className="text-[10px] text-gray-500">EXIT</div>
                    </div>

                    {/* Mini bar */}
                    <div className="h-2 w-16 rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${getExitBg(pred.exitProbability)}`}
                        style={{ width: `${pred.exitProbability * 100}%` }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-white">{pred.visitorId}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">Score: {pred.engagementScore}</span>
                      </div>
                      {pred.nudgeMessage && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">{pred.nudgeMessage}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          pred.recommendedAction === 'offer'
                            ? 'bg-red-500/20 text-red-400'
                            : pred.recommendedAction === 'nudge'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        <ActionIcon className="h-3 w-3" />
                        {pred.recommendedAction}
                      </span>
                    </div>

                    <span className="min-w-[70px] text-right text-xs text-gray-500">
                      {new Date(pred.predictedAt).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : null}
    </motion.div>
  );
}
