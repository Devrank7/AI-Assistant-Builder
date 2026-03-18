'use client';

import { useState, useRef, useEffect } from 'react';
import type { PanelMode } from '@/lib/builder/types';
import { playClickSound } from '@/lib/sounds';
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
  const prevModeRef = useRef<PanelMode>(mode);
  const hasContent = mode !== 'empty';

  // Play click sound when panel mode changes
  useEffect(() => {
    if (prevModeRef.current !== mode && mode !== 'empty') {
      playClickSound();
    }
    prevModeRef.current = mode;
  }, [mode]);

  const statusConfig: Record<string, { color: string; glow: string; bg: string; label: string }> = {
    connected: {
      color: '#10b981',
      glow: '0 0 10px rgba(16,185,129,0.35)',
      bg: 'rgba(16,185,129,0.06)',
      label: 'Connected',
    },
    failed: {
      color: '#ef4444',
      glow: '0 0 10px rgba(239,68,68,0.35)',
      bg: 'rgba(239,68,68,0.06)',
      label: 'Failed',
    },
    pending: {
      color: '#f59e0b',
      glow: '0 0 10px rgba(245,158,11,0.35)',
      bg: 'rgba(245,158,11,0.06)',
      label: 'Pending',
    },
  };

  return (
    <>
      {/* Mobile toggle button */}
      {hasContent && (
        <button
          onClick={() => {
            playClickSound();
            setIsOpen(!isOpen);
          }}
          className="fixed right-4 bottom-20 z-50 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 lg:hidden"
          style={{
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            boxShadow: '0 4px 24px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
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

      {/* Mobile overlay — backdrop blur transition */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 lg:pointer-events-none lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{
          background: 'rgba(5,6,12,0.7)',
          backdropFilter: isOpen ? 'blur(12px) saturate(120%)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(12px) saturate(120%)' : 'blur(0px)',
        }}
        onClick={() => {
          playClickSound();
          setIsOpen(false);
        }}
      />

      {/* Panel — glass sidebar with smooth width transition on desktop */}
      <div
        className={`fixed top-0 right-0 z-40 h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:z-auto lg:translate-x-0 ${
          hasContent
            ? `w-[340px] lg:w-[380px] ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`
            : 'w-0 translate-x-full lg:w-0 lg:translate-x-0'
        }`}
        style={{
          background: hasContent ? 'rgba(10,11,16,0.85)' : 'transparent',
          backdropFilter: hasContent ? 'blur(40px) saturate(150%)' : 'none',
          WebkitBackdropFilter: hasContent ? 'blur(40px) saturate(150%)' : 'none',
          borderLeft: hasContent ? '1px solid rgba(255,255,255,0.06)' : 'none',
          boxShadow: hasContent ? '-8px 0 40px rgba(0,0,0,0.3)' : 'none',
          overflow: 'hidden',
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
            onClick={() => {
              playClickSound();
              setIsOpen(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105"
            style={{ color: '#4a5068' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode indicator bar */}
        <div className="hidden items-center gap-2 px-5 pt-5 pb-2 lg:flex">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1.5"
            style={{
              background: 'rgba(6,182,212,0.06)',
              border: '1px solid rgba(6,182,212,0.12)',
            }}
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: '#06b6d4',
                boxShadow: '0 0 6px rgba(6,182,212,0.5)',
                animation: 'ctxIndicatorPulse 2s ease-in-out infinite',
              }}
            />
            <span
              className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: 'rgba(6,182,212,0.7)', fontFamily: "'Outfit', sans-serif" }}
            >
              {mode === 'live_preview' && 'Live Preview'}
              {mode === 'test_sandbox' && 'Test Sandbox'}
              {mode === 'ab_compare' && 'A/B Compare'}
              {mode === 'crm_status' && 'CRM Status'}
              {mode === 'integration_status' && 'Integrations'}
            </span>
          </div>
        </div>

        <div className="flex h-full flex-col overflow-hidden lg:h-full">
          {mode === 'live_preview' && <LivePreview clientId={clientId} currentTheme={currentTheme} />}

          {mode === 'ab_compare' && abVariants && <ABCompare variants={abVariants} onSelect={onSelectVariant} />}

          {mode === 'ab_compare' && !abVariants && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(6,182,212,0.04)',
                      border: '1px solid rgba(6,182,212,0.08)',
                      animation: 'ctxIndicatorPulse 2s ease-in-out infinite',
                    }}
                  />
                  <div
                    className="absolute inset-2 rounded-xl"
                    style={{
                      background: 'rgba(139,92,246,0.04)',
                      border: '1px solid rgba(139,92,246,0.08)',
                      animation: 'ctxIndicatorPulse 2s ease-in-out infinite 0.4s',
                    }}
                  />
                  <svg className="relative h-6 w-6" style={{ color: '#4a5068' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}>
                  Generating Design
                </p>
                <p className="mt-1.5 text-xs" style={{ color: '#2d3348', fontFamily: "'Outfit', sans-serif" }}>
                  Your widget preview will appear shortly
                </p>
              </div>
            </div>
          )}

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
                <div className="flex flex-col items-center py-8">
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <svg
                      className="h-5 w-5"
                      style={{ color: '#2d3348' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-3.572a4.5 4.5 0 00-6.364-6.364L4.5 8.25"
                      />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: '#3d4357', fontFamily: "'Outfit', sans-serif" }}>
                    No integrations connected yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {connectedIntegrations.map((integration, i) => {
                    const cfg = statusConfig[integration.status] || statusConfig.pending;
                    return (
                      <div
                        key={i}
                        className="group flex items-center gap-3.5 rounded-xl p-3.5 transition-all duration-300"
                        style={{
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {/* Status indicator with animated ring */}
                        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
                          <div
                            className="absolute inset-0 rounded-full transition-opacity duration-300"
                            style={{
                              background: cfg.bg,
                              border: `1px solid ${cfg.color}20`,
                              opacity: 0.6,
                            }}
                          />
                          <div
                            className="relative h-2 w-2 rounded-full"
                            style={{
                              background: cfg.color,
                              boxShadow: cfg.glow,
                              animation:
                                integration.status === 'connected'
                                  ? 'ctxStatusPulse 3s ease-in-out infinite'
                                  : integration.status === 'pending'
                                    ? 'ctxStatusBlink 1.5s ease-in-out infinite'
                                    : 'none',
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium capitalize"
                            style={{ color: '#e0e4ec', fontFamily: "'Outfit', sans-serif" }}
                          >
                            {integration.provider}
                          </p>
                          <p
                            className="mt-0.5 text-[11px] font-medium capitalize"
                            style={{ color: cfg.color, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {cfg.label}
                          </p>
                        </div>
                        {/* Chevron */}
                        <svg
                          className="h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          style={{ color: '#3d4357' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
          @keyframes ctxRing {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.06); }
          }
          @keyframes ctxCorePulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.03); }
          }
          @keyframes ctxIndicatorPulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes ctxStatusPulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.15); }
          }
          @keyframes ctxStatusBlink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  );
}
