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
    <div className="mx-auto max-w-xl">
      <AnimatePresence mode="wait">
        {/* --- SUCCESS STATE --- */}
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl border-white/5 p-8 text-center"
          >
            {/* Checkmark */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
              <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="mb-2 text-xl font-bold text-white">{t('success.title')}</h3>
            <p className="mb-4 text-sm text-gray-400">{t('success.desc')}</p>

            {/* Knowledge training indicator */}
            {!knowledgeReady ? (
              <p className="mb-6 flex items-center justify-center gap-1.5 text-xs text-amber-400/80">
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
              <p className="mb-6 flex items-center justify-center gap-1.5 text-xs text-emerald-400/80">
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
                className="mb-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="mb-6 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-white/[0.08] px-8 py-3.5 font-semibold text-gray-500 shadow-none">
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
                {t('success.training')}
              </span>
            )}

            {/* Embed Code */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{t('success.embed')}</span>
                <button
                  onClick={handleCopyEmbed}
                  className="text-xs text-[var(--neon-cyan)] transition-colors hover:text-white"
                >
                  {copied ? t('success.copied') : t('success.copy')}
                </button>
              </div>
              <code className="block text-xs break-all text-gray-300">{result.embedCode}</code>
            </div>

            {/* Generate Another */}
            <button onClick={handleReset} className="mt-6 text-sm text-gray-500 transition-colors hover:text-gray-300">
              {t('success.another')}
            </button>
          </motion.div>
        ) : (
          /* --- FORM STATE --- */
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="glass rounded-2xl border-white/5 p-8"
          >
            {/* URL Input */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-300">{t('form.url.label')}</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('form.url.placeholder')}
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-gray-600 transition-all outline-none focus:border-[var(--neon-cyan)]/40 focus:ring-1 focus:ring-[var(--neon-cyan)]/20 disabled:opacity-50"
              />
            </div>

            {/* Color Picker */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-300">{t('form.color.label')}</label>

              {/* Presets */}
              <div className="mb-3 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    disabled={isLoading}
                    className="group relative h-9 w-9 rounded-xl transition-all hover:scale-110 disabled:opacity-50"
                    style={{ backgroundColor: preset.hex }}
                    title={preset.label}
                  >
                    {primaryColor === preset.hex && (
                      <motion.div
                        layoutId="colorRing"
                        className="absolute -inset-1 rounded-xl border-2 border-white/60"
                      />
                    )}
                  </button>
                ))}

                {/* Custom color picker */}
                <label
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 transition-all hover:border-white/40"
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={isLoading}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: primaryColor }} />
                <span>{primaryColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="mb-8 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{t('form.dark.title')}</p>
                <p className="text-xs text-gray-500">{t('form.dark.desc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDark(!isDark)}
                disabled={isLoading}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${isDark ? 'bg-[var(--neon-cyan)]' : 'bg-gray-600'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
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
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button / Loading */}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl disabled:scale-100 disabled:opacity-60 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  {/* Spinner */}
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
                  <span className="transition-all">{t(PROGRESS_KEYS[progressIdx])}</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t('form.submit')}
                </span>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-600">{t('form.note')}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
