'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Play,
  Pause,
  Trash2,
  Plus,
  Trophy,
  Users,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Activity,
  MessageSquare,
  TrendingUp,
  Settings2,
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, useToast } from '@/components/ui';

/* ── Types ── */
interface VariantConfig {
  greeting?: string;
  systemPrompt?: string;
  quickReplies?: string[];
  position?: string;
  theme?: Record<string, string>;
}
interface VariantStats {
  impressions: number;
  conversations: number;
  messages: number;
  conversions: number;
  avgSatisfaction: number;
  avgResponseTime: number;
}
interface ABVariant {
  variantId: string;
  name: string;
  trafficPercent: number;
  config: VariantConfig;
  stats: VariantStats;
  conversionRate?: string;
  confidenceInterval?: { rate: number; lower: number; upper: number };
}
interface ABTestStatistics {
  significant: boolean;
  confidence: number;
  pValue: number;
  chiSquared: number;
  winnerIndex: number | null;
}
interface ABTest {
  _id: string;
  testId: string;
  name: string;
  description: string;
  clientId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  winnerVariantId?: string;
  confidenceLevel?: number;
  startDate?: string;
  endDate?: string;
  minSampleSize: number;
  createdAt: string;
  statistics?: ABTestStatistics;
}
interface Widget {
  clientId: string;
  widgetName?: string;
  username?: string;
}

/* ── Helpers ── */
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function durationLabel(startDate?: string, endDate?: string) {
  if (!startDate) return '—';
  const ms = (endDate ? new Date(endDate) : new Date()).getTime() - new Date(startDate).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}
const totalImpressions = (v: ABVariant[]) => v.reduce((s, x) => s + x.stats.impressions, 0);
const totalConversions = (v: ABVariant[]) => v.reduce((s, x) => s + x.stats.conversions, 0);
const overallCVR = (v: ABVariant[]) => {
  const i = totalImpressions(v);
  const c = totalConversions(v);
  return i === 0 ? '0.00' : ((c / i) * 100).toFixed(2);
};
const STATUS_BADGE: Record<string, 'green' | 'amber' | 'default' | 'blue'> = {
  draft: 'default',
  running: 'green',
  paused: 'amber',
  completed: 'blue',
};
const VARIANT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

/* ── Animated bar ── */
function CVRBar({ rate, max, color }: { rate: number; max: number; color: string }) {
  const pct = max > 0 ? (rate / max) * 100 : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/* ── Confidence ring SVG ── */
function ConfidenceRing({ confidence }: { confidence: number }) {
  const r = 18,
    circ = 2 * Math.PI * r,
    offset = circ - (confidence / 100) * circ;
  const color = confidence >= 95 ? '#10b981' : confidence >= 80 ? '#f59e0b' : '#6b7280';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums" style={{ color }}>
        {confidence}%
      </span>
    </div>
  );
}

