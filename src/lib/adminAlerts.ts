interface AlertUser {
  _id: unknown;
  email: string;
  trialEndsAt?: Date | string | null;
}

export interface AdminAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  severity: 'danger' | 'warning' | 'info';
}

export function buildAlerts(pastDueUsers: AlertUser[], expiringTrials: AlertUser[]): AdminAlert[] {
  return [
    ...pastDueUsers.map((u) => ({
      id: String(u._id),
      type: 'past_due',
      title: 'Past Due Payment',
      message: `${u.email} — payment overdue`,
      link: `/admin/users/${u._id}`,
      severity: 'danger' as const,
    })),
    ...expiringTrials.map((u) => ({
      id: String(u._id),
      type: 'trial_expiring',
      title: 'Trial Expiring',
      message: `${u.email} — expires ${u.trialEndsAt ? new Date(u.trialEndsAt as Date).toLocaleDateString() : 'soon'}`,
      link: `/admin/users/${u._id}`,
      severity: 'warning' as const,
    })),
  ];
}
