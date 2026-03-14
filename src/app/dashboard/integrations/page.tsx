'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useCallback } from 'react';

interface IntegrationConfig {
  name: string;
  provider: string;
  description: string;
  color: string;
  type: 'crm' | 'calendar';
}

interface ConnectedIntegration {
  _id: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

const integrations: IntegrationConfig[] = [
  { name: 'HubSpot', provider: 'hubspot', description: 'CRM & Marketing Automation', color: '#FF7A59', type: 'crm' },
  { name: 'Salesforce', provider: 'salesforce', description: 'Enterprise CRM Platform', color: '#00A1E0', type: 'crm' },
  { name: 'Pipedrive', provider: 'pipedrive', description: 'Sales Pipeline Management', color: '#1E1E1E', type: 'crm' },
  { name: 'Zoho', provider: 'zoho', description: 'Business Suite & CRM', color: '#E42527', type: 'crm' },
  { name: 'Freshsales', provider: 'freshsales', description: 'AI-Powered Sales CRM', color: '#F26522', type: 'crm' },
  { name: 'Bitrix24', provider: 'bitrix24', description: 'Collaboration & CRM', color: '#2FC6F6', type: 'crm' },
  { name: 'Monday CRM', provider: 'monday', description: 'Work OS & CRM', color: '#FF3D57', type: 'crm' },
  {
    name: 'Google Calendar',
    provider: 'google_calendar',
    description: 'Scheduling & Calendar',
    color: '#4285F4',
    type: 'calendar',
  },
  { name: 'Calendly', provider: 'calendly', description: 'Meeting Scheduling', color: '#006BFF', type: 'calendar' },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';
  const [connected, setConnected] = useState<ConnectedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProvider, setModalProvider] = useState<IntegrationConfig | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/user-integrations');
      const json = await res.json();
      if (json.success) setConnected(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPro) fetchIntegrations();
    else setLoading(false);
  }, [isPro, fetchIntegrations]);

  const isConnected = (provider: string) => connected.some((c) => c.provider === provider && c.isActive);

  const getConnectionId = (provider: string) => connected.find((c) => c.provider === provider)?._id;

  const handleConnect = async () => {
    if (!modalProvider || !tokenInput.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: modalProvider.provider, accessToken: tokenInput.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to connect');
        return;
      }
      setModalProvider(null);
      setTokenInput('');
      fetchIntegrations();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    const id = getConnectionId(provider);
    if (!id) return;
    try {
      const res = await fetch(`/api/user-integrations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchIntegrations();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="mt-1 text-gray-400">Connect your CRM, Google Calendar, and more.</p>
      </div>

      {!isPro && (
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6">
          <div className="mb-2 flex items-center gap-3">
            <svg
              className="h-6 w-6 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white">Pro Plan Required</h3>
          </div>
          <p className="text-sm text-gray-400">
            CRM and calendar integrations are available on the Pro plan. Upgrade to connect your favorite tools and
            automatically sync contacts from your AI widget conversations.
          </p>
          <a
            href="/dashboard/billing"
            className="mt-4 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
          >
            Upgrade to Pro
          </a>
        </div>
      )}

      {isPro && connected.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Connected</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((conn) => {
              const config = integrations.find((i) => i.provider === conn.provider);
              if (!config) return null;
              return (
                <div key={conn._id} className="rounded-xl border border-green-500/20 bg-[#12121a] p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: config.color + '30' }}
                    >
                      {config.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{config.name}</h3>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => handleDisconnect(config.provider)}
                    className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    Disconnect
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          {isPro && connected.length > 0 ? 'Available Integrations' : 'All Integrations'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations
            .filter((i) => !isConnected(i.provider))
            .map((integration) => (
              <div
                key={integration.provider}
                className={`relative rounded-xl border border-white/10 bg-[#12121a] p-5 ${!isPro ? 'opacity-60' : ''}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: integration.color + '30' }}
                  >
                    {integration.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-gray-500/15 px-2 py-0.5 text-xs font-medium text-gray-400">
                    Not Connected
                  </span>
                  <span className="inline-flex items-center rounded bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                    {integration.type === 'crm' ? 'CRM' : 'Calendar'}
                  </span>
                </div>

                {isPro && (
                  <button
                    onClick={() => {
                      setModalProvider(integration);
                      setError('');
                      setTokenInput('');
                    }}
                    className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    Connect
                  </button>
                )}

                {!isPro && <span className="mt-3 block text-center text-xs text-purple-400">Pro Plan Required</span>}
              </div>
            ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Connect Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-white">Connect {modalProvider.name}</h3>
            <p className="mb-4 text-sm text-gray-400">
              Enter your API key or access token to connect {modalProvider.name}.
            </p>

            <label className="mb-1 block text-xs font-medium text-gray-400">API Key / Access Token</label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your token here..."
              className="mb-4 w-full rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setModalProvider(null)}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={saving || !tokenInput.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
