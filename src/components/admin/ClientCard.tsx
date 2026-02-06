'use client';

import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

interface ClientCardProps {
  client: {
    clientId: string;
    name: string;
    email?: string;
    status: 'active' | 'trial' | 'past_due' | 'inactive' | 'blocked' | 'pending';
    plan?: string;
    messagesCount?: number;
    widgetsCount?: number;
    createdAt?: string;
  };
  href?: string;
  onAction?: (clientId: string, action: string) => void;
}

export default function ClientCard({ client, href, onAction }: ClientCardProps) {
  const card = (
    <div className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-sm font-bold text-white">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-cyan-400">
              {client.name}
            </h3>
            {client.email && <p className="max-w-[200px] truncate text-xs text-gray-500">{client.email}</p>}
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
          <p className="text-lg font-bold text-white">{client.messagesCount?.toLocaleString('ru-RU') ?? '—'}</p>
          <p className="text-[10px] tracking-wider text-gray-500 uppercase">Сообщений</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
          <p className="text-lg font-bold text-white">{client.widgetsCount ?? '—'}</p>
          <p className="text-[10px] tracking-wider text-gray-500 uppercase">Виджетов</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2 text-center">
          <p className="text-lg font-bold text-white">{client.plan ?? '—'}</p>
          <p className="text-[10px] tracking-wider text-gray-500 uppercase">Тариф</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        {client.createdAt && (
          <span className="text-xs text-gray-600">{new Date(client.createdAt).toLocaleDateString('ru-RU')}</span>
        )}
        {client.status === 'pending' && onAction && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction(client.clientId, 'activate');
            }}
            className="mr-2 ml-auto rounded-lg border border-[var(--neon-green)]/30 bg-[var(--neon-green)]/10 px-3 py-1.5 text-xs font-medium text-[var(--neon-green)] transition-colors hover:bg-[var(--neon-green)]/20"
          >
            Activate 🚀
          </button>
        )}
        {onAction && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction(client.clientId, 'edit');
              }}
              className="rounded-lg p-1.5 text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction(client.clientId, 'delete');
              }}
              className="rounded-lg p-1.5 text-xs text-gray-500 transition-colors hover:bg-red-500/5 hover:text-red-400"
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
