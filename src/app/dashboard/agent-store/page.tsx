'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Search,
  Filter,
  Star,
  Download,
  Plus,
  Loader2,
  MessageSquare,
  Sparkles,
  Shield,
  Calendar,
  Headphones,
  CreditCard,
  BookOpen,
  Wrench,
  Send,
} from 'lucide-react';

interface Agent {
  _id: string;
  name: string;
  description: string;
  niche: string;
  category: string;
  rating: number;
  reviewCount: number;
  installs: number;
  author: string;
  version: string;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'sales', label: 'Sales', icon: Send },
  { value: 'support', label: 'Support', icon: Headphones },
  { value: 'billing', label: 'Billing', icon: CreditCard },
  { value: 'booking', label: 'Booking', icon: Calendar },
  { value: 'custom', label: 'Custom', icon: Wrench },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'most_installs', label: 'Most Installs' },
];

export default function AgentStorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [installing, setInstalling] = useState<string | null>(null);
  const [tab, setTab] = useState<'browse' | 'submit' | 'review'>('browse');

  // Submit form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('sales');
  const [formNiche, setFormNiche] = useState('');
  const [formTags, setFormTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review form
  const [reviewAgentId, setReviewAgentId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ sort });
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/agent-store?${params}`);
      const data = await res.json();
      if (data.success) {
        setAgents(data.data.agents || []);
      } else {
        setError(data.error || 'Failed to load agents');
      }
    } catch {
      setError('Failed to load agents');
    }
    setLoading(false);
  }, [category, sort, search]);

  useEffect(() => {
    if (tab === 'browse') fetchAgents();
  }, [tab, fetchAgents]);

  const handleInstall = async (agentId: string) => {
    setInstalling(agentId);
    setError('');
    try {
      const res = await fetch(`/api/agent-store/${agentId}/install`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Agent installed successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchAgents();
      } else {
        setError(data.error || 'Install failed');
      }
    } catch {
      setError('Install failed');
    }
    setInstalling(null);
  };

  const handleSubmitAgent = async () => {
    if (!formName || !formDesc || !formCategory) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/agent-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          category: formCategory,
          niche: formNiche,
          tags: formTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormName('');
        setFormDesc('');
        setFormNiche('');
        setFormTags('');
        setSuccess('Agent submitted for review!');
        setTimeout(() => setSuccess(''), 3000);
        setTab('browse');
      } else {
        setError(data.error || 'Submit failed');
      }
    } catch {
      setError('Submit failed');
    }
    setSubmitting(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewAgentId || !reviewText) return;
    setReviewSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/agent-store/${reviewAgentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, text: reviewText }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewAgentId('');
        setReviewText('');
        setReviewRating(5);
        setSuccess('Review submitted!');
        setTimeout(() => setSuccess(''), 3000);
        setTab('browse');
        fetchAgents();
      } else {
        setError(data.error || 'Review failed');
      }
    } catch {
      setError('Review failed');
    }
    setReviewSubmitting(false);
  };

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found ? found.icon : Bot;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 flex items-center gap-3">
            <Bot className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Agent Store</h1>
          </div>
          <p className="text-sm text-gray-400">Discover and install pre-built AI agents for your business</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(
            [
              { key: 'browse', label: 'Browse Agents' },
              { key: 'submit', label: 'Submit Agent' },
              { key: 'review', label: 'Write Review' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as 'browse' | 'submit' | 'review')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tab === key ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            {success}
          </motion.div>
        )}

        {/* Browse Tab */}
        {tab === 'browse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pr-4 pl-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#0a0a0f]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      category === cat.value
                        ? 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
                        : 'border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Agent Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : agents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Bot className="mb-3 h-12 w-12 text-gray-600" />
                <p className="text-sm text-gray-400">No agents found</p>
              </motion.div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent, index) => {
                  const CategoryIcon = getCategoryIcon(agent.category);
                  return (
                    <motion.div
                      key={agent._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur transition-all hover:border-blue-500/30 hover:bg-white/[0.05]"
                    >
                      {/* Icon + Category */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                          <CategoryIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="rounded-full border border-white/[0.06] bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-500 capitalize">
                          {agent.category}
                        </span>
                      </div>

                      <h3 className="mb-1 text-sm font-semibold text-white">{agent.name}</h3>
                      <p className="mb-3 line-clamp-2 text-xs text-gray-500">{agent.description}</p>

                      {/* Tags */}
                      {agent.tags && agent.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {agent.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-gray-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            {agent.rating?.toFixed(1) || '0.0'}
                            <span className="text-gray-600">({agent.reviewCount || 0})</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {agent.installs || 0}
                          </span>
                        </div>
                        <span className="text-gray-600">by {agent.author || 'WinBix'}</span>
                      </div>

                      {agent.niche && (
                        <div className="mb-3 text-[10px] text-gray-600 capitalize">{agent.niche.replace('_', ' ')}</div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInstall(agent._id)}
                          disabled={installing === agent._id}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                        >
                          {installing === agent._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Install
                        </button>
                        <button
                          onClick={() => {
                            setReviewAgentId(agent._id);
                            setTab('review');
                          }}
                          className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Submit Agent Tab */}
        {tab === 'submit' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Plus className="h-5 w-5 text-blue-400" /> Submit New Agent
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Agent Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="My Sales Agent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value} className="bg-[#0a0a0f]">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Niche (optional)</label>
                  <input
                    value={formNiche}
                    onChange={(e) => setFormNiche(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="dental, beauty, etc."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tags (comma separated)</label>
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="lead-gen, follow-up, multilingual"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">Description</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  placeholder="Describe what your agent does..."
                />
              </div>

              <button
                onClick={handleSubmitAgent}
                disabled={submitting || !formName || !formDesc}
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-6 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Write Review Tab */}
        {tab === 'review' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <MessageSquare className="h-5 w-5 text-blue-400" /> Write a Review
              </h3>

              {!reviewAgentId && agents.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Select Agent</label>
                  <select
                    value={reviewAgentId}
                    onChange={(e) => setReviewAgentId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="" className="bg-[#0a0a0f]">
                      Choose an agent...
                    </option>
                    {agents.map((a) => (
                      <option key={a._id} value={a._id} className="bg-[#0a0a0f]">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reviewAgentId && (
                <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 px-3 py-2 text-xs text-blue-400">
                  Reviewing: {agents.find((a) => a._id === reviewAgentId)?.name || reviewAgentId}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-gray-400">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setReviewRating(star)} className="transition-colors">
                      <Star
                        className={`h-6 w-6 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-400">{reviewRating}/5</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">Review</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                  placeholder="Share your experience with this agent..."
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || !reviewAgentId || !reviewText}
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-6 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
              >
                {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
