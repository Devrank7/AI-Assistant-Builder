'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';

const plans = {
  basic: {
    name: 'Basic',
    monthlyPrice: 29,
    annualPrice: 24,
    features: ['1 AI Widget', 'Web Chat channel', '1,000 messages/mo', 'Email support'],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 79,
    annualPrice: 66,
    features: [
      'Unlimited widgets',
      'All channels (Web, Telegram, WhatsApp, Instagram)',
      'Unlimited messages',
      '7 CRM integrations',
      'Google Calendar + Calendly',
      'Priority support',
    ],
    popular: true,
  },
};

export default function PlansPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const handleSubscribe = async (plan: string) => {
    if (!user) {
      setAuthModalTab('signup');
      setShowAuthModal(true);
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, period: annual ? 'annual' : 'monthly' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // handle error
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-400 uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            Pricing
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Plan
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-400">
            Start with a free trial. Scale as you grow. No hidden fees.
          </p>
        </motion.div>

        {/* Annual toggle */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-12 rounded-full transition-colors ${annual ? 'bg-blue-500' : 'bg-white/10'}`}
          >
            <div
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                annual ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-gray-500'}`}>
            Annual
            <span className="ml-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Save 17%</span>
          </span>
        </div>
      </div>

      {/* Plans grid */}
      <div className="mx-auto max-w-4xl px-6 pb-24 md:px-12">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
          >
            <h3 className="mb-2 text-xl font-bold text-white">{plans.basic.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                ${annual ? plans.basic.annualPrice : plans.basic.monthlyPrice}
              </span>
              <span className="text-gray-500">/mo</span>
              {annual && (
                <p className="mt-1 text-sm text-gray-500">Billed annually (${plans.basic.annualPrice * 12}/yr)</p>
              )}
            </div>
            <ul className="mb-8 space-y-3">
              {plans.basic.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('basic')}
              disabled={loadingPlan === 'basic'}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPlan === 'basic' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Please wait...</span>
                </div>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative rounded-2xl border border-blue-500/20 bg-white/[0.03] p-8"
          >
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-semibold text-white">
              Most Popular
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">{plans.pro.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                ${annual ? plans.pro.annualPrice : plans.pro.monthlyPrice}
              </span>
              <span className="text-gray-500">/mo</span>
              {annual && (
                <p className="mt-1 text-sm text-gray-500">Billed annually (${plans.pro.annualPrice * 12}/yr)</p>
              )}
            </div>
            <ul className="mb-8 space-y-3">
              {plans.pro.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={loadingPlan === 'pro'}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPlan === 'pro' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Please wait...</span>
                </div>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </motion.div>
        </div>

        {/* FAQ or note */}
        <p className="mt-12 text-center text-sm text-gray-500">
          All plans include a 14-day free trial. Cancel anytime. Need a custom plan?{' '}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Contact us
          </Link>
        </p>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />
    </div>
  );
}
