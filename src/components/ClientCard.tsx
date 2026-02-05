'use client';

import Link from 'next/link';
import { IClient } from '@/models/Client';

interface ClientCardProps {
  client: IClient;
}

export default function ClientCard({ client }: ClientCardProps) {
  const startDate = new Date(client.startDate);
  const daysActive = Math.floor(
    (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilPayment = 30 - (daysActive % 30);

  return (
    <div className="glass-card p-6 cursor-pointer group relative">
      <Link href={`/client/${client.clientId}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Details</span>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center text-black font-bold text-lg">
            {client.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-[var(--neon-cyan)] transition-colors">
              {client.username}
            </h3>
            <p className="text-sm text-gray-400">{client.email}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 text-xs rounded-full bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
            Active
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="stat-card glass-card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--neon-cyan)]">
            {client.requests.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Requests</p>
        </div>
        <div className="stat-card glass-card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--neon-purple)]">
            {client.tokens.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Tokens</p>
        </div>
        <div className="stat-card glass-card p-3 text-center">
          <p className="text-2xl font-bold text-[var(--neon-pink)]">
            {daysUntilPayment}
          </p>
          <p className="text-xs text-gray-400">Days Left</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <a
          href={client.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-[var(--neon-cyan)] transition-colors flex items-center gap-1 relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          {new URL(client.website).hostname}
        </a>
        <span className="text-gray-500">
          Since {startDate.toLocaleDateString()}
        </span>
      </div>

      {/* Hover indicator */}
      <div className="mt-4 flex items-center justify-center text-gray-400 group-hover:text-[var(--neon-cyan)] transition-colors">
        <span className="text-sm">View Details</span>
        <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
