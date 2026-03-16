'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Plug, Check, ExternalLink, Link2, Unlink, ShieldCheck, Loader2 } from 'lucide-react';

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

  const connectedIntegrations = integrations.filter((i) => isConnected(i.provider));
  const availableIntegrations = integrations.filter((i) => !isConnected(i.provider));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold">Integrations</h1>
        <p className="text-text-secondary mt-1 text-sm">Connect your CRM, Google Calendar, and more.</p>
      </div>

      {/* Pro plan required banner */}
      {!isPro && (
        <Card padding="lg">
          <div className="mb-2 flex items-center gap-3">
            <ShieldCheck className="text-accent h-5 w-5" />
            <h3 className="text-text-primary text-base font-semibold">Pro Plan Required</h3>
          </div>
          <p className="text-text-secondary text-sm">
            CRM and calendar integrations are available on the Pro plan. Upgrade to connect your favorite tools and
            automatically sync contacts from your AI widget conversations.
          </p>
          <a href="/dashboard/billing">
            <Button variant="primary" size="md" className="mt-4">
              Upgrade to Pro
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="text-text-tertiary h-5 w-5 animate-spin" />
        </div>
      )}

      {/* Connected section */}
      {isPro && !loading && connectedIntegrations.length > 0 && (
        <section>
          <h2 className="text-text-tertiary mb-3 text-xs font-medium tracking-wider uppercase">Connected</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectedIntegrations.map((config) => {
              const conn = connected.find((c) => c.provider === config.provider);
              if (!conn) return null;
              return (
                <Card key={conn._id} padding="md" className="flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="text-text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ backgroundColor: config.color + '20' }}
                    >
                      {config.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-text-primary text-sm font-medium">{config.name}</h3>
                        <Badge variant="green">
                          <Check className="mr-0.5 h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-text-tertiary mt-0.5 text-xs">{config.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => handleDisconnect(config.provider)}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Available section */}
      {!loading && (
        <section>
          <h2 className="text-text-tertiary mb-3 text-xs font-medium tracking-wider uppercase">
            {isPro && connectedIntegrations.length > 0 ? 'Available' : 'All Integrations'}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => (
              <Card
                key={integration.provider}
                padding="md"
                className={`flex flex-col justify-between ${!isPro ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="text-text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ backgroundColor: integration.color + '20' }}
                  >
                    {integration.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-text-primary text-sm font-medium">{integration.name}</h3>
                    <p className="text-text-tertiary mt-0.5 text-xs">{integration.description}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge variant="default">Not Connected</Badge>
                      <Badge variant="blue">{integration.type === 'crm' ? 'CRM' : 'Calendar'}</Badge>
                    </div>
                  </div>
                </div>

                {isPro && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setModalProvider(integration);
                      setError('');
                      setTokenInput('');
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Connect
                  </Button>
                )}

                {!isPro && <p className="text-text-tertiary mt-3 text-center text-xs">Pro Plan Required</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Connect Modal */}
      <Modal
        open={!!modalProvider}
        onClose={() => setModalProvider(null)}
        title={`Connect ${modalProvider?.name ?? ''}`}
        description={`Enter your API key or access token to connect ${modalProvider?.name ?? ''}.`}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setModalProvider(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" disabled={saving || !tokenInput.trim()} onClick={handleConnect}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="h-3.5 w-3.5" />
                  Connect
                </>
              )}
            </Button>
          </>
        }
      >
        <Input
          label="API Key / Access Token"
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Paste your token here..."
          error={error || undefined}
        />
      </Modal>
    </div>
  );
}
