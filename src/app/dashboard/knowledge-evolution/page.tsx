'use client';

import { useState, useEffect, useCallback } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Clock,
  Plus,
  Minus,
  Pencil,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  Trash2,
  Pause,
  Play,
  Calendar,
  Activity,
  Zap,
  Database,
  Search,
  X,
  CheckCheck,
  ArrowUpDown,
  Link2,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 16 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const } },
};

interface TrackerSummary {
  id: string;
  evolutionId: string;
  clientId: string;
  sourceUrl: string;
  isActive: boolean;
  schedule: { enabled: boolean; intervalDays: number; lastRun?: string; nextRun?: string };
  stats: { totalCrawls: number; totalChanges: number; lastChangeAt?: string; avgChangesPerCrawl: number };
  lastCrawlStatus: 'success' | 'failed' | 'no_change' | null;
  pendingChanges: number;
  totalChanges: number;
  createdAt: string;
  updatedAt: string;
}

interface EvolutionChange {
  index: number;
  id: string;
  detectedAt: string;
  type: 'added' | 'removed' | 'modified';
  summary: string;
  oldSnippet?: string;
  newSnippet?: string;
  applied: boolean;
  appliedAt?: string;
}

interface CrawlHistoryEntry {
  crawledAt: string;
  contentHash: string;
  wordCount: number;
  status: 'success' | 'failed' | 'no_change';
  error?: string;
}

