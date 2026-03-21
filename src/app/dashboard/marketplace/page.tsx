'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Download, Star, Filter, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';

const NICHES = [
  { value: 'all', label: 'All', icon: '✨' },
  { value: 'dental', label: 'Dental', icon: '🦷' },
  { value: 'beauty', label: 'Beauty & Spa', icon: '💅' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍕' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
  { value: 'saas', label: 'SaaS & Tech', icon: '💻' },
  { value: 'hotel', label: 'Hotel & Travel', icon: '🏨' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'auto', label: 'Automotive', icon: '🚗' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
        />
      ))}
    </div>
  );
}

interface Template {
  _id: string;
  name: string;
  description: string;
  niche: string;
  tier: 'official' | 'community';
  author: { name: string };
  rating: { average: number; count: number };
  installCount: number;
  previewConfig: { primaryColor: string };
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [niche, setNiche] = useState('all');
  const [sort, setSort] = useState('popular');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: '12', sort });
      if (niche !== 'all') params.set('niche', niche);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/marketplace?${params}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTemplates(data.data.templates ?? []);
        setPagination((prev) => ({ ...prev, ...(data.data.pagination ?? {}) }));
      }
    } catch {
      // Network error — leave current state
    }
    setLoading(false);
  }, [niche, sort, debouncedSearch, pagination.page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleNicheChange = (value: string) => {
    setNiche(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const nicheLabel = (value: string) => NICHES.find((n) => n.value === value);

  const pageNumbers = () => {
    const pages: (number | string)[] = [];
    const { page, totalPages } = pagination;
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-8 text-center">
        <div className="from-accent/5 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="text-accent h-5 w-5" />
            <span className="text-accent text-sm font-medium">Template Store</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span
              style={{
                background: 'linear-gradient(135deg, var(--color-accent), #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Widget Marketplace
            </span>
          </h1>
          <p className="text-text-secondary mx-auto mt-4 max-w-xl">
            Discover ready-to-deploy AI chat templates for every industry
          </p>
          <Link
            href="/dashboard/marketplace/publish"
            className="bg-accent mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Publish Template
          </Link>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <div className="border-border bg-bg-primary/80 sticky top-12 z-20 border-b backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          {/* Search + Sort Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="text-text-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="border-border bg-bg-secondary/50 text-text-primary placeholder:text-text-secondary focus:border-accent focus:ring-accent w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-text-secondary h-4 w-4" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="border-border bg-bg-secondary/50 text-text-primary focus:border-accent focus:ring-accent rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Niche Chips */}
          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
            {NICHES.map((n) => (
              <motion.button
                key={n.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNicheChange(n.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                  niche === n.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'border-border bg-bg-secondary/50 text-text-secondary hover:border-accent/50 hover:text-text-primary border'
                }`}
              >
                <span className="text-xs">{n.icon}</span>
                {n.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-border bg-bg-secondary/50 animate-pulse rounded-2xl border p-6">
                <div className="bg-border mb-3 h-2 w-full rounded-full" />
                <div className="bg-border mb-4 h-5 w-3/4 rounded" />
                <div className="bg-border mb-2 h-4 w-full rounded" />
                <div className="bg-border h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Template Grid */}
        {!loading && templates.length > 0 && (
          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {templates.map((template, index) => (
              <motion.div
                key={template._id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/marketplace/${template._id}`}
                  className="group border-border bg-bg-secondary/50 hover:border-accent/50 hover:shadow-accent/5 block overflow-hidden rounded-2xl border backdrop-blur-sm transition-all hover:shadow-lg"
                >
                  {/* Color Strip */}
                  <div
                    className="h-2 rounded-t-2xl"
                    style={{ background: template.previewConfig?.primaryColor || 'var(--color-accent)' }}
                  />

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Badges Row */}
                    <div className="mb-3 flex items-center gap-2">
                      {/* Niche Badge */}
                      {nicheLabel(template.niche) && (
                        <span className="border-border bg-bg-primary/50 text-text-secondary inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                          <span>{nicheLabel(template.niche)?.icon}</span>
                          {nicheLabel(template.niche)?.label}
                        </span>
                      )}
                      {/* Tier Badge */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          template.tier === 'official'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {template.tier === 'official' ? 'Official' : 'Community'}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-text-primary group-hover:text-accent text-lg font-semibold transition-colors">
                      {template.name}
                    </h3>

                    {/* Description */}
                    <p className="text-text-secondary mt-1.5 line-clamp-2 text-sm leading-relaxed">
                      {template.description}
                    </p>

                    {/* Bottom Row */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={template.rating?.average || 0} />
                          <span className="text-text-secondary text-xs">({template.rating?.count || 0})</span>
                        </div>
                        <div className="text-text-secondary flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          <span className="text-xs">{template.installCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Author */}
                    <div className="border-border mt-3 border-t pt-3">
                      <span className="text-text-secondary text-xs">by {template.author?.name || 'Anonymous'}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="border-border bg-bg-secondary/50 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border">
              <Search className="text-text-secondary h-7 w-7" />
            </div>
            <h3 className="text-text-primary text-lg font-semibold">No templates found</h3>
            <p className="text-text-secondary mt-1 text-sm">Try adjusting your filters</p>
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="border-border bg-bg-secondary/50 text-text-secondary hover:border-accent/50 hover:text-text-primary disabled:hover:border-border disabled:hover:text-text-secondary flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers().map((p, i) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${i}`} className="text-text-secondary px-1.5 text-sm">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === p
                      ? 'bg-accent text-white shadow-sm'
                      : 'border-border bg-bg-secondary/50 text-text-secondary hover:border-accent/50 hover:text-text-primary border'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="border-border bg-bg-secondary/50 text-text-secondary hover:border-accent/50 hover:text-text-primary disabled:hover:border-border disabled:hover:text-text-secondary flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
