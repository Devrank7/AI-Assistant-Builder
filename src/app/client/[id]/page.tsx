'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IClient } from '@/models/Client';

interface ClientDetailsData {
  client: IClient;
  files: string[];
}

const demoTemplates = [
  {
    id: 'dental',
    name: 'Dental Clinic',
    description: 'Modern dental clinic website with appointment booking',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    gradient: 'from-cyan-500 to-blue-600',
    icon: '🦷',
    isClientSite: false,
  },
  {
    id: 'construction',
    name: 'Construction Co.',
    description: 'Professional construction company website',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    gradient: 'from-orange-500 to-amber-600',
    icon: '🏗️',
    isClientSite: false,
  },
  {
    id: 'hotel',
    name: 'Luxury Hotel',
    description: 'Elegant hotel booking website',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    gradient: 'from-purple-500 to-pink-600',
    icon: '🏨',
    isClientSite: false,
  },
  {
    id: 'client-website',
    name: 'Client Website',
    description: 'Preview widget on the actual client website',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    gradient: 'from-green-500 to-emerald-600',
    icon: '🌐',
    isClientSite: true,
  },
];

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'files' | 'usage' | 'demo'>('info');

  useEffect(() => {
    if (params.id) {
      fetchClientData(params.id as string);
    }
  }, [params.id]);

  const fetchClientData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${id}`);
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Client not found');
      }
    } catch (err) {
      setError('Failed to fetch client data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[var(--neon-cyan)] border-t-transparent" />
          <p className="text-gray-400">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="glass-card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Error</h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <button onClick={() => router.push('/admin')} className="neon-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { client, files } = data;
  const startDate = new Date(client.startDate);
  const daysActive = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilPayment = 30 - (daysActive % 30);
  const scriptUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widgets/${client.folderPath}/script.js`;

  return (
    <div className="bg-gradient-animated min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 rounded-none border-0 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 transition-colors hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
                <span className="font-bold text-black">{client.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="gradient-text text-xl font-bold">{client.username}</h1>
                <p className="text-xs text-gray-400">{client.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="rounded-full border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/10 px-4 py-2 text-sm text-[var(--neon-cyan)]">
                Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Total Requests</p>
            <p className="text-3xl font-bold text-[var(--neon-cyan)]">{client.requests.toLocaleString()}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Tokens Used</p>
            <p className="text-3xl font-bold text-[var(--neon-purple)]">{client.tokens.toLocaleString()}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Days Active</p>
            <p className="text-3xl font-bold text-[var(--neon-pink)]">{daysActive}</p>
          </div>
          <div className="glass-card stat-card p-6">
            <p className="mb-1 text-sm text-gray-400">Days Until Payment</p>
            <p className="gradient-text text-3xl font-bold">{daysUntilPayment}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-6">
          <div className="flex border-b border-white/10">
            {(['info', 'files', 'usage', 'demo'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'demo' ? 'Demo' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact Information */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg className="h-5 w-5 text-[var(--neon-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Username</label>
                  <p className="text-white">{client.username}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{client.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Website</label>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[var(--neon-cyan)] hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
                {client.phone && (
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-white">{client.phone}</p>
                  </div>
                )}
                {client.instagram && (
                  <div>
                    <label className="text-sm text-gray-400">Instagram</label>
                    <a
                      href={`https://instagram.com/${client.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[var(--neon-pink)] hover:underline"
                    >
                      @{client.instagram}
                    </a>
                  </div>
                )}
                {client.addresses && client.addresses.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-400">Addresses</label>
                    {client.addresses.map((addr, idx) => (
                      <p key={idx} className="text-white">
                        {addr}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Widget Integration */}
            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg
                  className="h-5 w-5 text-[var(--neon-purple)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Widget Integration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Script URL</label>
                  <div className="rounded-lg bg-black/30 p-3 font-mono text-sm break-all text-[var(--neon-cyan)]">
                    {scriptUrl}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-gray-400">Embed Code</label>
                  <div className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-sm text-gray-300">
                    <pre>{`<script src="${scriptUrl}"></script>`}</pre>
                  </div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(scriptUrl)} className="neon-button w-full">
                  Copy Script URL
                </button>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <svg className="h-5 w-5 text-[var(--neon-pink)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Subscription Details
              </h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <div>
                  <label className="text-sm text-gray-400">Start Date</label>
                  <p className="text-white">{startDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Next Payment</label>
                  <p className="text-white">
                    {new Date(Date.now() + daysUntilPayment * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Client ID</label>
                  <p className="font-mono text-sm text-white">{client.clientId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Client Token</label>
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-sm text-[var(--neon-cyan)]">{client.clientToken}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(client.clientToken)}
                      className="text-gray-400 transition-colors hover:text-white"
                      title="Copy token"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="glass-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Widget Files</h3>
            <div className="space-y-2">
              {files.length > 0 ? (
                files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="h-5 w-5 text-[var(--neon-cyan)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-mono text-sm text-gray-300">{file}</span>
                    </div>
                    <a
                      href={`/widgets/${client.folderPath}/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--neon-cyan)] hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-gray-400">No files found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="glass-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Usage Statistics</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-6">
                <h4 className="mb-2 text-sm text-gray-400">Requests Over Time</h4>
                <div className="flex h-48 items-end justify-around gap-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div
                      key={i}
                      className="w-full rounded-t bg-gradient-to-t from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-around text-xs text-gray-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-6">
                <h4 className="mb-4 text-sm text-gray-400">Token Usage</h4>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-400">Used</span>
                      <span className="text-white">{client.tokens.toLocaleString()} tokens</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                        style={{ width: `${Math.min((client.tokens / 100000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Avg per request: {client.requests > 0 ? Math.round(client.tokens / client.requests) : 0} tokens
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'demo' && (
          <div>
            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold text-white">Live Demo Templates</h3>
              <p className="text-gray-400">Preview how your widget looks on different website templates</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {demoTemplates.map((template) => {
                const href = template.isClientSite
                  ? `/demo/${template.id}?client=${client.clientId}&website=${encodeURIComponent(client.website)}`
                  : `/demo/${template.id}?client=${client.clientId}`;

                return (
                  <Link key={template.id} href={href} className="group">
                    <div
                      className={`glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${template.isClientSite ? 'ring-2 ring-green-500/30 hover:shadow-green-500/20' : 'hover:shadow-[var(--neon-cyan)]/20'}`}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={template.image}
                          alt={template.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${template.gradient} opacity-60`} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">{template.icon}</span>
                        </div>
                        <div
                          className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs text-white backdrop-blur-sm ${template.isClientSite ? 'bg-green-500/70' : 'bg-black/50'}`}
                        >
                          {template.isClientSite ? 'Your Website' : 'Live Preview'}
                        </div>
                      </div>
                      <div className="p-5">
                        <h4
                          className={`mb-1 text-lg font-semibold text-white transition-colors ${template.isClientSite ? 'group-hover:text-green-400' : 'group-hover:text-[var(--neon-cyan)]'}`}
                        >
                          {template.name}
                        </h4>
                        <p className="mb-2 text-sm text-gray-400">{template.description}</p>
                        {template.isClientSite && (
                          <p className="mb-2 truncate text-xs text-green-400/70">{client.website}</p>
                        )}
                        <div
                          className={`flex items-center text-sm font-medium ${template.isClientSite ? 'text-green-400' : 'text-[var(--neon-cyan)]'}`}
                        >
                          <span>Open Demo</span>
                          <svg
                            className="ml-2 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
