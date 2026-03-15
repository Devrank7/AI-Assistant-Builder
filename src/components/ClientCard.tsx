'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IClient } from '@/models/Client';
import { MotionCard } from '@/components/ui/motion';

interface ClientCardProps {
  client: IClient;
  isQuick?: boolean;
}

export default function ClientCard({ client, isQuick = false }: ClientCardProps) {
  // Use useState with lazy initializer to avoid Date.now() impure call during render
  const [{ daysUntilPayment, startDate }] = useState(() => {
    const start = new Date(client.startDate);
    const days = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    return {
      startDate: start,
      daysUntilPayment: 30 - (days % 30),
    };
  });

  const statusColor = isQuick
    ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
    : client.subscriptionStatus === 'trial'
      ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
      : client.subscriptionStatus === 'active'
        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
        : client.subscriptionStatus === 'suspended'
          ? 'bg-red-400/10 text-red-400 border-red-400/20'
          : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';

  const statusLabel = isQuick
    ? 'Demo'
    : client.subscriptionStatus === 'trial'
      ? 'Trial'
      : client.subscriptionStatus === 'active'
        ? 'Active'
        : client.subscriptionStatus === 'suspended'
          ? 'Suspended'
          : client.subscriptionStatus || 'Active';

  const accentFrom = isQuick ? 'from-amber-400' : 'from-[var(--neon-cyan)]';
  const accentTo = isQuick ? 'to-orange-500' : 'to-[var(--neon-purple)]';
  const hoverText = isQuick ? 'group-hover:text-amber-400' : 'group-hover:text-[var(--neon-cyan)]';

  return (
    <MotionCard className="group relative h-full overflow-hidden rounded-2xl">
      {/* Hover Gradient Reveal */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${accentFrom}/10 via-transparent ${accentTo}/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      />

      <div className="glass relative h-full border-white/[0.04] p-6 transition-colors group-hover:border-white/10 group-hover:bg-white/[0.05]">
        <Link href={`/admin/clients/${client.clientId}`} className="absolute inset-0 z-10">
          <span className="sr-only">View Details</span>
        </Link>
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-40`}
              />
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} text-lg font-bold text-white shadow-lg`}
              >
                {client.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <h3 className={`text-lg font-semibold text-white transition-colors ${hoverText}`}>{client.username}</h3>
              <p className="text-sm text-gray-500">{client.email || 'Quick Widget'}</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
        </div>

        {/* Stats Row */}
        <div className={`mb-5 grid ${isQuick ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-3 text-center transition-colors group-hover:bg-white/[0.05]">
            <p className={`text-xl font-bold ${isQuick ? 'text-amber-400' : 'text-[var(--neon-cyan)]'}`}>
              {client.requests >= 1000 ? `${(client.requests / 1000).toFixed(1)}k` : client.requests}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">Requests</p>
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-3 text-center transition-colors group-hover:bg-white/[0.05]">
            <p className={`text-xl font-bold ${isQuick ? 'text-orange-400' : 'text-[var(--neon-purple)]'}`}>
              {client.tokens >= 1000 ? `${(client.tokens / 1000).toFixed(1)}k` : client.tokens}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">Tokens</p>
          </div>
          {!isQuick && (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-3 text-center transition-colors group-hover:bg-white/[0.05]">
              <p className="text-xl font-bold text-[var(--neon-pink)]">{daysUntilPayment}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">Days Left</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <a
            href={client.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative z-20 flex items-center gap-1.5 text-gray-500 transition-colors ${hoverText}`}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            <span className="text-xs">{new URL(client.website).hostname}</span>
          </a>
          <span className="text-xs text-gray-600">Since {startDate.toLocaleDateString()}</span>
        </div>

        {/* Hover CTA */}
        <div
          className={`mt-4 flex items-center justify-center border-t border-white/[0.04] pt-4 text-gray-500 transition-all ${hoverText}`}
        >
          <span className="text-xs font-medium">View Details</span>
          <svg
            className="ml-1.5 h-3.5 w-3.5 transform transition-transform duration-300 group-hover:translate-x-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </MotionCard>
  );
}
