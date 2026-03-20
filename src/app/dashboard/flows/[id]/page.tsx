'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Syne } from 'next/font/google';
import {
  Zap,
  Play,
  Pause,
  Trash2,
  Plus,
  ArrowLeft,
  ArrowDown,
  X,
  Loader2,
  ChevronDown,
  Clock,
  MessageSquare,
  Bell,
  Tag,
  UserPlus,
  TrendingUp,
  Save,
  AlertCircle,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Animations ── */
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

const stepAppear = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
  exit: { opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } },
};

/* ── Constants ── */
const TRIGGER_TYPES = [
  { value: 'message:received', label: 'When message received' },
  { value: 'message:sent', label: 'When message sent' },
  { value: 'conversation:handoff', label: 'When conversation handed off' },
  { value: 'conversation:resolved', label: 'When conversation resolved' },
  { value: 'contact:created', label: 'When new contact created' },
  { value: 'contact:score_changed', label: 'When lead score changes' },
];

const CONDITION_FIELDS = [
  { value: 'contact.leadScore', label: 'Lead Score' },
  { value: 'contact.leadTemp', label: 'Lead Temperature' },
  { value: 'contact.channel', label: 'Channel' },
  { value: 'event.text', label: 'Message Text' },
  { value: 'event.reason', label: 'Trigger Reason' },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'contains', label: 'contains' },
];

const ACTION_TYPES = [
  { value: 'send_message', label: 'Send Message', icon: MessageSquare, color: '#10B981' },
  { value: 'send_notification', label: 'Send Notification', icon: Bell, color: '#F59E0B' },
  { value: 'add_tag', label: 'Add Tag', icon: Tag, color: '#3B82F6' },
  { value: 'remove_tag', label: 'Remove Tag', icon: Tag, color: '#EF4444' },
  { value: 'change_score', label: 'Change Score', icon: TrendingUp, color: '#8B5CF6' },
  { value: 'assign_operator', label: 'Assign Operator', icon: UserPlus, color: '#06B6D4' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'in_app', label: 'In-App' },
];

const TEMPLATE_VARIABLES = [
  '{{contact.name}}',
  '{{contact.email}}',
  '{{contact.phone}}',
  '{{contact.channel}}',
  '{{contact.leadScore}}',
  '{{contact.leadTemp}}',
  '{{contact.tags}}',
];

/* ── Types ── */
interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface FlowStep {
  id: string;
  type: 'action' | 'delay';
  actionType?: string;
  config: Record<string, unknown>;
}

/* ── Helpers ── */
let _stepIdCounter = 0;
function genId() {
  _stepIdCounter += 1;
  return `step_${Date.now()}_${_stepIdCounter}`;
}

function genCondId() {
  _stepIdCounter += 1;
  return `cond_${Date.now()}_${_stepIdCounter}`;
}

/* ═══════════════════════════════════════════════════
   VARIABLE HINT TOOLTIP
   ═══════════════════════════════════════════════════ */
function VariableHints() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-500 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <AlertCircle className="h-3 w-3" />
        Variables
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-50 mt-1 w-56 rounded-xl border border-gray-200/80 bg-white p-3 shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a24]"
          >
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Template Variables
            </p>
            <div className="space-y-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(v);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2 py-1 text-left font-mono text-xs text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">Click to copy</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STYLED SELECT
   ═══════════════════════════════════════════════════ */
function StyledSelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 pr-9 text-sm font-medium text-gray-900 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONNECTOR LINE
   ═══════════════════════════════════════════════════ */