interface TrackerDetail {
  id: string;
  evolutionId: string;
  clientId: string;
  sourceUrl: string;
  isActive: boolean;
  schedule: { enabled: boolean; intervalDays: number; lastRun?: string; nextRun?: string };
  stats: { totalCrawls: number; totalChanges: number; lastChangeAt?: string; avgChangesPerCrawl: number };
  changes: EvolutionChange[];
  crawlHistory: CrawlHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface ClientRecord {
  clientId: string;
  username: string;
  website: string;
}

function Bdg({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
      style={{ background: bg, color, border: `1px solid ${color}20` }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: 'success' | 'failed' | 'no_change' | null }) {
  if (!status) return null;
  const map = {
    success: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Success' },
    failed: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', label: 'Failed' },
    no_change: { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', label: 'No Change' },
  };
  const c = map[status];
  return (
    <Bdg color={c.color} bg={c.bg}>
      {c.label}
    </Bdg>
  );
}

function ChangeBadge({ type }: { type: 'added' | 'removed' | 'modified' }) {
  const map = {
    added: { icon: Plus, color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Added' },
    removed: { icon: Minus, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', label: 'Removed' },
    modified: { icon: Pencil, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: 'Modified' },
  };
  const c = map[type];
  const Icon = c.icon;
  return (
    <Bdg color={c.color} bg={c.bg}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </Bdg>
  );
}

function GlassCard({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-sm dark:border-white/[0.06] dark:bg-[#111118]/90 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', ...style }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wider text-gray-400 uppercase dark:text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${color}14`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </GlassCard>
  );
}

async function apiFetch(url: string, opts?: RequestInit): Promise<Response> {
  let res = await fetch(url, opts);
  if (res.status === 401) {
    await new Promise((r) => setTimeout(r, 800));
    res = await fetch(url, opts);
  }
  return res;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(iso?: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncUrl(url: string, max = 55) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length <= max ? short : short.slice(0, max) + '…';
  } catch {
    return url.length <= max ? url : url.slice(0, max) + '…';
  }
}

const INTERVALS = [
  { label: 'Daily', days: 1 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: 'Biweekly', days: 14 },
  { label: 'Monthly', days: 30 },
];

export default function KnowledgeEvolutionPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [trackers, setTrackers] = useState<TrackerSummary[]>([]);
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, TrackerDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalTracked: number;
    activeTracked: number;
    totalCrawls: number;
    totalChanges: number;
    pendingChanges: number;
    lastCrawlAt: string | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [crawlingId, setCrawlingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newInterval, setNewInterval] = useState(7);
  const [addingUrl, setAddingUrl] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);
  useEffect(() => {
    loadTrackers();
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const res = await apiFetch('/api/clients');
      const data = await res.json();
      if (data.success && data.clients) {
        const list: ClientRecord[] = data.clients.slice(0, 50);
        setClients(list);
        if (list.length > 0 && !selectedClientId) setSelectedClientId(list[0].clientId);
      }
    } catch {
      /* ignore */
    }
  };

  const loadTrackers = useCallback(async () => {
    setLoadingTrackers(true);
    try {
      const qs = selectedClientId ? `?clientId=${selectedClientId}` : '';
      const res = await apiFetch(`/api/knowledge-evolution${qs}`);
      const data = await res.json();
      if (data.success) {
        const list: TrackerSummary[] = data.data?.trackers || [];
        setTrackers(list);
        setStats({
          totalTracked: list.length,
          activeTracked: list.filter((t) => t.isActive && t.schedule.enabled).length,
          totalCrawls: list.reduce((s, t) => s + t.stats.totalCrawls, 0),
          totalChanges: list.reduce((s, t) => s + t.stats.totalChanges, 0),
          pendingChanges: list.reduce((s, t) => s + t.pendingChanges, 0),
          lastCrawlAt:
            list
              .flatMap((t) => (t.schedule.lastRun ? [t.schedule.lastRun] : []))
              .sort()
              .pop() || null,
        });
      }
    } catch {
      setError('Failed to load trackers');
    } finally {
      setLoadingTrackers(false);
    }
  }, [selectedClientId]);

  const loadDetail = async (evolutionId: string) => {
    if (detailMap[evolutionId]) return;
    setLoadingDetail(evolutionId);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${evolutionId}`);
      const data = await res.json();
      if (data.success) setDetailMap((prev) => ({ ...prev, [evolutionId]: data.data }));
    } catch {
      /* ignore */
    } finally {
      setLoadingDetail(null);
    }
  };

  const flash = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(msg);
      setTimeout(() => setError(''), 6000);
    }
  };

  const invalidateDetail = (evolutionId: string) =>
    setDetailMap((prev) => {
      const c = { ...prev };
      delete c[evolutionId];
      return c;
    });

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return flash('Please enter a URL', 'error');
    if (!selectedClientId) return flash('Please select a widget first', 'error');
    setAddingUrl(true);
    try {
      const res = await apiFetch('/api/knowledge-evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, sourceUrl: newUrl.trim(), intervalDays: newInterval }),
      });
      const data = await res.json();
      if (data.success) {
        flash('URL tracking added', 'success');
        setNewUrl('');
        setShowAddForm(false);
        await loadTrackers();
      } else flash(data.error || 'Failed to add URL', 'error');
    } catch {
      flash('Network error', 'error');
    } finally {
      setAddingUrl(false);
    }
  };

  const handleCrawlNow = async (evolutionId: string) => {
    setCrawlingId(evolutionId);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${evolutionId}/crawl`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const { crawlStatus, newChanges } = data.data;
        flash(
          crawlStatus === 'success'
            ? `Crawl complete — ${newChanges} new change(s) detected`
            : crawlStatus === 'no_change'
              ? 'No changes detected'
              : 'Crawl failed',
          crawlStatus === 'failed' ? 'error' : 'success'
        );
        invalidateDetail(evolutionId);
        await loadTrackers();
      } else flash(data.error || 'Crawl failed', 'error');
    } catch {
      flash('Crawl request failed', 'error');
    } finally {
      setCrawlingId(null);
    }
  };

  const handleToggleSchedule = async (tracker: TrackerSummary) => {
    setTogglingId(tracker.evolutionId);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${tracker.evolutionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !tracker.schedule.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        flash(`Auto-crawl ${!tracker.schedule.enabled ? 'enabled' : 'paused'}`, 'success');
        await loadTrackers();
      } else flash(data.error || 'Update failed', 'error');
    } catch {
      flash('Network error', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (evolutionId: string) => {
    setDeletingId(evolutionId);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${evolutionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        flash('URL tracking removed', 'success');
        invalidateDetail(evolutionId);
        if (expandedId === evolutionId) setExpandedId(null);
        await loadTrackers();
      } else flash(data.error || 'Delete failed', 'error');
    } catch {
      flash('Network error', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApplyChange = async (evolutionId: string, changeIndex: number) => {
    setApplyingId(`${evolutionId}-${changeIndex}`);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${evolutionId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeIndex }),
      });
      const data = await res.json();
      if (data.success) {
        flash('Change applied to knowledge base', 'success');
        invalidateDetail(evolutionId);
        await loadTrackers();
        setTimeout(() => loadDetail(evolutionId), 400);
      } else flash(data.error || 'Apply failed', 'error');
    } catch {
      flash('Network error', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const handleApplyAll = async (evolutionId: string) => {
    setApplyingId(`${evolutionId}-all`);
    try {
      const res = await apiFetch(`/api/knowledge-evolution/${evolutionId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        flash(`${data.data?.applied || 0} change(s) applied to knowledge base`, 'success');
        invalidateDetail(evolutionId);
        await loadTrackers();
        setTimeout(() => loadDetail(evolutionId), 400);
      } else flash(data.error || 'Apply all failed', 'error');
    } catch {
      flash('Network error', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const toggleExpand = async (evolutionId: string) => {
    if (expandedId === evolutionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(evolutionId);
    await loadDetail(evolutionId);
  };

  const selectedClient = clients.find((c) => c.clientId === selectedClientId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <motion.div {...fadeUp}>
        <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Intelligence
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg,rgba(16,185,129,.15),rgba(6,182,212,.25))',
                color: '#10B981',
              }}
            >
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>
                Knowledge Evolution
              </h1>
              <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
                Track URL changes and auto-update your AI knowledge base
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg,#10B981,#059669)',
              boxShadow: '0 4px 12px rgba(16,185,129,.35)',
            }}
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? 'Cancel' : 'Track URL'}
          </motion.button>
        </div>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium"
            style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', color: '#EF4444' }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium"
            style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', color: '#10B981' }}
          >
            <Check className="h-3.5 w-3.5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Selector */}
      <motion.div {...fadeUp}>
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'rgba(99,102,241,.1)', color: '#6366F1' }}
            >
              <Search className="h-3.5 w-3.5" />
            </div>
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Filter by Widget</p>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200/80 bg-transparent px-3 py-1.5 text-[13px] text-gray-800 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:text-white"
            >
              <option value="">All widgets</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.username} — {c.clientId}
                </option>
              ))}
            </select>
            {selectedClient?.website && (
              <a
                href={selectedClient.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
              >
                <Link2 className="h-3 w-3" />
                {truncUrl(selectedClient.website, 40)}
              </a>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Add URL Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-5">
              <p className={`${syne.className} mb-4 text-[15px] font-bold text-gray-900 dark:text-white`}>
                Add URL to Track
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                    URL to Monitor
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                    <input
                      type="url"
                      placeholder="https://yoursite.com/about"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                      className="flex-1 rounded-lg border border-gray-200/80 bg-transparent px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-400 dark:border-white/[0.08] dark:text-white"
                    />
                    {selectedClient?.website && (
                      <button
                        type="button"
                        onClick={() => setNewUrl(selectedClient.website)}
                        className="shrink-0 rounded-lg border border-gray-200/70 px-2.5 py-2 text-[11px] text-gray-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/[0.08]"
                      >
                        Use widget URL
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                    Crawl Schedule
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVALS.map((iv) => (
                      <button
                        key={iv.days}
                        type="button"
                        onClick={() => setNewInterval(iv.days)}
                        className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all"
                        style={
                          newInterval === iv.days
                            ? { background: 'rgba(16,185,129,.1)', borderColor: '#10B981', color: '#10B981' }
                            : { borderColor: 'rgba(107,114,128,.2)', color: '#6B7280' }
                        }
                      >
                        {iv.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-lg border border-gray-200/70 px-4 py-2 text-[13px] font-medium text-gray-500 hover:border-gray-300 dark:border-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleAddUrl}
                    disabled={addingUrl}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                  >
                    {addingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add Tracking
                  </motion.button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Stats */}
      {stats && (
        <motion.div {...fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="URLs Tracked" value={stats.totalTracked} color="#6366F1" icon={Globe} />
          <StatCard label="Auto-Active" value={stats.activeTracked} color="#10B981" icon={Activity} />
          <StatCard label="Total Crawls" value={stats.totalCrawls} color="#3B82F6" icon={RefreshCw} />
          <StatCard label="Changes Found" value={stats.totalChanges} color="#F59E0B" icon={ArrowUpDown} />
          <StatCard label="Pending Apply" value={stats.pendingChanges} color="#EF4444" icon={Zap} />
          <StatCard
            label="Last Crawl"
            value={stats.lastCrawlAt ? fmtRelative(stats.lastCrawlAt) : '—'}
            color="#8B5CF6"
            icon={Clock}
          />
        </motion.div>
      )}

      {/* Tracker List */}
      {loadingTrackers ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {trackers.length === 0 ? (
            <motion.div variants={staggerItem}>
              <GlassCard className="p-12 text-center">
                <Database className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">No URLs tracked yet</p>
                <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  Add a URL to start monitoring content changes and keep your knowledge base current.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAddForm(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                >
                  <Plus className="h-4 w-4" />
                  Track Your First URL
                </motion.button>
              </GlassCard>
            </motion.div>
          ) : (
            trackers.map((tracker) => {
              const detail = detailMap[tracker.evolutionId];
              const isExpanded = expandedId === tracker.evolutionId;
              const isCrawling = crawlingId === tracker.evolutionId;
              const isDeleting = deletingId === tracker.evolutionId;
              const isToggling = togglingId === tracker.evolutionId;
              const isApplyingAll = applyingId === `${tracker.evolutionId}-all`;
              const pendingChanges = detail?.changes.filter((c) => !c.applied) ?? [];

              return (
                <motion.div key={tracker.evolutionId} variants={staggerItem}>
                  <GlassCard>
                    <div className="p-5">
                      {/* Top row */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: tracker.isActive
                                ? 'linear-gradient(135deg,rgba(16,185,129,.1),rgba(16,185,129,.2))'
                                : 'rgba(107,114,128,.1)',
                              color: tracker.isActive ? '#10B981' : '#6B7280',
                            }}
                          >
                            <Globe className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={tracker.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-sm truncate text-[13px] font-semibold text-gray-900 hover:underline dark:text-white"
                              >
                                {truncUrl(tracker.sourceUrl, 65)}
                              </a>
                              <StatusBadge status={tracker.lastCrawlStatus} />
                              {!tracker.schedule.enabled && (
                                <Bdg color="#6B7280" bg="rgba(107,114,128,.08)">
                                  <Pause className="h-2.5 w-2.5" />
                                  Paused
                                </Bdg>
                              )}
                              {tracker.pendingChanges > 0 && (
                                <Bdg color="#F59E0B" bg="rgba(245,158,11,.08)">
                                  <Zap className="h-2.5 w-2.5" />
                                  {tracker.pendingChanges} pending
                                </Bdg>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last crawl: {fmtRelative(tracker.schedule.lastRun)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Next: {fmtDate(tracker.schedule.nextRun)}
                              </span>
                              <span>{tracker.stats.totalCrawls} crawls</span>
                              <span>{tracker.stats.totalChanges} changes</span>
                              {tracker.stats.avgChangesPerCrawl > 0 && (
                                <span>~{tracker.stats.avgChangesPerCrawl}/crawl avg</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCrawlNow(tracker.evolutionId)}
                            disabled={isCrawling}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/60 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/[0.06]"
                          >
                            {isCrawling ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            {isCrawling ? 'Crawling…' : 'Crawl Now'}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleSchedule(tracker)}
                            disabled={isToggling}
                            title={tracker.schedule.enabled ? 'Pause auto-crawl' : 'Resume auto-crawl'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/60 text-gray-500 hover:border-amber-300 hover:text-amber-500 disabled:opacity-50 dark:border-white/[0.08] dark:text-gray-400"
                          >
                            {isToggling ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : tracker.schedule.enabled ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(tracker.evolutionId)}
                            disabled={isDeleting}
                            title="Remove tracking"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200/60 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 dark:border-white/[0.08]"
                          >
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </motion.button>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      {(tracker.totalChanges > 0 || tracker.stats.totalCrawls > 0) && (
                        <button
                          onClick={() => toggleExpand(tracker.evolutionId)}
                          className="mt-3 flex items-center gap-1 text-[12px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {isExpanded
                            ? 'Hide details'
                            : `View details (${tracker.totalChanges} changes, ${tracker.stats.totalCrawls} crawls)`}
                        </button>
                      )}
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 p-5 dark:border-white/[0.04]">
                            {loadingDetail === tracker.evolutionId ? (
                              <div className="flex h-20 items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                              </div>
                            ) : detail ? (
                              <div className="space-y-6">
                                {/* Change History */}
                                {detail.changes.length > 0 && (
                                  <div>
                                    <div className="mb-3 flex items-center justify-between">
                                      <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                                        Change History ({detail.changes.length})
                                      </h3>
                                      {pendingChanges.length > 0 && (
                                        <motion.button
                                          whileHover={{ scale: 1.03 }}
                                          whileTap={{ scale: 0.97 }}
                                          onClick={() => handleApplyAll(tracker.evolutionId)}
                                          disabled={isApplyingAll}
                                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                                          style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}
                                        >
                                          {isApplyingAll ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <CheckCheck className="h-3 w-3" />
                                          )}
                                          Apply All ({pendingChanges.length})
                                        </motion.button>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      {detail.changes
                                        .slice()
                                        .reverse()
                                        .map((change) => {
                                          const isApplying = applyingId === `${tracker.evolutionId}-${change.index}`;
                                          return (
                                            <div
                                              key={change.id}
                                              className="rounded-xl border p-4 transition-all"
                                              style={{
                                                background: change.applied ? 'rgba(16,185,129,.03)' : 'rgba(0,0,0,.01)',
                                                borderColor: change.applied
                                                  ? 'rgba(16,185,129,.12)'
                                                  : 'rgba(107,114,128,.1)',
                                              }}
                                            >
                                              <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <ChangeBadge type={change.type} />
                                                  <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                                                    {change.summary}
                                                  </span>
                                                  <span className="text-[11px] text-gray-400">
                                                    {fmtRelative(change.detectedAt)}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  {change.applied ? (
                                                    <Bdg color="#10B981" bg="rgba(16,185,129,.08)">
                                                      <Check className="h-2.5 w-2.5" />
                                                      Applied
                                                    </Bdg>
                                                  ) : (
                                                    <motion.button
                                                      whileHover={{ scale: 1.03 }}
                                                      whileTap={{ scale: 0.97 }}
                                                      onClick={() =>
                                                        handleApplyChange(tracker.evolutionId, change.index)
                                                      }
                                                      disabled={!!applyingId}
                                                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300/50 px-2.5 py-1 text-[11px] font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/20 dark:hover:bg-violet-500/[0.06]"
                                                    >
                                                      {isApplying ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        <Database className="h-3 w-3" />
                                                      )}
                                                      Apply to KB
                                                    </motion.button>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Diff snippets */}
                                              {(change.oldSnippet || change.newSnippet) && (
                                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                  {change.oldSnippet && (
                                                    <div
                                                      className="rounded-lg p-3"
                                                      style={{
                                                        background: 'rgba(239,68,68,.04)',
                                                        border: '1px solid rgba(239,68,68,.1)',
                                                      }}
                                                    >
                                                      <p className="mb-1.5 text-[10px] font-bold tracking-widest text-red-400 uppercase">
                                                        Before
                                                      </p>
                                                      <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                                                        {change.oldSnippet.slice(0, 320)}
                                                        {change.oldSnippet.length > 320 ? '…' : ''}
                                                      </p>
                                                    </div>
                                                  )}
                                                  {change.newSnippet && (
                                                    <div
                                                      className="rounded-lg p-3"
                                                      style={{
                                                        background: 'rgba(16,185,129,.04)',
                                                        border: '1px solid rgba(16,185,129,.1)',
                                                      }}
                                                    >
                                                      <p className="mb-1.5 text-[10px] font-bold tracking-widest text-emerald-500 uppercase">
                                                        After
                                                      </p>
                                                      <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                                                        {change.newSnippet.slice(0, 320)}
                                                        {change.newSnippet.length > 320 ? '…' : ''}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}

                                {/* Activity Log */}
                                {detail.crawlHistory.length > 0 && (
                                  <div>
                                    <h3 className="mb-3 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                                      Activity Log (last {Math.min(detail.crawlHistory.length, 15)} crawls)
                                    </h3>
                                    <div className="space-y-1">
                                      {detail.crawlHistory
                                        .slice()
                                        .reverse()
                                        .slice(0, 15)
                                        .map((entry, i) => {
                                          const statusColor =
                                            entry.status === 'success'
                                              ? '#10B981'
                                              : entry.status === 'failed'
                                                ? '#EF4444'
                                                : '#6B7280';
                                          return (
                                            <div
                                              key={i}
                                              className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-[11px]"
                                              style={{ background: 'rgba(0,0,0,.015)' }}
                                            >
                                              <span
                                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                                style={{ background: statusColor }}
                                              />
                                              <span className="text-gray-400">{fmtDate(entry.crawledAt)}</span>
                                              <StatusBadge status={entry.status} />
                                              {entry.wordCount > 0 && (
                                                <span className="text-gray-400">
                                                  {entry.wordCount.toLocaleString()} words
                                                </span>
                                              )}
                                              {entry.error && <span className="text-red-400">{entry.error}</span>}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}
    </div>
  );
}
