interface StatsCardProps {
  label: string;
  value: string | number;
  change?: { value: number; label?: string };
  icon?: string;
  gradient?: 'cyan' | 'purple' | 'pink' | 'emerald' | 'amber';
}

const gradients = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
};

const iconBgs = {
  cyan: 'bg-cyan-500/10 text-cyan-400',
  purple: 'bg-purple-500/10 text-purple-400',
  pink: 'bg-pink-500/10 text-pink-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
};

export default function StatsCard({ label, value, change, icon, gradient = 'cyan' }: StatsCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 ${gradients[gradient]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {change && (
            <p
              className={`mt-2 flex items-center gap-1 text-xs ${change.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              <span>{change.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}%</span>
              {change.label && <span className="ml-1 text-gray-500">{change.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${iconBgs[gradient]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
