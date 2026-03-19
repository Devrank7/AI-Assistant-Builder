import { useCallback } from 'react';

export default function useIntegration(config) {
  const apiBase = (typeof window !== 'undefined' && window.__WIDGET_API_BASE__) || '';
  const widgetId = config?.clientId;

  const execute = useCallback(async (provider, action, params = {}) => {
    if (!widgetId || !provider || !action) {
      throw new Error('Missing integration params: widgetId, provider, and action are required');
    }

    const res = await fetch(`${apiBase}/api/integrations/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ widgetId, slug: provider, action, params }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Integration error: ${res.status}`);
    return data.data;
  }, [apiBase, widgetId]);

  return { execute };
}
