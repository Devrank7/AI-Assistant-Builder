'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Search,
  Star,
  Download,
  Plus,
  Loader2,
  MessageSquare,
  Sparkles,
  Shield,
  ShieldCheck,
  Calendar,
  Headphones,
  BookOpen,
  Wrench,
  Send,
  Store,
  Heart,
  X,
  ChevronDown,
  ChevronUp,
  Home,
  Gavel,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
  Share2,
  Flag,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentConfig {
  greeting: string;
  quickReplies: string[];
  tone: string;
  model: string;
  systemPrompt?: string;
}

interface AgentStats {
  installs: number;
  rating: number;
  reviewCount: number;
  activeUsers: number;
}

interface AgentReview {
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Agent {
  _id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  author: { userId: string; name: string; avatar: string };
  version: string;
  tags: string[];
  config: AgentConfig;
  pricing: { type: 'free' | 'premium'; price: number };
  stats: AgentStats;
  reviews: AgentReview[];
  screenshots: string[];
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface ListResponse {
  agents: Agent[];
  featured: Agent[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'All Agents', icon: Sparkles, color: 'blue' },
  { value: 'sales', label: 'Sales', icon: Send, color: 'green' },
  { value: 'support', label: 'Support', icon: Headphones, color: 'cyan' },
  { value: 'booking', label: 'Booking', icon: Calendar, color: 'purple' },
  { value: 'ecommerce', label: 'E-commerce', icon: ShoppingCart, color: 'orange' },
  { value: 'healthcare', label: 'Healthcare', icon: Heart, color: 'red' },
  { value: 'education', label: 'Education', icon: BookOpen, color: 'yellow' },
  { value: 'legal', label: 'Legal', icon: Gavel, color: 'slate' },
  { value: 'real_estate', label: 'Real Estate', icon: Home, color: 'emerald' },
  { value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'amber' },
  { value: 'general', label: 'General', icon: Wrench, color: 'gray' },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'installs', label: 'Most Installed' },
  { value: 'newest', label: 'Newest' },
];

const CATEGORY_COLORS: Record<string, string> = {
  sales: 'text-green-400 bg-green-500/10 border-green-500/20',
  support: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  booking: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  ecommerce: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  healthcare: 'text-red-400 bg-red-500/10 border-red-500/20',
  education: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  legal: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  real_estate: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  restaurant: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  general: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const ICON_COLORS: Record<string, string> = {
  sales: 'bg-green-500/15 text-green-400',
  support: 'bg-cyan-500/15 text-cyan-400',
  booking: 'bg-purple-500/15 text-purple-400',
  ecommerce: 'bg-orange-500/15 text-orange-400',
  healthcare: 'bg-red-500/15 text-red-400',
  education: 'bg-yellow-500/15 text-yellow-400',
  legal: 'bg-slate-500/15 text-slate-300',
  real_estate: 'bg-emerald-500/15 text-emerald-400',
  restaurant: 'bg-amber-500/15 text-amber-400',
  general: 'bg-gray-500/15 text-gray-400',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryIcon(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.icon || Bot;
}

function renderStars(rating: number, size = 'h-3.5 w-3.5') {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`}
        />
      ))}
    </span>
  );
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onInstall,
  onViewDetail,
  installing,
  installedIds,
}: {
  agent: Agent;
  onInstall: (id: string) => void;
  onViewDetail: (agent: Agent) => void;
  installing: string | null;
  installedIds: Set<string>;
}) {
  const CategoryIcon = getCategoryIcon(agent.category);
  const catColor = ICON_COLORS[agent.category] || ICON_COLORS.general;
  const installed = installedIds.has(agent._id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur transition-all duration-200 hover:border-blue-500/20 hover:bg-white/[0.05]"
    >
      {agent.isFeatured && (
        <div className="absolute -top-px left-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
      )}

      {/* Header row */}
      <div className="mb-4 flex items-start justify-between">
        <button
          onClick={() => onViewDetail(agent)}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${catColor} transition-transform group-hover:scale-110`}
        >
          <CategoryIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1.5">
          {agent.isVerified && (
            <span title="Verified by WinBix">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_COLORS[agent.category] || CATEGORY_COLORS.general}`}
          >
            {agent.category.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Name + description */}
      <button className="mb-1 text-left" onClick={() => onViewDetail(agent)}>
        <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-blue-400">{agent.name}</h3>
      </button>
      <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-500">{agent.description}</p>

      {/* Tags */}
      {agent.tags?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {agent.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          {renderStars(agent.stats.rating)}
          <span className="font-medium text-gray-400">{agent.stats.rating.toFixed(1)}</span>
          <span className="text-gray-700">({formatNumber(agent.stats.reviewCount)})</span>
        </span>
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {formatNumber(agent.stats.installs)}
        </span>
      </div>

      {/* Pricing + Author */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${agent.pricing.type === 'free' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}
        >
          {agent.pricing.type === 'free' ? 'Free' : `$${agent.pricing.price}/mo`}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <Users className="h-3 w-3" />
          {agent.author.name}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => !installed && onInstall(agent._id)}
          disabled={installing === agent._id || installed}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            installed
              ? 'cursor-default bg-green-500/10 text-green-400'
              : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50'
          }`}
        >
          {installing === agent._id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : installed ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {installed ? 'Installed' : installing === agent._id ? 'Installing...' : 'Install'}
        </button>
        <button
          onClick={() => onViewDetail(agent)}
          className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function AgentDetailModal({
  agent,
  onClose,
  onInstall,
  installing,
  installedIds,
  onReview,
}: {
  agent: Agent;
  onClose: () => void;
  onInstall: (id: string) => void;
  installing: string | null;
  installedIds: Set<string>;
  onReview: (agent: Agent) => void;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const CategoryIcon = getCategoryIcon(agent.category);
  const catColor = ICON_COLORS[agent.category] || ICON_COLORS.general;
  const installed = installedIds.has(agent._id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] p-5">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${catColor}`}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{agent.name}</h2>
                {agent.isVerified && <ShieldCheck className="h-4 w-4 text-blue-400" />}
                {agent.isFeatured && <Sparkles className="h-4 w-4 text-yellow-400" />}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                <span
                  className={`rounded-full border px-2 py-0.5 capitalize ${CATEGORY_COLORS[agent.category] || CATEGORY_COLORS.general}`}
                >
                  {agent.category.replace('_', ' ')}
                </span>
                <span>v{agent.version}</span>
                <span>by {agent.author.name}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[65vh] overflow-y-auto">
          {/* Stats bar */}
          <div className="grid grid-cols-4 divide-x divide-white/[0.06] border-b border-white/[0.06]">
            {[
              {
                label: 'Rating',
                value: agent.stats.rating.toFixed(1),
                icon: <Star className="h-3 w-3 text-yellow-400" />,
              },
              {
                label: 'Reviews',
                value: formatNumber(agent.stats.reviewCount),
                icon: <MessageSquare className="h-3 w-3 text-blue-400" />,
              },
              {
                label: 'Installs',
                value: formatNumber(agent.stats.installs),
                icon: <Download className="h-3 w-3 text-green-400" />,
              },
              {
                label: 'Active Users',
                value: formatNumber(agent.stats.activeUsers),
                icon: <Users className="h-3 w-3 text-purple-400" />,
              },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center p-3">
                <div className="mb-1 flex items-center gap-1">
                  {stat.icon}
                  <span className="text-sm font-bold text-white">{stat.value}</span>
                </div>
                <span className="text-[10px] text-gray-600">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-5 p-5">
            {/* Description */}
            <div>
              <p className="text-sm leading-relaxed text-gray-400">{agent.longDescription || agent.description}</p>
            </div>

            {/* Tags */}
            {agent.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {agent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-gray-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Greeting */}
            <div>
              <p className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">Greeting Message</p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-gray-300 italic">
                "{agent.config.greeting}"
              </div>
            </div>

            {/* Quick Replies */}
            {agent.config.quickReplies?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">Quick Replies</p>
                <div className="flex flex-wrap gap-2">
                  {agent.config.quickReplies.map((qr) => (
                    <span
                      key={qr}
                      className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-xs text-blue-300"
                    >
                      {qr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* System Prompt (collapsible) */}
            {agent.config.systemPrompt && (
              <div>
                <button
                  onClick={() => setPromptOpen(!promptOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-gray-400 transition-colors hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    System Prompt Preview
                  </span>
                  {promptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <AnimatePresence>
                  {promptOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-4 text-xs leading-relaxed whitespace-pre-wrap text-gray-500">
                        {agent.config.systemPrompt}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Reviews */}
            {agent.reviews && agent.reviews.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                  Reviews ({agent.stats.reviewCount})
                </p>
                <div className="space-y-3">
                  {agent.reviews.slice(0, 5).map((review, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">{review.userName}</span>
                        {renderStars(review.rating, 'h-3 w-3')}
                      </div>
                      <p className="text-xs text-gray-500">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReview(agent)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Review
            </button>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400">
              <Flag className="h-3.5 w-3.5" />
              Report
            </button>
          </div>

          <button
            onClick={() => !installed && onInstall(agent._id)}
            disabled={installing === agent._id || installed}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
              installed
                ? 'cursor-default bg-green-500/10 text-green-400'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50'
            }`}
          >
            {installing === agent._id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : installed ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {installed ? 'Installed' : installing === agent._id ? 'Installing...' : 'Install Agent'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageTab = 'browse' | 'submit' | 'installed';
type ReviewingAgent = Agent | null;

export default function AgentStorePage() {
  // Data state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [featured, setFeatured] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [total, setTotal] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [pricing, setPricing] = useState<'all' | 'free' | 'premium'>('all');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);

  // UI state
  const [tab, setTab] = useState<PageTab>('browse');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [reviewingAgent, setReviewingAgent] = useState<ReviewingAgent>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  // Submit form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    longDescription: '',
    category: 'sales',
    tags: '',
    systemPrompt: '',
    greeting: '',
    quickReplies: '',
    tone: 'professional',
  });
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAgents = useCallback(
    async (resetPage = false) => {
      setLoading(true);
      setError('');
      const p = resetPage ? 1 : page;
      const params = new URLSearchParams({ sort, page: String(p), limit: '20' });
      if (category !== 'all') params.set('category', category);
      if (pricing !== 'all') params.set('pricing', pricing);
      if (search) params.set('search', search);

      let retried = false;
      const attempt = async (): Promise<void> => {
        try {
          const res = await fetch(`/api/agent-store?${params}`);
          if (res.status === 401 && !retried) {
            retried = true;
            await new Promise((r) => setTimeout(r, 600));
            return attempt();
          }
          const data = (await res.json()) as { success: boolean; data?: ListResponse; error?: string };
          if (data.success && data.data) {
            setAgents(data.data.agents || []);
            setFeatured(data.data.featured || []);
            setTotal(data.data.total || 0);
            if (resetPage) setPage(1);
          } else {
            setError(data.error || 'Failed to load agents');
          }
        } catch {
          setError('Failed to load agents. Please try again.');
        }
        setLoading(false);
      };
      await attempt();
    },
    [category, pricing, sort, page, search]
  );

  useEffect(() => {
    if (tab === 'browse') {
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => fetchAgents(true), search ? 400 : 0);
    }
  }, [tab, category, pricing, sort, search, fetchAgents]);

  useEffect(() => {
    if (tab === 'browse' && page > 1) fetchAgents();
  }, [page, tab, fetchAgents]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleInstall = async (agentId: string) => {
    setInstalling(agentId);
    setError('');
    try {
      const res = await fetch(`/api/agent-store/${agentId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setInstalledIds((prev) => new Set([...prev, agentId]));
        setSuccess('Agent installed successfully! Check your Agents section.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Install failed');
      }
    } catch {
      setError('Install failed. Please try again.');
    }
    setInstalling(null);
  };

  const handleSubmitAgent = async () => {
    if (!formData.name || !formData.description || !formData.systemPrompt || !formData.greeting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/agent-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          longDescription: formData.longDescription,
          category: formData.category,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          config: {
            systemPrompt: formData.systemPrompt,
            greeting: formData.greeting,
            quickReplies: formData.quickReplies
              .split('\n')
              .map((t) => t.trim())
              .filter(Boolean),
            tone: formData.tone,
            model: 'gemini',
          },
          pricing: { type: 'free', price: 0 },
        }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setFormData({
          name: '',
          description: '',
          longDescription: '',
          category: 'sales',
          tags: '',
          systemPrompt: '',
          greeting: '',
          quickReplies: '',
          tone: 'professional',
        });
        setSuccess('Agent submitted for review! The WinBix team will review it within 48 hours.');
        setTimeout(() => setSuccess(''), 5000);
        setTab('browse');
      } else {
        setError(data.error || 'Submit failed');
      }
    } catch {
      setError('Submit failed. Please try again.');
    }
    setSubmitting(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewingAgent || reviewComment.trim().length < 10) return;
    setReviewSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/agent-store/${reviewingAgent._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setReviewingAgent(null);
        setReviewComment('');
        setReviewRating(5);
        setSuccess('Review submitted! Thank you for your feedback.');
        setTimeout(() => setSuccess(''), 4000);
        fetchAgents();
      } else {
        setError(data.error || 'Review failed');
      }
    } catch {
      setError('Review failed. Please try again.');
    }
    setReviewSubmitting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080810] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
                <Store className="h-5 w-5 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Agent Store</h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-400">
                {total > 0 ? `${total} agents` : 'Marketplace'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Discover, install, and share pre-built AI agent templates for your business
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {(
              [
                { key: 'browse', label: 'Browse', icon: Store },
                { key: 'submit', label: 'Submit', icon: Plus },
                { key: 'installed', label: 'Installed', icon: CheckCircle },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === 'installed' && installedIds.size > 0 && (
                  <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                    {installedIds.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Global Messages ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button onClick={() => setError('')} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              {success}
              <button onClick={() => setSuccess('')} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BROWSE TAB ── */}
        {tab === 'browse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Search + Sort bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-4 pl-10 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/[0.05]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="cursor-pointer rounded-xl border border-white/[0.06] bg-[#0d0d18] px-3 py-2.5 text-sm text-white outline-none"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#0d0d18]">
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* Pricing filter */}
                <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  {(['all', 'free', 'premium'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPricing(p)}
                      className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${pricing === p ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}
                    >
                      {p === 'all' ? 'All' : p === 'free' ? 'Free' : 'Premium'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                      category === cat.value
                        ? 'border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-lg shadow-blue-500/5'
                        : 'border border-white/[0.05] bg-white/[0.03] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Featured section */}
            {!loading && featured.length > 0 && !search && category === 'all' && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  <h2 className="text-sm font-semibold text-white">Featured Agents</h2>
                </div>
                <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
                  {featured.map((agent) => {
                    const CategoryIcon = getCategoryIcon(agent.category);
                    const catColor = ICON_COLORS[agent.category] || ICON_COLORS.general;
                    const installed = installedIds.has(agent._id);
                    return (
                      <motion.div
                        key={agent._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex w-64 flex-shrink-0 cursor-pointer flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 backdrop-blur transition-all hover:border-blue-500/20"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${catColor}`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div className="flex items-center gap-1">
                            {agent.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />}
                            <span className="rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-medium text-yellow-400">
                              Featured
                            </span>
                          </div>
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-white">{agent.name}</h3>
                        <p className="mb-3 line-clamp-2 flex-1 text-xs text-gray-500">{agent.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-gray-500">
                            {renderStars(agent.stats.rating, 'h-3 w-3')}
                            <span>{agent.stats.rating.toFixed(1)}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              !installed && handleInstall(agent._id);
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              installed
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                            }`}
                          >
                            {installed ? <CheckCircle className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                            {installed ? 'Installed' : 'Install'}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All agents grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-gray-500">Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                  <Bot className="h-8 w-8 text-gray-600" />
                </div>
                <p className="font-medium text-gray-400">No agents found</p>
                <p className="mt-1 text-sm text-gray-600">
                  {search ? `Try different search terms` : `No agents in this category yet`}
                </p>
                {(search || category !== 'all') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setCategory('all');
                    }}
                    className="mt-4 rounded-xl bg-white/[0.06] px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </motion.div>
            ) : (
              <>
                <div className="mb-2 text-xs text-gray-600">
                  Showing {agents.length} of {total} agents
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      onInstall={handleInstall}
                      onViewDetail={setSelectedAgent}
                      installing={installing}
                      installedIds={installedIds}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {total > 20 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {page} of {Math.ceil(total / 20)}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(total / 20)}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── SUBMIT TAB ── */}
        {tab === 'submit' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
              <Plus className="h-5 w-5 text-blue-400" />
              Submit Your Agent to the Store
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              Share your custom AI agent with the WinBix community. Submitted agents are reviewed within 48 hours.
            </p>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Agent Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                    placeholder="My Sales Agent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    className="w-full cursor-pointer rounded-xl border border-white/[0.06] bg-[#0d0d18] px-3 py-2.5 text-sm text-white outline-none"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value} className="bg-[#0d0d18]">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Short Description * (shown in card)
                </label>
                <input
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="What does this agent do? (1-2 sentences)"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Full Description (shown in detail view)
                </label>
                <textarea
                  value={formData.longDescription}
                  onChange={(e) => setFormData((p) => ({ ...p, longDescription: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="Detailed explanation of capabilities, use cases, and what makes this agent unique..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Greeting Message *</label>
                <input
                  value={formData.greeting}
                  onChange={(e) => setFormData((p) => ({ ...p, greeting: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="Hi! I'm here to help with..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  System Prompt * (min 200 words recommended)
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData((p) => ({ ...p, systemPrompt: e.target.value }))}
                  rows={8}
                  className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="You are a professional assistant who... (describe the agent's role, responsibilities, tone, and specific behaviors)"
                />
                <p className="mt-1 text-[10px] text-gray-700">
                  {formData.systemPrompt.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Quick Replies (one per line)</label>
                  <textarea
                    value={formData.quickReplies}
                    onChange={(e) => setFormData((p) => ({ ...p, quickReplies: e.target.value }))}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                    placeholder={'Get a quote\nBook a call\nLearn more'}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Tone</label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData((p) => ({ ...p, tone: e.target.value }))}
                      className="w-full cursor-pointer rounded-xl border border-white/[0.06] bg-[#0d0d18] px-3 py-2.5 text-sm text-white outline-none"
                    >
                      {['professional', 'friendly', 'casual', 'formal', 'consultative'].map((t) => (
                        <option key={t} value={t} className="bg-[#0d0d18] capitalize">
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Tags (comma separated)</label>
                    <input
                      value={formData.tags}
                      onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                      placeholder="lead-gen, follow-up, b2b"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmitAgent}
                disabled={
                  submitting || !formData.name || !formData.description || !formData.systemPrompt || !formData.greeting
                }
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-6 py-2.5 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── INSTALLED TAB ── */}
        {tab === 'installed' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {installedIds.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                  <Download className="h-8 w-8 text-gray-600" />
                </div>
                <p className="font-medium text-gray-400">No agents installed yet</p>
                <p className="mt-1 text-sm text-gray-600">Browse the marketplace and install agents to see them here</p>
                <button
                  onClick={() => setTab('browse')}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500/15 px-5 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/25"
                >
                  <Store className="h-4 w-4" />
                  Browse Agents
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {agents
                  .filter((a) => installedIds.has(a._id))
                  .map((agent) => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      onInstall={handleInstall}
                      onViewDetail={setSelectedAgent}
                      installing={installing}
                      installedIds={installedIds}
                    />
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Agent Detail Modal ── */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onInstall={handleInstall}
            installing={installing}
            installedIds={installedIds}
            onReview={(agent) => {
              setReviewingAgent(agent);
              setSelectedAgent(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Review Modal ── */}
      <AnimatePresence>
        {reviewingAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setReviewingAgent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d14] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  Write a Review
                </h3>
                <button
                  onClick={() => setReviewingAgent(null)}
                  className="rounded-xl p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-blue-500/10 bg-blue-500/5 px-3 py-2 text-sm text-blue-300">
                Reviewing: <span className="font-semibold">{reviewingAgent.name}</span>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium text-gray-400">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-400">{reviewRating}/5</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Your Review * (min 10 characters)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="Share your experience with this agent — what worked well, how you're using it..."
                />
                <p className="mt-1 text-[10px] text-gray-700">{reviewComment.length} characters (min 10)</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReviewingAgent(null)}
                  className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting || reviewComment.trim().length < 10}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500/20 py-2.5 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
                >
                  {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
