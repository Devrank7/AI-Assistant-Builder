'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Button, Badge } from '@/components/ui';
import {
  MessageSquare,
  ExternalLink,
  Settings,
  Trash2,
  Plus,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Copy,
  Check,
  Globe,
  Clock,
  Box,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
interface Widget {
  clientId: string;
  widgetName: string;
  clientType: string;
  createdAt: string;
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

/* ── Color palette per widget type ── */
const TYPE_STYLES = {
  quick: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.12)',
    glow: 'rgba(245,158,11,0.08)',
    color: '#F59E0B',
    label: 'Quick',
    icon: Zap,
  },
  production: {
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.12)',
    glow: 'rgba(59,130,246,0.08)',
    color: '#3B82F6',
    label: 'Production',
    icon: Globe,
  },
} as const;

function getTypeStyle(clientType: string) {
  return clientType === 'quick' ? TYPE_STYLES.quick : TYPE_STYLES.production;
}

/* ── Format date ── */
function fmtDate(d: string) {
  const dt = new Date(d);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: dt.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

/* ── Copy embed code hook ── */
function useCopyEmbed() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = (clientId: string) => {
    const code = `<script src="https://winbixai.com/widgets/${clientId}/script.js"></script>`;
    navigator.clipboard.writeText(code);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };
  return { copiedId, copy };
}

/* ═══════════════════════════════════════════════════
   WIDGET CARD
   ═══════════════════════════════════════════════════ */
