// src/components/builder/useBuilderStream.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import type { SSEEvent, BuilderStage, PanelMode } from '@/lib/builder/types';

interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCards?: { tool: string; status: 'running' | 'done' | 'error'; result?: Record<string, unknown> }[];
  crmInstruction?: { provider: string; steps: string[] };
}

interface StreamState {
  messages: BuilderMessage[];
  sessionId: string | null;
  stage: BuilderStage;
  panelMode: PanelMode;
  isStreaming: boolean;
  currentTheme: Record<string, unknown> | null;
  abVariants: { label: string; theme: Record<string, unknown> }[] | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  error: string | null;
}

export function useBuilderStream() {
  const [state, setState] = useState<StreamState>({
    messages: [],
    sessionId: null,
    stage: 'input',
    panelMode: 'empty',
    isStreaming: false,
    currentTheme: null,
    abVariants: null,
    knowledgeProgress: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, sessionId?: string | null) => {
      // Add user message
      const userMsg: BuilderMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isStreaming: true,
        error: null,
      }));

      // Create assistant message placeholder
      const assistantMsg: BuilderMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        toolCards: [],
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
      }));

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/builder/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId || state.sessionId, message }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to connect');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch {
              /* skip malformed lines */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            error: (err as Error).message,
          }));
        }
      } finally {
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [state.sessionId]
  );

  const handleEvent = useCallback((event: SSEEvent) => {
    setState((prev) => {
      const msgs = [...prev.messages];
      const lastMsg = msgs[msgs.length - 1];

      switch (event.type) {
        case 'text':
          if (lastMsg?.role === 'assistant') {
            lastMsg.content += event.content;
          }
          return { ...prev, messages: msgs };

        case 'tool_start':
          if (lastMsg?.role === 'assistant') {
            lastMsg.toolCards = [...(lastMsg.toolCards || []), { tool: event.tool, status: 'running' }];
          }
          return { ...prev, messages: msgs };

        case 'tool_result':
          if (lastMsg?.role === 'assistant') {
            const cards = lastMsg.toolCards || [];
            const card = cards.find((c) => c.tool === event.tool && c.status === 'running');
            if (card) {
              card.status = 'done';
              card.result = event.result;
            }
          }
          return { ...prev, messages: msgs };

        case 'session':
          return { ...prev, sessionId: event.sessionId };

        case 'theme_update':
          return { ...prev, currentTheme: event.theme };

        case 'ab_variants':
          return { ...prev, abVariants: event.variants };

        case 'panel_mode':
          return { ...prev, panelMode: event.mode };

        case 'progress':
          return { ...prev, stage: event.stage };

        case 'crm_instruction':
          if (lastMsg?.role === 'assistant') {
            lastMsg.crmInstruction = { provider: event.provider, steps: event.steps };
          }
          return { ...prev, messages: msgs };

        case 'error':
          return { ...prev, error: event.message };

        case 'knowledge_progress':
          return { ...prev, knowledgeProgress: { uploaded: event.uploaded, total: event.total } };

        case 'done':
          return { ...prev, isStreaming: false, knowledgeProgress: null };

        default:
          return prev;
      }
    });
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const resetSession = useCallback(() => {
    setState({
      messages: [],
      sessionId: null,
      stage: 'input',
      panelMode: 'empty',
      isStreaming: false,
      currentTheme: null,
      abVariants: null,
      knowledgeProgress: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    stopStreaming,
    resetSession,
    setSessionId: (id: string) => setState((prev) => ({ ...prev, sessionId: id })),
  };
}
