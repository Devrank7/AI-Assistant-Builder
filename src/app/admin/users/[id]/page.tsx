'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, UserData } from '@/components/admin/users/UserProfile';
import { Modal } from '@/components/admin/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'none' | 'basic' | 'pro'>('none');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
        } else {
          toastError('Failed to load user');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toastError]);

  const handleAction = async (action: string, value?: string) => {
    if (action === 'change_plan') {
      setPlanModal(true);
      return;
    }

    if (action === 'impersonate') {
      setActionLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${id}/impersonate`, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          window.open(json.data?.url ?? '/', '_blank');
          toastSuccess('Impersonation session opened');
        } else {
          toastError('Impersonation failed');
        }
      } catch {
        toastError('Impersonation failed');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (action === 'extend_trial') {
      setActionLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extendTrialDays: 30 }),
        });
        if (res.ok) {
          toastSuccess('Trial extended by 30 days');
          const refreshRes = await fetch(`/api/admin/users/${id}`);
          if (refreshRes.ok) {
            const json = await refreshRes.json();
            setUser(json.data);
          }
        } else {
          toastError('Failed to extend trial');
        }
      } catch {
        toastError('Failed to extend trial');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (action === 'cancel') {
      setActionLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionStatus: 'canceled' }),
        });
        if (res.ok) {
          toastSuccess('Subscription canceled');
          const refreshRes = await fetch(`/api/admin/users/${id}`);
          if (refreshRes.ok) {
            const json = await refreshRes.json();
            setUser(json.data);
          }
        } else {
          toastError('Failed to cancel subscription');
        }
      } catch {
        toastError('Failed to cancel subscription');
      } finally {
        setActionLoading(false);
      }
      return;
    }
  };

  const handlePlanChange = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (res.ok) {
        toastSuccess(`Plan changed to ${selectedPlan}`);
        setPlanModal(false);
        const refreshRes = await fetch(`/api/admin/users/${id}`);
        if (refreshRes.ok) {
          const json = await refreshRes.json();
          setUser(json.data);
        }
      } else {
        toastError('Failed to change plan');
      }
    } catch {
      toastError('Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-skeleton h-8 w-40" />
        <div className="admin-skeleton h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="admin-skeleton h-64 w-full rounded-xl" />
          <div className="admin-skeleton h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="py-20 text-center text-[var(--admin-text-muted)]">User not found</div>;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/admin/users')}
        className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)] transition-colors hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Users
      </button>

      <UserProfile user={user} onAction={handleAction} actionLoading={actionLoading} />

      <Modal
        open={planModal}
        onClose={() => setPlanModal(false)}
        title="Change Plan"
        onConfirm={handlePlanChange}
        confirmLabel="Apply"
        loading={actionLoading}
      >
        <div className="space-y-2">
          {(['none', 'basic', 'pro'] as const).map((plan) => (
            <label
              key={plan}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--admin-border-subtle)] px-4 py-3 transition-colors hover:bg-[var(--admin-bg-hover)]"
            >
              <input
                type="radio"
                name="plan"
                value={plan}
                checked={selectedPlan === plan}
                onChange={() => setSelectedPlan(plan)}
                className="text-[var(--admin-accent-blue)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-primary)] capitalize">{plan}</p>
                {plan === 'basic' && <p className="text-xs text-[var(--admin-text-muted)]">$29/month</p>}
                {plan === 'pro' && <p className="text-xs text-[var(--admin-text-muted)]">$79/month</p>}
                {plan === 'none' && <p className="text-xs text-[var(--admin-text-muted)]">Free tier</p>}
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
