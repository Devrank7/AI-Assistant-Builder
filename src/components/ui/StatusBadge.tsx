type Status = 'active' | 'trial' | 'past_due' | 'inactive' | 'blocked' | 'pending';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  active: { label: 'Активен', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  trial: { label: 'Пробный', dot: 'bg-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  past_due: { label: 'Просрочен', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  inactive: { label: 'Неактивен', dot: 'bg-gray-400', bg: 'bg-gray-500/10', text: 'text-gray-400' },
  blocked: { label: 'Заблокирован', dot: 'bg-red-400', bg: 'bg-red-500/10', text: 'text-red-400' },
  pending: { label: 'Ожидание', dot: 'bg-purple-400', bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.inactive;
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
      {displayLabel}
    </span>
  );
}