function ConnectorLine({ showAddButton, onAdd }: { showAddButton?: boolean; onAdd?: () => void }) {
  return (
    <div className="relative flex flex-col items-center py-1">
      <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-gray-200 dark:from-white/[0.12] dark:to-white/[0.06]" />
      <ArrowDown className="my-0.5 h-4 w-4 text-gray-300 dark:text-white/[0.15]" />
      {showAddButton && onAdd && (
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onAdd}
          className="absolute top-1/2 -right-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:border-white/[0.1] dark:bg-[#111118] dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
          title="Add step"
        >
          <Plus className="h-3.5 w-3.5" />
        </motion.button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ACTION CONFIG PANEL
   ═══════════════════════════════════════════════════ */
function ActionConfigPanel({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  switch (actionType) {
    case 'send_message':
      return (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Message</label>
            <VariableHints />
          </div>
          <textarea
            value={(config.message as string) || ''}
            onChange={(e) => onChange({ ...config, message: e.target.value })}
            placeholder="Type your message... Use {{contact.name}} for personalization"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>
      );

    case 'send_notification':
      return (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notification Message</label>
              <VariableHints />
            </div>
            <textarea
              value={(config.message as string) || ''}
              onChange={(e) => onChange({ ...config, message: e.target.value })}
              placeholder="Notification content..."
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Channel</label>
            <StyledSelect
              value={(config.channel as string) || 'email'}
              onChange={(v) => onChange({ ...config, channel: v })}
              options={NOTIFICATION_CHANNELS}
              className="mt-1.5"
            />
          </div>
        </div>
      );

    case 'add_tag':
    case 'remove_tag':
      return (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tag</label>
          <input
            type="text"
            value={(config.tag as string) || ''}
            onChange={(e) => onChange({ ...config, tag: e.target.value })}
            placeholder="e.g. hot-lead, interested"
            className="mt-1.5 w-full rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>
      );

    case 'change_score':
      return (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Score Delta</label>
          <input
            type="number"
            value={(config.delta as number) ?? 0}
            onChange={(e) => onChange({ ...config, delta: parseInt(e.target.value) || 0 })}
            placeholder="+5 or -3"
            className="mt-1.5 w-full rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            Positive to increase, negative to decrease
          </p>
        </div>
      );

    case 'assign_operator':
      return (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Operator User ID</label>
          <input
            type="text"
            value={(config.userId as string) || ''}
            onChange={(e) => onChange({ ...config, userId: e.target.value })}
            placeholder="user_abc123"
            className="mt-1.5 w-full rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          />
        </div>
      );

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════
   FLOW EDITOR PAGE
   ═══════════════════════════════════════════════════ */
export default function FlowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === 'new';
  const templateId = searchParams.get('template');

  /* ── State ── */
  const [flowName, setFlowName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [triggerType, setTriggerType] = useState('message:received');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  /* ── Load existing flow ── */
  const loadFlow = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch('/api/flows');
      const data = await res.json();
      if (data.success) {
        const flow = data.data.flows.find((f: { flowId: string }) => f.flowId === id);
        if (flow) {
          setFlowName(flow.name || '');
          setSelectedClientId(flow.clientId || '');
          setTriggerType(flow.trigger || 'message:received');
          if (flow.triggerConfig?.conditions) {
            setConditions(
              (flow.triggerConfig.conditions as Condition[]).map((c: Condition) => ({
                ...c,
                id: c.id || genCondId(),
              }))
            );
          }
          if (flow.steps) {
            setSteps(
              flow.steps.map((s: FlowStep) => ({
                ...s,
                id: s.id || genId(),
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to load flow:', err);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  /* ── Load template ── */
  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    try {
      const res = await fetch('/api/flows/templates');
      const data = await res.json();
      if (data.success) {
        const template = data.data.templates.find((t: { templateId: string }) => t.templateId === templateId);
        if (template) {
          setFlowName(template.name || '');
          setTriggerType(template.trigger || 'message:received');
          if (template.steps) {
            setSteps(
              template.steps.map((s: FlowStep) => ({
                ...s,
                id: s.id || genId(),
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  }, [templateId]);

  useEffect(() => {
    if (isNew && templateId) {
      loadTemplate();
    } else if (!isNew) {
      loadFlow();
    }
  }, [isNew, templateId, loadFlow, loadTemplate]);

  /* ── Condition handlers ── */
  const addCondition = () => {
    setConditions((prev) => [...prev, { id: genCondId(), field: 'contact.leadScore', operator: 'eq', value: '' }]);
  };

  const updateCondition = (condId: string, updates: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === condId ? { ...c, ...updates } : c)));
  };

  const removeCondition = (condId: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== condId));
  };

  /* ── Step handlers ── */
  const addStep = (index: number, type: 'action' | 'delay') => {
    const newStep: FlowStep =
      type === 'delay'
        ? { id: genId(), type: 'delay', config: { minutes: 5 } }
        : { id: genId(), type: 'action', actionType: 'send_message', config: {} };

    setSteps((prev) => {
      const next = [...prev];
      next.splice(index, 0, newStep);
      return next;
    });
  };

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id !== stepId) return s;
        const updated = { ...s, ...updates };
        // Reset config when action type changes
        if (updates.actionType && updates.actionType !== s.actionType) {
          updated.config = {};
        }
        return updated;
      })
    );
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  /* ── Save ── */
  const saveFlow = async (status: 'active' | 'draft') => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        name: flowName || 'Untitled Flow',
        clientId: selectedClientId,
        status,
        trigger: triggerType,
        triggerConfig: { conditions },
        steps,
        templateId: templateId || null,
      };

      if (isNew) {
        const res = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          router.push('/dashboard/flows');
        } else {
          setSaveStatus(data.error || 'Failed to create flow');
        }
      } else {
        const res = await fetch(`/api/flows/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          router.push('/dashboard/flows');
        } else {
          setSaveStatus(data.error || 'Failed to update flow');
        }
      }
    } catch (err) {
      console.error('Failed to save flow:', err);
      setSaveStatus('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Add step menu state ── */
  const [addMenuIndex, setAddMenuIndex] = useState<number | null>(null);

  const handleAddAt = (index: number) => {
    setAddMenuIndex(addMenuIndex === index ? null : index);
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/80 dark:from-[#0a0a12] dark:via-[#0d0d17] dark:to-[#0a0a12]">
        <div className="flex min-h-screen items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading flow...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/80 dark:from-[#0a0a12] dark:via-[#0d0d17] dark:to-[#0a0a12]">
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
        <div className="absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ══════════════ HEADER ══════════════ */}
        <motion.div {...fadeUp} className="mb-8">
          <button
            onClick={() => router.push('/dashboard/flows')}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Flows
          </button>

          {/* Flow name input */}
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Untitled Flow"
            className={`${syne.className} w-full border-none bg-transparent text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none dark:text-white dark:placeholder:text-gray-600`}
          />

          {/* Client ID input */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-400 uppercase dark:text-gray-500">
              Client ID
            </label>
            <input
              type="text"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              placeholder="Enter client ID"
              className="w-full max-w-xs rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
            />
          </div>
        </motion.div>

        {/* ══════════════ STEP CHAIN ══════════════ */}
        <div className="flex flex-col items-center">
          {/* ── STEP 1: TRIGGER ── */}
          <motion.div
            {...fadeUp}
            className="w-full overflow-hidden rounded-2xl border border-blue-200/60 bg-white shadow-sm dark:border-blue-500/[0.15] dark:bg-[#111118]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(59,130,246,0.08)' }}
          >
            {/* Accent bar */}
            <div className="h-[3px] bg-gradient-to-r from-blue-500 to-blue-400" />
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Zap className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">Step 1</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Trigger</h3>
                </div>
              </div>
              <StyledSelect
                value={triggerType}
                onChange={setTriggerType}
                options={TRIGGER_TYPES}
                placeholder="Select trigger..."
              />
            </div>
          </motion.div>

          <ConnectorLine />

          {/* ── STEP 2: CONDITIONS ── */}
          <motion.div
            {...fadeUp}
            className="w-full overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-sm dark:border-amber-500/[0.15] dark:bg-[#111118]"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(245,158,11,0.08)' }}
          >
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">Step 2</span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Conditions</h3>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {conditions.length === 0
                    ? 'No conditions (always runs)'
                    : `${conditions.length} condition${conditions.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {conditions.map((cond) => (
                  <motion.div
                    key={cond.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="flex items-start gap-2">
                      <StyledSelect
                        value={cond.field}
                        onChange={(v) => updateCondition(cond.id, { field: v })}
                        options={CONDITION_FIELDS}
                        className="flex-1"
                      />
                      <StyledSelect
                        value={cond.operator}
                        onChange={(v) => updateCondition(cond.id, { operator: v })}
                        options={OPERATORS}
                        className="w-36"
                      />
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        placeholder="Value"
                        className="w-28 rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      />
                      <button
                        onClick={() => removeCondition(cond.id)}
                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addCondition}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-amber-300/60 px-3 py-2 text-xs font-semibold text-amber-600 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-500/20 dark:text-amber-400 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Condition
              </motion.button>
            </div>
          </motion.div>

          {/* ── STEPS 3+: ACTIONS & DELAYS ── */}
          <AnimatePresence mode="popLayout">
            {steps.map((step, idx) => {
              const isDelay = step.type === 'delay';
              const actionMeta = ACTION_TYPES.find((a) => a.value === step.actionType);
              const accentColor = isDelay ? '#6B7280' : actionMeta?.color || '#10B981';
              const StepIcon = isDelay ? Clock : actionMeta?.icon || MessageSquare;

              return (
                <motion.div key={step.id} layout {...stepAppear} className="flex w-full flex-col items-center">
                  <ConnectorLine showAddButton onAdd={() => handleAddAt(idx)} />

                  {/* Add step popover */}
                  <AnimatePresence>
                    {addMenuIndex === idx && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mb-2 flex gap-2"
                      >
                        <button
                          onClick={() => {
                            addStep(idx, 'action');
                            setAddMenuIndex(null);
                          }}
                          className="rounded-xl border border-gray-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm transition-colors hover:bg-emerald-50 dark:border-white/[0.08] dark:bg-[#111118] dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        >
                          + Action
                        </button>
                        <button
                          onClick={() => {
                            addStep(idx, 'delay');
                            setAddMenuIndex(null);
                          }}
                          className="rounded-xl border border-gray-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#111118] dark:text-gray-400 dark:hover:bg-white/[0.04]"
                        >
                          + Delay
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Step card */}
                  <div
                    className="w-full overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-[#111118]"
                    style={{
                      borderColor: `${accentColor}25`,
                      boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px ${accentColor}10`,
                    }}
                  >
                    <div
                      className="h-[3px]"
                      style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }}
                    />
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                          >
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <span
                              className="text-[10px] font-bold tracking-widest uppercase"
                              style={{ color: accentColor }}
                            >
                              Step {idx + 3}
                            </span>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {isDelay ? 'Delay' : 'Action'}
                            </h3>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStep(step.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Remove step"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {isDelay ? (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Wait duration (minutes)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={(step.config.minutes as number) ?? 5}
                            onChange={(e) =>
                              updateStep(step.id, {
                                config: { ...step.config, minutes: parseInt(e.target.value) || 1 },
                              })
                            }
                            className="mt-1.5 w-full max-w-[200px] rounded-xl border border-gray-200/80 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:outline-none dark:border-white/[0.08] dark:bg-[#111118] dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                          />
                        </div>
                      ) : (
                        <>
                          <StyledSelect
                            value={step.actionType || 'send_message'}
                            onChange={(v) => updateStep(step.id, { actionType: v })}
                            options={ACTION_TYPES}
                          />
                          <ActionConfigPanel
                            actionType={step.actionType || 'send_message'}
                            config={step.config}
                            onChange={(config) => updateStep(step.id, { config })}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ── ADD STEP BUTTON (after last step) ── */}
          <ConnectorLine />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addStep(steps.length, 'action')}
              className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-300/60 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-600 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-[#111118] dark:text-emerald-400 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
            >
              <Plus className="h-4 w-4" />
              Add Action
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addStep(steps.length, 'delay')}
              className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300/60 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 dark:border-white/[0.1] dark:bg-[#111118] dark:text-gray-400 dark:hover:border-white/[0.2] dark:hover:bg-white/[0.04]"
            >
              <Clock className="h-4 w-4" />
              Add Delay
            </motion.button>
          </motion.div>
        </div>

        {/* ══════════════ ERROR BANNER ══════════════ */}
        <AnimatePresence>
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-6 flex items-center gap-2.5 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveStatus}
              <button onClick={() => setSaveStatus(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ BOTTOM ACTIONS ══════════════ */}
        <motion.div
          {...fadeUp}
          className="mt-10 flex flex-col gap-3 border-t border-gray-200/60 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]"
        >
          <button
            onClick={() => router.push('/dashboard/flows')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => saveFlow('draft')}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.06]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Draft
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => saveFlow('active')}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/30 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Save & Activate
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
