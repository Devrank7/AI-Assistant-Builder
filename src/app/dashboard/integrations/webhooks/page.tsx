'use client';

import { useState, useEffect, useCallback } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  PowerOff,
  Clock,
  AlertTriangle,
  ExternalLink,
  Code,
  ChevronDown,
  ChevronUp,
  X,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/models/Webhook';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookRecord {
  _id: string;
  clientId: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  lastTriggered: string | null;
  failureCount: number;
  createdAt: string;
}

interface ClientRecord {
  _id: string;
  name: string;
}

interface CreatedSecret {
  webhookId: string;
  secret: string;
}

// ─── Event categorisation ────────────────────────────────────────────────────

const EVENT_CATEGORY: Record<WebhookEvent, 'chat' | 'lead' | 'payment' | 'error'> = {
  new_chat: 'chat',
  chat_started: 'chat',
  handoff_requested: 'chat',
  widget_feedback: 'chat',
  new_lead: 'lead',
  lead_captured: 'lead',
  appointment_booked: 'lead',
  knowledge_gap_detected: 'lead',
  payment_success: 'payment',
  payment_failed: 'payment',
  cost_threshold: 'payment',
  widget_error: 'error',
};

const CATEGORY_COLORS: Record<string, string> = {
  chat: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  lead: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  payment: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  error: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

// ─── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 16 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

// ─── Relative time helper ────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── HMAC verification snippet ───────────────────────────────────────────────

const VERIFY_SNIPPET = `const crypto = require('crypto');

// rawBody must be the raw Buffer/string — NOT JSON.parse'd
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');

if (signature === req.headers['x-webhook-signature']) {
  // ✓ Signature valid — request is authentic
} else {
  return res.status(401).json({ error: 'Invalid signature' });
}`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function EventBadge({ event }: { event: WebhookEvent }) {
  const cat = EVENT_CATEGORY[event] ?? 'chat';
  return (
    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] leading-none font-medium', CATEGORY_COLORS[cat])}>
      {event.replace(/_/g, ' ')}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-bg-tertiary animate-pulse rounded-lg', className)} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<CreatedSecret | null>(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(new Set());
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Deletion confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks/manage');
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      const list: ClientRecord[] = (Array.isArray(data) ? data : (data.data ?? [])).map(
        (c: { _id: string; clientId?: string; name?: string }) => ({
          _id: c._id ?? c.clientId,
          name: c.name ?? c._id ?? c.clientId,
        })
      );
      setClients(list);
      if (list.length > 0 && !selectedClientId) setSelectedClientId(list[0]._id);
    } catch {
      // silently fail
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchWebhooks();
    fetchClients();
  }, [fetchWebhooks, fetchClients]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const toggleEvent = (evt: WebhookEvent) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      next.has(evt) ? next.delete(evt) : next.add(evt);
      return next;
    });
  };

  const selectAll = () => setSelectedEvents(new Set(WEBHOOK_EVENTS));
  const deselectAll = () => setSelectedEvents(new Set());

  const resetForm = () => {
    setUrlInput('');
    setSelectedEvents(new Set());
    setFormError('');
    setFormOpen(false);
  };

  // ── CRUD operations ────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!urlInput.trim()) {
      setFormError('URL is required.');
      return;
    }
    try {
      new URL(urlInput);
    } catch {
      setFormError('Please enter a valid URL.');
      return;
    }
    if (selectedEvents.size === 0) {
      setFormError('Select at least one event.');
      return;
    }
    setFormError('');
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, url: urlInput, events: Array.from(selectedEvents) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to create webhook.');
        return;
      }
      setCreatedSecret({ webhookId: data._id ?? data.id, secret: data.secret });
      resetForm();
      fetchWebhooks();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentlyActive: boolean) => {
    try {
      await fetch(`/api/webhooks/manage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentlyActive }),
      });
      setWebhooks((prev) => prev.map((w) => (w._id === id ? { ...w, isActive: !currentlyActive } : w)));
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/webhooks/manage/${id}`, { method: 'DELETE' });
      setWebhooks((prev) => prev.filter((w) => w._id !== id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-accent/10 flex h-9 w-9 items-center justify-center rounded-xl">
              <Webhook className="text-accent h-5 w-5" />
            </div>
            <h1 className={cn(syne.className, 'text-text-primary text-2xl font-bold')}>Webhooks</h1>
          </div>
          <p className="text-text-secondary mt-1.5 text-sm">
            Send real-time event notifications to your server when things happen in your widgets.
          </p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Webhook
        </button>
      </motion.div>

      {/* ── Create Form ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            className="overflow-hidden"
          >
            <div className="bg-bg-secondary border-border rounded-2xl border p-5 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-text-primary font-semibold">Create Webhook</h2>
                <button onClick={resetForm} className="text-text-tertiary hover:text-text-primary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Widget selector */}
                <div>
                  <label className="text-text-secondary mb-1.5 block text-xs font-medium">Widget / Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="bg-bg-tertiary border-border text-text-primary focus:ring-accent/40 w-full rounded-xl border px-3.5 py-2.5 text-sm focus:ring-2 focus:outline-none"
                  >
                    {clients.length === 0 && (
                      <option value="" disabled>
                        No clients found
                      </option>
                    )}
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* URL */}
                <div>
                  <label className="text-text-secondary mb-1.5 block text-xs font-medium">Endpoint URL</label>
                  <div className="relative">
                    <Globe className="text-text-tertiary absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://your-server.com/webhook"
                      className="bg-bg-tertiary border-border text-text-primary placeholder:text-text-tertiary focus:ring-accent/40 w-full rounded-xl border py-2.5 pr-3.5 pl-10 text-sm focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Event checkboxes */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-text-secondary text-xs font-medium">Events</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-text-tertiary hover:text-accent text-xs transition-colors"
                      >
                        Select all
                      </button>
                      <span className="text-text-tertiary text-xs">·</span>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="text-text-tertiary hover:text-accent text-xs transition-colors"
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>
                  <div className="bg-bg-tertiary border-border rounded-xl border p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {WEBHOOK_EVENTS.map((evt) => {
                        const cat = EVENT_CATEGORY[evt] ?? 'chat';
                        const checked = selectedEvents.has(evt);
                        return (
                          <label
                            key={evt}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                              checked ? 'bg-accent/8' : 'hover:bg-bg-secondary'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEvent(evt)}
                              className="accent-accent h-3.5 w-3.5 rounded"
                            />
                            <span
                              className={cn(
                                'rounded-md px-1.5 py-0.5 text-[10px] leading-none font-medium',
                                CATEGORY_COLORS[cat]
                              )}
                            >
                              {evt.replace(/_/g, ' ')}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {formError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={resetForm}
                    className="text-text-secondary hover:text-text-primary rounded-xl px-4 py-2 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Create Webhook
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Secret Reveal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {createdSecret && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 110, damping: 16 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Webhook created successfully</span>
              </div>
              <button
                onClick={() => setCreatedSecret(null)}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3">
              <p className="text-text-secondary mb-2 text-xs font-medium">Signing secret — save this now</p>
              <div className="bg-bg-primary border-border flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                <code className="text-text-primary font-mono text-xs break-all">{createdSecret.secret}</code>
                <CopyButton text={createdSecret.secret} />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400/90">
                Save this secret — it won&apos;t be shown again. Use it to verify the{' '}
                <code className="font-mono">x-webhook-signature</code> header on incoming requests.
              </p>
            </div>

            {/* How to verify */}
            <div className="mt-3">
              <button
                onClick={() => setVerifyOpen((v) => !v)}
                className="text-text-tertiary hover:text-text-primary flex items-center gap-1.5 text-xs transition-colors"
              >
                <Code className="h-3.5 w-3.5" />
                How to verify the signature
                {verifyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <AnimatePresence>
                {verifyOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-bg-primary border-border mt-2 rounded-xl border">
                      <div className="border-border flex items-center justify-between border-b px-4 py-2">
                        <span className="text-text-tertiary text-xs font-medium">Node.js — HMAC SHA-256</span>
                        <CopyButton text={VERIFY_SNIPPET} />
                      </div>
                      <pre className="overflow-x-auto px-4 py-3 text-xs">
                        <code className="text-text-secondary">{VERIFY_SNIPPET}</code>
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Webhook list ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-bg-secondary border-border flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
        >
          <div className="bg-bg-tertiary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Webhook className="text-text-tertiary h-7 w-7" />
          </div>
          <h3 className="text-text-primary mb-1 font-semibold">No webhooks yet</h3>
          <p className="text-text-secondary mb-5 max-w-xs text-sm">
            Create your first webhook to receive real-time notifications when events fire in your widgets.
          </p>
          <button
            onClick={() => setFormOpen(true)}
            className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Webhook
          </button>
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {webhooks.map((wh) => (
            <motion.div
              key={wh._id}
              variants={fadeUp}
              className="bg-bg-secondary border-border group rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: url + widget + events */}
                <div className="min-w-0 flex-1 space-y-2">
                  {/* URL row */}
                  <div className="flex items-center gap-2">
                    <ExternalLink className="text-text-tertiary h-3.5 w-3.5 shrink-0" />
                    <span className="text-text-primary font-mono text-sm" title={wh.url}>
                      {wh.url.length > 50 ? wh.url.slice(0, 50) + '…' : wh.url}
                    </span>
                  </div>

                  {/* Widget badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-bg-tertiary text-text-secondary border-border rounded-md border px-2 py-0.5 text-[11px] font-medium">
                      {clients.find((c) => c._id === wh.clientId)?.name ?? wh.clientId}
                    </span>
                    {/* Status badge */}
                    {wh.isActive ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Disabled
                        {wh.failureCount > 0 && ` · ${wh.failureCount} failure${wh.failureCount > 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>

                  {/* Event badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.map((evt) => (
                      <EventBadge key={evt} event={evt} />
                    ))}
                  </div>

                  {/* Last triggered */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="text-text-tertiary h-3 w-3" />
                    <span className="text-text-tertiary text-xs">Last triggered: {relativeTime(wh.lastTriggered)}</span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(wh._id, wh.isActive)}
                    title={wh.isActive ? 'Disable webhook' : 'Enable webhook'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all active:scale-95',
                      wh.isActive
                        ? 'bg-bg-tertiary text-text-secondary hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-emerald-500/10 hover:text-emerald-400'
                    )}
                  >
                    {wh.isActive ? (
                      <>
                        <PowerOff className="h-3.5 w-3.5" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5" />
                        Enable
                      </>
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(wh._id)}
                    disabled={deletingId === wh._id}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all active:scale-95',
                      confirmDeleteId === wh._id
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-red-500/10 hover:text-red-400',
                      'disabled:opacity-50'
                    )}
                    title="Delete webhook"
                  >
                    {deletingId === wh._id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {confirmDeleteId === wh._id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Signature verification guide ────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-bg-secondary border-border rounded-2xl border"
      >
        <button onClick={() => setGuideOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Code className="text-text-tertiary h-4 w-4" />
            <span className="text-text-primary text-sm font-semibold">Signature Verification Guide</span>
          </div>
          {guideOpen ? (
            <ChevronUp className="text-text-tertiary h-4 w-4" />
          ) : (
            <ChevronDown className="text-text-tertiary h-4 w-4" />
          )}
        </button>

        <AnimatePresence>
          {guideOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-border space-y-4 border-t px-5 pt-4 pb-5">
                <p className="text-text-secondary text-sm">
                  Every webhook request includes an{' '}
                  <code className="text-text-primary bg-bg-tertiary rounded px-1.5 py-0.5 font-mono text-xs">
                    x-webhook-signature
                  </code>{' '}
                  header. Verify it by computing an HMAC-SHA256 signature of the raw request body using your webhook
                  secret.
                </p>

                <div className="bg-bg-primary border-border rounded-xl border">
                  <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                    <span className="text-text-tertiary text-xs font-medium">Node.js / Express</span>
                    <CopyButton text={VERIFY_SNIPPET} />
                  </div>
                  <pre className="overflow-x-auto px-4 py-4 text-xs">
                    <code className="text-text-secondary">{VERIFY_SNIPPET}</code>
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-text-secondary text-xs font-medium">Key points:</p>
                  <ul className="text-text-secondary list-none space-y-1 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      Use the <strong className="text-text-primary">raw body buffer</strong> — not the parsed JSON
                      object.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      Store your webhook secret in an environment variable, never in source code.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      Return <code className="bg-bg-tertiary rounded px-1 font-mono">401</code> for invalid signatures
                      to reject spoofed requests.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      WinBix retries failed deliveries up to 3 times with exponential back-off.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
