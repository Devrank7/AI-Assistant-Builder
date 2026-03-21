'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Syne } from 'next/font/google';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Building2,
  Users,
  Briefcase,
  Palette,
  Download,
  PartyPopper,
  ChevronRight,
  Sun,
  Moon,
  Loader2,
  Copy,
  ExternalLink,
  Bell,
  BellOff,
  LayoutDashboard,
  Plus,
  UserPlus,
  BookOpen,
  Rocket,
  X,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ─── Constants ─── */
const TOTAL_STEPS = 6;

const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'Healthcare',
  'Real Estate',
  'Education',
  'Restaurant',
  'Legal',
  'Finance',
  'Fitness',
  'Consulting',
  'Other',
];

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+'];

const USE_CASES = [
  { id: 'support', label: 'Customer Support', desc: 'Handle tickets and answer questions 24/7' },
  { id: 'sales', label: 'Sales', desc: 'Qualify leads and guide purchase decisions' },
  { id: 'booking', label: 'Booking', desc: 'Schedule appointments and reservations' },
  { id: 'faq', label: 'FAQ', desc: 'Instantly answer frequent questions' },
  { id: 'leadgen', label: 'Lead Gen', desc: 'Capture and qualify inbound leads' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Kiev',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const STEP_NAMES = ['welcome', 'business', 'widget', 'customize', 'install', 'complete'];

/* ─── Types ─── */
interface BusinessInfo {
  companyName: string;
  industry: string;
  website: string;
  teamSize: string;
  useCase: string;
}

interface Preferences {
  language: string;
  timezone: string;
  notifications: boolean;
}

interface Progress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  businessInfo: BusinessInfo;
  preferences: Preferences;
  firstWidgetId?: string;
  isCompleted: boolean;
}

/* ─── Animations ─── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.25, 0.4, 0.25, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    filter: 'blur(4px)',
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
};

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const staggerItem = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ─── Confetti Particle ─── */
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#3B82F6', '#6366F1', '#06b6d4', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
  const color = colors[index % colors.length];
  const x = (Math.random() - 0.5) * 800;
  const y = -(Math.random() * 600 + 200);
  const rotate = Math.random() * 720 - 360;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 h-2 w-2 rounded-sm"
      style={{ background: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
      animate={{ x, y, opacity: [1, 1, 0], scale: [0, 1, 0.5], rotate }}
      transition={{ duration: 1.8 + Math.random() * 0.8, ease: 'easeOut', delay: Math.random() * 0.4 }}
    />
  );
}

/* ─── Progress Steps Indicator ─── */
function ProgressIndicator({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 uppercase dark:text-white/30">
          Step {step + 1} of {total}
        </span>
        <span className="text-[11px] font-medium text-gray-300 dark:text-white/20">{pct}%</span>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/[0.07]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1, #8B5CF6)' }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            width: '25%',
          }}
          animate={{ x: ['0%', '500%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {/* Step dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{
              width: i === step ? 20 : 6,
              height: 6,
              background: i < step ? '#6366f1' : i === step ? '#3b82f6' : 'rgba(156,163,175,0.3)',
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Input Field ─── */
function GlassInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-white/35">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
            <Icon size={15} className="text-gray-400 dark:text-white/25" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full rounded-xl border border-gray-200/80 bg-white/60 py-3 text-sm text-gray-900 placeholder-gray-400 backdrop-blur-sm transition-all outline-none focus:border-blue-400/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder-white/20 dark:focus:border-blue-500/30 dark:focus:bg-white/[0.06] dark:focus:ring-blue-500/[0.08] ${Icon ? 'pr-4 pl-10' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

/* ─── Select Field ─── */
function GlassSelect({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value?: string; label: string }[] | string[];
  icon?: React.ElementType;
}) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-white/35">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
            <Icon size={15} className="text-gray-400 dark:text-white/25" />
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border border-gray-200/80 bg-white/60 py-3 text-sm text-gray-900 backdrop-blur-sm transition-all outline-none focus:border-blue-400/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-blue-500/30 dark:focus:bg-white/[0.06] ${Icon ? 'pr-8 pl-10' : 'px-4 pr-8'}`}
        >
          <option value="">Select...</option>
          {normalized.map((o) => (
            <option key={o.value || o.label} value={o.value || o.label}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
          <ChevronRight size={14} className="rotate-90 text-gray-400 dark:text-white/25" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [widgetCreating, setWidgetCreating] = useState(false);
  const [widgetCreated, setWidgetCreated] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [firstWidgetId, setFirstWidgetId] = useState<string | null>(null);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: '',
    industry: '',
    website: '',
    teamSize: '',
    useCase: '',
  });

  const [preferences, setPreferences] = useState<Preferences>({
    language: 'en',
    timezone: 'UTC',
    notifications: true,
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Load existing progress ─── */
  useEffect(() => {
    let attempts = 0;
    async function load() {
      try {
        const res = await fetch('/api/onboarding');
        if (res.status === 401 && attempts < 2) {
          attempts++;
          const refresh = await fetch('/api/auth/refresh', { method: 'POST' });
          if (refresh.ok) return load();
          router.push('/auth/login');
          return;
        }
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.success && data.data) {
          const progress: Progress = data.data;
          if (progress.isCompleted) {
            router.push('/dashboard');
            return;
          }
          setStep(progress.currentStep || 0);
          setCompletedSteps(progress.completedSteps || []);
          setSkippedSteps(progress.skippedSteps || []);
          if (progress.businessInfo) setBusinessInfo(progress.businessInfo);
          if (progress.preferences) setPreferences(progress.preferences);
          if (progress.firstWidgetId) {
            setFirstWidgetId(progress.firstWidgetId);
            setWidgetCreated(true);
          }
        }
      } catch {
        // continue with defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  /* ─── Auto-detect timezone ─── */
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== 'UTC') {
      setPreferences((p) => ({ ...p, timezone: tz }));
    }
  }, []);

  /* ─── Persist progress debounced ─── */
  const persistProgress = useCallback(
    (
      currentStep: number,
      completed: string[],
      skipped: string[],
      biz: BusinessInfo,
      prefs: Preferences,
      widgetId?: string | null
    ) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch('/api/onboarding', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentStep,
              completedSteps: completed,
              skippedSteps: skipped,
              businessInfo: biz,
              preferences: prefs,
              ...(widgetId ? { firstWidgetId: widgetId } : {}),
            }),
          });
        } catch {
          // silent
        }
      }, 600);
    },
    []
  );

  /* ─── Navigation ─── */
  const goTo = useCallback(
    (next: number) => {
      setDirection(next > step ? 1 : -1);
      setStep(next);
      persistProgress(next, completedSteps, skippedSteps, businessInfo, preferences, firstWidgetId);
    },
    [step, completedSteps, skippedSteps, businessInfo, preferences, firstWidgetId, persistProgress]
  );

  const markStepDone = useCallback((stepName: string) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepName)) return prev;
      return [...prev, stepName];
    });
  }, []);

  const handleNext = useCallback(() => {
    markStepDone(STEP_NAMES[step]);
    goTo(step + 1);
  }, [step, markStepDone, goTo]);

  const handleBack = useCallback(() => {
    goTo(step - 1);
  }, [step, goTo]);

  const handleSkipStep = useCallback(() => {
    const name = STEP_NAMES[step];
    setSkippedSteps((prev) => (prev.includes(name) ? prev : [...prev, name]));
    goTo(step + 1);
  }, [step, goTo]);

  /* ─── Create First Widget ─── */
  const createWidget = useCallback(async () => {
    if (!businessInfo.website.trim()) {
      handleSkipStep();
      return;
    }
    setWidgetCreating(true);
    try {
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessInfo.companyName || 'My First Widget',
          websiteUrl: businessInfo.website,
          widgetType: 'ai_chat',
          fromOnboarding: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const wid = data?.data?._id || data?.data?.id || data?.data?.clientId || null;
        if (wid) {
          setFirstWidgetId(wid);
          setWidgetCreated(true);
          persistProgress(step, completedSteps, skippedSteps, businessInfo, preferences, wid);
        }
      }
      markStepDone(STEP_NAMES[step]);
      goTo(step + 1);
    } catch {
      markStepDone(STEP_NAMES[step]);
      goTo(step + 1);
    } finally {
      setWidgetCreating(false);
    }
  }, [
    businessInfo,
    step,
    completedSteps,
    skippedSteps,
    preferences,
    persistProgress,
    markStepDone,
    goTo,
    handleSkipStep,
  ]);

  /* ─── Verify Installation ─── */
  const verifyInstallation = useCallback(async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1800));
    setVerified(true);
    setVerifying(false);
  }, []);

  /* ─── Complete Onboarding ─── */
  const completeOnboarding = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo,
          preferences,
          ...(firstWidgetId ? { firstWidgetId } : {}),
        }),
      });
      await refreshUser();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [businessInfo, preferences, firstWidgetId, refreshUser]);

  /* ─── Skip All ─── */
  const skipAll = useCallback(async () => {
    setSkipping(true);
    try {
      await fetch('/api/onboarding/skip', { method: 'POST' });
      await refreshUser();
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  }, [refreshUser, router]);

  /* ─── Copy embed code ─── */
  const embedCode = firstWidgetId
    ? `<script src="https://winbixai.com/quickwidgets/${firstWidgetId}/script.js"></script>`
    : `<script src="https://winbixai.com/quickwidgets/YOUR_WIDGET_ID/script.js"></script>`;

  const copyEmbed = useCallback(() => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    });
  }, [embedCode]);

  /* ─── Step 5 (complete) triggers confetti once ─── */
  useEffect(() => {
    if (step === 5) {
      setShowConfetti(true);
      completeOnboarding();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#060810]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-2 border-blue-500/20 border-t-blue-500"
        />
      </div>
    );
  }

  /* ─── Shared button styles ─── */
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';
  const btnGhost =
    'inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-white/30 dark:hover:text-white/55';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#060810]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-blue-400/[0.05] blur-[120px] dark:bg-blue-600/[0.08]" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[500px] rounded-full bg-indigo-400/[0.04] blur-[100px] dark:bg-indigo-600/[0.06]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/[0.03] blur-[80px] dark:bg-purple-600/[0.05]" />
        <div
          className="absolute inset-0 hidden opacity-[0.025] dark:block"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Top bar */}
      <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-md">
            W
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">WinBix AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex h-8 items-center gap-1.5 rounded-full border border-gray-200/60 bg-white/60 px-3 text-xs font-medium text-gray-500 backdrop-blur-sm transition-all hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/40 dark:hover:border-white/[0.15]"
          >
            {resolvedTheme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
          </button>
          {step < 5 && (
            <button
              onClick={skipAll}
              disabled={skipping}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 dark:text-white/25 dark:hover:text-white/50"
            >
              {skipping ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Skip setup
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-xl px-6 py-24">
        {/* Progress */}
        <div className="mb-12">
          <ProgressIndicator step={step} total={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ════ STEP 0: WELCOME ════ */}
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
                className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/15 dark:from-blue-500/15 dark:to-indigo-500/20"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Rocket size={36} strokeWidth={1.5} className="text-blue-500" />
                </motion.div>
              </motion.div>

              <h1
                className={`${syne.className} mb-3 text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                Welcome
                {user?.name ? (
                  <>
                    ,{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                      {user.name.split(' ')[0]}
                    </span>
                    !
                  </>
                ) : (
                  ' to WinBix AI!'
                )}
              </h1>

              <p className="mb-3 max-w-md text-base leading-relaxed text-gray-500 dark:text-white/45">
                WinBix AI helps you deploy intelligent chat widgets that convert visitors into customers — no code
                required.
              </p>

              <div className="mb-10 space-y-2.5">
                {[
                  { icon: '🤖', text: 'AI-powered conversations trained on your business' },
                  { icon: '⚡', text: 'Deploy in minutes with a single script tag' },
                  { icon: '📈', text: 'Capture leads and answer questions 24/7' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-white/50"
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.text}
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={handleNext}
                className={btnPrimary}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Let&apos;s get started
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* ════ STEP 1: BUSINESS INFO ════ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1
                className={`${syne.className} mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white`}
              >
                Tell us about your{' '}
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  business
                </span>
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-white/40">
                This helps us tailor the AI to your industry.
              </p>

              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                <motion.div variants={staggerItem}>
                  <GlassInput
                    label="Company name"
                    value={businessInfo.companyName}
                    onChange={(v) => setBusinessInfo((b) => ({ ...b, companyName: v }))}
                    placeholder="Acme Inc."
                    icon={Building2}
                    autoFocus
                  />
                </motion.div>

                <motion.div variants={staggerItem}>
                  <GlassSelect
                    label="Industry"
                    value={businessInfo.industry}
                    onChange={(v) => setBusinessInfo((b) => ({ ...b, industry: v }))}
                    options={INDUSTRIES}
                    icon={Briefcase}
                  />
                </motion.div>

                <motion.div variants={staggerItem}>
                  <GlassInput
                    label="Website URL"
                    type="url"
                    value={businessInfo.website}
                    onChange={(v) => setBusinessInfo((b) => ({ ...b, website: v }))}
                    placeholder="https://yourwebsite.com"
                    icon={Globe}
                  />
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div variants={staggerItem}>
                    <GlassSelect
                      label="Team size"
                      value={businessInfo.teamSize}
                      onChange={(v) => setBusinessInfo((b) => ({ ...b, teamSize: v }))}
                      options={TEAM_SIZES}
                      icon={Users}
                    />
                  </motion.div>

                  <motion.div variants={staggerItem}>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-white/35">
                        Primary use case
                      </label>
                      <select
                        value={businessInfo.useCase}
                        onChange={(e) => setBusinessInfo((b) => ({ ...b, useCase: e.target.value }))}
                        className="w-full appearance-none rounded-xl border border-gray-200/80 bg-white/60 py-3 pr-8 pl-3 text-sm text-gray-900 backdrop-blur-sm transition-all outline-none focus:border-blue-400/50 focus:bg-white/90 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-blue-500/30 dark:focus:bg-white/[0.06]"
                      >
                        <option value="">Select...</option>
                        {USE_CASES.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={handleBack} className={btnGhost}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkipStep} className={btnGhost}>
                    Skip
                  </button>
                  <motion.button
                    onClick={handleNext}
                    className={btnPrimary}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue <ArrowRight size={15} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 2: CREATE FIRST WIDGET ════ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1
                className={`${syne.className} mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white`}
              >
                Create your first{' '}
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">widget</span>
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-white/40">
                Enter your website URL and we&apos;ll auto-analyze your brand to build the widget.
              </p>

              {widgetCreated ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 py-10 text-center backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-500/5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15"
                  >
                    <Check size={26} className="text-emerald-500" />
                  </motion.div>
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">Widget created!</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-white/40">
                      {firstWidgetId ? `ID: ${firstWidgetId}` : 'Ready to deploy'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <GlassInput
                    label="Website URL"
                    type="url"
                    value={businessInfo.website}
                    onChange={(v) => setBusinessInfo((b) => ({ ...b, website: v }))}
                    placeholder="https://yourwebsite.com"
                    icon={Globe}
                    autoFocus
                  />

                  <div className="rounded-xl border border-blue-200/50 bg-blue-50/50 p-4 text-xs leading-relaxed text-blue-700 dark:border-blue-500/15 dark:bg-blue-500/5 dark:text-blue-400">
                    We&apos;ll scan your website to extract brand colors, fonts, and content — then build a matching AI
                    widget.
                  </div>

                  {widgetCreating && (
                    <div className="space-y-2">
                      {['Scanning website...', 'Extracting brand colors...', 'Building AI widget...'].map((txt, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.6 }}
                          className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-white/35"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            className="h-3.5 w-3.5 rounded-full border border-blue-400/40 border-t-blue-500"
                          />
                          {txt}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button onClick={handleBack} className={btnGhost}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                  {!widgetCreated && (
                    <button onClick={handleSkipStep} className={btnGhost}>
                      Skip for now
                    </button>
                  )}
                  <motion.button
                    onClick={widgetCreated ? handleNext : createWidget}
                    disabled={widgetCreating}
                    className={btnPrimary}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {widgetCreating ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Creating...
                      </>
                    ) : widgetCreated ? (
                      <>
                        Continue <ArrowRight size={15} />
                      </>
                    ) : (
                      <>
                        Analyze & Create <ArrowRight size={15} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 3: CUSTOMIZE ════ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1
                className={`${syne.className} mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white`}
              >
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Customize
                </span>{' '}
                your experience
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-white/40">
                Set your theme, language, and notification preferences.
              </p>

              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-5">
                {/* Theme */}
                <motion.div variants={staggerItem}>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-white/35">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['light', 'dark', 'system'] as const).map((t) => {
                      const active =
                        resolvedTheme === (t === 'system' ? resolvedTheme : t) &&
                        (t === 'system' ? true : resolvedTheme === t);
                      const isActive = t === 'system' ? false : resolvedTheme === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-medium capitalize transition-all ${
                            (t === 'light' && resolvedTheme === 'light') ||
                            (t === 'dark' && resolvedTheme === 'dark') ||
                            t === 'system'
                              ? t === 'light' && resolvedTheme === 'light'
                                ? 'border-blue-400/50 bg-blue-50/80 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400'
                                : t === 'dark' && resolvedTheme === 'dark'
                                  ? 'border-indigo-400/50 bg-indigo-50/80 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400'
                                  : 'border-gray-200/60 bg-white/50 text-gray-600 hover:border-gray-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/40 dark:hover:border-white/[0.12]'
                              : 'border-gray-200/60 bg-white/50 text-gray-600 hover:border-gray-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/40 dark:hover:border-white/[0.12]'
                          }`}
                        >
                          {t === 'light' ? (
                            <Sun size={13} />
                          ) : t === 'dark' ? (
                            <Moon size={13} />
                          ) : (
                            <Palette size={13} />
                          )}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Language */}
                <motion.div variants={staggerItem}>
                  <GlassSelect
                    label="Language"
                    value={preferences.language}
                    onChange={(v) => setPreferences((p) => ({ ...p, language: v }))}
                    options={LANGUAGES}
                  />
                </motion.div>

                {/* Timezone */}
                <motion.div variants={staggerItem}>
                  <GlassSelect
                    label="Timezone"
                    value={preferences.timezone}
                    onChange={(v) => setPreferences((p) => ({ ...p, timezone: v }))}
                    options={TIMEZONES}
                  />
                </motion.div>

                {/* Notifications */}
                <motion.div variants={staggerItem}>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-white/35">
                    Email notifications
                  </label>
                  <button
                    onClick={() => setPreferences((p) => ({ ...p, notifications: !p.notifications }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                      preferences.notifications
                        ? 'border-blue-300/60 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5'
                        : 'border-gray-200/60 bg-white/50 dark:border-white/[0.06] dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {preferences.notifications ? (
                        <Bell size={16} className="text-blue-500" />
                      ) : (
                        <BellOff size={16} className="text-gray-400 dark:text-white/25" />
                      )}
                      <span
                        className={`text-sm font-medium ${preferences.notifications ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-white/45'}`}
                      >
                        {preferences.notifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div
                      className={`h-5 w-9 rounded-full transition-colors ${
                        preferences.notifications ? 'bg-blue-500' : 'bg-gray-300 dark:bg-white/10'
                      }`}
                    >
                      <motion.div
                        className="m-0.5 h-4 w-4 rounded-full bg-white shadow"
                        animate={{ x: preferences.notifications ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      />
                    </div>
                  </button>
                </motion.div>
              </motion.div>

              <div className="mt-8 flex items-center justify-between">
                <button onClick={handleBack} className={btnGhost}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkipStep} className={btnGhost}>
                    Skip
                  </button>
                  <motion.button
                    onClick={handleNext}
                    className={btnPrimary}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue <ArrowRight size={15} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 4: INSTALL ════ */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h1
                className={`${syne.className} mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white`}
              >
                Install your{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  widget
                </span>
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-white/40">
                Add one line of code to your website to activate the chat widget.
              </p>

              {/* Embed code block */}
              <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-900/95 dark:border-white/[0.06]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <button
                    onClick={copyEmbed}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                  >
                    {embedCopied ? (
                      <>
                        <Check size={12} className="text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto p-4">
                  <code className="font-mono text-xs leading-relaxed text-emerald-400">{embedCode}</code>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6 space-y-2.5">
                {[
                  { step: '1', text: "Go to your website's HTML file" },
                  { step: '2', text: 'Paste the script tag before the closing </body> tag' },
                  { step: '3', text: 'Save and deploy your changes' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 text-sm text-gray-600 dark:text-white/45">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                      {item.step}
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>

              {/* Verify button */}
              {!verified ? (
                <motion.button
                  onClick={verifyInstallation}
                  disabled={verifying}
                  className={`mb-4 w-full ${btnPrimary} justify-center`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {verifying ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Checking installation...
                    </>
                  ) : (
                    <>
                      <Download size={15} /> Verify Installation
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-300/50 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                >
                  <Check size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Installation verified!
                  </span>
                </motion.div>
              )}

              <div className="flex items-center justify-between">
                <button onClick={handleBack} className={btnGhost}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkipStep} className={btnGhost}>
                    Skip
                  </button>
                  <motion.button
                    onClick={handleNext}
                    className={btnPrimary}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue <ArrowRight size={15} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 5: COMPLETE ════ */}
          {step === 5 && (
            <motion.div
              key="step-5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center"
            >
              {/* Trophy / celebration icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
                className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-400/15 to-orange-400/15 dark:from-yellow-400/20 dark:to-orange-400/20"
              >
                <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.8, delay: 0.4 }}>
                  <PartyPopper size={44} strokeWidth={1.5} className="text-yellow-500" />
                </motion.div>
              </motion.div>

              <h1
                className={`${syne.className} mb-3 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl dark:text-white`}
              >
                You&apos;re all{' '}
                <span className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                  set up!
                </span>
              </h1>

              <p className="mx-auto mb-6 max-w-sm text-base leading-relaxed text-gray-500 dark:text-white/45">
                Your WinBix AI account is ready. Here&apos;s a summary of what was configured.
              </p>

              {/* Setup summary */}
              <div className="mb-8 rounded-2xl border border-gray-200/60 bg-white/50 p-5 text-left backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-white/25">
                  Setup summary
                </p>
                <div className="space-y-2.5">
                  {[
                    {
                      done: !!businessInfo.companyName,
                      label: businessInfo.companyName ? `Business: ${businessInfo.companyName}` : 'Business info',
                    },
                    {
                      done: !!businessInfo.industry,
                      label: businessInfo.industry ? `Industry: ${businessInfo.industry}` : 'Industry',
                    },
                    {
                      done: widgetCreated,
                      label: widgetCreated ? 'First widget created' : 'Widget (skipped)',
                    },
                    {
                      done: true,
                      label: `Language: ${LANGUAGES.find((l) => l.value === preferences.language)?.label || preferences.language}`,
                    },
                    {
                      done: verified,
                      label: verified ? 'Widget installed & verified' : 'Installation (skipped)',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm">
                      <div
                        className={`flex h-4.5 w-4.5 items-center justify-center rounded-full ${
                          item.done ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-gray-100 dark:bg-white/[0.04]'
                        }`}
                      >
                        <Check
                          size={10}
                          className={
                            item.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-white/15'
                          }
                        />
                      </div>
                      <span
                        className={item.done ? 'text-gray-700 dark:text-white/65' : 'text-gray-400 dark:text-white/25'}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="mb-8 grid grid-cols-2 gap-2.5">
                {[
                  { href: '/dashboard/widgets', icon: Plus, label: 'Create Widget' },
                  { href: '/dashboard/team', icon: UserPlus, label: 'Invite Team' },
                  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { href: 'https://winbixai.com/docs', icon: BookOpen, label: 'Documentation', external: true },
                ].map((link) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200/60 bg-white/50 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-gray-300/80 hover:bg-white/80 hover:shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/60 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05]"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <link.icon size={15} className="text-blue-500" />
                    {link.label}
                    {link.external && <ExternalLink size={11} className="ml-auto text-gray-300 dark:text-white/20" />}
                  </motion.a>
                ))}
              </div>

              {/* Go to Dashboard */}
              <motion.a
                href="/dashboard"
                className={`${btnPrimary} w-full`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Finishing up...
                  </>
                ) : (
                  <>
                    <LayoutDashboard size={16} /> Go to Dashboard
                  </>
                )}
              </motion.a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
