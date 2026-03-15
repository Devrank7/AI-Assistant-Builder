// src/app/dashboard/playground/[clientId]/page.tsx

'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlayground } from '@/components/playground/usePlayground';
import ControlPanel from '@/components/playground/ControlPanel';
import PreviewFrame from '@/components/playground/PreviewFrame';

export default function PlaygroundPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const pg = usePlayground(clientId);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Warn on browser navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pg.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pg.dirty]);

  // Desktop-only gate
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] p-8">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
            />
          </svg>
          <h2 className="mb-2 text-lg font-semibold text-white">Desktop Only</h2>
          <p className="mb-4 text-sm text-gray-400">
            The Widget Playground requires a larger screen. Please open this page on a desktop browser.
          </p>
          <Link href="/dashboard/widgets" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Back to Widgets
          </Link>
        </div>
      </div>
    );
  }

  if (pg.loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-500" />
      </div>
    );
  }

  if (pg.error && !pg.theme) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <p className="mb-4 text-sm text-red-400">{pg.error}</p>
          <Link href="/dashboard/widgets" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← Back to Widgets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen overlay covering the dashboard sidebar */}
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0f]">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/dashboard/widgets"
            onClick={(e) => {
              if (pg.dirty) {
                e.preventDefault();
                setShowUnsavedDialog(true);
              }
            }}
            className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Widgets
          </Link>

          <span className="text-sm font-medium text-white">{pg.config.botName || clientId}</span>

          <div className="flex items-center gap-2">
            {pg.error && <span className="text-xs text-red-400">{pg.error}</span>}

            <button
              onClick={pg.reset}
              disabled={!pg.dirty}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reset
            </button>

            <button
              onClick={async () => {
                const result = await pg.save();
                if (result?.buildTime) {
                  // Reload the preview iframe to show rebuilt widget
                  const iframe = pg.iframeRef.current;
                  if (iframe) iframe.src = iframe.src;
                }
              }}
              disabled={pg.saving || !pg.dirty}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pg.saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Building...
                </>
              ) : (
                'Save & Rebuild'
              )}
            </button>
          </div>
        </header>

        {/* Split-screen */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Control Panel */}
          <div className="w-[350px] shrink-0 border-r border-white/10 bg-[#0d0d14]">
            <ControlPanel
              theme={pg.theme}
              config={pg.config}
              clientId={clientId}
              siteProfile={pg.siteProfile}
              rebuildRequired={pg.rebuildRequired}
              onThemeChange={pg.updateThemeField}
              onConfigChange={pg.updateConfig}
            />
          </div>

          {/* Right: Preview */}
          <div className="flex-1">
            <PreviewFrame
              ref={pg.iframeRef}
              clientId={clientId}
              website={pg.website}
              widgetDir={pg.widgetDir}
              needsBuild={pg.needsBuild}
              onBuildClick={() => pg.save()}
            />
          </div>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-xl border border-white/10 bg-[#12121a] p-6">
            <h3 className="mb-2 text-base font-semibold text-white">Unsaved Changes</h3>
            <p className="mb-4 text-sm text-gray-400">You have unsaved changes. Leave without saving?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/5"
              >
                Stay
              </button>
              <Link
                href="/dashboard/widgets"
                className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-center text-sm text-red-400 hover:bg-red-500/30"
              >
                Leave
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
