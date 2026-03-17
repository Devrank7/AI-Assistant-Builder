'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Syne } from 'next/font/google';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Check,
  ArrowRight,
  Crown,
  Minus,
  Sparkles,
  Zap,
  Building2,
  Rocket,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { PRICING_PLANS, getFeatureComparison, getPlanById } from '@/lib/pricing';
import { Button, Badge } from '@/components/ui';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ── Plan icon + color mapping ── */
const PLAN_STYLES: Record<string, { icon: typeof Zap; color: string; gradient: string; bg: string; border: string }> = {
  free: {
    icon: Zap,
    color: '#6B7280',
    gradient: 'from-gray-400 to-gray-500',
    bg: 'rgba(107,114,128,0.06)',
    border: 'rgba(107,114,128,0.12)',
  },
  starter: {
    icon: Rocket,
    color: '#3B82F6',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.12)',
  },
  pro: {
    icon: Crown,
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.12)',
  },
  enterprise: {
    icon: Building2,
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.12)',
  },
};

function getPlanStyle(planId: string) {
  return PLAN_STYLES[planId] || PLAN_STYLES.free;
}

/* ── Status config ── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)' },
  trial: { label: 'Trial', color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)' },
  past_due: { label: 'Past Due', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
  canceled: { label: 'Canceled', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' },
};

function getStatus(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status || 'N/A',
      color: '#6B7280',
      bg: 'rgba(107,114,128,0.06)',
      border: 'rgba(107,114,128,0.15)',
    }
  );
}

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

  const currentPlanId = user?.plan === 'none' || user?.plan === 'basic' ? 'free' : user?.plan || 'free';
  const currentPlan = getPlanById(currentPlanId as any);
  const hasSubscription = user?.plan && user.plan !== 'none' && user.plan !== 'free';
  const features = getFeatureComparison();
  const planStyle = getPlanStyle(currentPlanId);
  const PlanIcon = planStyle.icon;
  const status = getStatus(user?.subscriptionStatus || '');

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <motion.div {...fadeUp}>
        <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Workspace
        </p>
        <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>Billing</h1>
        <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
          Manage your subscription and compare plans
        </p>
      </motion.div>

      {/* Current plan hero card */}
      <motion.div
        {...fadeUp}
        className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white dark:border-white/[0.06] dark:bg-[#111118]"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
      >
        {/* Gradient accent */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${planStyle.color}, ${planStyle.color}60)` }}
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Plan icon */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${planStyle.color}15, ${planStyle.color}25)`,
                  color: planStyle.color,
                  boxShadow: `0 0 0 1px ${planStyle.color}15, 0 0 20px ${planStyle.color}08`,
                }}
              >
                <PlanIcon className="h-6 w-6" />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
                    Current Plan
                  </p>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                    style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
                  >
                    {status.color === '#10B981' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                          style={{ background: status.color }}
                        />
                        <span
                          className="relative inline-flex h-1.5 w-1.5 rounded-full"
                          style={{ background: status.color }}
                        />
                      </span>
                    )}
                    {status.label}
                  </span>
                </div>

                <h2 className={`${syne.className} mt-1 text-3xl font-bold text-gray-900 dark:text-white`}>
                  {currentPlan?.name || 'Free'}
                </h2>

                {currentPlan && currentPlan.monthlyPrice > 0 && (
                  <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">${currentPlan.monthlyPrice}</span>
                    <span className="text-gray-400 dark:text-gray-500">/month</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {hasSubscription ? (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white px-5 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-white/[0.15]"
                >
                  {loadingPortal ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-600" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {loadingPortal ? 'Loading...' : 'Manage Subscription'}
                </motion.button>
              ) : (
                <Link href="/pricing">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 transition-shadow hover:shadow-xl hover:shadow-violet-500/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    Upgrade Plan
                  </motion.button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick limits summary */}
          {currentPlan && (
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-4 dark:border-white/[0.04]">
              {[
                { label: 'Widgets', value: currentPlan.limits.widgets },
                { label: 'Messages', value: currentPlan.limits.messages },
                { label: 'Team', value: currentPlan.limits.teamMembers },
                { label: 'Channels', value: currentPlan.limits.channels },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-gray-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Plan comparison grid */}
      <div className="space-y-5">
        <motion.div {...fadeUp}>
          <h2 className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
            Compare Plans
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const isPro = plan.id === 'pro';
            const style = getPlanStyle(plan.id);
            const Icon = style.icon;

            return (
              <motion.div
                key={plan.id}
                variants={staggerItem}
                className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-lg dark:bg-[#111118] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] ${
                  isPro
                    ? 'border-violet-300/60 dark:border-violet-500/20'
                    : isCurrentPlan
                      ? 'border-gray-300/80 dark:border-white/[0.12]'
                      : 'border-gray-200/60 dark:border-white/[0.06]'
                }`}
                style={{ boxShadow: isPro ? `0 0 20px ${style.color}08` : '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                {/* Top accent line */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px] opacity-70"
                  style={{ background: `linear-gradient(90deg, ${style.color}, ${style.color}60)` }}
                />

                {isPro && (
                  <div className="absolute top-4 -right-8 rotate-45 bg-gradient-to-r from-violet-500 to-purple-600 px-10 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-sm">
                    Popular
                  </div>
                )}

                <div className="p-5">
                  {/* Plan icon + name */}
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${style.color}15, ${style.color}20)`,
                        color: style.color,
                        boxShadow: `0 0 0 1px ${style.color}15`,
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                        {isCurrentPlan && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-px text-[9px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>
                      {plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}`}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="ml-1 text-[12px] text-gray-400 dark:text-gray-500">/month</span>
                    )}
                    {plan.annualPrice > 0 && plan.annualPrice < plan.monthlyPrice && (
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                        or ${plan.annualPrice}/mo billed annually
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {features.slice(0, 5).map((row) => {
                      const value = row[plan.id as keyof typeof row];
                      if (typeof value === 'boolean' && !value) return null;
                      return (
                        <li key={row.feature} className="flex items-start gap-2 text-[11px]">
                          <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: style.color }} />
                          <span className="text-gray-600 dark:text-gray-400">
                            {row.feature}
                            {typeof value === 'string' && value !== 'true' && (
                              <span className="ml-1 text-gray-400 dark:text-gray-500">({value})</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Feature comparison table */}
      <motion.div {...fadeUp} className="space-y-5">
        <h2 className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Detailed Features
        </h2>

        <div
          className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.04]">
                  <th className="px-5 py-4 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
                    Feature
                  </th>
                  {PRICING_PLANS.map((plan) => {
                    const style = getPlanStyle(plan.id);
                    return (
                      <th
                        key={plan.id}
                        className="px-4 py-4 text-center text-[10px] font-semibold tracking-widest uppercase"
                        style={{ color: plan.id === currentPlanId ? style.color : undefined }}
                      >
                        <span className={plan.id === currentPlanId ? '' : 'text-gray-400 dark:text-gray-500'}>
                          {plan.name}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {features.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${
                      i < features.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''
                    }`}
                  >
                    <td className="px-5 py-3 text-[12px] font-medium text-gray-600 dark:text-gray-400">
                      {row.feature}
                    </td>
                    {(['free', 'starter', 'pro', 'enterprise'] as const).map((planKey) => {
                      const val = row[planKey];
                      const style = getPlanStyle(planKey);
                      const isCurrent = planKey === currentPlanId;
                      return (
                        <td
                          key={planKey}
                          className={`px-4 py-3 text-center ${isCurrent ? 'bg-gray-50/50 dark:bg-white/[0.01]' : ''}`}
                        >
                          {typeof val === 'boolean' ? (
                            val ? (
                              <Check className="mx-auto h-4 w-4" style={{ color: style.color }} />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-gray-300 dark:text-gray-600" />
                            )
                          ) : (
                            <span
                              className={`text-[12px] ${isCurrent ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              {val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
