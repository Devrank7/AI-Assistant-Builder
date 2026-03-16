'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui';
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
} from 'lucide-react';

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

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState<string | null>(null);
  const [widgetType, setWidgetType] = useState<WidgetTypeId>('ai_chat');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoveredNiche, setHoveredNiche] = useState<string | null>(null);

  const totalSteps = 4;

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
    <div className="bg-bg-primary relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 opacity-40"
        style={{
          width: 800,
          height: 500,
          background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl px-6 py-12">
        {/* Progress */}
        <div className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-text-tertiary text-xs font-medium tracking-widest uppercase">
              Step {step + 1} of {totalSteps}
            </span>
            <button
              onClick={completeOnboarding}
              className="text-text-tertiary hover:text-text-secondary text-xs transition"
            >
              Skip setup
            </button>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{
                  background: i <= step ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : 'var(--wb-border-subtle)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 0: Niche */}
        {step === 0 && (
          <div>
            <h1 className="text-text-primary mb-2 text-3xl font-bold tracking-tight">What&apos;s your business?</h1>
            <p className="text-text-secondary mb-10 text-base">
              We&apos;ll customize your experience based on your industry.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {NICHES.map((n) => {
                const Icon = n.icon;
                const isSelected = niche === n.id;
                const isHovered = hoveredNiche === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setNiche(n.id);
                      setStep(1);
                    }}
                    onMouseEnter={() => setHoveredNiche(n.id)}
                    onMouseLeave={() => setHoveredNiche(null)}
                    className="group border-border-subtle hover:border-border relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-5 transition-all duration-200"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${n.color}12 0%, ${n.color}06 100%)`
                        : undefined,
                      borderColor: isSelected ? `${n.color}40` : undefined,
                    }}
                  >
                    <div
                      className="bg-bg-tertiary flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                      style={{
                        background: isSelected || isHovered ? `${n.color}18` : undefined,
                      }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        style={{
                          color: isSelected || isHovered ? n.color : undefined,
                          transition: 'color 0.2s',
                        }}
                        className={isSelected || isHovered ? '' : 'text-text-tertiary'}
                      />
                    </div>
                    <span className="text-text-secondary group-hover:text-text-primary block text-xs font-medium transition-colors">
                      {n.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Widget Type */}
        {step === 1 && (
          <div>
            <h1 className="text-text-primary mb-2 text-3xl font-bold tracking-tight">What do you want to build?</h1>
            <p className="text-text-secondary mb-10 text-base">
              Choose a widget type. You can always create more later.
            </p>
            <div className="space-y-3">
              {WIDGET_TYPES.map((type) => {
                const Icon = WIDGET_ICONS[type.id] || MessageSquare;
                const color = WIDGET_COLORS[type.id] || '#06b6d4';
                const isSelected = widgetType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setWidgetType(type.id);
                      setStep(2);
                    }}
                    className="group border-border-subtle hover:border-border flex w-full items-center gap-5 rounded-2xl border p-5 text-left transition-all duration-200"
                    style={{
                      background: isSelected ? `linear-gradient(135deg, ${color}0a 0%, ${color}04 100%)` : undefined,
                      borderColor: isSelected ? `${color}30` : undefined,
                    }}
                  >
                    <div
                      className="bg-bg-tertiary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                      style={{
                        background: isSelected ? `${color}15` : undefined,
                      }}
                    >
                      <Icon
                        size={22}
                        strokeWidth={1.5}
                        style={{ color: isSelected ? color : undefined, transition: 'color 0.2s' }}
                        className={isSelected ? '' : 'text-text-tertiary'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-text-primary block text-sm font-semibold">{type.label}</span>
                      <span className="text-text-secondary block text-xs leading-relaxed">{type.description}</span>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-text-tertiary group-hover:text-text-secondary flex-shrink-0 transition-all group-hover:translate-x-0.5"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: URL */}
        {step === 2 && (
          <div>
            <h1 className="text-text-primary mb-2 text-3xl font-bold tracking-tight">Got a website?</h1>
            <p className="text-text-secondary mb-10 text-base">
              We&apos;ll analyze your brand and auto-design the widget. Or skip to build from scratch.
            </p>
            <div className="relative">
              <Globe size={18} className="text-text-tertiary absolute top-1/2 left-4 -translate-y-1/2" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="your-website.com"
                className="border-border bg-bg-secondary text-text-primary placeholder:text-text-tertiary focus:border-accent focus:bg-bg-tertiary w-full rounded-2xl border py-4 pr-5 pl-11 transition-colors outline-none"
              />
            </div>
            <Button
              onClick={() => setStep(3)}
              size="lg"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-200 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #2563eb)',
              }}
            >
              {url.trim() ? 'Continue' : 'Skip — build from scratch'}
              <ChevronRight size={16} />
            </Button>
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 3 && (
          <div className="text-center">
            <div
              className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(37,99,235,0.15))',
              }}
            >
              <Rocket size={36} strokeWidth={1.5} className="text-cyan-400" />
            </div>
            <h1 className="text-text-primary mb-3 text-3xl font-bold tracking-tight">Ready to build!</h1>
            <p className="text-text-secondary mx-auto mb-10 max-w-md text-base">
              Our AI agents will create your {WIDGET_TYPES.find((t) => t.id === widgetType)?.label || 'widget'} in under
              a minute.
            </p>
            <Button
              onClick={completeOnboarding}
              disabled={saving}
              size="lg"
              className="inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold transition-all duration-200 hover:brightness-110 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #2563eb)',
              }}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Setting up...
                </>
              ) : (
                'Launch Builder'
              )}
            </Button>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < 3 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-text-tertiary hover:text-text-secondary mt-8 inline-flex items-center gap-1.5 text-sm transition"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        )}
      </div>
    </div>
  );
}
