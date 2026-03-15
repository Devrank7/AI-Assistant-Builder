// src/components/playground/usePlayground.ts

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CSS_VARIABLE_FIELDS, REBUILD_ONLY_FIELDS, PlaygroundConfig } from '@/lib/playgroundValidation';

type ThemeJson = Record<string, unknown>;

interface PlaygroundData {
  theme: ThemeJson;
  config: {
    botName: string;
    greeting: string;
    quickReplies: string[];
    tone: string | null;
  };
  website: string;
  needsBuild: boolean;
  widgetDir: string;
  siteProfile: Record<string, unknown> | null;
}

interface UsePlaygroundReturn {
  theme: ThemeJson;
  config: PlaygroundData['config'];
  website: string;
  needsBuild: boolean;
  widgetDir: string;
  siteProfile: Record<string, unknown> | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  rebuildRequired: boolean;
  error: string | null;
  updateThemeField: (key: string, value: unknown) => void;
  updateConfig: (updates: Partial<PlaygroundConfig>) => void;
  save: () => Promise<{ buildTime?: number } | null>;
  reset: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function usePlayground(clientId: string): UsePlaygroundReturn {
  const [data, setData] = useState<PlaygroundData | null>(null);
  const [theme, setTheme] = useState<ThemeJson>({});
  const [config, setConfig] = useState<PlaygroundData['config']>({
    botName: '',
    greeting: '',
    quickReplies: [],
    tone: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [rebuildRequired, setRebuildRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedThemeRef = useRef<ThemeJson>({});
  const savedConfigRef = useRef<PlaygroundData['config']>({
    botName: '',
    greeting: '',
    quickReplies: [],
    tone: null,
  });

  // Load playground data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/user/playground/${clientId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data as PlaygroundData;
          setData(d);
          setTheme(d.theme);
          setConfig(d.config);
          savedThemeRef.current = { ...d.theme };
          savedConfigRef.current = { ...d.config };
        } else {
          setError(json.message || 'Failed to load');
        }
      } catch {
        setError('Failed to load playground data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId]);

  // Send debounced postMessage to preview iframe
  const sendToPreview = useCallback((updates: Record<string, unknown>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'PLAYGROUND_THEME_UPDATE', theme: updates }, '*');
    }, 150);
  }, []);

  const updateThemeField = useCallback(
    (key: string, value: unknown) => {
      setTheme((prev) => {
        const next = { ...prev, [key]: value };
        return next;
      });
      setDirty(true);

      // Check if this field requires rebuild
      if ((REBUILD_ONLY_FIELDS as readonly string[]).includes(key)) {
        setRebuildRequired(true);
      }

      // Send live update for CSS-variable-compatible fields
      if ((CSS_VARIABLE_FIELDS as readonly string[]).includes(key)) {
        sendToPreview({ [key]: value });
      }
    },
    [sendToPreview]
  );

  const updateConfig = useCallback((updates: Partial<PlaygroundConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setDirty(true);
    setRebuildRequired(true); // Config changes always require rebuild
  }, []);

  const save = useCallback(async (): Promise<{ buildTime?: number } | null> => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/playground/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, config }),
      });
      const json = await res.json();
      if (json.success) {
        setDirty(false);
        setRebuildRequired(false);
        savedThemeRef.current = { ...theme };
        savedConfigRef.current = { ...config };
        return json.data;
      } else {
        setError(json.message || 'Save failed');
        return null;
      }
    } catch {
      setError('Network error during save');
      return null;
    } finally {
      setSaving(false);
    }
  }, [clientId, theme, config]);

  const reset = useCallback(() => {
    setTheme({ ...savedThemeRef.current });
    setConfig({ ...savedConfigRef.current });
    setDirty(false);
    setRebuildRequired(false);

    // Send full theme to preview to revert visuals
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'PLAYGROUND_THEME_UPDATE', theme: savedThemeRef.current },
      '*'
    );
  }, []);

  return {
    theme,
    config,
    website: data?.website || '',
    needsBuild: data?.needsBuild || false,
    widgetDir: data?.widgetDir || 'quickwidgets',
    siteProfile: data?.siteProfile || null,
    loading,
    saving,
    dirty,
    rebuildRequired,
    error,
    updateThemeField,
    updateConfig,
    save,
    reset,
    iframeRef,
  };
}
