'use client';

import { useAuth } from '@/components/AuthProvider';

const integrations = [
  { name: 'HubSpot', description: 'CRM & Marketing Automation', color: '#FF7A59' },
  { name: 'Salesforce', description: 'Enterprise CRM Platform', color: '#00A1E0' },
  { name: 'Pipedrive', description: 'Sales Pipeline Management', color: '#1E1E1E' },
  { name: 'Zoho', description: 'Business Suite & CRM', color: '#E42527' },
  { name: 'Freshsales', description: 'AI-Powered Sales CRM', color: '#F26522' },
  { name: 'Bitrix24', description: 'Collaboration & CRM', color: '#2FC6F6' },
  { name: 'Monday CRM', description: 'Work OS & CRM', color: '#FF3D57' },
  { name: 'Google Calendar', description: 'Scheduling & Calendar', color: '#4285F4' },
  { name: 'Calendly', description: 'Meeting Scheduling', color: '#006BFF' },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const isBasic = user?.plan === 'basic' || user?.plan === 'none';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="mt-1 text-gray-400">Connect your CRM, Google Calendar, and more.</p>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6">
        <div className="mb-2 flex items-center gap-3">
          <svg
            className="h-6 w-6 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Coming Soon</h3>
        </div>
        <p className="text-sm text-gray-400">
          We&apos;re building powerful integrations to connect your AI widgets with the tools you already use. Stay
          tuned for updates.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="relative rounded-xl border border-white/10 bg-[#12121a] p-5 opacity-60"
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

            {isBasic && (
              <span className="inline-flex items-center rounded bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                Pro Plan Required
              </span>
            )}

            {!isBasic && (
              <span className="inline-flex items-center rounded bg-gray-500/15 px-2 py-0.5 text-xs font-medium text-gray-400">
                Coming Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
