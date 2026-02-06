import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-4xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm text-gray-400">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
