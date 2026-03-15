'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface ClientRef {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  subscriptionStatus: string;
}

export interface UserData {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  billingPeriod?: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  createdAt: string;
  totalMessages?: number;
  clients?: ClientRef[];
}

interface UserProfileProps {
  user: UserData;
  onAction: (action: string, value?: string) => void;
  actionLoading?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function UserProfile({ user, onAction, actionLoading }: UserProfileProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div>
          <h2 className="text-xl font-semibold text-[var(--admin-text-primary)]">{user.name || user.email}</h2>
          <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={user.plan} />
            <StatusBadge status={user.subscriptionStatus} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAction('impersonate')}
            disabled={actionLoading}
            className="rounded-lg border border-[var(--admin-border-subtle)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)] disabled:opacity-50"
          >
            Impersonate
          </button>
          <button
            onClick={() => onAction('change_plan')}
            disabled={actionLoading}
            className="rounded-lg bg-[var(--admin-accent-blue)] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Change Plan
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Subscription Details */}
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Subscription Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Plan</dt>
              <dd>
                <StatusBadge status={user.plan} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Status</dt>
              <dd>
                <StatusBadge status={user.subscriptionStatus} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Billing Period</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{user.billingPeriod || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Trial Ends</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{formatDate(user.trialEndsAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Stripe Customer</dt>
              <dd className="font-mono text-sm text-[var(--admin-text-primary)]">{user.stripeCustomerId || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Registered</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onAction('extend_trial')}
              disabled={actionLoading}
              className="flex-1 rounded-lg border border-[var(--admin-border-subtle)] px-3 py-2 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)] disabled:opacity-50"
            >
              +30 Day Trial
            </button>
            <button
              onClick={() => onAction('cancel')}
              disabled={actionLoading}
              className="flex-1 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Cancel Sub
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Usage Stats</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Total Messages</dt>
              <dd className="text-sm font-medium text-[var(--admin-text-primary)]">
                {(user.totalMessages ?? 0).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Active Clients</dt>
              <dd className="text-sm font-medium text-[var(--admin-text-primary)]">{(user.clients ?? []).length}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Client List */}
      {user.clients && user.clients.length > 0 && (
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
          <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Clients</h3>
          </div>
          <div className="divide-y divide-[var(--admin-border-subtle)]">
            {user.clients.map((client) => (
              <button
                key={client._id}
                onClick={() => router.push(`/admin/clients/${client._id}`)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)]"
              >
                <div>
                  <p className="text-sm text-[var(--admin-text-primary)]">{client.name}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{client.domain || client.clientId}</p>
                </div>
                <StatusBadge status={client.subscriptionStatus} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
