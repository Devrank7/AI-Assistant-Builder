'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, X, Sparkles, Star, Download } from 'lucide-react';

const NICHES = [
  { value: 'dental', label: '\u{1F9B7} Dental' },
  { value: 'beauty', label: '\u{1F485} Beauty & Spa' },
  { value: 'restaurant', label: '\u{1F355} Restaurant' },
  { value: 'real_estate', label: '\u{1F3E0} Real Estate' },
  { value: 'ecommerce', label: '\u{1F6D2} E-Commerce' },
  { value: 'saas', label: '\u{1F4BB} SaaS & Tech' },
  { value: 'hotel', label: '\u{1F3E8} Hotel & Travel' },
  { value: 'fitness', label: '\u{1F4AA} Fitness' },
  { value: 'legal', label: '\u{2696}\u{FE0F} Legal' },
  { value: 'auto', label: '\u{1F697} Automotive' },
];

const NICHE_MAP: Record<string, { label: string; icon: string }> = {
  dental: { label: 'Dental', icon: '\u{1F9B7}' },
  beauty: { label: 'Beauty & Spa', icon: '\u{1F485}' },
  restaurant: { label: 'Restaurant', icon: '\u{1F355}' },
  real_estate: { label: 'Real Estate', icon: '\u{1F3E0}' },
  ecommerce: { label: 'E-Commerce', icon: '\u{1F6D2}' },
  saas: { label: 'SaaS & Tech', icon: '\u{1F4BB}' },
  hotel: { label: 'Hotel & Travel', icon: '\u{1F3E8}' },
  fitness: { label: 'Fitness', icon: '\u{1F4AA}' },
  legal: { label: 'Legal', icon: '\u{2696}\u{FE0F}' },
  auto: { label: 'Automotive', icon: '\u{1F697}' },
};

