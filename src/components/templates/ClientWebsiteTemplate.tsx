'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/useTranslation';

interface ClientWebsiteTemplateProps {
  scriptUrl: string;
  websiteUrl: string;
}

export default function ClientWebsiteTemplate({ scriptUrl, websiteUrl }: ClientWebsiteTemplateProps) {
  const { t } = useTranslation('common');

  // Force HTTPS to avoid Mixed Content blocking (HTTPS page can't embed HTTP iframe)
  const safeUrl = websiteUrl.replace(/^http:\/\//i, 'https://');

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [screenshotLoaded, setScreenshotLoaded] = useState(false);
  const [screenshotSrc, setScreenshotSrc] = useState('');
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  // Skip iframe entirely when pre-computed info says not frameable
  const [skipIframe, setSkipIframe] = useState(false);
  const iframeLoadedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reload-loop detection: track rapid consecutive iframe load events
  const loadCountRef = useRef(0);
  const loadWindowStartRef = useRef(0);
  const RELOAD_LOOP_THRESHOLD = 3; // max loads within time window
  const RELOAD_LOOP_WINDOW_MS = 5000; // 5 second window

  // Extract clientId from scriptUrl: "/quickwidgets/{clientId}/script.js" or "/widgets/{clientId}/script.js"
  const clientId = scriptUrl.split('/')[2] || '';
  const widgetDir = scriptUrl.split('/')[1] || 'quickwidgets';

  // Override document.title and meta description so the widget's page-context
  // injection picks up the client's website info instead of "WinBix AI" from root layout.
  useEffect(() => {
    try {
      const host = new URL(safeUrl).hostname.replace(/^www\./, '');
      document.title = host;
    } catch {
      document.title = safeUrl || 'Demo';
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', '');
  }, [safeUrl]);

  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = `${scriptUrl}?v=${Date.now()}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        document.querySelectorAll('[data-aw]').forEach((el) => el.remove());
        // Clear widget globals so next client starts fresh
        (window as unknown as Record<string, unknown>).__WIDGET_CSS__ = undefined;
        (window as unknown as Record<string, unknown>).__WIDGET_CONFIG__ = undefined;
      };
    }
  }, [scriptUrl]);

  // Fast pre-check: read pre-computed frameable flag from info.json (instant, no server round-trip to target site)
  useEffect(() => {
    const checkInfoJson = async () => {
      try {
        const res = await fetch(`/${widgetDir}/${clientId}/info.json`);
        if (!res.ok) return;
        const info = await res.json();
        if (info.frameable === false) {
          // Site is known to block iframes — skip iframe entirely, go straight to screenshot
          setSkipIframe(true);
          setIframeError(true);
        }
      } catch {
        // info.json not available — fall through to runtime check
      }
    };
    if (clientId) checkInfoJson();
  }, [clientId, widgetDir]);

  // Server-side runtime check: detect unreachable sites and iframe-blocking headers
  // This runs as a fallback when info.json doesn't have a frameable flag
  useEffect(() => {
    // Skip runtime check if info.json already told us it's not frameable
    if (skipIframe) return;

    const checkFrameable = async () => {
      try {
        const res = await fetch(`/api/check-frameable?url=${encodeURIComponent(safeUrl)}`);
        const data = await res.json();
        if ((!data.reachable || !data.frameable) && !iframeLoadedRef.current) {
          setIframeError(true);
        }
      } catch {
        // If check itself fails, let the iframe try to load
      }
    };
    checkFrameable();
  }, [safeUrl, skipIframe]);

  // Auto-enter screenshot mode when iframe is blocked
  useEffect(() => {
    if (iframeError && !screenshotMode && !screenshotFailed) {
      setScreenshotSrc(`/${widgetDir}/${clientId}/preview.png`);
      setScreenshotLoaded(false);
      setScreenshotMode(true);
    }
  }, [iframeError, screenshotMode, screenshotFailed, clientId, widgetDir]);

  // Timeout fallback: if iframe onLoad never fires (e.g. slow resources, hanging
  // scripts on client sites), remove the loading spinner after 5 seconds so the
  // user can see whatever has already rendered in the iframe.
  useEffect(() => {
    if (skipIframe) return; // No iframe to wait for
    const timer = setTimeout(() => {
      if (!iframeLoadedRef.current && !iframeError) {
        iframeLoadedRef.current = true;
        setIframeLoaded(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [iframeError, skipIframe]);

  // Handle iframe load — detect reload loops (e.g. LiteSpeed Cache lazy loader)
  // and trigger error state if the iframe reloads too many times in quick succession.
  const handleIframeLoad = useCallback(() => {
    const now = Date.now();

    // Reset counter if outside the detection window
    if (now - loadWindowStartRef.current > RELOAD_LOOP_WINDOW_MS) {
      loadCountRef.current = 0;
      loadWindowStartRef.current = now;
    }

    loadCountRef.current += 1;

    // Reload loop detected — show fallback
    if (loadCountRef.current >= RELOAD_LOOP_THRESHOLD) {
      setIframeError(true);
      // Stop the iframe from continuing to reload
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
      return;
    }

    if (!iframeLoadedRef.current) {
      // Check if iframe content is actually accessible (same-origin)
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          // If document is empty or about:blank, CSP likely blocked framing
          if (doc && (doc.body?.innerHTML === '' || doc.URL === 'about:blank')) {
            setIframeError(true);
            return;
          }
        }
      } catch {
        // Cross-origin error — can't access DOM. This is normal for legitimate
        // cross-origin sites. The /api/check-frameable call handles detection
        // of blocked/unreachable sites separately.
      }
      iframeLoadedRef.current = true;
      setIframeLoaded(true);
    }
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

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

      {/* Loading State — only shown when iframe is being attempted */}
      {!skipIframe && !iframeLoaded && !iframeError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            <p className="mb-2 text-lg text-white">Loading client website...</p>
            <p className="text-sm text-gray-400">{safeUrl}</p>
          </div>
        </div>
      )}

      {/* Error State — Template Picker (shown only after screenshot also fails) */}
      {iframeError && !screenshotMode && screenshotFailed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
          <div className="max-w-2xl px-6 text-center">
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
            <h2 className="mb-3 text-2xl font-bold text-white">{t('demo.iframeError.title')}</h2>
            <p className="mb-8 text-gray-400">{t('demo.iframeError.desc')}</p>

            {/* Template Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  template: 'dental',
                  label: t('demo.iframeError.dental'),
                  color: 'cyan',
                  borderHover: 'hover:border-cyan-500/40',
                  iconBg: 'from-cyan-500/20 to-cyan-500/5',
                  iconColor: 'text-cyan-400',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                    />
                  ),
                },
                {
                  template: 'construction',
                  label: t('demo.iframeError.construction'),
                  color: 'orange',
                  borderHover: 'hover:border-orange-500/40',
                  iconBg: 'from-orange-500/20 to-orange-500/5',
                  iconColor: 'text-orange-400',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                    />
                  ),
                },
                {
                  template: 'hotel',
                  label: t('demo.iframeError.hotel'),
                  color: 'purple',
                  borderHover: 'hover:border-purple-500/40',
                  iconBg: 'from-purple-500/20 to-purple-500/5',
                  iconColor: 'text-purple-400',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
                    />
                  ),
                },
              ].map((item) => (
                <a
                  key={item.template}
                  href={`/demo/${item.template}?client=${clientId}`}
                  className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 ${item.borderHover} hover:bg-white/[0.06]`}
                >
                  <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.iconBg}`}
                  >
                    <svg className={`h-7 w-7 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon}
                    </svg>
                  </div>
                  <p className="font-semibold text-white">{item.label}</p>
                </a>
              ))}

              {/* Screenshot preview card */}
              <button
                onClick={() => {
                  setScreenshotSrc(`/${widgetDir}/${clientId}/preview.png`);
                  setScreenshotLoaded(false);
                  setScreenshotFailed(false);
                  setScreenshotMode(true);
                }}
                className="group rounded-2xl border border-green-500/30 bg-green-500/[0.05] p-6 transition-all duration-300 hover:border-green-500/50 hover:bg-green-500/[0.1]"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5">
                  <svg className="h-7 w-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-green-300">{t('demo.iframeError.screenshot')}</p>
              </button>
            </div>

            {/* Secondary: open website directly */}
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              {t('demo.iframeError.openDirect')}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Screenshot Mode — full-page screenshot as background with live widget */}
      {screenshotMode && (
        <div className="absolute inset-0 z-10 bg-gray-900">
          {/* Back button */}
          <button
            onClick={() => {
              setScreenshotMode(false);
              setScreenshotLoaded(false);
              setScreenshotFailed(true);
            }}
            className="fixed top-16 left-4 z-[9999] flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('demo.screenshotMode.back')}
          </button>

          {/* Loading spinner while screenshot loads */}
          {!screenshotLoaded && (
            <div className="flex h-screen w-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
                <p className="text-lg text-white">{t('demo.screenshotMode.loading')}</p>
              </div>
            </div>
          )}

          {/* Screenshot image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotSrc}
            alt="Website screenshot"
            className={`h-screen w-full object-cover object-top ${screenshotLoaded ? 'block' : 'hidden'}`}
            onLoad={() => setScreenshotLoaded(true)}
            onError={() => {
              // If cached preview fails, try thum.io external service
              const thumbUrl = `https://image.thum.io/get/width/1440/crop/900/${safeUrl}`;
              if (screenshotSrc !== thumbUrl) {
                setScreenshotSrc(thumbUrl);
              } else {
                // Both sources failed — show template picker
                setScreenshotMode(false);
                setScreenshotLoaded(false);
                setScreenshotFailed(true);
              }
            }}
          />
        </div>
      )}

      {/* Iframe — only rendered when site is potentially frameable */}
      {!skipIframe && (
        <iframe
          ref={iframeRef}
          src={safeUrl}
          className="h-screen w-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Client Website Preview"
        />
      )}
    </div>
  );
}
