'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Syne } from 'next/font/google';
import { AnimatedNumber } from '@/components/ui/motion';
import {
  Zap,
  Play,
  Pause,
  Trash2,
  MoreVertical,
  Plus,
  ArrowRight,
  ChevronRight,
  Loader2,
  Workflow,
  Bell,
  Clock,
  Users,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
interface FlowStep {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface Flow {
  flowId: string;
  clientId: string;
  name: string;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  steps: FlowStep[];
  status: 'active' | 'paused' | 'draft';
  stats: {
    timesTriggered: number;
    lastTriggeredAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface Template {
  templateId: string;
  name: string;
  description: string;
  category: string;
  trigger: string;
  steps: FlowStep[];
}

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ── Stat gradients ── */
const STAT_GRADIENTS = [
  { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.15)' },
  { from: '#F59E0B', to: '#FBBF24', glow: 'rgba(245,158,11,0.15)' },
  { from: '#3B82F6', to: '#60A5FA', glow: 'rgba(59,130,246,0.15)' },
];

/* ── Trigger labels ── */
const TRIGGER_LABELS: Record<string, string> = {
  'message:received': 'When message received',
  'message:sent': 'When message sent',
  'conversation:handoff': 'When conversation handed off',
  'conversation:resolved': 'When conversation resolved',
  'contact:created': 'When new contact created',
  'contact:score_changed': 'When lead score changes',
};

/* ── Template icons ── */
const TEMPLATE_ICONS: Record<string, typeof Bell> = {
  'hot-lead-alert': Bell,
  'follow-up-after-silence': Clock,
  'welcome-sequence': Users,
  'auto-tag-pricing': Tag,
};

/* ── Template gradient accents ── */
const TEMPLATE_GRADIENTS: Record<string, { from: string; to: string }> = {
  'hot-lead-alert': { from: '#EF4444', to: '#F97316' },
  'follow-up-after-silence': { from: '#8B5CF6', to: '#6366F1' },
  'welcome-sequence': { from: '#10B981', to: '#06B6D4' },
  'auto-tag-pricing': { from: '#F59E0B', to: '#EAB308' },
};

/* ── Status config ── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: {
    label: 'Active',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
  },
  paused: {
    label: 'Paused',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.2)',
  },
};

/* ── Helpers ── */
function getTriggerLabel(trigger: string): string {
  return TRIGGER_LABELS[trigger] || trigger;
}

function getStepSummary(steps: FlowStep[]): string {
  if (!steps || steps.length === 0) return 'No steps';
  const types = [...new Set(steps.map((s) => s.type))];
  const labels: Record<string, string> = {
    send_message: 'Send message',
    add_tag: 'Add tag',
    notify: 'Notify',
    delay: 'Delay',
    condition: 'Condition',
    webhook: 'Webhook',
    assign: 'Assign',
    update_score: 'Update score',
  };
  return types.map((t) => labels[t] || t).join(', ');
}

/* ═══════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════ */
function StatCard({
  label,
  numericValue,
  icon,
  gradientIndex,
  loading,
}: {
  label: string;
  numericValue: number;
  icon: React.ReactNode;
  gradientIndex: number;
  loading: boolean;
}) {
  const g = STAT_GRADIENTS[gradientIndex];

  return (
    <motion.div
      variants={staggerItem}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
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
            <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          ) : (
            <AnimatedNumber
              value={numericValue}
              className={`${syne.className} mt-2 block text-3xl font-bold text-gray-900 dark:text-white`}
            />
          )}
        </div>
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

/* ═══════════════════════════════════════════════════
   TEMPLATE CARD
   ═══════════════════════════════════════════════════ */
function TemplateCard({ template }: { template: Template }) {
  const Icon = TEMPLATE_ICONS[template.templateId] || Workflow;
  const gradient = TEMPLATE_GRADIENTS[template.templateId] || { from: '#6366F1', to: '#8B5CF6' };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all duration-300 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})` }}
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}18, ${gradient.to}22)`,
              color: gradient.from,
              boxShadow: `0 0 0 1px ${gradient.from}18`,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{template.name}</h3>
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{template.category}</p>
          </div>
        </div>
        <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {template.description}
        </p>
        <Link
          href={`/dashboard/flows/new?template=${template.templateId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: gradient.from }}
        >
          Use Template
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   FLOW CARD
   ═══════════════════════════════════════════════════ */
function FlowCard({
  flow,
  onToggleStatus,
  onDelete,
}: {
  flow: Flow;
  onToggleStatus: (flow: Flow) => void;
  onDelete: (flow: Flow) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = STATUS_CONFIG[flow.status] || STATUS_CONFIG.draft;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <motion.div
      variants={staggerItem}
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-40 transition-opacity duration-300 group-hover:opacity-80"
        style={{ background: `linear-gradient(90deg, ${status.color}, ${status.color}80)` }}
      />

      <div className="flex items-start justify-between gap-4">
        {/* Left: flow info */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2.5">
            {/* Status dot */}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: status.color,
                boxShadow: flow.status === 'active' ? `0 0 8px ${status.color}60` : 'none',
              }}
            />
            <Link
              href={`/dashboard/flows/${flow.flowId}`}
              className="truncate text-base font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              {flow.name}
            </Link>
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
              style={{
                color: status.color,
                backgroundColor: status.bg,
                borderColor: status.border,
              }}
            >
              {status.label}
            </span>
          </div>

          {/* Trigger */}
          <p className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {getTriggerLabel(flow.trigger)}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Workflow className="h-3.5 w-3.5" />
              {flow.steps?.length || 0} step{(flow.steps?.length || 0) !== 1 ? 's' : ''}
              {flow.steps?.length > 0 && (
                <span className="ml-1 text-gray-300 dark:text-gray-600">({getStepSummary(flow.steps)})</span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Play className="h-3.5 w-3.5" />
              {flow.stats?.timesTriggered || 0} execution{(flow.stats?.timesTriggered || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Right: kebab menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a24]"
              >
                <Link
                  href={`/dashboard/flows/${flow.flowId}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  onClick={() => setMenuOpen(false)}
                >
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleStatus(flow);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  {flow.status === 'active' ? (
                    <>
                      <Pause className="h-4 w-4 text-amber-500" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 text-emerald-500" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(flow);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/[0.06]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   FLOWS PAGE
   ═══════════════════════════════════════════════════ */
export default function FlowsPage() {
  /* ── State ── */
  const [flows, setFlows] = useState<Flow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Flow | null>(null);

  const templateScrollRef = useRef<HTMLDivElement>(null);

  /* ── Data Fetching ── */
  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flows');
      const data = await res.json();
      if (data.success) setFlows(data.data.flows);
    } catch (err) {
      console.error('Failed to fetch flows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/flows/templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data.templates);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    fetchTemplates();
  }, [fetchFlows, fetchTemplates]);

  /* ── Actions ── */
  const handleToggleStatus = async (flow: Flow) => {
    const newStatus = flow.status === 'active' ? 'paused' : 'active';
    setActionLoading(flow.flowId);
    try {
      const res = await fetch(`/api/flows/${flow.flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFlows((prev) => prev.map((f) => (f.flowId === flow.flowId ? { ...f, status: newStatus } : f)));
      }
    } catch (err) {
      console.error('Failed to update flow status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (flow: Flow) => {
    setActionLoading(flow.flowId);
    try {
      const res = await fetch(`/api/flows/${flow.flowId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFlows((prev) => prev.filter((f) => f.flowId !== flow.flowId));
      }
    } catch (err) {
      console.error('Failed to delete flow:', err);
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  /* ── Derived stats ── */
  const activeCount = flows.filter((f) => f.status === 'active').length;
  const pausedCount = flows.filter((f) => f.status === 'paused').length;
  const totalExecutions = flows.reduce((sum, f) => sum + (f.stats?.timesTriggered || 0), 0);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/80 dark:from-[#0a0a12] dark:via-[#0d0d17] dark:to-[#0a0a12]">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        <div className="absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ══════════════ HEADER ══════════════ */}
        <motion.div {...fadeUp} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`${syne.className} text-3xl font-bold text-gray-900 dark:text-white`}>Flows</h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Automate actions when events happen in your workspace
            </p>
          </div>
          <Link
            href="/dashboard/flows/new"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/30 hover:brightness-110"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            New Flow
          </Link>
        </motion.div>

        {/* ══════════════ STAT CARDS ══════════════ */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <StatCard
            label="Active"
            numericValue={activeCount}
            icon={<Play className="h-5 w-5" />}
            gradientIndex={0}
            loading={loading}
          />
          <StatCard
            label="Paused"
            numericValue={pausedCount}
            icon={<Pause className="h-5 w-5" />}
            gradientIndex={1}
            loading={loading}
          />
          <StatCard
            label="Total Executions"
            numericValue={totalExecutions}
            icon={<Zap className="h-5 w-5" />}
            gradientIndex={2}
            loading={loading}
          />
        </motion.div>

        {/* ══════════════ TEMPLATE BANNER ══════════════ */}
        {templates.length > 0 && (
          <motion.div {...fadeUp} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Quick Start Templates
              </h2>
            </div>
            <div
              ref={templateScrollRef}
              className="scrollbar-none flex gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {templates.map((template) => (
                <TemplateCard key={template.templateId} template={template} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════ FLOW LIST ══════════════ */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                      <div className="h-4 w-40 rounded bg-gray-200 dark:bg-white/[0.06]" />
                      <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
                    </div>
                    <div className="h-3 w-48 rounded bg-gray-100 dark:bg-white/[0.04]" />
                    <div className="flex gap-4">
                      <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/[0.03]" />
                      <div className="h-3 w-24 rounded bg-gray-100 dark:bg-white/[0.03]" />
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : flows.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            {...fadeUp}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300/80 bg-white/50 px-8 py-16 text-center backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.01]"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <Workflow className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className={`${syne.className} mb-2 text-xl font-bold text-gray-900 dark:text-white`}>No flows yet</h3>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Start with a template above or create from scratch. Flows automate repetitive tasks so you can focus on
              what matters.
            </p>
            <Link
              href="/dashboard/flows/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/30 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Create Your First Flow
            </Link>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {flows.map((flow) => (
              <FlowCard
                key={flow.flowId}
                flow={flow}
                onToggleStatus={handleToggleStatus}
                onDelete={(f) => setDeleteConfirm(f)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ══════════════ DELETE CONFIRM MODAL ══════════════ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a24]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <h3 className={`${syne.className} mb-1.5 text-lg font-bold text-gray-900 dark:text-white`}>
                  Delete Flow
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete{' '}
                  <strong className="text-gray-700 dark:text-gray-200">{deleteConfirm.name}</strong>? This action cannot
                  be undone.
                </p>
              </div>
              <div className="flex gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-white/[0.04] dark:bg-white/[0.01]">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={actionLoading === deleteConfirm.flowId}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading === deleteConfirm.flowId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
