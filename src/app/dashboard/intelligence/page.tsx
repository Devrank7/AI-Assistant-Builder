'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Loader2,
  ShieldAlert,
  MessageCircle,
  Lightbulb,
  Target,
  Zap,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Users,
  Hash,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  X,
} from 'lucide-react';

type SignalType =
  | 'buying_signal'
  | 'churn_risk'
  | 'competitor_mention'
  | 'complaint'
  | 'feature_request'
  | 'positive_feedback'
  | 'escalation_needed'
  | 'upsell_opportunity';

interface OverviewData {
  totalConversations: number;
  analyzedConversations: number;
  buyingSignals: number;
  buyingSignalsTrend: number;
  churnRisks: number;
  churnRisksTrend: number;
  avgSentiment: number;
  avgSentimentFormatted: string;
}

interface SentimentPoint {
  date: string;
  sentiment: number;
  count: number;
}
interface TopTopic {
  topic: string;
  count: number;
}
interface ActionItem {
  type: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  conversationId: string;
  createdAt: string;
}
interface SignalFeedItem {
  _id: string;
  conversationId: string;
  type: SignalType;
  confidence: number;
  text: string;
  sentiment: number;
  topics: string[];
  summary: string;
  analyzedAt: string;
}
interface DashboardData {
  overview: OverviewData;
  signalsByType: Record<string, number>;
  sentimentTrend: SentimentPoint[];
  topTopics: TopTopic[];
  actionItems: ActionItem[];
  recentSignals: SignalFeedItem[];
}

const SIGNAL_CONFIG: Record<
  SignalType,
  { label: string; icon: React.ElementType; color: string; bg: string; hex: string }
