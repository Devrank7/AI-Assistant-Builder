'use client';

import type { PanelMode } from '@/lib/builder/types';
import LivePreview from './LivePreview';
import TestSandbox from './TestSandbox';
import ABCompare from './ABCompare';

interface Props {
  mode: PanelMode;
  clientId: string | null;
  currentTheme: Record<string, unknown> | null;
  abVariants: { label: string; theme: Record<string, unknown> }[] | null;
  connectedIntegrations: { provider: string; status: string }[];
  onSelectVariant: (index: number) => void;
}

export default function ContextPanel({
  mode,
  clientId,
  currentTheme,
  abVariants,
  connectedIntegrations,
  onSelectVariant,
}: Props) {
  return (
    <div className="flex h-full w-[400px] flex-col border-l border-gray-200 bg-white">
      {mode === 'empty' && (
        <div className="flex h-full items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="mb-4 text-5xl">✨</div>
            <p className="text-sm">Preview will appear here</p>
            <p className="mt-1 text-xs text-gray-300">Paste a URL to get started</p>
          </div>
        </div>
      )}

      {mode === 'live_preview' && <LivePreview clientId={clientId} currentTheme={currentTheme} />}

      {mode === 'ab_compare' && abVariants && <ABCompare variants={abVariants} onSelect={onSelectVariant} />}

      {mode === 'test_sandbox' && clientId && (
        <TestSandbox clientId={clientId} connectedIntegrations={connectedIntegrations} />
      )}

      {mode === 'crm_status' && (
        <div className="p-4">
          <h3 className="mb-4 text-sm font-medium">Connected Integrations</h3>
          {connectedIntegrations.length === 0 ? (
            <p className="text-sm text-gray-400">No integrations connected yet</p>
          ) : (
            <div className="space-y-3">
              {connectedIntegrations.map((integration, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      integration.status === 'connected'
                        ? 'bg-green-500'
                        : integration.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium capitalize">{integration.provider}</p>
                    <p className="text-xs text-gray-500 capitalize">{integration.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
