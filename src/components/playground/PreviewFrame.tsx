// src/components/playground/PreviewFrame.tsx

'use client';

import { useEffect, useState, forwardRef } from 'react';

interface PreviewFrameProps {
  clientId: string;
  website: string;
  widgetDir: string;
  needsBuild: boolean;
  onBuildClick?: () => void;
}

const PreviewFrame = forwardRef<HTMLIFrameElement, PreviewFrameProps>(function PreviewFrame(
  { clientId, website, widgetDir, needsBuild, onBuildClick },
  ref
) {
  const [frameable, setFrameable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // Check frameability on mount
  useEffect(() => {
    if (!website) {
      setFrameable(false);
      return;
    }
    setChecking(true);
    fetch(`/api/user/playground/check-frame?url=${encodeURIComponent(website)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFrameable(d.data.frameable);
        else setFrameable(false);
      })
      .catch(() => setFrameable(false))
      .finally(() => setChecking(false));
  }, [website]);

  if (needsBuild) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <svg
              className="h-8 w-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17l-5.58 3.23V6.97l5.58 3.23m0 4.97l5.58 3.23V6.97l-5.58 3.23m0 4.97V6.97"
              />
            </svg>
          </div>
          <h3 className="mb-1 text-base font-semibold text-white">Widget not built yet</h3>
          <p className="mb-4 text-sm text-gray-400">
            Click &quot;Save &amp; Rebuild&quot; to create your widget first.
          </p>
          {onBuildClick && (
            <button
              onClick={onBuildClick}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Build Now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-500" />
      </div>
    );
  }

  const previewUrl = `/playground-preview/${clientId}?dir=${widgetDir}&website=${encodeURIComponent(website)}&frameable=${frameable}`;

  return (
    <iframe
      ref={ref}
      src={previewUrl}
      className="h-full w-full border-none"
      sandbox="allow-scripts allow-same-origin"
      title="Widget preview"
    />
  );
});

export default PreviewFrame;
