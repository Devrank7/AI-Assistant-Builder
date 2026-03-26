'use client';

import { useEffect } from 'react';

interface Props {
  clientId: string | null;
  version: number;
}

/**
 * Injects the widget script directly into the page so it appears
 * as a real floating chat widget in the bottom-right corner.
 * Cleans up and re-injects when clientId or version changes.
 */
export default function WidgetInjector({ clientId, version }: Props) {
  useEffect(() => {
    if (!clientId || !version) return;

    // Always clean up previous widget first
    cleanup();

    // Inject the widget script with cache-busting version
    const script = document.createElement('script');
    script.src = `/quickwidgets/${clientId}/script.js?v=${version}`;
    script.async = true;
    script.dataset.builderPreview = 'true';
    document.body.appendChild(script);

    return () => {
      cleanup();
    };
  }, [clientId, version]);

  return null;
}

/** Remove injected widget script and all widget DOM elements */
function cleanup() {
  // 1. Remove our injected script tags
  document.querySelectorAll('script[data-builder-preview]').forEach((el) => el.remove());

  // 2. Remove widget host elements (custom elements with data-aw attribute)
  // The widget mounts with: <ai-chat-{clientId} data-aw="1">
  document.querySelectorAll('[data-aw]').forEach((el) => el.remove());

  // 3. Remove any custom elements that start with "ai-chat-"
  document.querySelectorAll('*').forEach((el) => {
    if (el.tagName && el.tagName.toLowerCase().startsWith('ai-chat-')) {
      el.remove();
    }
  });

  // 4. Clean up global state the widget may have set
  if (typeof window !== 'undefined') {
    delete (window as unknown as Record<string, unknown>).__WIDGET_CONFIG__;
    delete (window as unknown as Record<string, unknown>).__WIDGET_CSS__;

    // 5. Clear widget chat history from localStorage so reloaded widget starts fresh
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('aiwidget_')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
