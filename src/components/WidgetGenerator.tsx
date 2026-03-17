'use client';

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';

const COLOR_PRESETS = [
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#059669', label: 'Green' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#0891B2', label: 'Cyan' },
  { hex: '#4B5563', label: 'Gray' },
];

interface GenerateResult {
  clientId: string;
  demoUrl: string;
  embedCode: string;
}

export default function WidgetGenerator() {
  const { t } = useTranslation('generator');
  const [url, setUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [knowledgeReady, setKnowledgeReady] = useState(false);

  const PROGRESS_KEYS = ['progress.0', 'progress.1', 'progress.2', 'progress.3', 'progress.4'];

  // Rotate progress messages during loading
  useEffect(() => {
    if (!isLoading) {
      setProgressIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setProgressIdx((prev) => Math.min(prev + 1, PROGRESS_KEYS.length - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [isLoading]);

  // Knowledge training timer — flips after ~25s
  useEffect(() => {
    if (!result) {
      setKnowledgeReady(false);
      return;
    }
    const timer = setTimeout(() => setKnowledgeReady(true), 25000);
    return () => clearTimeout(timer);
  }, [result]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      const res = await fetch('/api/generate-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: finalUrl,
          primaryColor,
          isDark,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyEmbed = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setUrl('');
    setProgressIdx(0);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <AnimatePresence mode="wait">
        {/* ── SUCCESS STATE ── */}
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="p-8 text-center md:p-10"
          >
            {/* Checkmark */}
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <svg className="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="mb-1.5 text-lg font-semibold text-gray-900 dark:text-white">{t('success.title')}</h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-white/40">{t('success.desc')}</p>

            {/* Knowledge training indicator */}
            {!knowledgeReady ? (
              <p className="mb-6 flex items-center justify-center gap-2 text-xs text-amber-500 dark:text-amber-400/70">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('success.training')}
              </p>
            ) : (
              <p className="mb-6 flex items-center justify-center gap-2 text-xs text-emerald-500 dark:text-emerald-400/70">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {t('success.trained')}
              </p>
            )}

            {/* Demo Link */}
            {knowledgeReady ? (
              <a
                href={result.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-6 inline-flex items-center gap-2.5 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 dark:bg-white dark:text-[#080810] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {t('success.preview')}
              </a>
            ) : (
              <span className="mb-6 inline-flex cursor-not-allowed items-center gap-2.5 rounded-xl bg-gray-100 px-8 py-3.5 text-sm font-semibold text-gray-400 dark:bg-white/[0.05] dark:text-white/25">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('success.training')}
              </span>
            )}

            {/* Embed Code */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-left dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 dark:text-white/30">{t('success.embed')}</span>
                <button
                  onClick={handleCopyEmbed}
                  className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {copied ? t('success.copied') : t('success.copy')}
                </button>
              </div>
              <code className="block text-xs leading-relaxed break-all text-gray-600 dark:text-white/45">
                {result.embedCode}
              </code>
            </div>

            {/* Generate Another */}
            <button
              onClick={handleReset}
              className="mt-6 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
            >
              {t('success.another')}
            </button>
          </motion.div>
        ) : (
          /* ── FORM STATE ── */
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            onSubmit={handleSubmit}
            className="p-8 md:p-10"
          >
            {/* URL Input */}
            <div className="mb-7">
              <label className="mb-2.5 block text-[13px] font-medium tracking-wide text-gray-500 dark:text-white/50">
                {t('form.url.label')}
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-blue-400/60 dark:text-white/20">
                  <svg
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t('form.url.placeholder')}
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pr-4 pl-12 text-[15px] text-gray-900 placeholder-gray-400 transition-all outline-none focus:border-blue-500/30 focus:bg-white focus:ring-1 focus:ring-blue-500/15 disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-white/20 dark:focus:bg-white/[0.05]"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div className="mb-7">
              <label className="mb-3 block text-[13px] font-medium tracking-wide text-gray-500 dark:text-white/50">
                {t('form.color.label')}
              </label>

              {/* Presets */}
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    disabled={isLoading}
                    className={`relative h-9 w-9 rounded-xl transition-all duration-200 disabled:opacity-40 ${
                      primaryColor === preset.hex
                        ? 'scale-105 ring-2 ring-gray-400 ring-offset-2 ring-offset-white dark:ring-white/40 dark:ring-offset-[#0c0c1a]'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.label}
                  />
                ))}

                {/* Custom color picker */}
                <label
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 transition-all hover:border-gray-400 dark:border-white/15 dark:hover:border-white/30"
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={isLoading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <svg
                    className="h-4 w-4 text-gray-400 dark:text-white/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                </label>
              </div>

              {/* Current color display */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-white/25">
                <div className="h-3.5 w-3.5 rounded" style={{ backgroundColor: primaryColor }} />
                <span>{primaryColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="mb-9 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">{t('form.dark.title')}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-white/30">{t('form.dark.desc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDark(!isDark)}
                disabled={isLoading}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-300 disabled:opacity-40 ${
                  isDark ? 'bg-blue-600' : 'bg-gray-200 dark:bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="group relative w-full overflow-hidden rounded-xl bg-blue-600 py-4 text-[15px] font-semibold text-white shadow-lg transition-all duration-300 hover:bg-blue-700 disabled:opacity-30 disabled:shadow-none dark:bg-white dark:text-[#080810] dark:shadow-[0_0_40px_rgba(255,255,255,0.06)] dark:hover:shadow-[0_0_60px_rgba(255,255,255,0.1)]"
            >
              {/* Subtle shimmer overlay on hover */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {isLoading ? (
                <span className="relative flex items-center justify-center gap-3">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{t(PROGRESS_KEYS[progressIdx])}</span>
                </span>
              ) : (
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('form.submit')}
                </span>
              )}
            </button>

            <p className="mt-5 text-center text-xs text-gray-400 dark:text-white/20">{t('form.note')}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
