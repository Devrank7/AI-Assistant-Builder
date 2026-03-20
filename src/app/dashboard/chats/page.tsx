'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge } from '@/components/ui';
import { AnimatedNumber } from '@/components/ui/motion';
import {
  MessageSquare,
  Plus,
  Search,
  Paintbrush,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Rocket,
  Clock,
  Wrench,
  Bot,
  Brain,
  Database,
  Layers,
  BookOpen,
  Lightbulb,
  LayoutGrid,
  List,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Types ── */
interface ChatSession {
  _id: string;
  widgetName: string | null;
  status: string;
  clientId: string | null;
  currentStage: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
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

/* ── Stage configuration ── */
const STAGE_CONFIG: Record<
  string,
  { icon: typeof MessageSquare; label: string; color: string; bg: string; border: string; glow: string }
> = {
  deploy: {
    icon: CheckCircle2,
    label: 'Deployed',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.12)',
    glow: 'rgba(16,185,129,0.08)',
  },
  workspace: {
    icon: Layers,
    label: 'Workspace',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.12)',
    glow: 'rgba(16,185,129,0.08)',
  },
  design: {
    icon: Paintbrush,
    label: 'Design phase',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.12)',
    glow: 'rgba(139,92,246,0.08)',
  },
  analysis: {
    icon: Brain,
    label: 'Analyzing',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.12)',
    glow: 'rgba(59,130,246,0.08)',
  },
  knowledge: {
    icon: Database,
    label: 'Knowledge base',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.12)',
    glow: 'rgba(245,158,11,0.08)',
  },
  input: {
    icon: MessageSquare,
    label: 'Getting started',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.06)',
    border: 'rgba(107,114,128,0.12)',
    glow: 'rgba(107,114,128,0.08)',
  },
  integrations: {
    icon: Layers,
    label: 'Integrations',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.06)',
    border: 'rgba(236,72,153,0.12)',
    glow: 'rgba(236,72,153,0.08)',
  },
  suggestions: {
    icon: Lightbulb,
    label: 'Suggestions',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.12)',
    glow: 'rgba(245,158,11,0.08)',
  },
};

const DEFAULT_STAGE = {
  icon: MessageSquare,
  label: 'In progress',
  color: '#6B7280',
  bg: 'rgba(107,114,128,0.06)',
  border: 'rgba(107,114,128,0.12)',
  glow: 'rgba(107,114,128,0.08)',
};

function getStage(stage: string) {
  return STAGE_CONFIG[stage] || DEFAULT_STAGE;
}

/* ── Stat gradients (matches Overview) ── */
const STAT_GRADIENTS = [
  { from: '#3B82F6', to: '#60A5FA', glow: 'rgba(59,130,246,0.15)' },
  { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.15)' },
  { from: '#F59E0B', to: '#FBBF24', glow: 'rgba(245,158,11,0.15)' },
];

/* ── Helpers ── */
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ═══════════════════════════════════════════════════
   STAT CARD (matching Overview design)
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
      {/* Gradient accent line */}
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
   CHAT SESSION CARD (Grid View)
   ═══════════════════════════════════════════════════ */
