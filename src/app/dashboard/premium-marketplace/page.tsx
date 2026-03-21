'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Star,
  Download,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  Package,
  Brain,
  Puzzle,
  Palette,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  Upload,
  Plus,
  Tag,
  Globe,
  RefreshCw,
  Sparkles,
  Crown,
  BadgeCheck,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type TemplateCategory = 'widget_theme' | 'flow_template' | 'knowledge_pack' | 'integration_bundle' | 'prompt_pack';

type PricingType = 'free' | 'one_time' | 'subscription';
type ActiveTab = 'browse' | 'purchases' | 'sell' | 'submit';

interface Template {
  _id: string;
  templateId: string;
  name: string;
  description: string;
  longDescription: string;
  category: TemplateCategory;
  author: { userId: string; name: string; avatar?: string };
  version: string;
  pricing: { type: PricingType; price: number; currency: string };
  config: Record<string, unknown>;
  previewImages: string[];
  tags: string[];
  stats: { purchases: number; rating: number; reviewCount: number; activeInstalls: number };
  reviews: Array<{ userId: string; userName: string; rating: number; comment: string; createdAt: string }>;
  compatibility: { minPlan: string; platforms: string[] };
  isPublished: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface UserPurchase {
  purchase: {
    templateId: string;
    price: number;
    isInstalled: boolean;
    installedClientId?: string;
    createdAt: string;
  };
  template: Template | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: {
  value: TemplateCategory | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'all', label: 'All Templates', icon: Store },
  { value: 'widget_theme', label: 'Widget Themes', icon: Palette },
  { value: 'flow_template', label: 'Flow Templates', icon: Zap },
  { value: 'knowledge_pack', label: 'Knowledge Packs', icon: Brain },
  { value: 'prompt_pack', label: 'Prompt Packs', icon: Sparkles },
  { value: 'integration_bundle', label: 'Integration Bundles', icon: Puzzle },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  widget_theme: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  flow_template: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  knowledge_pack: 'text-green-400 bg-green-500/10 border-green-500/20',
  integration_bundle: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  prompt_pack: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const CATEGORY_GRADIENT: Record<TemplateCategory, string> = {
  widget_theme: 'from-purple-500/20 to-indigo-500/10',
  flow_template: 'from-blue-500/20 to-cyan-500/10',
  knowledge_pack: 'from-green-500/20 to-emerald-500/10',
  integration_bundle: 'from-orange-500/20 to-amber-500/10',
  prompt_pack: 'from-pink-500/20 to-rose-500/10',
};

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  widget_theme: 'Widget Theme',
  flow_template: 'Flow Template',
  knowledge_pack: 'Knowledge Pack',
  integration_bundle: 'Integration Bundle',
  prompt_pack: 'Prompt Pack',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(pricing: { type: PricingType; price: number; currency: string }): string {
  if (pricing.type === 'free') return 'Free';
  const symbol = pricing.currency === 'USD' ? '$' : pricing.currency;
  if (pricing.type === 'subscription') return `${symbol}${pricing.price}/mo`;
  return `${symbol}${pricing.price}`;
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const icons: Record<string, string> = {
    web: '🌐',
    mobile: '📱',
    tablet: '💻',
    telegram: '✈️',
    whatsapp: '💬',
    instagram: '📸',
  };
  return (
    <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-gray-400">
      {icons[platform] || '📡'} {platform}
    </span>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isPurchased,
  onBuy,
  onSelect,
  buying,
}: {
  template: Template;
  isPurchased: boolean;
  onBuy: (t: Template) => void;
  onSelect: (t: Template) => void;
  buying: string | null;
}) {
  const colorClass = CATEGORY_COLORS[template.category];
  const gradientClass = CATEGORY_GRADIENT[template.category];
  const isBuying = buying === template.templateId;
  const isFree = template.pricing.type === 'free';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-xl hover:shadow-black/40"
    >
      {/* Featured Badge */}
      {template.isFeatured && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/80 to-orange-500/80 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur">
          <Crown className="h-3 w-3" />
          Featured
        </div>
      )}

      {/* Preview Image */}
      <div
        className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradientClass} cursor-pointer`}
        onClick={() => onSelect(template)}
      >
        {template.previewImages?.[0] ? (
          <img
            src={template.previewImages[0]}
            alt={template.name}
            className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Category Badge */}
        <div
          className={`absolute right-3 bottom-3 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${colorClass}`}
        >
          {CATEGORY_LABEL[template.category]}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3
                className="cursor-pointer text-sm font-semibold text-white transition-colors hover:text-blue-400"
                onClick={() => onSelect(template)}
              >
                {template.name}
              </h3>
              {template.isVerified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-blue-400" />}
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              by {template.author.name} · v{template.version}
            </p>
          </div>
          <div
            className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
              isFree
                ? 'bg-green-500/15 text-green-400'
                : template.pricing.type === 'subscription'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-blue-500/15 text-blue-400'
            }`}
          >
            {formatPrice(template.pricing)}
          </div>
        </div>

        {/* Description */}
        <p className="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-400">{template.description}</p>

        {/* Tags */}
        <div className="mb-3 flex flex-wrap gap-1">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <StarDisplay rating={template.stats.rating} />
              <span className="font-medium text-yellow-400">{template.stats.rating.toFixed(1)}</span>
              <span className="text-gray-600">({template.stats.reviewCount})</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            <span>{template.stats.purchases.toLocaleString()}</span>
          </div>
        </div>

        {/* Action */}
        {isPurchased ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 py-2 text-sm font-medium text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Installed
          </div>
        ) : (
          <button
            onClick={() => onBuy(template)}
            disabled={isBuying}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
              isFree
                ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/30'
            }`}
          >
            {isBuying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFree ? (
              <>
                <Download className="h-4 w-4" />
                Get Free
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Buy {formatPrice(template.pricing)}
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function TemplateModal({
  template,
  isPurchased,
  onClose,
  onBuy,
  onInstall,
  buying,
  installing,
}: {
  template: Template;
  isPurchased: boolean;
  onClose: () => void;
  onBuy: (t: Template) => void;
  onInstall: (t: Template) => void;
  buying: string | null;
  installing: string | null;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const isBuying = buying === template.templateId;
  const isInstalling = installing === template.templateId;
  const isFree = template.pricing.type === 'free';
  const colorClass = CATEGORY_COLORS[template.category];

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: template.reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] p-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border p-3 ${colorClass}`}>
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{template.name}</h2>
                {template.isVerified && <BadgeCheck className="h-5 w-5 text-blue-400" />}
                {template.isFeatured && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    <Crown className="h-3 w-3" />
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                by {template.author.name} · v{template.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* Left: Images + Description */}
          <div className="flex-1 p-6">
            {/* Image Carousel */}
            {template.previewImages.length > 0 && (
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.06]">
                <img
                  src={template.previewImages[imageIndex]}
                  alt={`${template.name} preview ${imageIndex + 1}`}
                  className="h-56 w-full object-cover"
                />
                {template.previewImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setImageIndex((i) => Math.max(0, i - 1))}
                      className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-1.5 backdrop-blur"
                    >
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={() => setImageIndex((i) => Math.min(template.previewImages.length - 1, i + 1))}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-1.5 backdrop-blur"
                    >
                      <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {template.previewImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Description */}
            <h3 className="mb-2 font-semibold text-white">About this template</h3>
            <p className="mb-4 text-sm leading-relaxed text-gray-400">
              {template.longDescription || template.description}
            </p>

            {/* Tags */}
            <div className="mb-6 flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Config Preview */}
            {Object.keys(template.config).length > 0 && (
              <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Package className="h-4 w-4 text-blue-400" />
                  Configuration Preview
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(template.config)
                    .slice(0, 6)
                    .map(([key, val]) => (
                      <div key={key} className="rounded-lg bg-white/[0.02] p-2">
                        <div className="text-[10px] text-gray-500">{key.replace(/_/g, ' ')}</div>
                        <div className="truncate text-xs font-medium text-white">
                          {typeof val === 'boolean'
                            ? val
                              ? 'Enabled'
                              : 'Disabled'
                            : Array.isArray(val)
                              ? `${(val as unknown[]).length} items`
                              : String(val).slice(0, 30)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                Reviews ({template.stats.reviewCount})
              </h4>

              {/* Rating Breakdown */}
              <div className="mb-4 space-y-1.5">
                {ratingBreakdown.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-gray-500">{star}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-1.5 rounded-full bg-yellow-400/60"
                        style={{
                          width:
                            template.stats.reviewCount > 0 ? `${(count / template.stats.reviewCount) * 100}%` : '0%',
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-500">{count}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {template.reviews.slice(0, 3).map((review, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-white">{review.userName}</span>
                      <StarDisplay rating={review.rating} />
                    </div>
                    <p className="text-xs text-gray-400">{review.comment}</p>
                  </div>
                ))}
                {template.reviews.length === 0 && (
                  <p className="text-center text-xs text-gray-600">No reviews yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Purchase Panel */}
          <div className="w-full border-t border-white/[0.06] p-6 lg:w-72 lg:border-t-0 lg:border-l">
            {/* Price */}
            <div className="mb-5 text-center">
              <div className="text-3xl font-bold text-white">{formatPrice(template.pricing)}</div>
              {template.pricing.type === 'subscription' && <p className="text-xs text-gray-500">billed monthly</p>}
              {template.pricing.type === 'one_time' && <p className="text-xs text-gray-500">one-time purchase</p>}
            </div>

            {/* Stats Grid */}
            <div className="mb-5 grid grid-cols-2 gap-2">
              {[
                { label: 'Downloads', value: template.stats.purchases.toLocaleString(), icon: Download },
                { label: 'Installs', value: template.stats.activeInstalls.toLocaleString(), icon: Zap },
                { label: 'Rating', value: template.stats.rating.toFixed(1), icon: Star },
                { label: 'Reviews', value: template.stats.reviewCount.toString(), icon: BarChart3 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                  <stat.icon className="mx-auto mb-1 h-4 w-4 text-blue-400" />
                  <div className="text-sm font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Compatibility */}
            <div className="mb-5 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-300">
                <Shield className="h-3.5 w-3.5 text-green-400" />
                Compatibility
              </div>
              <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                <span>Min plan:</span>
                <span className="font-medium text-white capitalize">{template.compatibility.minPlan}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.compatibility.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
            </div>

            {/* CTA */}
            {isPurchased ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 py-3 text-sm font-semibold text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Purchased
                </div>
                <button
                  onClick={() => onInstall(template)}
                  disabled={isInstalling}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/20 py-2.5 text-sm font-semibold text-blue-400 transition-all hover:bg-blue-500/30 disabled:opacity-50"
                >
                  {isInstalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Install to Widget
                </button>
              </div>
            ) : (
              <button
                onClick={() => onBuy(template)}
                disabled={isBuying}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                  isFree
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-blue-400'
                }`}
              >
                {isBuying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFree ? (
                  <>
                    <Download className="h-5 w-5" />
                    Get for Free
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Buy Now · {formatPrice(template.pricing)}
                  </>
                )}
              </button>
            )}

            <p className="mt-3 text-center text-[10px] text-gray-600">
              {isFree ? 'No payment required' : 'Secure checkout · Instant access'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Submit Form ──────────────────────────────────────────────────────────────

function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('widget_theme');
  const [pricingType, setPricingType] = useState<PricingType>('free');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name || !description || !category) {
      setError('Name, description, and category are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/premium-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          longDescription,
          category,
          pricing: { type: pricingType, price: price ? Number(price) : 0, currency: 'USD' },
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Submit failed');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
          <Upload className="h-5 w-5 text-blue-400" />
          Submit New Template
        </h3>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Template Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/[0.05]"
                placeholder="My Awesome Template"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="w-full rounded-xl border border-white/[0.06] bg-[#0d0d14] px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
              >
                {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Pricing</label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as PricingType)}
                className="w-full rounded-xl border border-white/[0.06] bg-[#0d0d14] px-3.5 py-2.5 text-sm text-white outline-none"
              >
                <option value="free">Free</option>
                <option value="one_time">One-time Purchase</option>
                <option value="subscription">Monthly Subscription</option>
              </select>
            </div>
            {pricingType !== 'free' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Price (USD) {pricingType === 'subscription' && '/ month'}
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="1"
                  max="999"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  placeholder="29"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Short Description *</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50"
              placeholder="One-line summary of your template..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Full Description</label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50"
              placeholder="Describe what your template does, who it's for, and what makes it special..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/50"
              placeholder="saas, dark, premium, glassmorphism"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-xs text-gray-500">
            <span>
              Revenue share: <strong className="text-white">70%</strong> to you · 30% platform fee
            </span>
            <span>Review time: 2-5 business days</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !name || !description}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function PremiumMarketplacePage() {
  const [tab, setTab] = useState<ActiveTab>('browse');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pricing, setPricing] = useState<'free' | 'paid' | 'all'>('all');
  const [sort, setSort] = useState<'popular' | 'newest' | 'rating'>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Featured template for hero
  const featuredTemplate = templates.find((t) => t.isFeatured) || templates[0];

  const purchasedIds = new Set(purchases.map((p) => p.purchase.templateId));

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ sort });
    if (category !== 'all') params.set('category', category);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (pricing !== 'all') params.set('pricing', pricing);

    let attempts = 0;
    while (attempts < 2) {
      try {
        const res = await fetch(`/api/premium-templates?${params}`);
        if (res.status === 401 && attempts === 0) {
          // Refresh and retry once
          await fetch('/api/auth/refresh', { method: 'POST' });
          attempts++;
          continue;
        }
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data.templates || []);
        } else {
          setError(data.error || 'Failed to load templates');
        }
        break;
      } catch {
        setError('Network error. Please try again.');
        break;
      }
    }
    setLoading(false);
  }, [category, sort, debouncedSearch, pricing]);

  const fetchPurchases = useCallback(async () => {
    setPurchasesLoading(true);
    try {
      const res = await fetch('/api/premium-templates/purchases');
      const data = await res.json();
      if (data.success) {
        setPurchases(data.data || []);
      }
    } catch {
      /* silent */
    }
    setPurchasesLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (tab === 'purchases' || tab === 'sell') fetchPurchases();
  }, [tab, fetchPurchases]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  const handleBuy = async (template: Template) => {
    setBuying(template.templateId);
    try {
      const res = await fetch(`/api/premium-templates/${template.templateId}/purchase`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          template.pricing.type === 'free'
            ? `"${template.name}" added to your library!`
            : `"${template.name}" purchased successfully!`,
          'success'
        );
        await fetchPurchases();
        setSelectedTemplate(null);
      } else {
        showToast(data.error || 'Purchase failed', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    }
    setBuying(null);
  };

  const handleInstall = async (template: Template) => {
    setInstalling(template.templateId);
    // In a real scenario, would prompt for clientId selection
    showToast(`"${template.name}" installation initiated. Select a widget to apply it.`, 'success');
    setInstalling(null);
  };

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#080810]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[100] flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
              toast.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Detail Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateModal
            template={selectedTemplate}
            isPurchased={purchasedIds.has(selectedTemplate.templateId)}
            onClose={() => setSelectedTemplate(null)}
            onBuy={handleBuy}
            onInstall={handleInstall}
            buying={buying}
            installing={installing}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ── Page Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-blue-500/30 to-purple-500/20">
              <Store className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Premium Marketplace</h1>
              <p className="text-sm text-gray-500">Extend your AI widgets with professionally crafted templates</p>
            </div>
          </div>
        </motion.div>

        {/* ── Hero Banner (Featured Template) ── */}
        {!loading && featuredTemplate && tab === 'browse' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-[#0d0d14]"
          >
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              {featuredTemplate.previewImages?.[0] && (
                <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-36 sm:w-64">
                  <img
                    src={featuredTemplate.previewImages[0]}
                    alt={featuredTemplate.name}
                    className="h-full w-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />
                </div>
              )}
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                    <Crown className="h-3 w-3" />
                    Featured Pick
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${CATEGORY_COLORS[featuredTemplate.category]}`}
                  >
                    {CATEGORY_LABEL[featuredTemplate.category]}
                  </span>
                </div>
                <h2 className="mb-1 text-2xl font-bold text-white">{featuredTemplate.name}</h2>
                <p className="mb-4 line-clamp-2 text-sm text-gray-400">{featuredTemplate.description}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={featuredTemplate.stats.rating} size="lg" />
                    <span className="text-sm font-semibold text-yellow-400">
                      {featuredTemplate.stats.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">({featuredTemplate.stats.reviewCount} reviews)</span>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(featuredTemplate)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-blue-400"
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              { id: 'browse', label: 'Browse', icon: Store },
              { id: 'purchases', label: 'My Library', icon: Package },
              { id: 'sell', label: 'Sell', icon: TrendingUp },
              { id: 'submit', label: 'Submit Template', icon: Upload },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10'
                  : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Error Banner ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              <span>{error}</span>
              <button onClick={() => setError('')}>
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────── BROWSE TAB ─────────────────────────── */}
        {tab === 'browse' && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
            {/* Category Tabs */}
            <motion.div variants={itemVariants} className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    category === value
                      ? 'bg-white/[0.08] text-white shadow-lg'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </motion.div>

            {/* Search + Filters */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur"
            >
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search templates, tags, categories..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-4 pl-10 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/40 focus:bg-white/[0.05]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter:</span>
                </div>
                {(['all', 'free', 'paid'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPricing(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      pricing === p
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06]'
                    }`}
                  >
                    {p === 'all' ? 'All' : p === 'free' ? 'Free' : 'Paid'}
                  </button>
                ))}
                <div className="h-4 w-px bg-white/[0.06]" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="rounded-xl border border-white/[0.06] bg-[#080810] px-3 py-2 text-xs text-gray-300 outline-none focus:border-blue-500/40"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest</option>
                  <option value="rating">Top Rated</option>
                </select>
                <button
                  onClick={fetchTemplates}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[0.06]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            </motion.div>

            {/* Results Count */}
            {!loading && (
              <motion.div variants={itemVariants} className="text-sm text-gray-500">
                {templates.length} template{templates.length !== 1 ? 's' : ''} found
                {category !== 'all' && (
                  <span className="ml-1">
                    in <strong className="text-gray-300">{CATEGORY_LABEL[category as TemplateCategory]}</strong>
                  </span>
                )}
              </motion.div>
            )}

            {/* Template Grid */}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5">
                    <div className="mb-4 h-44 rounded-xl bg-white/[0.04]" />
                    <div className="mb-2 h-4 w-3/4 rounded bg-white/[0.04]" />
                    <div className="mb-3 h-3 w-full rounded bg-white/[0.03]" />
                    <div className="h-9 rounded-xl bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <Search className="h-9 w-9 text-gray-600" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-white">No templates found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setCategory('all');
                    setPricing('all');
                  }}
                  className="mt-4 rounded-xl bg-white/[0.05] px-5 py-2 text-sm text-gray-400 hover:bg-white/[0.08]"
                >
                  Clear all filters
                </button>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                <AnimatePresence mode="popLayout">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.templateId}
                      template={template}
                      isPurchased={purchasedIds.has(template.templateId)}
                      onBuy={handleBuy}
                      onSelect={setSelectedTemplate}
                      buying={buying}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─────────────────── MY LIBRARY TAB ───────────────────────── */}
        {tab === 'purchases' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">My Library</h2>
                <p className="text-sm text-gray-500">Templates you own and can install</p>
              </div>
              <button
                onClick={fetchPurchases}
                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/[0.06]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {purchasesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <Package className="h-9 w-9 text-gray-600" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-white">No templates yet</h3>
                <p className="mb-4 text-sm text-gray-500">Browse the marketplace and get your first template</p>
                <button
                  onClick={() => setTab('browse')}
                  className="rounded-xl bg-blue-500/20 px-5 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/30"
                >
                  Browse Templates
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {purchases.map(({ purchase, template }) => {
                  if (!template) return null;
                  return (
                    <motion.div
                      key={purchase.templateId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                            {template.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />}
                          </div>
                          <p
                            className={`mt-0.5 text-[10px] font-medium ${CATEGORY_COLORS[template.category].split(' ')[0]}`}
                          >
                            {CATEGORY_LABEL[template.category]}
                          </p>
                        </div>
                        {purchase.isInstalled ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 text-[10px] font-semibold text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Installed
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-gray-500">
                            Not installed
                          </span>
                        )}
                      </div>

                      <p className="mb-4 line-clamp-2 text-xs text-gray-500">{template.description}</p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.06] hover:text-white"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleInstall(template)}
                          disabled={installing === template.templateId}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500/20 py-2 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/30 disabled:opacity-50"
                        >
                          {installing === template.templateId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {purchase.isInstalled ? 'Re-install' : 'Install'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────── SELL / SELLER DASHBOARD TAB ──────────── */}
        {tab === 'sell' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: 'Total Earnings',
                  value: '$0.00',
                  icon: DollarSign,
                  color: 'text-green-400',
                  bg: 'bg-green-500/10',
                  border: 'border-green-500/20',
                },
                {
                  label: 'Templates Sold',
                  value: '0',
                  icon: TrendingUp,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  border: 'border-blue-500/20',
                },
                {
                  label: 'Avg Rating',
                  value: '—',
                  icon: Star,
                  color: 'text-yellow-400',
                  bg: 'bg-yellow-500/10',
                  border: 'border-yellow-500/20',
                },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-6 backdrop-blur`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-gray-400">{stat.label}</span>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Revenue Share Info */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Revenue Share Program</h3>
              </div>
              <div className="mb-4 flex items-center justify-between text-sm text-gray-400">
                <span>Your share</span>
                <span>Platform fee</span>
              </div>
              <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-400">70% to you</span>
                <span className="text-gray-500">30% platform</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                {[
                  { icon: Globe, text: 'Global audience of thousands of active users' },
                  { icon: Shield, text: 'Secure payments, monthly payouts' },
                  { icon: TrendingUp, text: 'Analytics dashboard for your templates' },
                  { icon: Sparkles, text: 'Featured placement for top-rated templates' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-gray-400">
                    <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                    <span className="text-xs">{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setTab('submit')}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400"
              >
                <Plus className="h-4 w-4" />
                Submit Your First Template
              </button>
            </div>
          </motion.div>
        )}

        {/* ─────────────────── SUBMIT TAB ───────────────────────────── */}
        {tab === 'submit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <SubmitForm
              onSuccess={() => {
                showToast("Template submitted for review! We'll notify you within 2-5 business days.", 'success');
                setTab('sell');
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
