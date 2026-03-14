'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface WidgetData {
  clientId: string;
  widgetName: string;
  clientType: string;
  createdAt: string;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  useEffect(() => {
    fetch('/api/user/widgets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setWidgets(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingWidgets(false));
  }, []);

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      // ignore
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Welcome back, {user?.name || 'there'}</h1>
        <p className="mt-1 text-gray-400">Here&apos;s an overview of your account.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <p className="text-sm text-gray-400">Active Widgets</p>
          <p className="mt-2 text-3xl font-bold text-white">{loadingWidgets ? '...' : widgets.length}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <p className="text-sm text-gray-400">Messages This Month</p>
          <p className="mt-2 text-lg font-semibold text-gray-500">Coming soon</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <p className="text-sm text-gray-400">Current Plan</p>
          <p className="mt-2 text-3xl font-bold text-white capitalize">{user?.plan || 'None'}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <p className="text-sm text-gray-400">Subscription Status</p>
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
      </div>

      {/* Upgrade CTA */}
      {user?.plan === 'none' && (
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6">
          <h3 className="text-lg font-semibold text-white">Upgrade Your Plan</h3>
          <p className="mt-1 text-sm text-gray-400">Get access to more widgets, integrations, and priority support.</p>
          <Link
            href="/plans"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            View Plans
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/builder"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create New Widget
          </Link>
          <button
            onClick={handleManageBilling}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
            Manage Billing
          </button>
        </div>
      </div>
    </div>
  );
}
