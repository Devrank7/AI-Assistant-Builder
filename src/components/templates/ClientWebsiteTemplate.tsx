'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ClientWebsiteTemplateProps {
  scriptUrl: string;
  websiteUrl: string;
}

export default function ClientWebsiteTemplate({ scriptUrl, websiteUrl }: ClientWebsiteTemplateProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        document.querySelectorAll('ai-chat-widget').forEach((el) => el.remove());
      };
    }
  }, [scriptUrl]);

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white shadow-lg">
        <span className="text-sm font-medium">Live Preview</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Info Bar */}
      <div className="fixed top-4 right-4 z-[9999] flex max-w-md items-center gap-3 rounded-lg bg-black/80 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
          <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs text-gray-400">Previewing</p>
          <p className="truncate text-sm font-medium">{websiteUrl}</p>
        </div>
      </div>

      {/* Loading State */}
      {!iframeLoaded && !iframeError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            <p className="mb-2 text-lg text-white">Loading client website...</p>
            <p className="text-sm text-gray-400">{websiteUrl}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {iframeError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
          <div className="max-w-lg px-6 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10">
              <svg className="h-10 w-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white">Cannot Load Website</h2>
            <p className="mb-6 text-gray-400">
              This website cannot be displayed in preview mode due to security restrictions (X-Frame-Options). This is
              normal - the widget will still work when installed directly on the site.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open Website Directly
              </a>
              <button
                onClick={() => window.history.back()}
                className="rounded-lg bg-gray-700 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-600"
              >
                Go Back
              </button>
            </div>

            {/* Widget Preview Box */}
            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800 p-6">
              <p className="mb-4 text-sm text-gray-400">
                The widget is still loaded and visible in the bottom-right corner
              </p>
              <div className="flex items-center justify-center gap-2 text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm font-medium">Widget Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={websiteUrl}
        className="h-screen w-full border-0"
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeError(true)}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        title="Client Website Preview"
      />

      {/* Fallback timeout for iframe blocking */}
      <IframeBlockDetector onBlocked={() => setIframeError(true)} websiteUrl={websiteUrl} />
    </div>
  );
}

// Component to detect if iframe is blocked
function IframeBlockDetector({ onBlocked, websiteUrl }: { onBlocked: () => void; websiteUrl: string }) {
  useEffect(() => {
    // Check after a delay if the iframe content is accessible
    const timer = setTimeout(() => {
      try {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          // Try to access iframe content - will throw if blocked
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc || iframeDoc.body.innerHTML === '') {
            onBlocked();
          }
        }
      } catch {
        // Cross-origin error means the site loaded but we can't access it (which is fine)
        // Only call onBlocked if we detect actual blocking
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [onBlocked, websiteUrl]);

  return null;
}
