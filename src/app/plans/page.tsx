'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import { Card, Button, Badge, Toggle } from '@/components/ui';

const plans = {
  basic: {
    name: 'Basic',
    monthlyPrice: 29,
    annualPrice: 24,
    features: ['1 AI Widget', 'Web Chat channel', '1,000 messages/mo', 'Email support'],
    excluded: ['Telegram, WhatsApp, Instagram', 'CRM integrations', 'Google Calendar + Calendly', 'Priority support'],
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
    excluded: [],
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
      const checkoutUrl = data.url || data.data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      // handle error
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      {/* Nav */}
      <nav className="border-border border-b px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-text-primary flex items-center gap-3">
            <div className="bg-accent flex h-9 w-9 items-center justify-center rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">WinBix AI</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="px-6 pt-20 pb-8 text-center md:px-12">
        <h1 className="text-text-primary mb-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Choose Your Plan
        </h1>
        <p className="text-text-secondary mx-auto max-w-xl text-lg">
          Start with a free trial. Scale as you grow. No hidden fees.
        </p>

        {/* Annual toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-text-primary' : 'text-text-tertiary'}`}>Monthly</span>
          <Toggle checked={annual} onChange={setAnnual} />
          <span className={`text-sm font-medium ${annual ? 'text-text-primary' : 'text-text-tertiary'}`}>Annual</span>
          {annual && <Badge variant="green">Save 17%</Badge>}
        </div>
      </div>

      {/* Plans grid */}
      <div className="mx-auto max-w-4xl px-6 pb-24 md:px-12">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Plan */}
          <Card padding="lg" className="relative flex flex-col">
            <div className="mb-1">
              <h3 className="text-text-primary text-xl font-bold">{plans.basic.name}</h3>
            </div>
            <div className="mb-6">
              <span className="text-text-primary text-4xl font-bold">
                ${annual ? plans.basic.annualPrice : plans.basic.monthlyPrice}
              </span>
              <span className="text-text-tertiary">/mo</span>
              {annual && (
                <p className="text-text-tertiary mt-1 text-sm">Billed annually (${plans.basic.annualPrice * 12}/yr)</p>
              )}
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {plans.basic.features.map((f) => (
                <li key={f} className="text-text-secondary flex items-start gap-3 text-sm">
                  <Check className="text-accent mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
              {plans.basic.excluded.map((f) => (
                <li key={f} className="text-text-tertiary flex items-start gap-3 text-sm">
                  <X className="text-text-tertiary mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => handleSubscribe('basic')}
              disabled={loadingPlan === 'basic'}
            >
              {loadingPlan === 'basic' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </Card>

          {/* Pro Plan */}
          <Card padding="lg" className="border-accent relative flex flex-col">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-text-primary text-xl font-bold">{plans.pro.name}</h3>
              <Badge variant="blue">
                <Crown className="mr-1 inline h-3 w-3" />
                Most Popular
              </Badge>
            </div>
            <div className="mb-6">
              <span className="text-text-primary text-4xl font-bold">
                ${annual ? plans.pro.annualPrice : plans.pro.monthlyPrice}
              </span>
              <span className="text-text-tertiary">/mo</span>
              {annual && (
                <p className="text-text-tertiary mt-1 text-sm">Billed annually (${plans.pro.annualPrice * 12}/yr)</p>
              )}
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {plans.pro.features.map((f) => (
                <li key={f} className="text-text-secondary flex items-start gap-3 text-sm">
                  <Check className="text-accent mt-0.5 h-4 w-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => handleSubscribe('pro')}
              disabled={loadingPlan === 'pro'}
            >
              {loadingPlan === 'pro' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </Card>
        </div>

        {/* Footer note */}
        <p className="text-text-tertiary mt-12 text-center text-sm">
          All plans include a 14-day free trial. Cancel anytime. Need a custom plan?{' '}
          <Link href="/" className="text-accent hover:underline">
            Contact us
          </Link>
        </p>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />
    </div>
  );
}
