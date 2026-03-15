'use client';

interface Trend {
  value: number;
  positive: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  trend?: Trend;
  subtext?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, trend, subtext, loading, onClick }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-3 h-3 w-20" />
        <div className="admin-skeleton mb-2 h-8 w-24" />
        <div className="admin-skeleton h-3 w-16" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5 transition-colors duration-150 ${onClick ? 'cursor-pointer hover:bg-[var(--admin-bg-hover)]' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">{label}</p>
      <p className="mt-1 text-[32px] leading-tight font-bold text-[var(--admin-text-primary)]">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            <span aria-hidden="true">{trend.positive ? '↑' : '↓'}</span>
            {`${trend.positive ? '+' : '-'}${trend.value}%`}
          </span>
        )}
        {subtext && <span className="text-xs text-[var(--admin-text-secondary)]">{subtext}</span>}
      </div>
    </div>
  );
}
