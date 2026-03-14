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
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-3 text-4xl">👁️</div>
          <p className="text-sm">Preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-xs font-medium text-gray-500">Live Preview</span>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-green-600">Live</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-gray-100">
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
