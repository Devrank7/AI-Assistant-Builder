'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { WIDGET_TYPES, type WidgetTypeId } from '@/lib/builder/widgetTypes';

const NICHES = [
  { id: 'dental', label: 'Dental Clinic', icon: '🦷' },
  { id: 'beauty', label: 'Beauty Salon', icon: '💅' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'realestate', label: 'Real Estate', icon: '🏠' },
  { id: 'saas', label: 'SaaS / Tech', icon: '💻' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
  { id: 'auto', label: 'Auto Service', icon: '🚗' },
  { id: 'consulting', label: 'Consulting', icon: '📊' },
  { id: 'other', label: 'Other', icon: '✨' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState<string | null>(null);
  const [widgetType, setWidgetType] = useState<WidgetTypeId>('ai_chat');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#06070b' }}>
      <div className="w-full max-w-2xl px-6 py-12">
        {/* Progress */}
        <div className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Step {step + 1} of {totalSteps}
            </span>
            <button onClick={completeOnboarding} className="text-xs text-gray-600 transition hover:text-gray-400">
              Skip setup
            </button>
          </div>
          <div className="h-1 rounded-full bg-white/5">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Niche */}
        {step === 0 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">What&apos;s your business?</h1>
            <p className="mb-8 text-gray-500">We&apos;ll customize your experience based on your industry.</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {NICHES.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setNiche(n.id);
                    setStep(1);
                  }}
                  className="rounded-xl border p-4 text-center transition-all duration-200"
                  style={{
                    background: niche === n.id ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                    borderColor: niche === n.id ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="mb-1 block text-2xl">{n.icon}</span>
                  <span className="block text-xs font-medium text-gray-400">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Widget Type */}
        {step === 1 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">What do you want to build?</h1>
            <p className="mb-8 text-gray-500">Choose a widget type. You can always create more later.</p>
            <div className="space-y-3">
              {WIDGET_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setWidgetType(type.id);
                    setStep(2);
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border p-5 text-left transition-all duration-200"
                  style={{
                    background: widgetType === type.id ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: widgetType === type.id ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <span className="block text-sm font-semibold text-white">{type.label}</span>
                    <span className="block text-xs text-gray-500">{type.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: URL */}
        {step === 2 && (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">Got a website?</h1>
            <p className="mb-8 text-gray-500">
              We&apos;ll analyze your brand and auto-design the widget. Or skip to build from scratch.
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="your-website.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-cyan-500/30"
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:from-cyan-500 hover:to-blue-500"
              >
                {url.trim() ? 'Continue' : 'Skip — build from scratch'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 3 && (
          <div className="text-center">
            <div className="mb-6 text-6xl">🚀</div>
            <h1 className="mb-2 text-3xl font-bold text-white">Ready to build!</h1>
            <p className="mb-8 text-gray-500">
              Our AI agents will create your {WIDGET_TYPES.find((t) => t.id === widgetType)?.label || 'widget'} in under
              a minute.
            </p>
            <button
              onClick={completeOnboarding}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-10 py-4 text-base font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
            >
              {saving ? 'Setting up...' : 'Launch Builder'}
            </button>
          </div>
        )}

        {/* Back button */}
        {step > 0 && step < 3 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-6 text-sm text-gray-600 transition hover:text-gray-400"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
