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
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-sm font-medium">Live Preview</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Info Bar */}
      <div className="fixed top-4 right-4 z-[9999] bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs text-gray-400">Previewing</p>
          <p className="text-sm font-medium truncate">{websiteUrl}</p>
        </div>
      </div>

      {/* Loading State */}
      {!iframeLoaded && !iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Loading client website...</p>
            <p className="text-gray-400 text-sm">{websiteUrl}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {iframeError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center max-w-lg px-6">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Cannot Load Website</h2>
            <p className="text-gray-400 mb-6">
              This website cannot be displayed in preview mode due to security restrictions (X-Frame-Options).
              This is normal - the widget will still work when installed directly on the site.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Website Directly
              </a>
              <button
                onClick={() => window.history.back()}
                className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>

            {/* Widget Preview Box */}
            <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-sm text-gray-400 mb-4">The widget is still loaded and visible in the bottom-right corner</p>
              <div className="flex items-center justify-center gap-2 text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Widget Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={websiteUrl}
        className="w-full h-screen border-0"
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeError(true)}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        title="Client Website Preview"
      />

      {/* Fallback timeout for iframe blocking */}
      <IframeBlockDetector
        onBlocked={() => setIframeError(true)}
        websiteUrl={websiteUrl}
      />
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