function WidgetCard({
  widget,
  onDelete,
  deleting,
  copiedId,
  onCopy,
}: {
  widget: Widget;
  onDelete: (id: string) => void;
  deleting: boolean;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const style = getTypeStyle(widget.clientType);
  const TypeIcon = style.icon;
  const isCopied = copiedId === widget.clientId;

  return (
    <motion.div
      variants={staggerItem}
      layout
      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all duration-300 hover:border-gray-300/80 hover:shadow-lg dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      {/* Gradient accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${style.color}, ${style.color}80)` }}
      />

      {/* Card body */}
      <div className="p-5">
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Type icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${style.color}15, ${style.color}20)`,
                color: style.color,
                boxShadow: `0 0 0 1px ${style.color}15`,
              }}
            >
              <TypeIcon className="h-[18px] w-[18px]" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
                {widget.widgetName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                <Clock className="h-3 w-3" />
                {fmtDate(widget.createdAt)}
              </p>
            </div>
          </div>

          {/* Status & type badges */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`,
              }}
            >
              {style.label}
            </span>
          </div>
        </div>

        {/* Client ID + status row */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 dark:border-white/[0.04] dark:bg-white/[0.02]">
          <code className="flex-1 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {widget.clientId}
          </code>
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(widget.clientId); }}
            className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
            title="Copy embed code"
          >
            {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

        {/* Active status beacon */}
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.04]">
          <Link
            href={`/dashboard/builder?client=${widget.clientId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full gap-1.5 text-[11px]">
              <MessageSquare className="h-3 w-3" />
              Edit
            </Button>
          </Link>
          <a
            href={`/demo/client-website?client=${widget.clientId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full gap-1.5 text-[11px]">
              <ExternalLink className="h-3 w-3" />
              Preview
            </Button>
          </a>
          <a
            href={`/dashboard/playground/${widget.clientId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
          >
            <Button variant="secondary" size="sm" className="w-full gap-1.5 text-[11px]">
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
            disabled={deleting}
            onClick={(e) => { e.stopPropagation(); onDelete(widget.clientId); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   WIDGET LIST ROW
   ═══════════════════════════════════════════════════ */
function WidgetRow({
  widget,
  onDelete,
  deleting,
  copiedId,
  onCopy,
}: {
  widget: Widget;
  onDelete: (id: string) => void;
  deleting: boolean;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const style = getTypeStyle(widget.clientType);
  const TypeIcon = style.icon;
  const isCopied = copiedId === widget.clientId;

  return (
    <motion.div
      variants={staggerItem}
      layout
      className="group relative flex items-center gap-4 border-b border-gray-100 px-5 py-4 transition-colors last:border-0 hover:bg-gray-50/50 dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
    >
      {/* Left accent */}
      <div
        className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: style.color }}
      />

      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${style.color}15, ${style.color}20)`,
          color: style.color,
          boxShadow: `0 0 0 1px ${style.color}15`,
        }}
      >
        <TypeIcon className="h-4 w-4" />
      </div>

      {/* Name + ID */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{widget.widgetName}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-gray-400 dark:text-gray-500">
          <code className="font-mono">{widget.clientId}</code>
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(widget.clientId); }}
            className="ml-1 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
          </button>
        </p>
      </div>

      {/* Type badge */}
      <span
        className="hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex"
        style={{
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
        }}
      >
        {style.label}
      </span>

      {/* Status */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
      </div>

      {/* Date */}
      <span className="hidden text-[11px] text-gray-400 dark:text-gray-500 md:block">
        {fmtDate(widget.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Link href={`/dashboard/builder?client=${widget.clientId}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit in Builder">
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <a
          href={`/demo/client-website?client=${widget.clientId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Preview">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
        <a href={`/dashboard/playground/${widget.clientId}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          disabled={deleting}
          onClick={(e) => { e.stopPropagation(); onDelete(widget.clientId); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   PREMIUM EMPTY STATE
   ═══════════════════════════════════════════════════ */
function EmptyWidgets({ href }: { href: string }) {
  return (
    <motion.div {...fadeUp} className="flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div
          className="absolute -inset-4 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)',
            animation: 'emptyPulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.12)',
            boxShadow: '0 0 24px rgba(59,130,246,0.08)',
          }}
        >
          <span style={{ color: '#3B82F6' }}>
            <Box className="h-7 w-7" />
          </span>
        </div>

        {/* Floating particles */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-blue-400/40"
            style={{
              top: `${20 + i * 25}%`,
              left: i === 1 ? '85%' : `${10 + i * 30}%`,
              animation: `emptyFloat ${2 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <h3 className={`${syne.className} mb-2 text-xl font-bold text-gray-900 dark:text-white`}>
        No widgets yet
      </h3>
      <p className="mb-8 max-w-sm text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
        Create your first AI-powered chat widget and embed it on any website in minutes.
        Our builder handles everything automatically.
      </p>

      <Link href={href}>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-shadow hover:shadow-xl hover:shadow-blue-500/30"
        >
          <Sparkles className="h-4 w-4" />
          Create Your First Widget
        </motion.button>
      </Link>

      <style jsx>{`
        @keyframes emptyPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes emptyFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-8px) scale(1.3); opacity: 0.8; }
        }
      `}</style>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════ */
function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            <div className="flex-1">
              <div className="h-4 w-28 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
              <div className="mt-2 h-2.5 w-16 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
            </div>
          </div>
          <div className="mb-4 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
          <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.04]">
            <div className="h-8 flex-1 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-8 flex-1 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white dark:border-white/[0.06] dark:bg-[#111118]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-0 dark:border-white/[0.04]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          <div className="flex-1">
            <div className="h-3.5 w-32 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
            <div className="mt-1.5 h-2.5 w-44 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
          </div>
          <div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
          <div className="h-5 w-12 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
          <div className="flex gap-1">
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function MyWidgetsPage() {
  const { user } = useAuth();
  const hasPlan = user?.plan && user.plan !== 'none';
  const builderHref = hasPlan ? '/dashboard/builder' : '/plans';
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { copiedId, copy } = useCopyEmbed();

  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/user/widgets');
      const data = await res.json();
      if (data.success && data.data) {
        setWidgets(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this widget? This action cannot be undone.')) {
      return;
    }
    setDeletingId(clientId);
    try {
      const res = await fetch('/api/user/widgets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setWidgets((prev) => prev.filter((w) => w.clientId !== clientId));
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  /* Filter widgets */
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return widgets;
    const q = searchQuery.toLowerCase();
    return widgets.filter(
      (w) =>
        w.widgetName.toLowerCase().includes(q) ||
        w.clientId.toLowerCase().includes(q) ||
        w.clientType.toLowerCase().includes(q)
    );
  }, [widgets, searchQuery]);

  /* Stats */
  const quickCount = widgets.filter((w) => w.clientType === 'quick').length;
  const prodCount = widgets.length - quickCount;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Dashboard
          </p>
          <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>
            My Widgets
          </h1>
          {!loading && widgets.length > 0 && (
            <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
              {quickCount > 0 && prodCount > 0 && (
                <span className="ml-1.5 text-gray-400 dark:text-gray-500">
                  · {prodCount} production · {quickCount} quick
                </span>
              )}
            </p>
          )}
        </div>

        <Link href={builderHref}>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-blue-500/15 transition-shadow hover:shadow-lg hover:shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" />
            New Widget
          </motion.button>
        </Link>
      </motion.div>

      {/* Loading */}
      {loading && (
        <>
          {/* Search bar skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            <div className="flex gap-1">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            </div>
          </div>
          {view === 'grid' ? <SkeletonGrid /> : <SkeletonList />}
        </>
      )}

      {/* Empty state */}
      {!loading && widgets.length === 0 && <EmptyWidgets href={builderHref} />}

      {/* Content */}
      {!loading && widgets.length > 0 && (
        <>
          {/* Toolbar: Search + View toggle */}
          <motion.div
            {...fadeUp}
            className="flex items-center gap-3"
            style={{ animationDelay: '60ms' }}
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200/60 bg-white pl-10 pr-4 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.06] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/30"
              />
            </div>

            {/* View toggle */}
            <div className="flex overflow-hidden rounded-xl border border-gray-200/60 dark:border-white/[0.06]">
              {[
                { id: 'grid' as const, icon: LayoutGrid },
                { id: 'list' as const, icon: List },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`flex h-10 w-10 items-center justify-center transition-colors ${
                    view === v.id
                      ? 'bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-white'
                      : 'bg-white text-gray-400 hover:text-gray-600 dark:bg-[#111118] dark:text-gray-500 dark:hover:text-gray-300'
                  }`}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* No search results */}
          {filtered.length === 0 && searchQuery.trim() && (
            <motion.div {...fadeUp} className="flex flex-col items-center py-16 text-center">
              <Search className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                No widgets matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[12px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                Clear search
              </button>
            </motion.div>
          )}

          {/* Grid view */}
          <AnimatePresence mode="wait">
            {view === 'grid' && filtered.length > 0 && (
              <motion.div
                key="grid"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((widget) => (
                  <WidgetCard
                    key={widget.clientId}
                    widget={widget}
                    onDelete={handleDelete}
                    deleting={deletingId === widget.clientId}
                    copiedId={copiedId}
                    onCopy={copy}
                  />
                ))}
              </motion.div>
            )}

            {/* List view */}
            {view === 'list' && filtered.length > 0 && (
              <motion.div
                key="list"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white dark:border-white/[0.06] dark:bg-[#111118]"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
              >
                {filtered.map((widget) => (
                  <WidgetRow
                    key={widget.clientId}
                    widget={widget}
                    onDelete={handleDelete}
                    deleting={deletingId === widget.clientId}
                    copiedId={copiedId}
                    onCopy={copy}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
