'use client';

import { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const hasContent = mode !== 'empty';

  // Don't render anything when there's no content
  if (!hasContent) return null;

  return (
    <>
      {/* Mobile toggle button */}
      {hasContent && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed right-4 bottom-20 z-50 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 lg:hidden"
          style={{
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            boxShadow: '0 4px 24px rgba(6,182,212,0.3)',
          }}
        >
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
            )}
            {!isOpen && <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
          </svg>
        </button>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-[340px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:z-auto lg:w-[380px] lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} `}
        style={{
          background: '#0a0b10',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Mobile close header */}
        <div
          className="flex items-center justify-between px-5 py-4 lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}
          >
            Preview
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: '#4a5068' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-full flex-col overflow-hidden lg:h-full">
          {mode === 'empty' && (
            <div className="flex h-full items-center justify-center px-6">
              <div className="text-center">
                <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(6,182,212,0.04)',
                      border: '1px solid rgba(6,182,212,0.08)',
                      animation: 'panelPulse 3s ease-in-out infinite',
                    }}
                  />
                  <svg
                    className="relative h-7 w-7"
                    style={{ color: '#2d3348' }}
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
                <p className="text-sm font-medium" style={{ color: '#3d4357', fontFamily: "'Outfit', sans-serif" }}>
                  Preview will appear here
                </p>
                <p className="mt-1.5 text-xs" style={{ color: '#252a3a', fontFamily: "'Outfit', sans-serif" }}>
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
              <h3
                className="mb-5 text-sm font-semibold"
                style={{ color: '#e0e4ec', fontFamily: "'Outfit', sans-serif" }}
              >
                Connected Integrations
              </h3>
              {connectedIntegrations.length === 0 ? (
                <p className="text-sm" style={{ color: '#3d4357', fontFamily: "'Outfit', sans-serif" }}>
                  No integrations connected yet
                </p>
              ) : (
                <div className="space-y-3">
                  {connectedIntegrations.map((integration, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl p-3.5 transition-all duration-200"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        className="h-2 w-2 rounded-full"
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
                          style={{ color: '#e0e4ec', fontFamily: "'Outfit', sans-serif" }}
                        >
                          {integration.provider}
                        </p>
                        <p className="text-xs capitalize" style={{ color: '#3d4357' }}>
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

        <style>{`
          @keyframes panelPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
        `}</style>
      </div>
    </>
  );
}
