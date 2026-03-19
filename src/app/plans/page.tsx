'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Sparkles, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AuthModal from '@/components/AuthModal';
import { Card, Button, Badge, Toggle } from '@/components/ui';
import { PRICING_PLANS, type PricingPlanId } from '@/lib/pricing';

export default function PlansPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');

  const handleSubscribe = async (planId: PricingPlanId) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@winbixai.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (planId === 'free') {
      if (!user) {
        setAuthModalTab('signup');
        setShowAuthModal(true);
        return;
      }
      // Free plan — just activate
      try {
        setLoadingPlan('free');
        await fetch('/api/user/activate-free', { method: 'POST' });
        window.location.href = '/dashboard';
      } catch {
        // handle error
      } finally {
        setLoadingPlan(null);
      }
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

  const isCurrentPlan = (planId: PricingPlanId) => {
    if (!user) return false;
    return user.plan === planId;
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
        <p className="text-text-secondary mx-auto max-w-xl text-lg">Start free. Scale as you grow. No hidden fees.</p>

        {/* Annual toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-text-primary' : 'text-text-tertiary'}`}>Monthly</span>
          <Toggle checked={annual} onChange={setAnnual} />
          <span className={`text-sm font-medium ${annual ? 'text-text-primary' : 'text-text-tertiary'}`}>Annual</span>
          {annual && <Badge variant="green">Save 17%</Badge>}
        </div>
      </div>

      {/* Plans grid */}
      <div className="mx-auto max-w-6xl px-6 pb-24 md:px-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isPopular = plan.popular;
            const isEnterprise = plan.id === 'enterprise';
            const isFree = plan.id === 'free';
            const price = annual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <Card
                key={plan.id}
                padding="lg"
                className={`relative flex flex-col ${isPopular ? 'border-accent' : ''} ${isEnterprise ? 'border-amber-500/50' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="blue">
                      <Crown className="mr-1 inline h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="amber">
                      <Building2 className="mr-1 inline h-3 w-3" />
                      Enterprise
                    </Badge>
                  </div>
                )}

                <div className="mb-1 pt-2">
                  <h3 className="text-text-primary text-xl font-bold">{plan.name}</h3>
                  <p className="text-text-tertiary text-sm">{plan.description}</p>
                </div>

                <div className="mt-3 mb-6">
                  {isFree ? (
                    <span className="text-text-primary text-4xl font-bold">Free</span>
                  ) : isEnterprise ? (
                    <>
                      <span className="text-text-primary text-4xl font-bold">${price}</span>
                      <span className="text-text-tertiary">/mo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-text-primary text-4xl font-bold">${price}</span>
                      <span className="text-text-tertiary">/mo</span>
                      {annual && (
                        <p className="text-text-tertiary mt-1 text-sm">Billed annually (${plan.annualPrice * 12}/yr)</p>
                      )}
                    </>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="text-text-secondary flex items-start gap-3 text-sm">
                      <Check className="text-accent mt-0.5 h-4 w-4 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? 'primary' : isEnterprise ? 'secondary' : 'secondary'}
                  size="lg"
                  className={`w-full ${isEnterprise ? 'border-amber-500/30 hover:border-amber-500/60' : ''}`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || loadingPlan === plan.id}
                >
                  {isCurrent ? (
                    'Current Plan'
                  ) : loadingPlan === plan.id ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Please wait...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-text-tertiary mt-12 text-center text-sm">
          All paid plans include a 14-day free trial. Cancel anytime. Need a custom plan?{' '}
          <a href="mailto:sales@winbixai.com" className="text-accent hover:underline">
            Contact us
          </a>
        </p>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialTab={authModalTab} />
    </div>
  );
}
