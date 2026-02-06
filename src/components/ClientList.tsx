'use client';

import { useEffect, useState } from 'react';
import { IClient } from '@/models/Client';
import ClientCard from './ClientCard';
import LoadingCard from './LoadingCard';

export default function ClientList() {
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (data.success) {
        setClients(data.clients);
      } else {
        setError(data.error || 'Failed to fetch clients');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.website.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRequests = clients.reduce((sum, c) => sum + c.requests, 0);
  const totalTokens = clients.reduce((sum, c) => sum + c.tokens, 0);

  return (
    <div className="animate-slide-up space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Total Clients */}
        <div className="stat-premium group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <svg
              className="h-16 w-16 -rotate-12 transform text-[var(--neon-cyan)] transition-transform duration-500 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/10 shadow-[0_0_15px_rgba(0,229,255,0.1)] backdrop-blur-md">
              <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide text-gray-400">Total Clients</span>
          </div>
          <p className="stat-value relative z-10">{clients.length}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <span className="flex items-center gap-0.5 text-emerald-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +12%
            </span>
            <span>vs last month</span>
          </div>
        </div>

        {/* Total Requests */}
        <div className="stat-premium group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <svg
              className="h-16 w-16 -rotate-12 transform text-[var(--neon-purple)] transition-transform duration-500 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--neon-purple)]/20 bg-[var(--neon-purple)]/10 shadow-[0_0_15px_rgba(184,77,255,0.1)] backdrop-blur-md">
              <svg className="h-5 w-5 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide text-gray-400">Requests</span>
          </div>
          <p className="stat-value relative z-10">{totalRequests.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <span className="flex items-center gap-0.5 text-emerald-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +5.3%
            </span>
            <span>vs last month</span>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="stat-premium group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <svg
              className="h-16 w-16 -rotate-12 transform text-[var(--neon-pink)] transition-transform duration-500 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--neon-pink)]/20 bg-[var(--neon-pink)]/10 shadow-[0_0_15px_rgba(255,45,135,0.1)] backdrop-blur-md">
              <svg className="h-5 w-5 text-[var(--neon-pink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide text-gray-400">Tokens Used</span>
          </div>
          <p className="stat-value relative z-10">
            {totalTokens >= 1000000
              ? `${(totalTokens / 1000000).toFixed(1)}M`
              : totalTokens >= 1000
                ? `${(totalTokens / 1000).toFixed(1)}k`
                : totalTokens.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <span className="flex items-center gap-0.5 text-emerald-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +24%
            </span>
            <span>vs last month</span>
          </div>
        </div>

        {/* Active Widgets */}
        <div className="stat-premium group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
            <svg
              className="h-16 w-16 -rotate-12 transform text-emerald-400 transition-transform duration-500 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="relative z-10 mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.1)] backdrop-blur-md">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium tracking-wide text-gray-400">Active</span>
          </div>
          <p className="stat-value relative z-10">{clients.filter((c) => c.isActive).length || clients.length}</p>
          <div className="relative z-10 mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-300">100%</span> uptime
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-premium flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        <div className="group relative w-full md:w-96">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
          <div className="relative flex items-center">
            <svg
              className="absolute left-4 h-5 w-5 text-gray-400 transition-colors group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050507] py-3.5 pr-4 pl-12 text-sm text-white placeholder-gray-500 transition-all focus:outline-none"
            />
          </div>
        </div>

        <button onClick={fetchClients} className="btn-outline-premium group flex items-center gap-2">
          <svg
            className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass rounded-2xl border-red-500/20 bg-red-500/[0.03] p-5">
          <div className="flex items-center gap-3 text-red-400">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingCard key={i} />
            ))}
          </>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => <ClientCard key={client.clientId} client={client} />)
        ) : (
          <div className="col-span-full">
            <div className="glass rounded-2xl border-white/[0.04] p-16 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
                <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">No clients found</h3>
              <p className="text-sm text-gray-500">
                {searchTerm
                  ? 'No clients match your search criteria'
                  : 'Add widget folders to the /widgets directory to get started'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
