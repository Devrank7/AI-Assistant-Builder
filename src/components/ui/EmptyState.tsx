import { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="bg-bg-tertiary text-text-secondary mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="text-text-primary mb-2 text-xl font-semibold">{title}</h3>
      {description && <p className="text-text-secondary mb-6 max-w-sm text-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
