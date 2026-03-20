'use client';

import { useState, useEffect } from 'react';
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
  ArrowRight,
  Loader2,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

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

interface Evolution {
  id: string;
  clientId: string;
  crawlUrl: string;
  status: string;
  pagesScanned: number;
  addedChunks: number;
  removedChunks: number;
  modifiedChunks: number;
  autoApplied: boolean;
  error: string | null;
  diffsCount: number;
  diffs?: Array<{
    type: 'added' | 'removed' | 'modified';
    chunkTitle: string;
    oldContent?: string;
    newContent?: string;
    similarity?: number;
  }>;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: 'rgba(16,185,129,0.08)', color: '#10B981', label: 'Completed' },
    failed: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', label: 'Failed' },
    crawling: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', label: 'Crawling' },
    diffing: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', label: 'Diffing' },
    applying: { bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6', label: 'Applying' },
    pending: { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', label: 'Pending' },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}20` }}
    >
      {c.label}
    </span>
  );
}

function DiffBadge({ type }: { type: string }) {
  const config: Record<string, { icon: typeof Plus; bg: string; color: string }> = {
    added: { icon: Plus, bg: 'rgba(16,185,129,0.08)', color: '#10B981' },
    removed: { icon: Minus, bg: 'rgba(239,68,68,0.08)', color: '#EF4444' },
    modified: { icon: Pencil, bg: 'rgba(245,158,11,0.08)', color: '#F59E0B' },
  };
  const c = config[type] || config.modified;
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
      style={{ background: c.bg, color: c.color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {type}
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

export default function KnowledgeEvolutionPage() {
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEvolutions();
  }, []);

  const fetchEvolutions = async () => {
    try {
      const res = await fetch('/api/knowledge/evolution?limit=50');
      const data = await res.json();
      if (data.success) {
        setEvolutions(data.data.evolutions || []);
      }
    } catch {
      // No data yet
    } finally {
      setLoading(false);
    }
  };

  const triggerEvolution = async (clientId: string) => {
    setTriggering(clientId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/knowledge/evolution/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApply: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Re-crawl triggered for ${clientId}: ${data.data.diffsCount} diffs found`);
        await fetchEvolutions();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to trigger re-crawl');
        setTimeout(() => setError(''), 5000);
      }
    } catch {
      setError('Failed to trigger re-crawl');
      setTimeout(() => setError(''), 5000);
    } finally {
      setTriggering(null);
    }
  };

  const loadDiffs = async (evoId: string, clientId: string) => {
    if (expandedId === evoId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(evoId);

    // Load full diffs from client-specific endpoint
    try {
      const res = await fetch(`/api/knowledge/evolution/${clientId}`);
      const data = await res.json();
      if (data.success) {
        const fullEvo = data.data.evolutions.find((e: Evolution) => e.id === evoId);
        if (fullEvo) {
          setEvolutions((prev) => prev.map((e) => (e.id === evoId ? { ...e, diffs: fullEvo.diffs } : e)));
        }
      }
    } catch {
      // Keep collapsed
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <motion.div {...fadeUp}>
        <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Intelligence
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.25))',
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
                Track how your AI knowledge base evolves over time
              </p>
            </div>
          </div>
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
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}
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
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10B981' }}
          >
            <Check className="h-3.5 w-3.5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      {evolutions.length > 0 && (
        <motion.div {...fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total Crawls',
              value: evolutions.length,
              color: '#3B82F6',
            },
            {
              label: 'Chunks Added',
              value: evolutions.reduce((s, e) => s + e.addedChunks, 0),
              color: '#10B981',
            },
            {
              label: 'Chunks Modified',
              value: evolutions.reduce((s, e) => s + e.modifiedChunks, 0),
              color: '#F59E0B',
            },
            {
              label: 'Chunks Removed',
              value: evolutions.reduce((s, e) => s + e.removedChunks, 0),
              color: '#EF4444',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200/60 bg-white p-4 dark:border-white/[0.06] dark:bg-[#111118]"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Evolution Timeline */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
        {evolutions.length === 0 ? (
          <motion.div
            variants={staggerItem}
            className="rounded-2xl border border-gray-200/60 bg-white p-12 text-center dark:border-white/[0.06] dark:bg-[#111118]"
          >
            <RefreshCw className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">No evolutions yet</p>
            <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
              Knowledge evolutions are created when the system re-crawls client websites to detect changes.
            </p>
          </motion.div>
        ) : (
          evolutions.map((evo) => (
            <motion.div
              key={evo.id}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all dark:border-white/[0.06] dark:bg-[#111118]"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.2))',
                        color: '#10B981',
                      }}
                    >
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{evo.clientId}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{evo.crawlUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={evo.status} />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => triggerEvolution(evo.clientId)}
                      disabled={triggering === evo.clientId}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200/60 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/[0.06]"
                    >
                      {triggering === evo.clientId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Re-crawl
                    </motion.button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(evo.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>{evo.pagesScanned} pages scanned</span>
                  {evo.addedChunks > 0 && <span className="text-emerald-600">+{evo.addedChunks} added</span>}
                  {evo.modifiedChunks > 0 && <span className="text-amber-600">{evo.modifiedChunks} modified</span>}
                  {evo.removedChunks > 0 && <span className="text-red-500">-{evo.removedChunks} removed</span>}
                  {evo.autoApplied && (
                    <span className="flex items-center gap-1 text-violet-600">
                      <Check className="h-3 w-3" /> Auto-applied
                    </span>
                  )}
                </div>

                {/* Error */}
                {evo.error && (
                  <div
                    className="mt-3 rounded-lg px-3 py-2 text-[11px] text-red-600"
                    style={{ background: 'rgba(239,68,68,0.06)' }}
                  >
                    {evo.error}
                  </div>
                )}

                {/* Expand diffs */}
                {evo.diffsCount > 0 && (
                  <button
                    onClick={() => loadDiffs(evo.id, evo.clientId)}
                    className="mt-3 flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {expandedId === evo.id ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {evo.diffsCount} changes detected
                  </button>
                )}

                {/* Diffs list */}
                <AnimatePresence>
                  {expandedId === evo.id && evo.diffs && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {evo.diffs.map((diff, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-gray-100 p-3 dark:border-white/[0.04]"
                          style={{ background: 'rgba(0,0,0,0.01)' }}
                        >
                          <div className="flex items-center gap-2">
                            <DiffBadge type={diff.type} />
                            <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                              {diff.chunkTitle}
                            </span>
                            {diff.similarity !== undefined && (
                              <span className="text-[10px] text-gray-400">
                                {Math.round(diff.similarity * 100)}% similar
                              </span>
                            )}
                          </div>
                          {diff.type === 'modified' && diff.oldContent && diff.newContent && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="rounded-md bg-red-50/50 p-2 text-[11px] text-gray-600 dark:bg-red-500/[0.04] dark:text-gray-400">
                                <p className="mb-1 text-[10px] font-semibold text-red-500 uppercase">Before</p>
                                {diff.oldContent.slice(0, 200)}...
                              </div>
                              <div className="rounded-md bg-emerald-50/50 p-2 text-[11px] text-gray-600 dark:bg-emerald-500/[0.04] dark:text-gray-400">
                                <p className="mb-1 text-[10px] font-semibold text-emerald-600 uppercase">After</p>
                                {diff.newContent.slice(0, 200)}...
                              </div>
                            </div>
                          )}
                          {diff.type === 'added' && diff.newContent && (
                            <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                              {diff.newContent.slice(0, 200)}...
                            </p>
                          )}
                          {diff.type === 'removed' && diff.oldContent && (
                            <p className="mt-1.5 text-[11px] text-gray-500 line-through dark:text-gray-400">
                              {diff.oldContent.slice(0, 200)}...
                            </p>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
