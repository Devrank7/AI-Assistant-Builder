import { useRef, useCallback, useEffect } from 'preact/hooks';

const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_BATCH = 20;

export function useAnalytics(config) {
  const bufferRef = useRef([]);
  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Generate a unique session ID for this widget open
  useEffect(() => {
    sessionIdRef.current = 'ws_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }, []);

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const events = bufferRef.current.splice(0, MAX_BATCH);
    const baseUrl = config?.apiBase || window.__WIDGET_API_BASE__ || '';

    // Use sendBeacon for reliability (survives page unload)
    const url = `${baseUrl}/api/widget-analytics`;
    const body = JSON.stringify({ events });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, [config]);

  // Auto-flush on interval
  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL);
    // Flush on page unload
    const handleUnload = () => flush();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      flush(); // Final flush on unmount
    };
  }, [flush]);

  const track = useCallback((event, metadata = {}) => {
    bufferRef.current.push({
      clientId: config?.clientId || window.__WIDGET_CONFIG__?.clientId || '',
      event,
      metadata,
      sessionId: sessionIdRef.current,
      timestamp: Date.now(),
      url: window.location.href,
    });

    // Auto-flush if buffer is full
    if (bufferRef.current.length >= MAX_BATCH) {
      flush();
    }
  }, [config, flush]);

  return { track };
}
