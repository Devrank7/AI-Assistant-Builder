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
  PartyPopper,
  ChevronRight,
  Sun,
  Moon,
  Loader2,
  ExternalLink,
  Bell,
  BellOff,
  LayoutDashboard,
  Plus,
  UserPlus,
  BookOpen,
  Rocket,
  X,
  MessageSquare,
  BarChart3,
  Plug,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ─── Constants ─── */
const TOTAL_STEPS = 4;

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

const STEP_NAMES = ['welcome', 'profile', 'tour', 'complete'];

/* ─── Tour Slides ─── */
const TOUR_SLIDES = [
  {
    title: 'AI Builder',
    icon: Rocket,
    gradient: 'from-blue-500 to-indigo-500',
    gradientBg: 'from-blue-500/15 to-indigo-500/20',
    description: 'Create your AI chat widget in minutes',
  },
  {
    title: 'Widgets',
    icon: MessageSquare,
    gradient: 'from-cyan-500 to-blue-500',
    gradientBg: 'from-cyan-500/15 to-blue-500/20',
    description: 'Manage and customize all your widgets',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    gradient: 'from-emerald-500 to-teal-500',
    gradientBg: 'from-emerald-500/15 to-teal-500/20',
    description: 'Track conversations, leads & performance',
  },
  {
    title: 'Integrations',
    icon: Plug,
    gradient: 'from-purple-500 to-pink-500',
    gradientBg: 'from-purple-500/15 to-pink-500/20',
    description: 'Connect Telegram, WhatsApp, CRM & more',
  },
  {
    title: 'Knowledge Base',
    icon: BookOpen,
    gradient: 'from-orange-500 to-amber-500',
    gradientBg: 'from-orange-500/15 to-amber-500/20',
    description: 'Train your AI with your business content',
  },
];

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
  const vals = useRef({
    x: 0,
    y: 0,
    rotate: 0,
    duration: 2.2,
    delay: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    vals.current = {
      x: (Math.random() - 0.5) * 800,
      y: -(Math.random() * 600 + 200),
      rotate: Math.random() * 720 - 360,
      duration: 1.8 + Math.random() * 0.8,
      delay: Math.random() * 0.4,
    };
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 h-2 w-2 rounded-sm"
      style={{ background: color }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
      animate={{
        x: vals.current.x,
        y: vals.current.y,
        opacity: [1, 1, 0],
        scale: [0, 1, 0.5],
        rotate: vals.current.rotate,
      }}
      transition={{ duration: vals.current.duration, ease: 'easeOut', delay: vals.current.delay }}
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

/* ─── Mock UI Screens for Tour ─── */
function MockTitleBar() {
  return (
    <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3.5 py-2.5">
      <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
      <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
    </div>
  );
}

function MockAIBuilder() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/40 bg-gray-900/95 dark:border-white/[0.06]">
      <MockTitleBar />
      <div className="space-y-2.5 p-3.5 sm:p-4">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-blue-500/20" />
          <div className="rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2">
            <p className="text-[11px] leading-relaxed text-white/50">
              Hello! I&apos;m your AI assistant. How can I help you today?
            </p>
          </div>
        </div>
        <div className="flex items-start justify-end gap-2.5">
          <div className="rounded-xl rounded-tr-sm bg-blue-500/20 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-blue-300/70">What are your pricing plans?</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full bg-blue-500/20" />
          <div className="rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2">
            <p className="text-[11px] leading-relaxed text-white/50">
              We offer three plans: Starter ($29/mo), Pro ($79/mo), and Enterprise...
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-8 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-8 w-8 rounded-lg bg-blue-500/30" />
        </div>
      </div>
    </div>
  );
}

function MockWidgets() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/40 bg-gray-900/95 dark:border-white/[0.06]">
      <MockTitleBar />
      <div className="space-y-2 p-3.5 sm:p-4">
        {['Support Bot', 'Sales Assistant', 'FAQ Widget'].map((name, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-emerald-400' : 'bg-gray-500'}`}
              />
              <span className="text-[11px] font-medium text-white/60">{name}</span>
            </div>
            <span className="text-[10px] text-white/25">{i === 2 ? 'Draft' : 'Active'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAnalytics() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/40 bg-gray-900/95 dark:border-white/[0.06]">
      <MockTitleBar />
      <div className="p-3.5 sm:p-4">
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Conversations', val: '1,247' },
            { label: 'Leads', val: '89' },
            { label: 'Resolution', val: '94%' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-2 text-center">
              <p className="text-[10px] text-white/30">{s.label}</p>
              <p className="text-sm font-semibold text-white/60">{s.val}</p>
            </div>
          ))}
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {[35, 50, 40, 65, 55, 70, 60, 80, 75, 90, 85, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-blue-500/25" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockIntegrations() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/40 bg-gray-900/95 dark:border-white/[0.06]">
      <MockTitleBar />
      <div className="grid grid-cols-2 gap-2 p-3.5 sm:p-4">
        {[
          { name: 'Telegram', color: 'bg-blue-400' },
          { name: 'WhatsApp', color: 'bg-emerald-400' },
          { name: 'Instagram', color: 'bg-pink-400' },
          { name: 'Slack', color: 'bg-purple-400' },
          { name: 'HubSpot', color: 'bg-orange-400' },
          { name: 'Zapier', color: 'bg-amber-400' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2"
          >
            <div className={`h-2 w-2 rounded-full ${item.color}`} />
            <span className="text-[11px] text-white/50">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockKnowledgeBase() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/40 bg-gray-900/95 dark:border-white/[0.06]">
      <MockTitleBar />
      <div className="space-y-2 p-3.5 sm:p-4">
        {[
          { name: 'Website Pages', count: '24 pages', icon: '🌐' },
          { name: 'Product Catalog', count: '156 items', icon: '📦' },
          { name: 'FAQ Document', count: '42 entries', icon: '📄' },
          { name: 'Support Tickets', count: '1.2k resolved', icon: '🎫' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[11px] font-medium text-white/55">{item.name}</span>
            </div>
            <span className="text-[10px] text-white/25">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCK_SCREENS = [MockAIBuilder, MockWidgets, MockAnalytics, MockIntegrations, MockKnowledgeBase];

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);

  // Tour carousel state (ephemeral)
  const [tourSlide, setTourSlide] = useState(0);
  const [tourDirection, setTourDirection] = useState(1);

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
          // Migration: old 6-step → new 4-step
          const oldStep = progress.currentStep || 0;
          let newStep: number;
          if (oldStep === 0) newStep = 0;
          else if (oldStep === 1) newStep = 1;
          else if (oldStep >= 2 && oldStep <= 4) newStep = 1;
          else newStep = 0;

          setStep(newStep);
          setCompletedSteps(progress.completedSteps || []);
          setSkippedSteps(progress.skippedSteps || []);
          if (progress.businessInfo) setBusinessInfo(progress.businessInfo);
          if (progress.preferences) setPreferences(progress.preferences);
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
      persistProgress(next, completedSteps, skippedSteps, businessInfo, preferences);
    },
    [step, completedSteps, skippedSteps, businessInfo, preferences, persistProgress]
  );

  const markStepDone = useCallback((stepName: string) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepName)) return prev;
      return [...prev, stepName];
    });
  }, []);

  const handleNext = useCallback(() => {
    const name = STEP_NAMES[step];
    const updated = completedSteps.includes(name) ? completedSteps : [...completedSteps, name];
    setCompletedSteps(updated);
    setDirection(step + 1 > step ? 1 : -1);
    setStep(step + 1);
    persistProgress(step + 1, updated, skippedSteps, businessInfo, preferences);
  }, [step, completedSteps, skippedSteps, businessInfo, preferences, persistProgress]);

  const handleBack = useCallback(() => {
    goTo(step - 1);
  }, [step, goTo]);

  const handleSkipStep = useCallback(() => {
    const name = STEP_NAMES[step];
    setSkippedSteps((prev) => (prev.includes(name) ? prev : [...prev, name]));
    goTo(step + 1);
  }, [step, goTo]);

  /* ─── Complete Onboarding ─── */
  const completeOnboarding = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo,
          preferences,
        }),
      });
      await refreshUser();
    } catch (err) {
      console.error('[Onboarding] Failed to save onboarding data:', err);
      setSaveError('Failed to save your progress. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [businessInfo, preferences, refreshUser]);

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

  /* ─── Step 3 (complete) triggers confetti and completes onboarding ─── */
  useEffect(() => {
    if (step === 3) {
      setShowConfetti(true);
      completeOnboarding();
    }
  }, [step, completeOnboarding]);

  /* ─── Tour carousel keyboard navigation ─── */
  useEffect(() => {
    if (step !== 2) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && tourSlide > 0) {
        setTourDirection(-1);
        setTourSlide((s) => s - 1);
      } else if (e.key === 'ArrowRight' && tourSlide < TOUR_SLIDES.length - 1) {
        setTourDirection(1);
        setTourSlide((s) => s + 1);
      } else if (e.key === 'Enter' && tourSlide === TOUR_SLIDES.length - 1) {
        markStepDone('tour');
        goTo(3);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [step, tourSlide, markStepDone, goTo]);

  /* ─── Tour navigation handlers ─── */
  const handleTourNext = useCallback(() => {
    if (tourSlide < TOUR_SLIDES.length - 1) {
      setTourDirection(1);
      setTourSlide((s) => s + 1);
    } else {
      // Last slide: complete tour and advance to Done
      markStepDone('tour');
      goTo(3);
    }
  }, [tourSlide, markStepDone, goTo]);

  const handleTourBack = useCallback(() => {
    if (tourSlide > 0) {
      setTourDirection(-1);
      setTourSlide((s) => s - 1);
    } else {
      goTo(1);
    }
  }, [tourSlide, goTo]);

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
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-btn { position: relative; overflow: hidden; }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2.5s ease-in-out infinite;
        }
      `}</style>

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

      {/* Aurora background for Tour step */}
      {step === 2 && (
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute top-1/3 left-1/4 h-[400px] w-[500px] rounded-full blur-[140px]"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08), transparent)' }}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-1/4 bottom-1/3 h-[350px] w-[450px] rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent)' }}
            animate={{
              scale: [1, 1.15, 1],
              x: [0, -25, 0],
              y: [0, 15, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}

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
          {step < 3 && (
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
      <div className={`relative z-10 w-full px-6 py-24 ${step === 2 ? 'max-w-2xl' : 'max-w-xl'}`}>
        {/* Save error banner */}
        {saveError && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <span>{saveError}</span>
            <button
              onClick={() => setSaveError(null)}
              className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

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
                  { icon: '\u{1F916}', text: 'AI-powered conversations trained on your business' },
                  { icon: '\u26A1', text: 'Deploy in minutes with a single script tag' },
                  { icon: '\u{1F4C8}', text: 'Capture leads and answer questions 24/7' },
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

          {/* ════ STEP 1: ABOUT YOU (merged Business Info + Preferences) ════ */}
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
                About{' '}
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">you</span>
              </h1>
              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-white/40">
                Tell us about your business so we can tailor the AI to your needs.
              </p>

              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
                {/* Group 1: Business Info */}
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

                {/* Divider */}
                <motion.div variants={staggerItem}>
                  <div className="my-2 border-t border-gray-200/60 dark:border-white/[0.06]" />
                  <p className="mt-3 mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-white/25">
                    Preferences
                  </p>
                </motion.div>

                {/* Group 2: Preferences */}
                <motion.div variants={staggerItem}>
                  <GlassSelect
                    label="Language"
                    value={preferences.language}
                    onChange={(v) => setPreferences((p) => ({ ...p, language: v }))}
                    options={LANGUAGES}
                  />
                </motion.div>

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

          {/* ════ STEP 2: PLATFORM TOUR ════ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="mb-8 text-center">
                <h1
                  className={`${syne.className} mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white`}
                >
                  Explore the{' '}
                  <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                    platform
                  </span>
                </h1>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-white/40">
                  Take a quick tour to see what you can do with WinBix AI.
                </p>
              </div>

              {/* Carousel container */}
              <div className="min-h-[380px] rounded-2xl border border-gray-200/60 bg-white/50 backdrop-blur-sm max-sm:min-h-[320px] sm:min-h-[380px] dark:border-white/[0.06] dark:bg-white/[0.02]">
                <AnimatePresence mode="wait" custom={tourDirection}>
                  <motion.div
                    key={`tour-${tourSlide}`}
                    custom={tourDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="p-5 sm:p-6"
                  >
                    {/* Slide header */}
                    <div className="mb-5 flex flex-col items-center text-center">
                      <div
                        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${TOUR_SLIDES[tourSlide].gradientBg}`}
                      >
                        {(() => {
                          const SlideIcon = TOUR_SLIDES[tourSlide].icon;
                          return (
                            <SlideIcon
                              size={24}
                              strokeWidth={1.5}
                              className={`bg-gradient-to-r ${TOUR_SLIDES[tourSlide].gradient} bg-clip-text`}
                              style={{
                                color:
                                  tourSlide === 0
                                    ? '#3b82f6'
                                    : tourSlide === 1
                                      ? '#06b6d4'
                                      : tourSlide === 2
                                        ? '#10b981'
                                        : tourSlide === 3
                                          ? '#a855f7'
                                          : '#f97316',
                              }}
                            />
                          );
                        })()}
                      </div>
                      <h2
                        className={`${syne.className} bg-gradient-to-r text-xl font-extrabold ${TOUR_SLIDES[tourSlide].gradient} bg-clip-text text-transparent`}
                      >
                        {TOUR_SLIDES[tourSlide].title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-white/40">
                        {TOUR_SLIDES[tourSlide].description}
                      </p>
                    </div>

                    {/* Mock UI screen */}
                    <div className="max-sm:max-h-[200px] max-sm:overflow-hidden">
                      {(() => {
                        const MockScreen = MOCK_SCREENS[tourSlide];
                        return <MockScreen />;
                      })()}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Dot indicators */}
                <div className="flex items-center justify-center gap-1.5 pb-4">
                  {TOUR_SLIDES.map((_, i) => (
                    <motion.div
                      key={i}
                      className="cursor-pointer rounded-full"
                      onClick={() => {
                        setTourDirection(i > tourSlide ? 1 : -1);
                        setTourSlide(i);
                      }}
                      animate={{
                        width: i === tourSlide ? 20 : 6,
                        height: 6,
                        background: i < tourSlide ? '#6366f1' : i === tourSlide ? '#3b82f6' : 'rgba(156,163,175,0.3)',
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
              </div>

              {/* Carousel navigation */}
              <div className="mt-6 flex items-center justify-between">
                <button onClick={handleTourBack} className={btnGhost}>
                  <ArrowLeft size={14} /> {tourSlide === 0 ? 'Back' : 'Previous'}
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkipStep} className={btnGhost}>
                    Skip tour
                  </button>
                  {tourSlide === TOUR_SLIDES.length - 1 ? (
                    <motion.button
                      onClick={handleTourNext}
                      className={`${btnPrimary} shimmer-btn`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Start with AI Builder <ArrowRight size={15} />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleTourNext}
                      className={btnPrimary}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Next <ArrowRight size={15} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ STEP 3: DONE ════ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="text-center"
            >
              {/* Celebration icon */}
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
                  set!
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
                      label: businessInfo.companyName
                        ? `Business: ${businessInfo.companyName}`
                        : 'Business info (skipped)',
                    },
                    {
                      done: !!businessInfo.industry,
                      label: businessInfo.industry ? `Industry: ${businessInfo.industry}` : 'Industry (skipped)',
                    },
                    {
                      done: !!businessInfo.website,
                      label: businessInfo.website ? `Website: ${businessInfo.website}` : 'Website (skipped)',
                    },
                    {
                      done: true,
                      label: `Language: ${LANGUAGES.find((l) => l.value === preferences.language)?.label || preferences.language}`,
                    },
                    {
                      done: true,
                      label: `Notifications: ${preferences.notifications ? 'Enabled' : 'Disabled'}`,
                    },
                    {
                      done: completedSteps.includes('tour'),
                      label: completedSteps.includes('tour') ? 'Platform tour completed' : 'Platform tour (skipped)',
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
                    target={(link as { external?: boolean }).external ? '_blank' : undefined}
                    rel={(link as { external?: boolean }).external ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200/60 bg-white/50 px-4 py-3 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all hover:border-gray-300/80 hover:bg-white/80 hover:shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/60 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05]"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <link.icon size={15} className="text-blue-500" />
                    {link.label}
                    {(link as { external?: boolean }).external && (
                      <ExternalLink size={11} className="ml-auto text-gray-300 dark:text-white/20" />
                    )}
                  </motion.a>
                ))}
              </div>

              {/* Primary CTA: Go to AI Builder */}
              <motion.button
                onClick={() => {
                  if (!saving && !saveError) router.push('/dashboard/ai-builder');
                }}
                disabled={saving || !!saveError}
                className={`${btnPrimary} shimmer-btn mb-3 w-full`}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.97 }}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Finishing up...
                  </>
                ) : (
                  <>
                    <Rocket size={16} /> Go to AI Builder
                  </>
                )}
              </motion.button>

              {/* Secondary CTA: Go to Dashboard */}
              <button
                onClick={() => {
                  if (!saving && !saveError) router.push('/dashboard');
                }}
                disabled={saving || !!saveError}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/35 dark:hover:text-white/55"
              >
                <LayoutDashboard size={14} /> Go to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
