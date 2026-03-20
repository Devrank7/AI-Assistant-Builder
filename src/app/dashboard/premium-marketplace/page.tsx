'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Star,
  Download,
  DollarSign,
  Search,
  Filter,
  Plus,
  TrendingUp,
  ShoppingCart,
  Upload,
  Eye,
  Tag,
  Loader2,
  BarChart3,
} from 'lucide-react';

interface PremiumTemplate {
  _id: string;
  name: string;
  description: string;
  niche: string;
  price: number;
  rating: number;
  reviewCount: number;
  purchases: number;
  previewImages: string[];
  author: string;
  status: string;
  tags: string[];
  createdAt: string;
}

interface Earnings {
  totalEarnings: number;
  templatesSold: number;
  avgRating: number;
  templates: Array<{
    id: string;
    name: string;
    purchases: number;
    revenue: number;
    status: string;
  }>;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const NICHES = [
  'all',
  'dental',
  'beauty',
  'restaurant',
  'real_estate',
  'ecommerce',
  'saas',
  'hotel',
  'fitness',
  'legal',
  'auto',
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];
const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: '0-29', label: '$0 - $29' },
  { value: '30-59', label: '$30 - $59' },
  { value: '60-99', label: '$60 - $99' },
];

export default function PremiumMarketplacePage() {
  const [tab, setTab] = useState<'browse' | 'earnings' | 'submit'>('browse');
  const [templates, setTemplates] = useState<PremiumTemplate[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [niche, setNiche] = useState('all');
  const [sort, setSort] = useState('newest');
  const [priceRange, setPriceRange] = useState('all');
  const [search, setSearch] = useState('');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Submit form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formNiche, setFormNiche] = useState('dental');
  const [formPrice, setFormPrice] = useState('');
  const [formTags, setFormTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ sort });
    if (niche !== 'all') params.set('niche', niche);
    if (search) params.set('search', search);
    if (priceRange !== 'all') params.set('priceRange', priceRange);
    try {
      const res = await fetch(`/api/premium-marketplace?${params}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates || []);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('Failed to load templates');
    }
    setLoading(false);
  }, [niche, sort, search, priceRange]);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch('/api/premium-marketplace/earnings');
      const data = await res.json();
      if (data.success) setEarnings(data.data);
    } catch {
      /* empty */
    }
    setEarningsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'browse') fetchTemplates();
    if (tab === 'earnings') fetchEarnings();
  }, [tab, fetchTemplates, fetchEarnings]);

  const handlePurchase = async (templateId: string) => {
    setPurchasing(templateId);
    try {
      const res = await fetch(`/api/premium-marketplace/${templateId}/purchase`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      } else {
        setError(data.error || 'Purchase failed');
      }
    } catch {
      setError('Purchase failed');
    }
    setPurchasing(null);
  };

  const handleSubmit = async () => {
    if (!formName || !formDesc || !formNiche) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/premium-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          niche: formNiche,
          price: formPrice ? Number(formPrice) : 19,
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
        setFormPrice('');
        setFormTags('');
        setTab('browse');
        fetchTemplates();
      } else {
        setError(data.error || 'Submit failed');
      }
    } catch {
      setError('Submit failed');
    }
    setSubmitting(false);
  };

  const formatPrice = (price: number) => (price === 0 ? 'Free' : `$${price}`);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 flex items-center gap-3">
            <Store className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Premium Marketplace</h1>
          </div>
          <p className="text-sm text-gray-400">Browse, purchase, and sell premium AI chat templates</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['browse', 'earnings', 'submit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              {t === 'browse' ? 'Browse Templates' : t === 'earnings' ? 'My Earnings' : 'Submit Template'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Browse Tab */}
        {tab === 'browse' && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {/* Filters */}
            <motion.div
              variants={item}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur"
            >
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pr-4 pl-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                >
                  {NICHES.map((n) => (
                    <option key={n} value={n} className="bg-[#0a0a0f]">
                      {n === 'all' ? 'All Niches' : n.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                >
                  {PRICE_RANGES.map((p) => (
                    <option key={p.value} value={p.value} className="bg-[#0a0a0f]">
                      {p.label}
                    </option>
                  ))}
                </select>
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
            </motion.div>

            {/* Template Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : templates.length === 0 ? (
              <motion.div variants={item} className="flex flex-col items-center justify-center py-20">
                <Store className="mb-3 h-12 w-12 text-gray-600" />
                <p className="text-gray-400">No templates found</p>
              </motion.div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl, index) => (
                  <motion.div
                    key={tpl._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur transition-all hover:border-blue-500/30 hover:bg-white/[0.05]"
                  >
                    {/* Preview */}
                    <div className="mb-4 flex h-36 items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.03]">
                      {tpl.previewImages?.[0] ? (
                        <img
                          src={tpl.previewImages[0]}
                          alt={tpl.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <Eye className="h-8 w-8 text-gray-600" />
                      )}
                    </div>

                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-white">{tpl.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          tpl.price === 0 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {formatPrice(tpl.price)}
                      </span>
                    </div>

                    <p className="mb-3 line-clamp-2 text-xs text-gray-500">{tpl.description}</p>

                    {/* Tags */}
                    {tpl.tags && tpl.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {tpl.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 rounded bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-gray-500"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {tpl.rating?.toFixed(1) || '0.0'}
                          <span className="text-gray-600">({tpl.reviewCount || 0})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {tpl.purchases || 0}
                        </span>
                      </div>
                      <span className="text-gray-600">by {tpl.author || 'Unknown'}</span>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-600 capitalize">{tpl.niche?.replace('_', ' ')}</div>

                    <button
                      onClick={() => handlePurchase(tpl._id)}
                      disabled={purchasing === tpl._id}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      {purchasing === tpl._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      {tpl.price === 0 ? 'Get Free' : `Buy ${formatPrice(tpl.price)}`}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Earnings Tab */}
        {tab === 'earnings' && (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {earningsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : earnings ? (
              <>
                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: 'Total Earnings',
                      value: `$${earnings.totalEarnings.toFixed(2)}`,
                      icon: DollarSign,
                      color: 'text-green-400',
                    },
                    {
                      label: 'Templates Sold',
                      value: String(earnings.templatesSold),
                      icon: TrendingUp,
                      color: 'text-blue-400',
                    },
                    { label: 'Avg Rating', value: earnings.avgRating.toFixed(1), icon: Star, color: 'text-yellow-400' },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-400">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div className="text-3xl font-bold text-white">{stat.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Revenue Share Bar */}
                <motion.div
                  variants={item}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">Revenue Share</h3>
                    </div>
                    <span className="text-xs text-gray-400">70% Author / 30% Platform</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
                  </div>
                </motion.div>

                {/* Templates List */}
                <motion.div
                  variants={item}
                  className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur"
                >
                  <div className="border-b border-white/[0.06] px-5 py-3">
                    <h3 className="text-sm font-semibold text-white">My Templates</h3>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {earnings.templates.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-gray-500">No templates published yet</div>
                    ) : (
                      earnings.templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{t.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                t.status === 'approved'
                                  ? 'bg-green-500/20 text-green-400'
                                  : t.status === 'pending_review'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{t.purchases} purchases</span>
                            <span className="font-medium text-green-400">${t.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="py-20 text-center text-gray-500">No earnings data available</div>
            )}
          </motion.div>
        )}

        {/* Submit Tab */}
        {tab === 'submit' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Upload className="h-5 w-5 text-blue-400" /> Submit New Template
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Template Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="My Premium Template"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Niche</label>
                  <select
                    value={formNiche}
                    onChange={(e) => setFormNiche(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  >
                    {NICHES.filter((n) => n !== 'all').map((n) => (
                      <option key={n} value={n} className="bg-[#0a0a0f]">
                        {n.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Price ($19 - $99)</label>
                  <input
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    type="number"
                    min="19"
                    max="99"
                    step="1"
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="49"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tags (comma separated)</label>
                  <input
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                    placeholder="modern, dark, premium"
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
                  placeholder="Describe your premium template..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formName || !formDesc}
                  className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-6 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
                <span className="text-xs text-gray-500">Revenue share: 70% to you, 30% platform fee</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
