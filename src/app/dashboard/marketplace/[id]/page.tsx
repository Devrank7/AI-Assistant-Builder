'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Download,
  Sparkles,
  Clock,
  User,
  MessageSquare,
  Check,
  X,
  Loader2,
  ChevronRight,
  Palette,
  Monitor,
  Smartphone,
  Sun,
  Moon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getStarDistribution(reviews: any[]) {
  const dist = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
  });
  return dist;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderStars(rating: number, size = 16) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-text-secondary/30'}
        />
      ))}
    </span>
  );
}

const nicheEmojis: Record<string, string> = {
  dental: '🦷',
  beauty: '💅',
  realestate: '🏠',
  restaurant: '🍽️',
  hotel: '🏨',
  fitness: '💪',
  ecommerce: '🛒',
  saas: '💻',
  education: '📚',
  healthcare: '🏥',
  legal: '⚖️',
  finance: '💰',
  construction: '🏗️',
  automotive: '🚗',
  general: '🤖',
};

const tierColors: Record<string, string> = {
  free: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  starter: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pro: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

/* ------------------------------------------------------------------ */
/*  Animation variants                                                */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const swatchPop = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.04, type: 'spring', stiffness: 400, damping: 22 },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function MarketplaceTemplatePage() {
  const { id } = useParams();
  const router = useRouter();

  const [template, setTemplate] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedTemplates, setRelatedTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 5;

  /* ---------- data fetching ---------- */

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [tmplRes, revRes] = await Promise.all([
          fetch(`/api/marketplace/${id}`),
          fetch(`/api/marketplace/${id}/review`),
        ]);
        const tmplData = await tmplRes.json();
        const revData = await revRes.json();

        if (tmplData.success) {
          setTemplate(tmplData.data);
          const relRes = await fetch(`/api/marketplace?niche=${tmplData.data.niche}&limit=4`);
          const relData = await relRes.json();
          if (relData.success) {
            setRelatedTemplates(relData.data.templates.filter((t: any) => t._id !== id).slice(0, 3));
          }
        }
        if (revData.success) setReviews(revData.data.reviews);
      } catch (e) {
        console.error('Failed to load template:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  /* ---------- install ---------- */

  async function handleInstall() {
    setInstalling(true);
    setInstallSuccess(null);
    try {
      const res = await fetch(`/api/marketplace/${id}/install`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setInstallSuccess(data.data.clientId);
      }
    } catch (e) {
      console.error('Install failed:', e);
    } finally {
      setInstalling(false);
    }
  }

  /* ---------- review submit ---------- */

  async function handleReviewSubmit() {
    if (!reviewRating) return;
    setReviewSubmitting(true);
    try {
      await fetch(`/api/marketplace/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const revRes = await fetch(`/api/marketplace/${id}/review`);
      const revData = await revRes.json();
      if (revData.success) setReviews(revData.data.reviews);
      const tmplRes = await fetch(`/api/marketplace/${id}`);
      const tmplData = await tmplRes.json();
      if (tmplData.success) setTemplate(tmplData.data);
      setReviewRating(0);
      setReviewComment('');
    } catch (e) {
      console.error('Review submit failed:', e);
    } finally {
      setReviewSubmitting(false);
    }
  }

  /* ---------- derived data ---------- */

  const configJson = template?.configJson
    ? typeof template.configJson === 'string'
      ? JSON.parse(template.configJson)
      : template.configJson
    : null;

  const themeJson = template?.themeJson
    ? typeof template.themeJson === 'string'
      ? JSON.parse(template.themeJson)
      : template.themeJson
    : null;

  const features = configJson?.features || {};
  const quickReplies = configJson?.quickReplies || [];

  const themeColors: { label: string; color: string }[] = [];
  if (themeJson) {
    const c = themeJson.colors || themeJson;
    if (c.primary) themeColors.push({ label: 'Primary', color: c.primary });
    if (c.accent) themeColors.push({ label: 'Accent', color: c.accent });
    if (c.headerGradientStart) themeColors.push({ label: 'Header Start', color: c.headerGradientStart });
    if (c.headerGradientEnd) themeColors.push({ label: 'Header End', color: c.headerGradientEnd });
    if (c.surface) themeColors.push({ label: 'Surface', color: c.surface });
    if (c.background) themeColors.push({ label: 'Background', color: c.background });
    if (c.userBubble) themeColors.push({ label: 'User Bubble', color: c.userBubble });
    if (c.botBubble) themeColors.push({ label: 'Bot Bubble', color: c.botBubble });
    if (c.text) themeColors.push({ label: 'Text', color: c.text });
  }

  const isDarkMode = themeJson?.darkMode ?? themeJson?.mode === 'dark';
  const widgetWidth = themeJson?.width || configJson?.width;
  const widgetHeight = themeJson?.height || configJson?.height;

  const starDist = getStarDistribution(reviews);
  const maxStarCount = Math.max(...starDist, 1);
  const visibleReviews = reviews.slice(0, reviewPage * reviewsPerPage);
  const hasMoreReviews = reviews.length > visibleReviews.length;

  /* ---------- loading state ---------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="text-accent h-10 w-10 animate-spin" />
          <p className="text-text-secondary text-sm">Loading template...</p>
        </motion.div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-text-secondary text-lg">Template not found</p>
        <Link href="/dashboard/marketplace" className="text-accent text-sm hover:underline">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pt-6 pb-20 sm:px-6 lg:px-8">
      {/* ---- Back link ---- */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
        <Link
          href="/dashboard/marketplace"
          className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>
      </motion.div>

      {/* ============================================================ */}
      {/*  HEADER                                                      */}
      {/* ============================================================ */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between"
      >
        {/* Left */}
        <div className="space-y-3">
          <h1 className="text-text-primary text-3xl font-bold tracking-tight">{template.name}</h1>

          <div className="flex flex-wrap items-center gap-2.5">
            {template.authorName && (
              <span className="text-text-secondary inline-flex items-center gap-1.5 text-sm">
                <User size={14} /> {template.authorName}
              </span>
            )}

            {template.tier && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                  tierColors[template.tier] || 'bg-bg-secondary text-text-secondary border-border'
                }`}
              >
                {template.tier}
              </span>
            )}

            {template.niche && (
              <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium">
                {nicheEmojis[template.niche] || '🤖'} {template.niche}
              </span>
            )}

            {template.createdAt && (
              <span className="text-text-secondary inline-flex items-center gap-1.5 text-xs">
                <Clock size={12} /> {formatDate(template.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Right — rating + installs */}
        <div className="flex items-center gap-6 lg:text-right">
          <div className="flex flex-col items-center">
            <span className="text-text-primary text-4xl font-bold tabular-nums">
              {(template.averageRating ?? 0).toFixed(1)}
            </span>
            <div className="mt-1">{renderStars(template.averageRating ?? 0, 18)}</div>
            <span className="text-text-secondary mt-0.5 text-xs">
              {template.reviewCount ?? 0} review{(template.reviewCount ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-border h-12 w-px" />

          <div className="flex flex-col items-center">
            <span className="text-text-primary text-4xl font-bold tabular-nums">{template.installCount ?? 0}</span>
            <span className="text-text-secondary mt-1 flex items-center gap-1 text-xs">
              <Download size={12} /> installs
            </span>
          </div>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/*  ACTION BUTTONS                                              */}
      {/* ============================================================ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
        className="flex flex-wrap items-center gap-3"
      >
        <button
          onClick={handleInstall}
          disabled={installing}
          className="bg-accent shadow-accent/20 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {installing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download size={16} />
              Use This Template
            </>
          )}
        </button>

        <button
          onClick={() => router.push(`/dashboard/builder?template=${id}`)}
          className="border-border bg-bg-secondary/50 text-text-primary hover:bg-bg-secondary inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all active:scale-[0.97]"
        >
          <Sparkles size={16} />
          Remix in Builder
        </button>

        {installSuccess && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400"
          >
            <Check size={14} />
            Installed! Client: {installSuccess}
          </motion.span>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/*  DESCRIPTION CARD                                            */}
      {/* ============================================================ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
        className="border-border bg-bg-secondary/50 rounded-2xl border p-6 backdrop-blur-sm"
      >
        <h2 className="text-text-primary mb-4 text-lg font-semibold">Description</h2>

        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
          {template.description || 'No description provided.'}
        </p>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {template.tags.map((tag: string) => (
              <span key={tag} className="bg-accent/10 text-accent rounded-full px-3 py-1 text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Widget type */}
        {template.widgetType && (
          <div className="mt-4">
            <span className="border-border bg-bg-primary/60 text-text-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
              <Monitor size={12} /> Widget: {template.widgetType}
            </span>
          </div>
        )}

        {/* Features */}
        {Object.keys(features).length > 0 && (
          <div className="mt-6">
            <h3 className="text-text-primary mb-3 text-sm font-semibold">Features</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(features).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {enabled ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check size={12} className="text-emerald-400" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10">
                      <X size={12} className="text-red-400/60" />
                    </span>
                  )}
                  <span className={enabled ? 'text-text-primary' : 'text-text-secondary/60'}>
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (s) => s.toUpperCase())
                      .trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/*  PREVIEW CARD                                                */}
      {/* ============================================================ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
        className="border-border bg-bg-secondary/50 rounded-2xl border p-6 backdrop-blur-sm"
      >
        <h2 className="text-text-primary mb-5 text-lg font-semibold">Theme Preview</h2>

        {/* Color palette */}
        {themeColors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
              <Palette size={14} /> Color Palette
            </h3>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
            >
              {themeColors.map((swatch, i) => (
                <motion.div
                  key={swatch.label}
                  variants={swatchPop}
                  custom={i}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <div
                    className="border-border h-14 w-14 rounded-xl border shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.color}
                  />
                  <span className="text-text-secondary text-[11px]">{swatch.label}</span>
                  <span className="text-text-secondary/60 font-mono text-[10px]">{swatch.color}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Meta row */}
        <div className="text-text-secondary flex flex-wrap items-center gap-4 text-sm">
          {isDarkMode !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </span>
          )}
          {(widgetWidth || widgetHeight) && (
            <span className="inline-flex items-center gap-1.5">
              <Smartphone size={14} />
              {widgetWidth && `${widgetWidth}px`}
              {widgetWidth && widgetHeight && ' × '}
              {widgetHeight && `${widgetHeight}px`}
            </span>
          )}
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="mt-6">
            <h3 className="text-text-primary mb-3 text-sm font-semibold">Quick Replies Preview</h3>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((qr: any, i: number) => {
                const label = typeof qr === 'string' ? qr : qr.label || qr.text || '';
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="border-accent/30 bg-accent/5 text-accent inline-flex rounded-full border px-4 py-1.5 text-sm"
                  >
                    {label}
                  </motion.span>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/*  REVIEWS SECTION                                             */}
      {/* ============================================================ */}
      <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={4} className="space-y-6">
        <h2 className="text-text-primary text-lg font-semibold">
          Reviews <span className="text-text-secondary font-normal">({reviews.length})</span>
        </h2>

        {/* Rating summary */}
        <div className="border-border bg-bg-secondary/50 flex flex-col gap-6 rounded-2xl border p-6 backdrop-blur-sm sm:flex-row sm:items-center">
          {/* Left: big number */}
          <div className="flex flex-col items-center gap-1 sm:min-w-[120px]">
            <span className="text-text-primary text-5xl font-bold tabular-nums">
              {(template.averageRating ?? 0).toFixed(1)}
            </span>
            <div>{renderStars(template.averageRating ?? 0, 20)}</div>
            <span className="text-text-secondary text-xs">
              {reviews.length} rating{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Right: bars */}
          <div className="flex flex-1 flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starDist[star - 1];
              const pct = (count / maxStarCount) * 100;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary w-8 text-right tabular-nums">{star}★</span>
                  <div className="bg-bg-primary/60 relative h-2.5 flex-1 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: (5 - star) * 0.08 }}
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                    />
                  </div>
                  <span className="text-text-secondary w-6 text-xs tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write a review */}
        <div className="border-border bg-bg-secondary/50 rounded-2xl border p-6 backdrop-blur-sm">
          <h3 className="text-text-primary mb-4 text-sm font-semibold">Write a Review</h3>

          {/* Star selector */}
          <div className="mb-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewRating(star)}
                onMouseEnter={() => setReviewHover(star)}
                onMouseLeave={() => setReviewHover(0)}
                className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  size={28}
                  className={
                    star <= (reviewHover || reviewRating) ? 'fill-amber-400 text-amber-400' : 'text-text-secondary/30'
                  }
                />
              </button>
            ))}
            {reviewRating > 0 && <span className="text-text-secondary ml-2 text-sm">{reviewRating}/5</span>}
          </div>

          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Share your experience with this template..."
            rows={3}
            className="border-border bg-bg-primary/60 text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-accent/30 mb-4 w-full resize-none rounded-xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          />

          <button
            onClick={handleReviewSubmit}
            disabled={!reviewRating || reviewSubmitting}
            className="bg-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reviewSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <MessageSquare size={14} />
                Submit Review
              </>
            )}
          </button>
        </div>

        {/* Review list */}
        {visibleReviews.length > 0 && (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
            {visibleReviews.map((review, i) => (
              <motion.div
                key={review._id || i}
                variants={fadeUp}
                custom={i}
                className="border-border bg-bg-secondary/50 rounded-2xl border p-5 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-accent/15 text-accent flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
                      {(review.userName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-text-primary text-sm font-semibold">{review.userName || 'Anonymous'}</span>
                      <div className="mt-0.5">{renderStars(review.rating, 13)}</div>
                    </div>
                  </div>
                  <span className="text-text-secondary text-xs">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && <p className="text-text-secondary text-sm leading-relaxed">{review.comment}</p>}
              </motion.div>
            ))}
          </motion.div>
        )}

        {hasMoreReviews && (
          <div className="flex justify-center">
            <button
              onClick={() => setReviewPage((p) => p + 1)}
              className="border-border bg-bg-secondary/50 text-text-secondary hover:bg-bg-secondary hover:text-text-primary inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-all"
            >
              Load More
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </motion.section>

      {/* ============================================================ */}
      {/*  RELATED TEMPLATES                                           */}
      {/* ============================================================ */}
      {relatedTemplates.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" animate="visible" custom={5} className="space-y-5">
          <h2 className="text-text-primary text-lg font-semibold">
            More {template.niche ? `${template.niche.charAt(0).toUpperCase()}${template.niche.slice(1)}` : ''} Templates
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTemplates.map((t: any, i: number) => (
              <motion.div key={t._id} variants={fadeUp} custom={i} initial="hidden" animate="visible">
                <Link
                  href={`/dashboard/marketplace/${t._id}`}
                  className="group border-border bg-bg-secondary/50 hover:border-accent/30 hover:shadow-accent/5 block rounded-2xl border p-5 backdrop-blur-sm transition-all hover:shadow-lg"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-text-primary group-hover:text-accent line-clamp-1 text-sm font-semibold transition-colors">
                      {t.name}
                    </h3>
                    {t.tier && (
                      <span
                        className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                          tierColors[t.tier] || 'bg-bg-secondary text-text-secondary border-border'
                        }`}
                      >
                        {t.tier}
                      </span>
                    )}
                  </div>

                  <p className="text-text-secondary mb-3 line-clamp-2 text-xs leading-relaxed">
                    {t.description || 'No description'}
                  </p>

                  <div className="text-text-secondary flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {renderStars(t.averageRating ?? 0, 12)}
                      <span className="ml-1 tabular-nums">{(t.averageRating ?? 0).toFixed(1)}</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Download size={11} /> {t.installCount ?? 0}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
