'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import { PRICING_PLANS, getFeatureComparison, type PricingPlanId } from '@/lib/pricing';

export default function PricingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const features = getFeatureComparison();

  const handleSubscribe = async (planId: PricingPlanId) => {
    if (planId === 'free') {
      if (!user) {
        setAuthModalTab('signup');
        setShowAuthModal(true);
      } else {
        window.location.href = '/dashboard';
      }
      return;
    }

    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@winbixai.com?subject=Enterprise Plan Inquiry';
      return;
    }

    if (!user) {
      setAuthModalTab('signup');
      setShowAuthModal(true);
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, period: annual ? 'annual' : 'monthly' }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to create checkout session. Please try again.');
        return;
      }

      const checkoutUrl = data.url || data.data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Could not redirect to payment page. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060810] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">WinBix AI</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 pt-20 pb-8 text-center md:px-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/15 bg-cyan-500/8 px-4 py-1.5 text-xs font-semibold tracking-wide text-cyan-400 uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Pricing
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Simple, transparent pricing</h1>
        <p className="mx-auto mb-10 max-w-lg text-lg text-gray-400">Start free. Upgrade as you grow. No hidden fees.</p>

        {/* Annual/Monthly Toggle */}
        <div className="mb-16 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${!annual ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${annual ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Annual <span className="ml-1 text-xs text-emerald-400">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto grid max-w-7xl gap-4 px-6 pb-20 md:grid-cols-4 md:px-12">
        {PRICING_PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isCurrentPlan = user?.plan === plan.id || (user?.plan === 'none' && plan.id === 'free');

          return (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-2xl border p-6"
              style={{
                background: plan.popular ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.02)',
                borderColor: plan.popular ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="mb-1 text-lg font-bold text-white">{plan.name}</h3>
              <p className="mb-4 text-sm text-gray-500">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${price}</span>
                {price > 0 && <span className="text-gray-500">/mo</span>}
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || loadingPlan === plan.id}
                className="mb-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
                style={{
                  background: plan.popular ? 'linear-gradient(135deg, #0891b2, #2563eb)' : 'rgba(255,255,255,0.06)',
                  color: plan.popular ? '#fff' : '#e5e7eb',
                }}
              >
                {isCurrentPlan ? 'Current Plan' : loadingPlan === plan.id ? 'Loading...' : plan.cta}
              </button>

              <ul className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="mx-auto max-w-7xl px-6 pb-20 md:px-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Compare plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left font-medium text-gray-500">Feature</th>
                <th className="pb-4 text-center font-medium text-gray-500">Free</th>
                <th className="pb-4 text-center font-medium text-gray-500">Starter</th>
                <th className="pb-4 text-center font-medium text-cyan-400">Pro</th>
                <th className="pb-4 text-center font-medium text-gray-500">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {features.map((row) => (
                <tr key={row.feature} className="border-b border-white/5">
                  <td className="py-3 text-gray-300">{row.feature}</td>
                  {(['free', 'starter', 'pro', 'enterprise'] as const).map((plan) => (
                    <td key={plan} className="py-3 text-center text-gray-400">
                      {typeof row[plan] === 'boolean' ? (
                        row[plan] ? (
                          <svg
                            className="mx-auto h-5 w-5 text-cyan-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-700">&mdash;</span>
                        )
                      ) : (
                        row[plan]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />
      )}
    </div>
  );
}