export default function PublishTemplatePage() {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [niche, setNiche] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [themeJson, setThemeJson] = useState<Record<string, unknown>>({});
  const [configJson, setConfigJson] = useState<Record<string, unknown>>({});

  useEffect(() => {
    async function loadWidgets() {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.success) setWidgets(data.data || []);
      } catch {
        // Network error
      }
      setLoading(false);
    }
    loadWidgets();
  }, []);

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }

  function handleWidgetSelect(widgetId: string) {
    setSelectedWidget(widgetId);
    const widget = widgets.find((w) => w._id === widgetId || w.clientId === widgetId);
    if (widget) {
      setThemeJson({});
      setConfigJson({});
      if (!name && widget.name) {
        setName(widget.name);
      }
    }
  }

  const isFormValid = selectedWidget && name.trim() && shortDescription.trim() && niche;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          shortDescription: shortDescription.trim(),
          niche,
          widgetType: 'ai_chat',
          tags,
          themeJson,
          configJson,
          knowledgeSample: '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      }
    } catch {
      // Network error
    }
    setSubmitting(false);
  }

  const selectedWidgetData = widgets.find((w) => w._id === selectedWidget || w.clientId === selectedWidget);

  const fadeIn = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  };

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20"
          >
            <Check className="h-10 w-10 text-emerald-400" strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-text-primary text-2xl font-bold">Template Submitted for Review!</h2>
          <p className="text-text-secondary mt-3 leading-relaxed">
            We&apos;ll notify you when it&apos;s published. This usually takes 1-2 business days.
          </p>
          <Link
            href="/dashboard/marketplace"
            className="bg-accent mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Back Link */}
      <motion.div {...fadeIn} className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Link
          href="/dashboard/marketplace"
          className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </motion.div>

      {/* Hero */}
      <motion.div
        {...fadeIn}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="text-accent h-5 w-5" />
          <span className="text-accent text-sm font-medium">Publish</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Publish to Marketplace
          </span>
        </h1>
        <p className="text-text-secondary mt-2">Share your widget template with the community</p>
      </motion.div>

      {/* Main Content: Form + Preview */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <form onSubmit={handleSubmit}>
              <div className="border-border bg-bg-secondary/50 space-y-8 rounded-2xl border p-8 backdrop-blur-sm">
                {/* Select Widget Section */}
                <div>
                  <h2 className="text-text-primary mb-1 text-lg font-semibold">Select Widget</h2>
                  <p className="text-text-secondary mb-4 text-sm">Choose a widget to use as the template base</p>

                  {loading ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border-border bg-bg-primary/50 animate-pulse rounded-xl border p-4">
                          <div className="bg-border mb-2 h-4 w-3/4 rounded" />
                          <div className="bg-border h-3 w-1/2 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : widgets.length === 0 ? (
                    <div className="border-border bg-bg-primary/50 rounded-xl border p-6 text-center">
                      <p className="text-text-secondary text-sm">No widgets found. Create a widget first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {widgets.map((widget) => {
                        const id = widget._id || widget.clientId;
                        const isSelected = selectedWidget === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleWidgetSelect(id)}
                            className={`group relative rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? 'border-accent bg-accent/5 ring-accent/30 ring-1'
                                : 'border-border bg-bg-primary/50 hover:border-accent/40'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="widget-check"
                                className="bg-accent absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                              >
                                <Check className="h-3 w-3 text-white" />
                              </motion.div>
                            )}
                            <p className="text-text-primary truncate text-sm font-medium">
                              {widget.name || widget.clientId}
                            </p>
                            <p className="text-text-secondary mt-0.5 truncate text-xs">{widget.clientId}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-border border-t" />

                {/* Template Details */}
                <div className="space-y-5">
                  <h2 className="text-text-primary mb-1 text-lg font-semibold">Template Details</h2>

                  {/* Template Name */}
                  <div>
                    <label className="text-text-primary mb-1.5 block text-sm font-medium">
                      Template Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Modern Dental Assistant"
                      className="border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-accent w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {/* Short Description */}
                  <div>
                    <label className="text-text-primary mb-1.5 block text-sm font-medium">
                      Short Description <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={shortDescription}
                        onChange={(e) => {
                          if (e.target.value.length <= 120) setShortDescription(e.target.value);
                        }}
                        placeholder="A brief tagline for your template"
                        className="border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-accent w-full rounded-xl border px-4 py-3 pr-16 text-sm transition-colors focus:ring-1 focus:outline-none"
                      />
                      <span
                        className={`absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums ${
                          shortDescription.length >= 110 ? 'text-amber-400' : 'text-text-secondary/60'
                        }`}
                      >
                        {shortDescription.length}/120
                      </span>
                    </div>
                  </div>

                  {/* Full Description */}
                  <div>
                    <label className="text-text-primary mb-1.5 block text-sm font-medium">Full Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe what makes this template special, its features, and ideal use cases..."
                      className="border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-accent w-full resize-none rounded-xl border px-4 py-3 text-sm transition-colors focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {/* Niche */}
                  <div>
                    <label className="text-text-primary mb-1.5 block text-sm font-medium">
                      Niche <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="border-border bg-bg-primary text-text-primary focus:border-accent focus:ring-accent w-full appearance-none rounded-xl border px-4 py-3 text-sm transition-colors focus:ring-1 focus:outline-none"
                    >
                      <option value="" disabled>
                        Select a niche...
                      </option>
                      {NICHES.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-text-primary mb-1.5 block text-sm font-medium">
                      Tags
                      <span className="text-text-secondary ml-1.5 text-xs font-normal">(up to 10)</span>
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <AnimatePresence mode="popLayout">
                        {tags.map((tag) => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            layout
                            className="border-accent/20 bg-accent/5 text-accent inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:bg-accent/10 ml-0.5 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={tags.length >= 10 ? 'Maximum tags reached' : 'Type a tag and press Enter'}
                      disabled={tags.length >= 10}
                      className="border-border bg-bg-primary text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-accent w-full rounded-xl border px-4 py-3 text-sm transition-colors focus:ring-1 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-6 flex items-center gap-4"
              >
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="bg-accent inline-flex items-center gap-2 rounded-xl px-8 py-3 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for Review'
                  )}
                </button>
                {!isFormValid && !submitting && (
                  <p className="text-text-secondary text-xs">Fill in all required fields to submit</p>
                )}
              </motion.div>
            </form>
          </motion.div>

          {/* Live Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="sticky top-24">
              <h3 className="text-text-secondary mb-4 text-sm font-semibold tracking-wider uppercase">Live Preview</h3>
              <div className="border-border bg-bg-secondary/50 hover:border-accent/50 hover:shadow-accent/5 overflow-hidden rounded-2xl border backdrop-blur-sm transition-all hover:shadow-lg">
                {/* Color Strip */}
                <div
                  className="h-2 rounded-t-2xl transition-colors"
                  style={{
                    background: selectedWidgetData?.primaryColor || 'var(--color-accent)',
                  }}
                />

                {/* Card Body */}
                <div className="p-5">
                  {/* Badges Row */}
                  <div className="mb-3 flex items-center gap-2">
                    {niche && NICHE_MAP[niche] && (
                      <span className="border-border bg-bg-primary/50 text-text-secondary inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                        <span>{NICHE_MAP[niche].icon}</span>
                        {NICHE_MAP[niche].label}
                      </span>
                    )}
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                      Community
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="text-text-primary text-lg font-semibold">{name || 'Template Name'}</h3>

                  {/* Description */}
                  <p className="text-text-secondary mt-1.5 line-clamp-2 text-sm leading-relaxed">
                    {shortDescription || 'Your short description will appear here'}
                  </p>

                  {/* Stats Row */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={14} className="text-gray-600" />
                        ))}
                        <span className="text-text-secondary ml-1.5 text-xs">(0)</span>
                      </div>
                      <div className="text-text-secondary flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-xs">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="border-border mt-3 border-t pt-3">
                    <span className="text-text-secondary text-xs">by You</span>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-bg-primary/70 text-text-secondary rounded-full px-2 py-0.5 text-[10px] font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview note */}
              <p className="text-text-secondary/60 mt-3 text-center text-xs">
                This is how your template will appear in the marketplace
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
