'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Check, ArrowRight, Crown, Minus } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { PRICING_PLANS, getFeatureComparison, getPlanById } from '@/lib/pricing';
import { Card, Button, Badge } from '@/components/ui';

export default function BillingPage() {
  const { user } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      // ignore
    } finally {
      setLoadingPortal(false);
    }
  };

  const statusBadgeVariant = (status: string): 'green' | 'blue' | 'amber' | 'red' | 'default' => {
    switch (status) {
      case 'active':
        return 'green';
      case 'trial':
        return 'blue';
      case 'past_due':
        return 'amber';
      case 'canceled':
        return 'red';
      default:
        return 'default';
    }
  };

  const currentPlanId = user?.plan === 'none' || user?.plan === 'basic' ? 'free' : user?.plan || 'free';
  const currentPlan = getPlanById(currentPlanId as any);
  const hasSubscription = user?.plan && user.plan !== 'none' && user.plan !== 'free';
  const features = getFeatureComparison();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <CreditCard className="text-text-secondary h-6 w-6" />
        <h1 className="text-text-primary text-2xl font-bold">Billing</h1>
      </div>

      {/* Current plan card */}
      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-text-tertiary text-sm font-medium">Current Plan</p>
            <div className="flex items-center gap-3">
              <p className="text-text-primary text-2xl font-bold">{currentPlan?.name || 'Free'}</p>
              <Badge variant={statusBadgeVariant(user?.subscriptionStatus || '')} className="capitalize">
                {user?.subscriptionStatus || 'N/A'}
              </Badge>
            </div>
            {currentPlan && currentPlan.monthlyPrice > 0 && (
              <p className="text-text-tertiary text-sm">${currentPlan.monthlyPrice}/mo</p>
            )}
          </div>

          <div>
            {hasSubscription ? (
              <Button variant="secondary" size="lg" onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal ? 'Loading...' : 'Manage Subscription'}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button variant="primary" size="lg">
                  Upgrade Plan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Plan comparison */}
      <div className="space-y-4">
        <h2 className="text-text-primary text-lg font-semibold">Plan Comparison</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const isPro = plan.id === 'pro';

            return (
              <Card
                key={plan.id}
                padding="md"
                className={`relative ${isPro ? 'border-accent' : ''} ${isCurrentPlan ? 'ring-accent/30 ring-1' : ''}`}
              >
                {isPro && (
                  <div className="mb-3 flex items-center gap-1.5">
                    <Crown className="text-accent h-4 w-4" />
                    <span className="text-accent text-xs font-medium">Recommended</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-text-primary text-base font-semibold">{plan.name}</h3>
                      {isCurrentPlan && <Badge variant="green">Current</Badge>}
                    </div>
                    <p className="text-text-primary mt-1 text-xl font-bold">
                      {plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}`}
                      {plan.monthlyPrice > 0 && <span className="text-text-tertiary text-sm font-normal">/mo</span>}
                    </p>
                  </div>

                  <ul className="space-y-2">
                    {features.slice(0, 5).map((row) => {
                      const value = row[plan.id as keyof typeof row];
                      if (typeof value === 'boolean' && !value) return null;
                      return (
                        <li key={row.feature} className="flex items-start gap-2 text-xs">
                          <Check className="text-accent mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="text-text-secondary">
                            {row.feature}
                            {typeof value === 'string' && value !== 'true' && (
                              <span className="text-text-tertiary"> ({value})</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="space-y-4">
        <h2 className="text-text-primary text-lg font-semibold">Detailed Features</h2>
        <Card padding="sm" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-text-tertiary px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    Feature
                  </th>
                  {PRICING_PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={`px-4 py-3 text-center text-xs font-medium tracking-wider uppercase ${
                        plan.id === currentPlanId ? 'text-accent' : 'text-text-tertiary'
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((row, i) => (
                  <tr key={row.feature} className={i < features.length - 1 ? 'border-border border-b' : ''}>
                    <td className="text-text-secondary px-4 py-3">{row.feature}</td>
                    {(['free', 'starter', 'pro', 'enterprise'] as const).map((planKey) => (
                      <td key={planKey} className="px-4 py-3 text-center">
                        {typeof row[planKey] === 'boolean' ? (
                          row[planKey] ? (
                            <Check className="text-accent mx-auto h-4 w-4" />
                          ) : (
                            <Minus className="text-text-tertiary mx-auto h-4 w-4" />
                          )
                        ) : (
                          <span className="text-text-secondary">{row[planKey]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
