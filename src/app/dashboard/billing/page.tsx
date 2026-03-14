'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const planFeatures = [
  { feature: 'AI Chat Widget', basic: true, pro: true },
  { feature: 'Knowledge Base', basic: '1 widget', pro: 'Unlimited' },
  { feature: 'Monthly Messages', basic: '500', pro: 'Unlimited' },
  { feature: 'Custom Branding', basic: false, pro: true },
  { feature: 'CRM Integrations', basic: false, pro: true },
  { feature: 'Multi-channel (Telegram, WhatsApp)', basic: false, pro: true },
  { feature: 'Analytics Dashboard', basic: 'Basic', pro: 'Advanced' },
  { feature: 'Priority Support', basic: false, pro: true },
];

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/15 text-green-400';
      case 'trial':
        return 'bg-blue-500/15 text-blue-400';
      case 'past_due':
        return 'bg-yellow-500/15 text-yellow-400';
      case 'canceled':
        return 'bg-red-500/15 text-red-400';
      default:
        return 'bg-gray-500/15 text-gray-400';
    }
  };

  const hasSubscription = user?.plan && user.plan !== 'none';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Billing</h1>

      {/* Current plan card */}
      <div className="rounded-xl border border-white/10 bg-[#12121a] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-400">Current Plan</p>
            <p className="text-2xl font-bold text-white capitalize">{user?.plan || 'None'}</p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColor(
                  user?.subscriptionStatus || ''
                )}`}
              >
                {user?.subscriptionStatus || 'N/A'}
              </span>
            </div>
          </div>

          <div>
            {hasSubscription ? (
              <button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {loadingPortal ? 'Loading...' : 'Manage Subscription'}
              </button>
            ) : (
              <Link
                href="/plans"
                className="inline-flex rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                Choose a Plan
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Plan Comparison</h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#12121a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Basic</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Pro</th>
              </tr>
            </thead>
            <tbody>
              {planFeatures.map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-300">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {typeof row.basic === 'boolean' ? (
                      row.basic ? (
                        <svg
                          className="mx-auto h-5 w-5 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg
                          className="mx-auto h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    ) : (
                      <span className="text-gray-400">{row.basic}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <svg
                          className="mx-auto h-5 w-5 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg
                          className="mx-auto h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    ) : (
                      <span className="text-gray-400">{row.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
