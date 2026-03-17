'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { WIDGET_TYPES, type WidgetTypeId } from '@/lib/builder/widgetTypes';
import {
  Stethoscope,
  Scissors,
  UtensilsCrossed,
  Building2,
  Monitor,
  ShoppingCart,
  GraduationCap,
  Dumbbell,
  Scale,
  Car,
  TrendingUp,
  Sparkles,
  MessageSquare,
  HelpCircle,
  ClipboardList,
  Rocket,
  ArrowLeft,
  ChevronRight,
  Globe,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

/* ─── Data ─── */
const NICHES = [
  { id: 'dental', label: 'Dental Clinic', icon: Stethoscope, color: '#06b6d4' },
  { id: 'beauty', label: 'Beauty Salon', icon: Scissors, color: '#f472b6' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: '#fb923c' },
  { id: 'realestate', label: 'Real Estate', icon: Building2, color: '#a78bfa' },
  { id: 'saas', label: 'SaaS / Tech', icon: Monitor, color: '#60a5fa' },
  { id: 'ecommerce', label: 'E-Commerce', icon: ShoppingCart, color: '#34d399' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: '#fbbf24' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, color: '#f87171' },
  { id: 'legal', label: 'Legal', icon: Scale, color: '#94a3b8' },
  { id: 'auto', label: 'Auto Service', icon: Car, color: '#fb7185' },
  { id: 'consulting', label: 'Consulting', icon: TrendingUp, color: '#2dd4bf' },
  { id: 'other', label: 'Other', icon: Sparkles, color: '#c084fc' },
];

const WIDGET_ICONS: Record<string, typeof MessageSquare> = {
  ai_chat: MessageSquare,
  smart_faq: HelpCircle,
  lead_form: ClipboardList,
};

const WIDGET_COLORS: Record<string, string> = {
  ai_chat: '#06b6d4',
  smart_faq: '#a78bfa',
  lead_form: '#34d399',
};

/* ─── Animations ─── */
const pageTransition = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
  exit: { opacity: 0, y: -16, filter: 'blur(4px)', transition: { duration: 0.3 } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ─── 3D Tilt Hook ─── */
function useTilt() {
  const [style, setStyle] = useState({});

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`,
      transition: 'transform 0.15s ease-out',
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)',
      transition: 'transform 0.4s ease-out',
    });
  }, []);

  return { style, onMouseMove, onMouseLeave };
}

/* ═══════════════════════════════════════════════
   NICHE CARD — with 3D tilt
   ═══════════════════════════════════════════════ */
function NicheCard({
  niche,
  isSelected,
  onClick,
}: {
  niche: (typeof NICHES)[number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const { style, onMouseMove, onMouseLeave } = useTilt();
  const Icon = niche.icon;

  return (
    <motion.button
      variants={staggerItem}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-5 backdrop-blur-sm transition-colors duration-200 ${
        isSelected
          ? 'border-transparent bg-gradient-to-br from-white/80 to-white/40 shadow-lg dark:from-white/[0.08] dark:to-white/[0.02]'
          : 'border-gray-200/60 bg-white/50 hover:border-gray-300/80 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12]'
      }`}
    >
      {/* Selected glow ring */}
      {isSelected && (
        <motion.div
          layoutId="niche-glow"
          className="absolute -inset-px rounded-2xl"
          style={{ boxShadow: `0 0 20px ${niche.color}25, 0 0 40px ${niche.color}10` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300"
        style={{
          background: isSelected ? `${niche.color}18` : undefined,
        }}
      >
        <Icon
          size={22}
          strokeWidth={1.5}
          className="transition-colors duration-200"
          style={{ color: isSelected ? niche.color : undefined }}
        />
      </div>
      <span className="text-[13px] font-medium text-gray-600 transition-colors group-hover:text-gray-900 dark:text-white/50 dark:group-hover:text-white/80">
        {niche.label}
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ background: niche.color }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [niche, setNiche] = useState<string | null>(null);
  const [widgetType, setWidgetType] = useState<WidgetTypeId>('ai_chat');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche }),
      });
      await refreshUser();
      const params = new URLSearchParams();
      if (widgetType) params.set('widgetType', widgetType);
      if (url) params.set('url', url);
      router.push(`/dashboard/builder?${params.toString()}`);
    } catch {
      router.push('/dashboard/builder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#060810]">
      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-400/[0.06] blur-[120px] dark:bg-blue-600/[0.08]" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[500px] translate-x-1/4 rounded-full bg-indigo-400/[0.05] blur-[100px] dark:bg-indigo-600/[0.06]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.04] blur-[80px] dark:bg-cyan-600/[0.05]" />
        {/* Dot grid — dark mode only */}
        <div
          className="absolute inset-0 hidden opacity-[0.03] dark:block"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ── Top bar: theme toggle + skip ── */}
      <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
            W
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">WinBix AI</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme toggle pill */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex h-8 items-center gap-1.5 rounded-full border border-gray-200/60 bg-white/60 px-3 text-xs font-medium text-gray-500 backdrop-blur-sm transition-all hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/40 dark:hover:border-white/[0.15]"
          >
            {resolvedTheme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={completeOnboarding}
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
          >
            Skip setup
          </button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="relative z-10 w-full max-w-2xl px-6 py-20">
        {/* ── Progress bar ── */}
        <div className="mb-14">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 uppercase dark:text-white/25">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-[11px] font-medium text-gray-300 dark:text-white/15">
              {Math.round(((step + 1) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="relative h-1 overflow-hidden rounded-full bg-gray-200/60 dark:bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)' }}
              initial={false}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const }}
            />
            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full opacity-40"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                width: '30%',
              }}
              initial={false}
              animate={{ x: ['0%', '400%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>

        {/* ── Step content with AnimatePresence ── */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ════════ STEP 0: NICHE ════════ */}
          {step === 0 && (
            <motion.div key="step-0" {...pageTransition}>
              <h1
                className={`${syne.className} mb-3 text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                What&apos;s your{' '}
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  business
                </span>
                ?
              </h1>
              <p className="mb-10 max-w-md text-base leading-relaxed text-gray-500 dark:text-white/40">
                We&apos;ll customize your AI assistant based on your industry.
              </p>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              >
                {NICHES.map((n) => (
                  <NicheCard
                    key={n.id}
                    niche={n}
                    isSelected={niche === n.id}
                    onClick={() => {
                      setNiche(n.id);
                      setTimeout(() => goTo(1), 350);
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ════════ STEP 1: WIDGET TYPE ════════ */}
          {step === 1 && (
            <motion.div key="step-1" {...pageTransition}>
              <h1
                className={`${syne.className} mb-3 text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                What do you want to{' '}
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">build</span>?
              </h1>
              <p className="mb-10 max-w-md text-base leading-relaxed text-gray-500 dark:text-white/40">
                Choose a widget type. You can always create more later.
              </p>

              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                {WIDGET_TYPES.map((type) => {
                  const Icon = WIDGET_ICONS[type.id] || MessageSquare;
                  const color = WIDGET_COLORS[type.id] || '#06b6d4';
                  const isSelected = widgetType === type.id;

                  return (
                    <motion.button
                      key={type.id}
                      variants={staggerItem}
                      onClick={() => {
                        setWidgetType(type.id);
                        setTimeout(() => goTo(2), 350);
                      }}
                      className={`group flex w-full items-center gap-5 rounded-2xl border p-5 text-left backdrop-blur-sm transition-all duration-200 ${
                        isSelected
                          ? 'border-transparent bg-gradient-to-r from-white/80 to-white/50 shadow-lg dark:from-white/[0.06] dark:to-white/[0.02]'
                          : 'border-gray-200/60 bg-white/50 hover:border-gray-300/80 hover:bg-white/80 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04]'
                      }`}
                      style={isSelected ? { boxShadow: `0 0 24px ${color}15` } : undefined}
                    >
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                        style={{ background: isSelected ? `${color}18` : 'var(--wb-bg-tertiary, #f3f4f6)' }}
                      >
                        <Icon
                          size={22}
                          strokeWidth={1.5}
                          className="transition-colors"
                          style={{ color: isSelected ? color : undefined }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{type.label}</span>
                        <span className="block text-xs leading-relaxed text-gray-500 dark:text-white/35">
                          {type.description}
                        </span>
                      </div>
                      <ChevronRight
                        size={18}
                        className="flex-shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-white/15 dark:group-hover:text-white/30"
                      />
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ════════ STEP 2: URL ════════ */}
          {step === 2 && (
            <motion.div key="step-2" {...pageTransition}>
              <h1
                className={`${syne.className} mb-3 text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                Got a{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  website
                </span>
                ?
              </h1>
              <p className="mb-10 max-w-md text-base leading-relaxed text-gray-500 dark:text-white/40">
                We&apos;ll analyze your brand and auto-design the widget. Or skip to build from scratch.
              </p>

              {/* URL Input — glass style */}
              <div className="relative">
                <div className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2">
                  <Globe size={18} className="text-gray-400 dark:text-white/25" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="your-website.com"
                  autoFocus
                  className="w-full rounded-2xl border border-gray-200/80 bg-white/60 py-4 pr-5 pl-13 text-[15px] text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all outline-none focus:border-blue-400/40 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-white/20 dark:focus:border-blue-500/30 dark:focus:bg-white/[0.06] dark:focus:ring-blue-500/10"
                />
              </div>

              {/* Continue button */}
              <motion.button
                onClick={() => goTo(3)}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {url.trim() ? (
                  <>
                    Continue
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                ) : (
                  <>
                    Skip — build from scratch
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* ════════ STEP 3: LAUNCH ════════ */}
          {step === 3 && (
            <motion.div key="step-3" {...pageTransition} className="text-center">
              {/* Animated rocket icon */}
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/15 dark:to-indigo-500/15"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Rocket size={40} strokeWidth={1.5} className="text-blue-500 dark:text-blue-400" />
                </motion.div>
              </motion.div>

              {/* Celebration particles */}
              <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full"
                    style={{
                      background: ['#3B82F6', '#6366F1', '#06b6d4', '#f472b6', '#fbbf24', '#34d399'][i],
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                      x: [0, (i % 2 === 0 ? 1 : -1) * (40 + i * 15)],
                      y: [0, -(30 + i * 12)],
                      opacity: [0, 1, 0],
                      scale: [0, 1.2, 0],
                    }}
                    transition={{ duration: 1.2, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                  />
                ))}
              </div>

              <h1
                className={`${syne.className} mb-4 text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                Ready to{' '}
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  build
                </span>
                !
              </h1>
              <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-gray-500 dark:text-white/40">
                Our AI agents will create your{' '}
                <span className="font-medium text-gray-700 dark:text-white/60">
                  {WIDGET_TYPES.find((t) => t.id === widgetType)?.label || 'widget'}
                </span>{' '}
                in under a minute.
              </p>

              {/* Launch button */}
              <motion.button
                onClick={completeOnboarding}
                disabled={saving}
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? (
                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Zap size={18} className="transition-transform group-hover:scale-110" />
                    Launch Builder
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Back button ── */}
        <AnimatePresence>
          {step > 0 && step < 3 && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => goTo(step - 1)}
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-white/25 dark:hover:text-white/50"
            >
              <ArrowLeft size={14} />
              Back
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
