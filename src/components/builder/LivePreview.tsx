'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  clientId: string | null;
  currentTheme: Record<string, unknown> | null;
}

type PreviewMode = 'widget' | 'site';

export default function LivePreview({ clientId, currentTheme }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<PreviewMode>('widget');
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteError, setSiteError] = useState(false);
  const [isHoveringBtn, setIsHoveringBtn] = useState(false);
  const [isHoveringBack, setIsHoveringBack] = useState(false);

  // Send theme updates to widget iframe
  useEffect(() => {
    if (!currentTheme || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'theme_update', theme: currentTheme }, '*');
  }, [currentTheme]);

  // Extract site URL from theme or info.json
  useEffect(() => {
    if (!clientId) return;

    // Try theme.domain first
    if (currentTheme?.domain) {
      const domain = currentTheme.domain as string;
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      setSiteUrl(url);
      return;
    }

    // Fallback: fetch info.json
    fetch(`/quickwidgets/${clientId}/info.json`)
      .then((r) => r.json())
      .then((data) => {
        if (data.website) {
          const url = data.website.startsWith('http') ? data.website : `https://${data.website}`;
          setSiteUrl(url);
        }
      })
      .catch(() => {});
  }, [clientId, currentTheme]);

  const switchToSite = useCallback(() => {
    if (!siteUrl) return;
    setMode('site');
    setSiteLoading(true);
    setSiteError(false);
  }, [siteUrl]);

  const switchToWidget = useCallback(() => {
    setMode('widget');
    setSiteLoading(false);
    setSiteError(false);
  }, []);

  // Empty state
  if (!clientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          {/* Animated concentric rings */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'rgba(6,182,212,0.03)',
                border: '1px solid rgba(6,182,212,0.06)',
                animation: 'pulse 3s ease-in-out infinite',
              }}
            />
            <div
              className="absolute inset-2 rounded-xl"
              style={{
                background: 'rgba(6,182,212,0.04)',
                border: '1px solid rgba(6,182,212,0.08)',
                animation: 'pulse 3s ease-in-out infinite 0.5s',
              }}
            />
            <svg
              className="relative h-7 w-7"
              style={{ color: '#2d3a50' }}
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
          <p className="text-sm font-medium" style={{ color: '#3d4560', fontFamily: "'Outfit', sans-serif" }}>
            Widget Preview
          </p>
          <p className="mt-1.5 text-xs" style={{ color: '#252a3a' }}>
            Your widget will appear here
          </p>
        </div>
      </div>
    );
  }

  // Site preview mode
  if (mode === 'site' && siteUrl) {
    const encodedUrl = encodeURIComponent(siteUrl);
    const demoUrl = `/demo/client-website?client=${clientId}&website=${encodedUrl}`;

    return (
      <div className="flex h-full flex-col">
        {/* Header — site preview mode */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <svg
                className="h-3.5 w-3.5"
                style={{ color: '#34d399' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </div>
            <div>
              <span
                className="block text-xs font-medium"
                style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
              >
                Site Preview
              </span>
              <span className="block max-w-[200px] truncate text-[10px]" style={{ color: '#4a5068' }}>
                {siteUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={switchToWidget}
            onMouseEnter={() => setIsHoveringBack(true)}
            onMouseLeave={() => setIsHoveringBack(false)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200"
            style={{
              color: isHoveringBack ? '#e8eaed' : '#4a5068',
              background: isHoveringBack ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${isHoveringBack ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Widget
          </button>
        </div>

        {/* Site iframe */}
        <div className="relative flex-1 overflow-hidden" style={{ background: '#0a0b10' }}>
          {siteLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: '#0a0b10' }}>
              <div className="text-center">
                <div className="relative mx-auto mb-4 h-10 w-10">
                  <div
                    className="absolute inset-0 rounded-full border-2 border-transparent"
                    style={{
                      borderTopColor: '#06b6d4',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div
                    className="absolute inset-1.5 rounded-full border-2 border-transparent"
                    style={{
                      borderBottomColor: 'rgba(6,182,212,0.3)',
                      animation: 'spin 1.5s linear infinite reverse',
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}>
                  Loading site preview...
                </p>
              </div>
            </div>
          )}
          {siteError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: '#0a0b10' }}>
              <div className="text-center">
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <svg
                    className="h-5 w-5"
                    style={{ color: '#f87171' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <p className="text-xs" style={{ color: '#94a3b8', fontFamily: "'Outfit', sans-serif" }}>
                  This site blocks iframe embedding
                </p>
                <p className="mt-1 text-[10px]" style={{ color: '#3d4560' }}>
                  Open in a new tab instead
                </p>
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all duration-200"
                  style={{
                    background: 'rgba(6,182,212,0.08)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    color: '#22d3ee',
                  }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                  Open in new tab
                </a>
              </div>
            </div>
          )}
          <iframe
            src={demoUrl}
            className="absolute inset-0 h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="Site Preview"
            onLoad={() => setSiteLoading(false)}
            onError={() => {
              setSiteLoading(false);
              setSiteError(true);
            }}
          />
        </div>
      </div>
    );
  }

  // Dynamic preview srcdoc (fallback when preview.html doesn't exist)
  const previewSrcDoc = clientId
    ? `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#111318;overflow:hidden}</style>
</head>
<body>
<script src="/quickwidgets/${clientId}/script.js"><\/script>
</body>
</html>`
    : undefined;

  // Widget preview mode (default)
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.15)' }}
          >
            <svg
              className="h-3.5 w-3.5"
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
          </div>
          <span className="text-xs font-medium" style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}>
            Widget Preview
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: '#10b981',
              boxShadow: '0 0 6px rgba(16,185,129,0.5)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: '#34d399' }}>
            Live
          </span>
        </div>
      </div>

      {/* Widget iframe */}
      <div className="relative flex-1 overflow-hidden" style={{ background: '#111318' }}>
        <iframe
          ref={iframeRef}
          srcDoc={previewSrcDoc}
          className="absolute inset-0 h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Widget Preview"
        />
      </div>

      {/* Bottom action bar */}
      <div
        className="px-4 py-3.5"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <button
          onClick={switchToSite}
          disabled={!siteUrl}
          onMouseEnter={() => setIsHoveringBtn(true)}
          onMouseLeave={() => setIsHoveringBtn(false)}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              isHoveringBtn && siteUrl
                ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.1))'
                : 'rgba(6,182,212,0.06)',
            border: `1px solid ${isHoveringBtn && siteUrl ? 'rgba(6,182,212,0.35)' : 'rgba(6,182,212,0.15)'}`,
            color: '#22d3ee',
            fontFamily: "'Outfit', sans-serif",
            boxShadow:
              isHoveringBtn && siteUrl ? '0 0 20px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
          }}
        >
          {/* Subtle shimmer on hover */}
          {isHoveringBtn && siteUrl && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.02), transparent)',
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          )}
          <svg className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
            />
          </svg>
          <span className="relative">Preview on Site</span>
        </button>

        {siteUrl && (
          <p className="mt-2 truncate text-center text-[10px]" style={{ color: '#2d3348' }}>
            {siteUrl.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