> = {
  buying_signal: {
    label: 'Buying Signal',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    hex: '#10b981',
  },
  churn_risk: { label: 'Churn Risk', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', hex: '#ef4444' },
  competitor_mention: {
    label: 'Competitor',
    icon: Users,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    hex: '#f59e0b',
  },
  complaint: {
    label: 'Complaint',
    icon: AlertCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    hex: '#f97316',
  },
  feature_request: {
    label: 'Feature Request',
    icon: Lightbulb,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    hex: '#3b82f6',
  },
  positive_feedback: {
    label: 'Positive Feedback',
    icon: Star,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    hex: '#eab308',
  },
  escalation_needed: {
    label: 'Escalation',
    icon: ShieldAlert,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    hex: '#a855f7',
  },
  upsell_opportunity: { label: 'Upsell', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', hex: '#06b6d4' },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/15' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="text-text-tertiary flex items-center gap-0.5 text-xs">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  const pos = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function SentimentTrendChart({ data }: { data: SentimentPoint[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; val: number } | null>(null);
  const W = 600;
  const H = 140;
  const PX = 32;
  const PY = 16;
  const active = data.filter((d) => d.count > 0);
  if (active.length === 0)
    return (
      <div className="text-text-tertiary flex h-32 items-center justify-center text-sm">
        No sentiment data for this period
      </div>
    );
  const xS = (i: number) => PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2);
  const yS = (v: number) => PY + ((1 - v) / 2) * (H - PY * 2);
  const zeroY = yS(0);
  const pts = data.map((d, i) => ({ x: xS(i), y: yS(d.sentiment), ...d }));
  const aPts = pts.filter((p) => p.count > 0);
  const linePath = aPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    aPts.length > 1
      ? `${linePath} L ${aPts[aPts.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${aPts[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
      : '';
  const step = Math.max(1, Math.floor(data.length / 7));
  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={PX} y1={zeroY} x2={W - PX} y2={zeroY} stroke="#ffffff12" strokeWidth="1" strokeDasharray="4 3" />
        {[1, -1].map((v) => (
          <text key={v} x={PX - 4} y={yS(v) + 4} fill="#ffffff30" fontSize="8" textAnchor="end">
            {v > 0 ? '+1' : '-1'}
          </text>
        ))}
        <text x={PX - 4} y={zeroY + 4} fill="#ffffff30" fontSize="8" textAnchor="end">
          0
        </text>
        {areaPath && <path d={areaPath} fill="url(#sg)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {aPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#10b981"
            stroke="#0f172a"
            strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, date: p.date, val: p.sentiment })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {data
          .filter((_, i) => i % step === 0)
          .map((d, i) => {
            const idx = data.indexOf(d);
            return (
              <text key={i} x={xS(idx)} y={H - 2} fill="#ffffff25" fontSize="8" textAnchor="middle">
                {d.date.slice(5)}
              </text>
            );
          })}
      </svg>
      {tooltip && (
        <div
          className="bg-bg-primary border-border pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: 'translate(-50%,-120%)',
          }}
        >
          <div className="text-text-tertiary">{tooltip.date}</div>
          <div className={`font-semibold ${tooltip.val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {tooltip.val >= 0 ? '+' : ''}
            {tooltip.val.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicCloud({ topics }: { topics: TopTopic[] }) {
  if (!topics.length) return <div className="text-text-tertiary py-6 text-center text-sm">No topics detected yet</div>;
  const max = Math.max(...topics.map((t) => t.count));
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => {
        const scale = max > 0 ? t.count / max : 0;
        return (
          <motion.span
            key={t.topic}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-accent/10 border-accent/20 text-accent inline-flex cursor-default items-center gap-1 rounded-full border px-2.5 py-1 ${scale > 0.7 ? 'text-sm font-semibold' : scale > 0.4 ? 'text-xs font-medium' : 'text-xs'}`}
            style={{ opacity: 0.4 + scale * 0.6 }}
          >
            <Hash className="h-2.5 w-2.5 opacity-60" />
            {t.topic}
            <span className="text-text-tertiary text-[10px]">{t.count}</span>
          </motion.span>
        );
      })}
    </div>
  );
}

function SignalCard({ signal, onClick }: { signal: SignalFeedItem; onClick: () => void }) {
  const cfg = SIGNAL_CONFIG[signal.type] || SIGNAL_CONFIG.complaint;
  const Icon = cfg.icon;
  const pct = Math.round(signal.confidence * 100);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="bg-bg-secondary/50 border-border cursor-pointer rounded-xl border p-4 backdrop-blur-sm transition-all hover:bg-white/5"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 rounded-lg p-2 ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${pct >= 80 ? 'bg-emerald-500/15 text-emerald-400' : pct >= 65 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}
              >
                {pct}%
              </span>
              <span className="text-text-tertiary text-[10px]">
                {new Date(signal.analyzedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <p className="text-text-secondary line-clamp-2 text-xs leading-relaxed">{signal.text}</p>
          {signal.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {signal.topics.slice(0, 3).map((t) => (
                <span key={t} className="bg-bg-tertiary text-text-tertiary rounded px-1.5 py-0.5 text-[10px]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

function ConversationDrawer({ conversationId, onClose }: { conversationId: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setMessagesError('');
      return;
    }
    setLoadingMessages(true);
    setMessagesError('');
    fetch(`/api/inbox/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const msgs: ConversationMessage[] = d.data?.messages ?? d.data?.conversation?.messages ?? [];
          setMessages(msgs);
        } else {
          setMessagesError('Could not load conversation');
        }
      })
      .catch(() => setMessagesError('Failed to fetch conversation'))
      .finally(() => setLoadingMessages(false));
  }, [conversationId]);

  return (
    <AnimatePresence>
      {conversationId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-bg-primary border-border fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l shadow-2xl"
          >
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-text-primary text-sm font-semibold">Conversation Details</h3>
                <p className="text-text-tertiary mt-0.5 font-mono text-[10px]">{conversationId}</p>
              </div>
              <button
                onClick={onClose}
                className="text-text-tertiary hover:text-text-primary rounded-lg p-1.5 transition-colors hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingMessages ? (
                <div className="text-text-tertiary flex items-center justify-center py-12">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading messages...
                </div>
              ) : messagesError ? (
                <div className="text-text-tertiary flex flex-col items-center gap-3 py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-red-400 opacity-60" />
                  <p className="text-sm text-red-400">{messagesError}</p>
                  <p className="font-mono text-xs break-all opacity-60">{conversationId}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-text-tertiary flex flex-col items-center gap-3 py-12 text-center">
                  <MessageCircle className="h-10 w-10 opacity-30" />
                  <p className="text-sm">No messages found</p>
                  <p className="font-mono text-xs break-all opacity-60">{conversationId}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-accent text-white'
                            : 'bg-bg-secondary text-text-primary border-border border'
                        }`}
                      >
                        <p>{msg.content}</p>
                        {msg.timestamp && (
                          <p
                            className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-white/60' : 'text-text-tertiary'}`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function IntelligencePage() {
  const [widgets, setWidgets] = useState<Array<{ clientId: string; username?: string; website?: string }>>([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [signals, setSignals] = useState<SignalFeedItem[]>([]);
  const [signalType, setSignalType] = useState('');
  const [signalPage, setSignalPage] = useState(1);
  const [signalTotal, setSignalTotal] = useState(0);
  const [signalTotalPages, setSignalTotalPages] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [analyzeResult, setAnalyzeResult] = useState<{
    analyzed: number;
    skipped: number;
    errors: number;
    message: string;
  } | null>(null);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.status === 401) {
        if (retryCount < 3) setTimeout(() => setRetryCount((c) => c + 1), 1200);
        return;
      }
      const d = await res.json();
      const list = d.data?.data || d.data || d.clients || [];
      setWidgets(list);
      if (list.length > 0 && !selectedWidget) setSelectedWidget(list[0].clientId);
    } catch (err) {
      console.error('fetchWidgets', err);
    }
  }, [selectedWidget, retryCount]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedWidget) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/intelligence/dashboard?clientId=${selectedWidget}&days=${days}`);
      if (res.status === 401) {
        if (retryCount < 3) setTimeout(() => setRetryCount((c) => c + 1), 1200);
        return;
      }
      const d = await res.json();
      if (d.success) setData(d.data);
    } catch (err) {
      console.error('fetchDashboard', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWidget, days, retryCount]);

  const fetchSignals = useCallback(async () => {
    if (!selectedWidget) return;
    try {
      const tp = signalType ? `&type=${signalType}` : '';
      const res = await fetch(
        `/api/intelligence/signals?clientId=${selectedWidget}&days=${days}&page=${signalPage}&limit=12${tp}`
      );
      const d = await res.json();
      if (d.success) {
        setSignals(d.data.signals || []);
        setSignalTotal(d.data.pagination?.total || 0);
        setSignalTotalPages(d.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('fetchSignals', err);
    }
  }, [selectedWidget, days, signalPage, signalType]);

  const runAnalysis = useCallback(async () => {
    if (!selectedWidget || analyzing) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedWidget }),
      });
      const d = await res.json();
      if (d.success) {
        setAnalyzeResult(d.data);
        await fetchDashboard();
        await fetchSignals();
      }
    } catch (err) {
      console.error('runAnalysis', err);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedWidget, analyzing, fetchDashboard, fetchSignals]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);
  useEffect(() => {
    fetchDashboard();
    fetchSignals();
  }, [fetchDashboard, fetchSignals]);
  useEffect(() => {
    setSignalPage(1);
  }, [signalType, selectedWidget, days]);

  const hasData = data && data.overview.analyzedConversations > 0;
  const totalSignals = data ? Object.values(data.signalsByType).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-accent/15 rounded-xl p-2">
              <Brain className="text-accent h-5 w-5" />
            </div>
            <h1 className="text-text-primary text-2xl font-bold">Conversation Intelligence</h1>
          </div>
          <p className="text-text-secondary mt-1 text-sm">
            Signal detection and sentiment analysis across your conversations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedWidget}
              onChange={(e) => {
                setSelectedWidget(e.target.value);
                setSignalPage(1);
              }}
              className="bg-bg-secondary border-border text-text-primary appearance-none rounded-lg border py-2 pr-8 pl-3 text-sm focus:outline-none"
            >
              {widgets.length === 0 && <option value="">Select widget...</option>}
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId}>
                  {w.username || w.website || w.clientId}
                </option>
              ))}
            </select>
            <ChevronDown className="text-text-tertiary pointer-events-none absolute top-2.5 right-2 h-4 w-4" />
          </div>
          <select
            value={days}
            onChange={(e) => {
              setDays(parseInt(e.target.value));
              setSignalPage(1);
            }}
            className="bg-bg-secondary border-border text-text-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button
            onClick={runAnalysis}
            disabled={analyzing || !selectedWidget}
            className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis result */}
      <AnimatePresence>
        {analyzeResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">{analyzeResult.message}</span>
            </div>
            <button onClick={() => setAnalyzeResult(null)} className="text-text-tertiary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-text-tertiary flex items-center justify-center py-24">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading intelligence data...
        </div>
      ) : !selectedWidget ? (
        <div className="text-text-tertiary py-24 text-center">
          <Brain className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">Select a widget to view intelligence data</p>
        </div>
      ) : !hasData ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary/40 border-border rounded-2xl border py-24 text-center backdrop-blur-sm"
        >
          <div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Brain className="text-accent h-8 w-8" />
          </div>
          <h3 className="text-text-primary mb-2 text-lg font-semibold">No analysis data yet</h3>
          <p className="text-text-secondary mx-auto mb-6 max-w-sm text-sm">
            Run the analysis engine to detect buying signals, churn risks, competitor mentions, and more.
          </p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="bg-accent hover:bg-accent/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Analyze Conversations
              </>
            )}
          </button>
          {data && data.overview.totalConversations > 0 && (
            <p className="text-text-tertiary mt-3 text-xs">
              {data.overview.totalConversations} conversations ready for analysis
            </p>
          )}
        </motion.div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: 'Analyzed',
                value: data.overview.analyzedConversations,
                sub: `of ${data.overview.totalConversations} total`,
                icon: MessageCircle,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                trend: null,
              },
              {
                label: 'Buying Signals',
                value: data.overview.buyingSignals,
                sub: 'detected',
                icon: TrendingUp,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                trend: data.overview.buyingSignalsTrend,
              },
              {
                label: 'Churn Risks',
                value: data.overview.churnRisks,
                sub: 'identified',
                icon: AlertTriangle,
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                trend: data.overview.churnRisksTrend,
              },
              {
                label: 'Avg Sentiment',
                value: data.overview.avgSentimentFormatted,
                sub:
                  data.overview.avgSentiment >= 0.2
                    ? 'Positive'
                    : data.overview.avgSentiment <= -0.2
                      ? 'Negative'
                      : 'Neutral',
                icon: Activity,
                color:
                  data.overview.avgSentiment >= 0.2
                    ? 'text-emerald-400'
                    : data.overview.avgSentiment <= -0.2
                      ? 'text-red-400'
                      : 'text-amber-400',
                bg:
                  data.overview.avgSentiment >= 0.2
                    ? 'bg-emerald-500/10'
                    : data.overview.avgSentiment <= -0.2
                      ? 'bg-red-500/10'
                      : 'bg-amber-500/10',
                trend: null,
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className={`rounded-xl p-2 ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  {card.trend !== null && <TrendBadge value={card.trend} />}
                </div>
                <div className="text-text-primary text-2xl font-bold tabular-nums">{card.value}</div>
                <div className="text-text-tertiary mt-0.5 text-xs">{card.label}</div>
                <div className="text-text-tertiary/60 text-[10px]">{card.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Signal Breakdown + Sentiment Trend */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Signal Breakdown</h3>
                <span className="text-text-tertiary ml-auto text-xs">{totalSignals} total</span>
              </div>
              {totalSignals === 0 ? (
                <div className="text-text-tertiary py-8 text-center text-sm">No signals detected</div>
              ) : (
                <div className="space-y-2.5">
                  {(Object.entries(SIGNAL_CONFIG) as [SignalType, (typeof SIGNAL_CONFIG)[SignalType]][])
                    .map(([type, cfg]) => ({ type, cfg, count: data.signalsByType[type] || 0 }))
                    .filter((item) => item.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map((item, i) => {
                      const pct = totalSignals > 0 ? (item.count / totalSignals) * 100 : 0;
                      const Icon = item.cfg.icon;
                      return (
                        <div key={item.type} className="flex items-center gap-3">
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${item.cfg.color}`} />
                          <span className="text-text-secondary w-28 flex-shrink-0 truncate text-xs">
                            {item.cfg.label}
                          </span>
                          <div className="bg-bg-tertiary h-2 flex-1 overflow-hidden rounded-full">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.07, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ background: item.cfg.hex }}
                            />
                          </div>
                          <span className="text-text-tertiary w-6 text-right text-xs tabular-nums">{item.count}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-accent h-4 w-4" />
                  <h3 className="text-text-primary text-sm font-semibold">Sentiment Trend</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text-tertiary flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> +
                  </span>
                  <span className="text-text-tertiary flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> -
                  </span>
                </div>
              </div>
              <SentimentTrendChart data={data.sentimentTrend} />
            </motion.div>
          </div>

          {/* Topics + Action Items */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <Target className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Top Topics</h3>
                <span className="text-text-tertiary ml-auto text-xs">{data.topTopics.length} detected</span>
              </div>
              <TopicCloud topics={data.topTopics} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
            >
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h3 className="text-text-primary text-sm font-semibold">Recommended Actions</h3>
              </div>
              {data.actionItems.length === 0 ? (
                <div className="text-text-tertiary py-8 text-center text-sm">No actions required</div>
              ) : (
                <div className="space-y-2">
                  {data.actionItems.slice(0, 8).map((item, i) => {
                    const prio = PRIORITY_CONFIG[item.priority];
                    const cfg = SIGNAL_CONFIG[item.type as SignalType];
                    const Icon = cfg?.icon || CheckCircle2;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedConversation(item.conversationId)}
                        className="bg-bg-tertiary/50 hover:bg-bg-tertiary flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors"
                      >
                        <div className="mt-0.5">
                          <Icon className={`h-3.5 w-3.5 ${cfg?.color || 'text-text-tertiary'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-text-primary text-xs">{item.text}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${prio.bg} ${prio.color}`}
                            >
                              {prio.label}
                            </span>
                            <span className="text-text-tertiary text-[10px]">
                              <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Signal Feed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-bg-secondary/60 border-border rounded-2xl border p-5 backdrop-blur-md"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="text-accent h-4 w-4" />
                <h3 className="text-text-primary text-sm font-semibold">Signal Feed</h3>
                <span className="text-text-tertiary text-xs">({signalTotal} total)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    setSignalType('');
                    setSignalPage(1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${signalType === '' ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary hover:bg-white/5'}`}
                >
                  All
                </button>
                {(Object.entries(SIGNAL_CONFIG) as [SignalType, (typeof SIGNAL_CONFIG)[SignalType]][]).map(
                  ([type, cfg]) => {
                    const count = data.signalsByType[type] || 0;
                    if (!count) return null;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSignalType(type);
                          setSignalPage(1);
                        }}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${signalType === type ? `${cfg.bg} ${cfg.color} border border-white/10` : 'bg-bg-tertiary text-text-tertiary hover:bg-white/5'}`}
                      >
                        {cfg.label} <span className="opacity-60">{count}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {signals.length === 0 ? (
              <div className="text-text-tertiary py-10 text-center">
                <RefreshCw className="mx-auto mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">No signals found for this filter</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {signals.map((signal) => (
                      <SignalCard
                        key={`${signal._id}-${signal.type}`}
                        signal={signal}
                        onClick={() => setSelectedConversation(signal.conversationId)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <button
                    onClick={() => setSignalPage((p) => Math.max(1, p - 1))}
                    disabled={signalPage <= 1}
                    className="border-border text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-text-tertiary text-xs">
                    Page {signalPage} of {signalTotalPages}
                  </span>
                  <button
                    onClick={() => setSignalPage((p) => p + 1)}
                    disabled={signalPage >= signalTotalPages}
                    className="border-border text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}

      <ConversationDrawer conversationId={selectedConversation} onClose={() => setSelectedConversation(null)} />
    </div>
  );
}
