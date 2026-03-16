'use client';

import { useEffect, useRef } from 'react';

interface Props {
  clientId: string | null;
  currentTheme: Record<string, unknown> | null;
}

export default function LivePreview({ clientId, currentTheme }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!currentTheme || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'theme_update', theme: currentTheme }, '*');
  }, [currentTheme]);

  if (!clientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg
              className="h-6 w-6"
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            style={{ color: '#22d3ee' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-medium" style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}>
            Live Preview
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
          />
          <span className="text-xs" style={{ color: '#34d399' }}>
            Live
          </span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden" style={{ background: '#111318' }}>
        <iframe
          ref={iframeRef}
          src={`/quickwidgets/${clientId}/preview.html`}
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Widget Preview"
        />
      </div>
    </div>
  );
}
