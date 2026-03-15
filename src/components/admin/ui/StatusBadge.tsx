'use client';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  past_due: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  none: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const fallback = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = statusStyles[status] ?? fallback;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {label ?? status}
    </span>
  );
}
