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
    <div
      className="flex h-full w-[420px] flex-col"
      style={{
        background: '#0c0d13',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {mode === 'empty' && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <div
                className="absolute inset-0 animate-pulse rounded-2xl"
                style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.1)' }}
              />
              <svg
                className="relative h-7 w-7"
                style={{ color: '#4a5068' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}>
              Preview will appear here
            </p>
            <p className="mt-1 text-xs" style={{ color: '#2d3348' }}>
              Paste a URL to get started
            </p>
          </div>
        </div>
      )}

      {mode === 'live_preview' && <LivePreview clientId={clientId} currentTheme={currentTheme} />}

      {mode === 'ab_compare' && abVariants && <ABCompare variants={abVariants} onSelect={onSelectVariant} />}

      {mode === 'test_sandbox' && clientId && (
        <TestSandbox clientId={clientId} connectedIntegrations={connectedIntegrations} />
      )}

      {(mode === 'crm_status' || mode === 'integration_status') && (
        <div className="p-5">
          <h3 className="mb-5 text-sm font-medium" style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}>
            Connected Integrations
          </h3>
          {connectedIntegrations.length === 0 ? (
            <p className="text-sm" style={{ color: '#4a5068' }}>
              No integrations connected yet
            </p>
          ) : (
            <div className="space-y-3">
              {connectedIntegrations.map((integration, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl p-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        integration.status === 'connected'
                          ? '#10b981'
                          : integration.status === 'failed'
                            ? '#ef4444'
                            : '#f59e0b',
                      boxShadow:
                        integration.status === 'connected'
                          ? '0 0 8px rgba(16,185,129,0.4)'
                          : integration.status === 'failed'
                            ? '0 0 8px rgba(239,68,68,0.4)'
                            : '0 0 8px rgba(245,158,11,0.4)',
                    }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium capitalize"
                      style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {integration.provider}
                    </p>
                    <p className="text-xs capitalize" style={{ color: '#4a5068' }}>
                      {integration.status}
                    </p>
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