function ChatCard({ session, onOpen }: { session: ChatSession; onOpen: (id: string) => void }) {
  const stage = getStage(session.currentStage);
  const StageIcon = stage.icon;
  const isDeployed = session.status === 'deployed';
  const title = session.widgetName || session.preview || 'Untitled Chat';

  return (
    <motion.button
      variants={staggerItem}
      layout
      onClick={() => onOpen(session._id)}
      className="group relative w-full overflow-hidden rounded-2xl border border-gray-200/60 bg-white text-left transition-all duration-300 hover:border-gray-300/80 hover:shadow-lg dark:border-white/[0.06] dark:bg-[#111118] dark:hover:border-white/[0.12] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Gradient accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-50 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${stage.color}, ${stage.color}60)` }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${stage.color}15, ${stage.color}20)`,
                color: stage.color,
                boxShadow: `0 0 0 1px ${stage.color}15`,
              }}
            >
              <StageIcon className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{stage.label}</p>
            </div>
          </div>

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400" />
        </div>

        {/* Preview text */}
        {session.preview && (
          <p className="mb-3 line-clamp-2 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
            {session.preview}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-white/[0.04]">
          <div className="flex items-center gap-3">
            {/* Status beacon */}
            {isDeployed ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                  Live
                </span>
              </div>
            ) : (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                style={{
                  background: stage.bg,
                  color: stage.color,
                  border: `1px solid ${stage.border}`,
                }}
              >
                {session.status === 'building' ? 'Building' : 'In Progress'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {session.messageCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getTimeAgo(session.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════
   CHAT SESSION ROW (List View)
   ═══════════════════════════════════════════════════ */
function ChatRow({ session, onOpen }: { session: ChatSession; onOpen: (id: string) => void }) {
  const stage = getStage(session.currentStage);
  const StageIcon = stage.icon;
  const isDeployed = session.status === 'deployed';
  const title = session.widgetName || session.preview || 'Untitled Chat';

  return (
    <motion.button
      variants={staggerItem}
      layout
      onClick={() => onOpen(session._id)}
      className="group relative flex w-full items-center gap-4 border-b border-gray-100 px-5 py-4 text-left transition-colors last:border-0 hover:bg-gray-50/50 dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
    >
      {/* Left accent on hover */}
      <div
        className="absolute inset-y-2 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: stage.color }}
      />

      {/* Stage icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${stage.color}15, ${stage.color}20)`,
          color: stage.color,
          boxShadow: `0 0 0 1px ${stage.color}15`,
        }}
      >
        <StageIcon className="h-[18px] w-[18px]" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{title}</span>
          {isDeployed ? (
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Live
              </span>
            </div>
          ) : (
            <span
              className="inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wider uppercase"
              style={{
                background: stage.bg,
                color: stage.color,
                border: `1px solid ${stage.border}`,
              }}
            >
              {session.status === 'building' ? 'Building' : 'In Progress'}
            </span>
          )}
        </div>

        {session.preview && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">{session.preview}</p>
        )}

        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
          <span>{stage.label}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>{session.messageCount} messages</span>
          <span className="h-0.5 w-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>{getTimeAgo(session.updatedAt)}</span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400" />
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════
   PREMIUM EMPTY STATE
   ═══════════════════════════════════════════════════ */
function EmptyChats({ filterActive }: { filterActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Bot className="text-text-tertiary h-8 w-8" />
      </div>
      <h3 className="text-text-primary mb-1.5 text-base font-semibold">
        {filterActive ? 'No chats in this category' : 'No active chat sessions'}
      </h3>
      <p className="text-text-secondary max-w-sm text-sm">
        {filterActive
          ? 'Try a different filter to find your conversations.'
          : 'Chat sessions appear when visitors interact with your widgets'}
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETONS
   ═══════════════════════════════════════════════════ */
function SkeletonStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="h-3 w-20 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
              <div className="mt-3 h-9 w-16 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            </div>
            <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            <div className="flex-1">
              <div className="h-4 w-28 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
              <div className="mt-1.5 h-2.5 w-16 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
            </div>
          </div>
          <div className="mb-3 h-8 rounded-lg bg-gray-50 dark:bg-white/[0.02]" />
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-white/[0.04]">
            <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-3 w-24 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
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
          <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
          <div className="flex-1">
            <div className="h-3.5 w-36 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
            <div className="mt-1.5 h-2.5 w-48 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
            <div className="mt-1.5 h-2.5 w-32 rounded-md bg-gray-50 dark:bg-white/[0.02]" />
          </div>
          <div className="h-4 w-4 rounded bg-gray-100 dark:bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function MyChatsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deployed' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetch('/api/builder/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSessions(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deployedCount = sessions.filter((s) => s.status === 'deployed').length;
  const inProgressCount = sessions.filter((s) => s.status !== 'deployed').length;

  const filtered = useMemo(() => {
    let result = sessions;
    if (filter === 'deployed') result = result.filter((s) => s.status === 'deployed');
    if (filter === 'in_progress') result = result.filter((s) => s.status !== 'deployed');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.widgetName || '').toLowerCase().includes(q) ||
          (s.preview || '').toLowerCase().includes(q) ||
          (s.clientId || '').toLowerCase().includes(q) ||
          s.currentStage.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sessions, filter, searchQuery]);

  const handleOpenChat = useCallback(
    (id: string) => {
      router.push(`/dashboard/builder?session=${id}`);
    },
    [router]
  );

  /* Filter tabs config */
  const FILTERS: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: sessions.length },
    { key: 'deployed', label: 'Deployed', count: deployedCount },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Dashboard
          </p>
          <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>My Chats</h1>
          {!loading && sessions.length > 0 && (
            <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} with AI Builder
            </p>
          )}
        </div>

        <Link href="/dashboard/builder">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-violet-500/15 transition-shadow hover:shadow-lg hover:shadow-violet-500/25"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </motion.button>
        </Link>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <SkeletonStats />
          <div className="flex items-center gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            <div className="flex gap-1">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            </div>
          </div>
          {view === 'grid' ? <SkeletonGrid /> : <SkeletonList />}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Stat cards */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Chats"
              numericValue={sessions.length}
              icon={<MessageSquare className="h-5 w-5" />}
              gradientIndex={0}
              loading={false}
            />
            <StatCard
              label="Deployed"
              numericValue={deployedCount}
              icon={<Rocket className="h-5 w-5" />}
              gradientIndex={1}
              loading={false}
            />
            <StatCard
              label="In Progress"
              numericValue={inProgressCount}
              icon={<Wrench className="h-5 w-5" />}
              gradientIndex={2}
              loading={false}
            />
          </motion.div>

          {/* Empty — no sessions at all */}
          {sessions.length === 0 && <EmptyChats filterActive={false} />}

          {/* Sessions exist */}
          {sessions.length > 0 && (
            <>
              {/* Toolbar: Filters + Search + View toggle */}
              <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-gray-200/60 bg-gray-50/50 p-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  {FILTERS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-all duration-200 ${
                        filter === tab.key
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.08] dark:text-white'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                          filter === tab.key
                            ? 'bg-gray-900/[0.06] text-gray-700 dark:bg-white/[0.1] dark:text-gray-300'
                            : 'bg-gray-200/60 text-gray-500 dark:bg-white/[0.06] dark:text-gray-500'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200/60 bg-white pr-4 pl-10 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10 focus:outline-none sm:w-56 dark:border-white/[0.06] dark:bg-[#111118] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-violet-500/30"
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

              {/* No results */}
              {filtered.length === 0 &&
                (searchQuery.trim() ? (
                  <motion.div {...fadeUp} className="flex flex-col items-center py-16 text-center">
                    <Search className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                      No chats matching &ldquo;{searchQuery}&rdquo;
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-[12px] font-medium text-violet-500 hover:text-violet-600 dark:text-violet-400"
                    >
                      Clear search
                    </button>
                  </motion.div>
                ) : (
                  <EmptyChats filterActive={filter !== 'all'} />
                ))}

              {/* Grid / List views */}
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
                    {filtered.map((session) => (
                      <ChatCard key={session._id} session={session} onOpen={handleOpenChat} />
                    ))}
                  </motion.div>
                )}

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
                    {filtered.map((session) => (
                      <ChatRow key={session._id} session={session} onOpen={handleOpenChat} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}
    </div>
  );
}