/* ── Traffic split sliders ── */
function TrafficSplitSlider({
  variants,
  onChange,
}: {
  variants: { name: string; trafficPercent: number }[];
  onChange: (idx: number, val: number) => void;
}) {
  const total = variants.reduce((s, v) => s + v.trafficPercent, 0);
  const valid = Math.abs(total - 100) < 0.1;
  return (
    <div className="space-y-3">
      {variants.map((v, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">{v.name}</span>
            <span className="font-semibold tabular-nums" style={{ color: VARIANT_COLORS[i % 4] }}>
              {v.trafficPercent}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            step={5}
            value={v.trafficPercent}
            onChange={(e) => onChange(i, Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer rounded-full accent-indigo-500"
          />
        </div>
      ))}
      <div className={`flex items-center gap-1.5 text-xs ${valid ? 'text-emerald-500' : 'text-red-500'}`}>
        {valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        <span>
          Total: {total}%{!valid && ' — must equal 100%'}
        </span>
      </div>
    </div>
  );
}

/* ── Create Test Modal ── */
function CreateTestModal({
  open,
  onClose,
  widgets,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  widgets: Widget[];
  onCreated: () => void;
}) {
  const { toastSuccess, toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', minSampleSize: 100 });
  const [variants, setVariants] = useState([
    { name: 'Control', trafficPercent: 50, config: { greeting: '', quickReplies: [] as string[] } },
    { name: 'Variant A', trafficPercent: 50, config: { greeting: '', quickReplies: [] as string[] } },
  ]);
  useEffect(() => {
    if (open) {
      setForm({ name: '', description: '', clientId: widgets[0]?.clientId ?? '', minSampleSize: 100 });
      setVariants([
        { name: 'Control', trafficPercent: 50, config: { greeting: '', quickReplies: [] } },
        { name: 'Variant A', trafficPercent: 50, config: { greeting: '', quickReplies: [] } },
      ]);
    }
  }, [open, widgets]);

  const handleTrafficChange = (idx: number, val: number) => {
    const u = [...variants];
    const delta = val - u[idx].trafficPercent;
    u[idx] = { ...u[idx], trafficPercent: val };
    if (u.length === 2) {
      const o = idx === 0 ? 1 : 0;
      u[o] = { ...u[o], trafficPercent: Math.max(5, Math.min(95, u[o].trafficPercent - delta)) };
    }
    setVariants(u);
  };
  const addVariant = () => {
    if (variants.length >= 4) return;
    const n = variants.length + 1;
    const eq = Math.floor(100 / n);
    const rem = 100 - eq * n;
    const u = variants.map((v, i) => ({ ...v, trafficPercent: i === 0 ? eq + rem : eq }));
    const letter = String.fromCharCode(64 + variants.length);
    setVariants([...u, { name: `Variant ${letter}`, trafficPercent: eq, config: { greeting: '', quickReplies: [] } }]);
  };
  const removeVariant = (idx: number) => {
    if (variants.length <= 2) return;
    const rem = variants[idx];
    const rest = variants.filter((_, i) => i !== idx);
    rest[0] = { ...rest[0], trafficPercent: rest[0].trafficPercent + rem.trafficPercent };
    setVariants(rest);
  };
  const total = variants.reduce((s, v) => s + v.trafficPercent, 0);
  const canSubmit = !!form.name && !!form.clientId && Math.abs(total - 100) < 0.1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, variants }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Create failed');
      toastSuccess('A/B test created');
      onCreated();
      onClose();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create A/B Test"
      description="Compare widget variants to optimize conversion rates"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Create Test
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-text-secondary block text-xs font-medium">Widget</label>
          <select
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            className="text-text-primary border-border focus:border-accent focus:ring-accent/10 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors focus:ring-2 focus:outline-none"
          >
            {widgets.length === 0 && <option value="">No widgets</option>}
            {widgets.map((w) => (
              <option key={w.clientId} value={w.clientId}>
                {w.widgetName || w.username || w.clientId}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Test Name"
          placeholder="e.g., Greeting message optimization"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="space-y-1.5">
          <label className="text-text-secondary block text-xs font-medium">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What hypothesis are you testing?"
            rows={2}
            className="text-text-primary placeholder:text-text-tertiary border-border focus:border-accent focus:ring-accent/10 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-text-secondary text-xs font-medium">Variants</label>
            {variants.length < 4 && (
              <button onClick={addVariant} className="text-accent flex items-center gap-1 text-xs hover:underline">
                <Plus className="h-3 w-3" />
                Add variant
              </button>
            )}
          </div>
          {variants.map((v, i) => (
            <div key={i} className="border-border space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => {
                    const u = [...variants];
                    u[i] = { ...u[i], name: e.target.value };
                    setVariants(u);
                  }}
                  className="text-text-primary border-border focus:border-accent h-8 flex-1 rounded-md border bg-transparent px-2.5 text-xs font-medium focus:outline-none"
                />
                {variants.length > 2 && (
                  <button onClick={() => removeVariant(i)} className="text-text-tertiary hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={v.config.greeting}
                onChange={(e) => {
                  const u = [...variants];
                  u[i] = { ...u[i], config: { ...u[i].config, greeting: e.target.value } };
                  setVariants(u);
                }}
                placeholder="Greeting message (optional)"
                className="text-text-primary placeholder:text-text-tertiary border-border focus:border-accent h-8 w-full rounded-md border bg-transparent px-2.5 text-xs focus:outline-none"
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <label className="text-text-secondary block text-xs font-medium">Traffic Split</label>
          <TrafficSplitSlider variants={variants} onChange={handleTrafficChange} />
        </div>
        <Input
          label="Minimum Sample Size"
          type="number"
          min={50}
          value={form.minSampleSize}
          onChange={(e) => setForm((f) => ({ ...f, minSampleSize: Number(e.target.value) }))}
        />
      </div>
    </Modal>
  );
}

/* ── Variant Card ── */
function VariantCard({
  variant,
  isWinner,
  isControl,
  maxCVR,
  index,
}: {
  variant: ABVariant;
  isWinner: boolean;
  isControl: boolean;
  maxCVR: number;
  index: number;
}) {
  const color = VARIANT_COLORS[index % 4];
  const cvr = variant.stats.impressions > 0 ? (variant.stats.conversions / variant.stats.impressions) * 100 : 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`relative overflow-hidden rounded-xl border p-4 ${isWinner ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-border bg-bg-secondary'}`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: color, opacity: 0.7 }} />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {String.fromCharCode(65 + index)}
          </span>
          <span className="text-text-primary text-sm font-medium">{variant.name}</span>
          {isControl && (
            <span className="text-text-tertiary rounded bg-white/5 px-1.5 py-0.5 text-[10px]">Control</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isWinner && (
            <Badge variant="green">
              <Trophy className="mr-1 h-3 w-3" />
              Winner
            </Badge>
          )}
          <span className="text-xs font-semibold tabular-nums" style={{ color }}>
            {variant.trafficPercent}%
          </span>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['Impressions', variant.stats.impressions, Users],
            ['Conversations', variant.stats.conversations, MessageSquare],
            ['Conversions', variant.stats.conversions, Target],
            ['CVR', cvr.toFixed(2) + '%', TrendingUp],
          ] as const
        ).map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg bg-white/[0.03] p-2.5 text-center">
            <Icon className="text-text-tertiary mx-auto mb-1 h-3.5 w-3.5" />
            <div className="text-text-primary text-base font-semibold tabular-nums">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-text-tertiary mt-0.5 text-[10px]">{label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-tertiary">Conversion rate</span>
          <span className="text-text-secondary font-semibold tabular-nums">{cvr.toFixed(2)}%</span>
        </div>
        <CVRBar rate={cvr} max={maxCVR} color={color} />
      </div>
    </motion.div>
  );
}

/* ── Test Detail Panel ── */
function TestDetailPanel({
  test,
  onAction,
  onDelete,
  actionLoading,
}: {
  test: ABTest;
  onAction: (id: string, a: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const maxCVR = Math.max(
    ...test.variants.map((v) => (v.stats.impressions > 0 ? (v.stats.conversions / v.stats.impressions) * 100 : 0)),
    0.001
  );
  const stats = test.statistics;
  const busy = actionLoading === test._id;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="border-border bg-bg-primary space-y-5 rounded-xl border p-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-text-primary font-semibold">{test.name}</h3>
            {test.description && <p className="text-text-tertiary text-sm">{test.description}</p>}
            <div className="text-text-tertiary flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Started: {fmtDate(test.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Duration: {durationLabel(test.startDate, test.endDate)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Min sample: {test.minSampleSize.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {test.status === 'draft' && (
              <Button variant="primary" size="sm" disabled={busy} onClick={() => onAction(test._id, 'start')}>
                {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Start
              </Button>
            )}
            {test.status === 'running' && (
              <>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => onAction(test._id, 'pause')}>
                  {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}Pause
                </Button>
                <Button variant="primary" size="sm" disabled={busy} onClick={() => onAction(test._id, 'complete')}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete
                </Button>
              </>
            )}
            {test.status === 'paused' && (
              <>
                <Button variant="primary" size="sm" disabled={busy} onClick={() => onAction(test._id, 'resume')}>
                  {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Resume
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => onAction(test._id, 'complete')}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-text-tertiary hover:text-red-500"
              onClick={() => onDelete(test._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Statistical significance */}
        {stats && totalImpressions(test.variants) > 0 && (
          <div
            className={`flex items-center gap-3 rounded-lg px-4 py-3 ${stats.significant ? 'border border-emerald-500/20 bg-emerald-500/[0.06]' : 'border border-white/5 bg-white/[0.02]'}`}
          >
            <ConfidenceRing confidence={stats.confidence} />
            <div>
              <div
                className={`text-sm font-semibold ${stats.significant ? 'text-emerald-400' : 'text-text-secondary'}`}
              >
                {stats.significant
                  ? `Statistically significant — ${stats.confidence}% confidence`
                  : `Not yet significant — ${stats.confidence}% confidence`}
              </div>
              <div className="text-text-tertiary text-xs">
                χ² = {stats.chiSquared.toFixed(3)} · p = {stats.pValue.toFixed(4)} ·{' '}
                {totalImpressions(test.variants).toLocaleString()} impressions
              </div>
            </div>
          </div>
        )}

        {/* Variants */}
        <div className="grid gap-3 sm:grid-cols-2">
          {test.variants.map((v, i) => (
            <VariantCard
              key={v.variantId}
              variant={v}
              isWinner={test.winnerVariantId === v.variantId}
              isControl={i === 0}
              maxCVR={maxCVR}
              index={i}
            />
          ))}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['Total Impressions', totalImpressions(test.variants), Users, '#6366f1'],
              ['Total Conversions', totalConversions(test.variants), Target, '#10b981'],
              ['Overall CVR', overallCVR(test.variants) + '%', TrendingUp, '#f59e0b'],
              ['Variants', test.variants.length, FlaskConical, '#6b7280'],
            ] as const
          ).map(([label, value, Icon, color]) => (
            <div key={label} className="bg-bg-secondary rounded-lg p-3 text-center">
              <Icon className="text-text-tertiary mx-auto mb-1.5 h-4 w-4" />
              <div className="text-text-primary text-lg font-semibold tabular-nums" style={{ color }}>
                {value}
              </div>
              <div className="text-text-tertiary text-[11px]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Test Row (collapsed) ── */
function TestRow({
  test,
  expanded,
  onToggle,
  onAction,
  onDelete,
  actionLoading,
}: {
  test: ABTest;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: string, a: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const impr = totalImpressions(test.variants);
  const cvr = overallCVR(test.variants);
  const STATUS_ICON: Record<string, React.ReactNode> = {
    draft: <Settings2 className="h-3 w-3" />,
    running: <Activity className="h-3 w-3" />,
    paused: <Pause className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
  };
  return (
    <div className="space-y-2">
      <div
        onClick={onToggle}
        className="border-border hover:bg-bg-tertiary/50 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
      >
        <div className="bg-bg-tertiary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <FlaskConical className="text-text-tertiary h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-text-primary truncate text-sm font-medium">{test.name}</span>
            {test.winnerVariantId && <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
          </div>
          <span className="text-text-tertiary text-xs">{test.clientId}</span>
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <div className="text-center">
            <div className="text-text-primary text-sm font-semibold tabular-nums">{impr.toLocaleString()}</div>
            <div className="text-text-tertiary text-[10px]">Impressions</div>
          </div>
          <div className="text-center">
            <div className="text-text-primary text-sm font-semibold tabular-nums">{cvr}%</div>
            <div className="text-text-tertiary text-[10px]">CVR</div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary text-sm font-medium">{fmtDate(test.createdAt)}</div>
            <div className="text-text-tertiary text-[10px]">Created</div>
          </div>
        </div>
        <Badge variant={STATUS_BADGE[test.status]}>
          <span className="mr-1 inline-flex">{STATUS_ICON[test.status]}</span>
          {test.status}
        </Badge>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {test.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              title="Start"
              onClick={() => onAction(test._id, 'start')}
              disabled={actionLoading === test._id}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {test.status === 'running' && (
            <Button
              variant="ghost"
              size="sm"
              title="Pause"
              onClick={() => onAction(test._id, 'pause')}
              disabled={actionLoading === test._id}
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {test.status === 'paused' && (
            <Button
              variant="ghost"
              size="sm"
              title="Resume"
              onClick={() => onAction(test._id, 'resume')}
              disabled={actionLoading === test._id}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-text-tertiary hover:text-red-500"
            onClick={() => onDelete(test._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-text-tertiary">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <TestDetailPanel test={test} onAction={onAction} onDelete={onDelete} actionLoading={actionLoading} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <div className="border-border flex animate-pulse items-center gap-3 rounded-xl border px-4 py-3">
      <div className="bg-bg-tertiary h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="bg-bg-tertiary h-3.5 w-36 rounded" />
        <div className="bg-bg-tertiary h-3 w-20 rounded" />
      </div>
      <div className="bg-bg-tertiary h-5 w-16 rounded-md" />
    </div>
  );
}

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'draft', label: 'Draft' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
] as const;
type FilterKey = (typeof FILTER_TABS)[number]['key'];

/* ── Main Page ── */
export default function ABTestsPage() {
  const { toastSuccess, toastError } = useToast();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedWidget, setSelectedWidget] = useState('');

  const fetchWithRetry = useCallback(async (url: string, retries = 2): Promise<Response> => {
    const res = await fetch(url);
    if (res.status === 401 && retries > 0) {
      await new Promise((r) => setTimeout(r, 600));
      return fetchWithRetry(url, retries - 1);
    }
    return res;
  }, []);

  const fetchTests = useCallback(async () => {
    try {
      const url = selectedWidget ? `/api/ab-tests?clientId=${selectedWidget}` : '/api/ab-tests';
      const res = await fetchWithRetry(url);
      const json = await res.json();
      if (json.success) setTests(json.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedWidget, fetchWithRetry]);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetchWithRetry('/api/clients/me');
      const json = await res.json();
      if (json.success) setWidgets((json.data || []) as Widget[]);
    } catch {
      /* ignore */
    }
  }, [fetchWithRetry]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);
  useEffect(() => {
    setLoading(true);
    fetchTests();
  }, [fetchTests]);

  const fetchDetail = useCallback(
    async (id: string) => {
      try {
        const res = await fetchWithRetry(`/api/ab-tests/${id}`);
        const json = await res.json();
        if (json.success) setTests((prev) => prev.map((t) => (t._id === id ? { ...t, ...json.data } : t)));
      } catch {
        /* ignore */
      }
    },
    [fetchWithRetry]
  );

  const handleToggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchDetail(id);
    }
  };

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      let res: Response;
      if (action === 'start') {
        res = await fetch(`/api/ab-tests/${id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // pause, resume, complete — PATCH with status body
        res = await fetch(`/api/ab-tests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action }),
        });
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      toastSuccess(`Test ${action}ed`);
      if (expandedId === id) await fetchDetail(id);
      else await fetchTests();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(null);
    try {
      const res = await fetch(`/api/ab-tests/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      setTests((prev) => prev.filter((t) => t._id !== id));
      if (expandedId === id) setExpandedId(null);
      toastSuccess('Test deleted');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const filtered = filter === 'all' ? tests : tests.filter((t) => t.status === filter);
  const summary = {
    total: tests.length,
    running: tests.filter((t) => t.status === 'running').length,
    completed: tests.filter((t) => t.status === 'completed').length,
    winners: tests.filter((t) => !!t.winnerVariantId).length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-text-primary flex items-center gap-2 text-2xl font-semibold">
            <FlaskConical className="text-accent h-6 w-6" />
            A/B Testing
          </h1>
          <p className="text-text-tertiary mt-1 text-sm">
            Compare widget variants and optimize conversion rates with statistical rigor
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {widgets.length > 0 && (
            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="text-text-secondary border-border focus:border-accent h-9 rounded-lg border bg-transparent px-3 text-xs focus:outline-none"
            >
              <option value="">All widgets</option>
              {widgets.map((w) => (
                <option key={w.clientId} value={w.clientId}>
                  {w.widgetName || w.username || w.clientId}
                </option>
              ))}
            </select>
          )}
          <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Test
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {(
          [
            ['Total Tests', summary.total, FlaskConical, '#6366f1'],
            ['Running', summary.running, Activity, '#10b981'],
            ['Completed', summary.completed, CheckCircle2, '#3b82f6'],
            ['Winners Found', summary.winners, Trophy, '#f59e0b'],
          ] as const
        ).map(([label, value, Icon, color]) => (
          <Card key={label} padding="md" className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-semibold tabular-nums" style={{ color }}>
                {value}
              </div>
              <div className="text-text-tertiary text-xs">{label}</div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filter tabs */}
      {tests.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-1 overflow-x-auto"
        >
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all' ? tests.length : tests.filter((t) => t.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-tertiary'}`}
              >
                {tab.label}
                <span
                  className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-tertiary'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-bg-tertiary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <FlaskConical className="text-text-tertiary h-6 w-6" />
            </div>
            {filter !== 'all' ? (
              <>
                <h2 className="text-text-primary mb-1 text-lg font-semibold">No {filter} tests</h2>
                <p className="text-text-tertiary mb-4 max-w-xs text-sm">
                  No tests in the &ldquo;{filter}&rdquo; state right now.
                </p>
                <Button variant="secondary" size="md" onClick={() => setFilter('all')}>
                  View all tests
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-text-primary mb-1 text-lg font-semibold">No A/B tests yet</h2>
                <p className="text-text-tertiary mb-6 max-w-sm text-sm">
                  Create your first test to compare widget variants and discover what drives more conversions.
                </p>
                <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create First Test
                </Button>
              </>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((test) => (
              <motion.div
                key={test._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
              >
                <TestRow
                  test={test}
                  expanded={expandedId === test._id}
                  onToggle={() => handleToggle(test._id)}
                  onAction={handleAction}
                  onDelete={(id) => setDeleteId(id)}
                  actionLoading={actionLoading}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create modal */}
      <CreateTestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        widgets={widgets}
        onCreated={fetchTests}
      />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-border bg-bg-primary w-full max-w-sm rounded-2xl border p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-text-primary mb-1 text-base font-semibold">Delete A/B Test</h3>
              <p className="text-text-secondary mb-5 text-sm">
                This will permanently delete the test and all its statistical data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" className="flex-1" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" size="md" className="flex-1" onClick={() => handleDelete(deleteId)}>
                  Delete Test
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
