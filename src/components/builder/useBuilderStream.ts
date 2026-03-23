// src/components/builder/useBuilderStream.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import type { SSEEvent, BuilderStage, PanelMode, Suggestion, AgentType } from '@/lib/builder/types';

interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCards?: { tool: string; status: 'running' | 'done' | 'error'; result?: Record<string, unknown> }[];
  crmInstruction?: { provider: string; steps: string[] };
  fileAttachment?: { filename: string; type: string; size: number };
}

interface StreamState {
  messages: BuilderMessage[];
  sessionId: string | null;
  widgetClientId: string | null;
  widgetVersion: number;
  stage: BuilderStage;
  panelMode: PanelMode;
  isStreaming: boolean;
  currentTheme: Record<string, unknown> | null;
  abVariants: { label: string; theme: Record<string, unknown> }[] | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  suggestions: Suggestion[] | null;
  activeAgent: AgentType | null;
  agentActivities: { agent: AgentType; task: string; timestamp: number }[];
  error: string | null;
}

export function useBuilderStream() {
  const [state, setState] = useState<StreamState>({
    messages: [],
    sessionId: null,
    widgetClientId: null,
    widgetVersion: 0,
    stage: 'input',
    panelMode: 'empty',
    isStreaming: false,
    currentTheme: null,
    abVariants: null,
    knowledgeProgress: null,
    suggestions: null,
    activeAgent: null,
    agentActivities: [],
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: SSEEvent) => {
    setState((prev) => {
      const msgs = [...prev.messages];
      const lastMsg = msgs[msgs.length - 1];

      switch (event.type) {
        case 'text':
          if (lastMsg?.role === 'assistant') {
            const updated = { ...lastMsg, content: lastMsg.content + event.content };
            return { ...prev, messages: [...msgs.slice(0, -1), updated] };
          }
          return prev;

        case 'tool_start':
          if (lastMsg?.role === 'assistant') {
            const updated = {
              ...lastMsg,
              toolCards: [...(lastMsg.toolCards || []), { tool: event.tool, status: 'running' as const }],
            };
            return { ...prev, messages: [...msgs.slice(0, -1), updated] };
          }
          return prev;

        case 'tool_result':
          if (lastMsg?.role === 'assistant') {
            const cards = (lastMsg.toolCards || []).map((c) =>
              c.tool === event.tool && c.status === 'running'
                ? { ...c, status: 'done' as const, result: event.result }
                : c
            );
            const updated = { ...lastMsg, toolCards: cards };
            return { ...prev, messages: [...msgs.slice(0, -1), updated] };
          }
          return prev;

        case 'session':
          return { ...prev, sessionId: event.sessionId };

        case 'theme_update':
          return { ...prev, currentTheme: event.theme };

        case 'ab_variants':
          return { ...prev, abVariants: event.variants };

        case 'panel_mode':
          return { ...prev, panelMode: event.mode };

        case 'progress':
          if ('stage' in event) {
            return { ...prev, stage: event.stage };
          }
          return prev;

        case 'crm_instruction':
          if (lastMsg?.role === 'assistant') {
            const updated = { ...lastMsg, crmInstruction: { provider: event.provider, steps: event.steps } };
            return { ...prev, messages: [...msgs.slice(0, -1), updated] };
          }
          return prev;

        case 'error':
          return { ...prev, error: event.message };

        case 'knowledge_progress':
          return { ...prev, knowledgeProgress: { uploaded: event.uploaded, total: event.total } };

        case 'suggestions':
          return { ...prev, suggestions: event.suggestions };

        case 'agent_switch':
          return {
            ...prev,
            activeAgent: event.agent,
            agentActivities: [...prev.agentActivities, { agent: event.agent, task: event.task, timestamp: Date.now() }],
          };

        case 'widget_ready':
          return { ...prev, widgetClientId: event.clientId, widgetVersion: Date.now() };

        case 'done':
          return { ...prev, isStreaming: false, knowledgeProgress: null };

        default:
          return prev;
      }
    });
  }, []);

  // Shared SSE stream reader
  const streamChat = useCallback(
    async (
      displayMessage: string,
      requestBody: Record<string, unknown>,
      fileAttachment?: { filename: string; type: string; size: number }
    ) => {
      const userMsg: BuilderMessage = {
        role: 'user',
        content: displayMessage,
        timestamp: new Date().toISOString(),
        ...(fileAttachment && { fileAttachment }),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isStreaming: true,
        error: null,
      }));

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
      // Safety timeout: abort if stream runs longer than 5 minutes (widget build can take a while)
      const safetyTimeout = setTimeout(() => abortRef.current?.abort(), 300000);

      try {
        const res = await fetch('/api/builder/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortRef.current.signal,
          credentials: 'include',
        });

        if (!res.ok) {
          let err;
          try {
            err = await res.json();
          } catch {
            err = { error: `Server error (${res.status})` };
          }
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
          const raw = (err as Error).message || '';
          // Convert raw errors to user-friendly messages
          let friendlyError = raw;
          if (
            raw.includes('Failed to fetch') ||
            raw.includes('NetworkError') ||
            raw.includes('network') ||
            raw.includes('ERR_')
          ) {
            friendlyError = 'Connection lost. Please check your internet and try again.';
          } else if (raw.includes('timeout') || raw.includes('TimeoutError') || raw.includes('timed out')) {
            friendlyError = 'Request timed out. Please try again.';
          } else if (raw.includes('Not authenticated') || raw.includes('Unauthorized')) {
            friendlyError = 'Session expired. Please refresh the page.';
          }
          setState((prev) => ({
            ...prev,
            error: friendlyError,
          }));
        }
      } finally {
        clearTimeout(safetyTimeout);
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [handleEvent]
  );

  const sendMessage = useCallback(
    async (message: string, sessionId?: string | null) => {
      await streamChat(message, {
        sessionId: sessionId || state.sessionId,
        message,
      });
    },
    [state.sessionId, streamChat]
  );

  const sendMessageWithFile = useCallback(
    async (
      message: string,
      fileContext: {
        filename: string;
        type: string;
        size: number;
        pages?: number;
        wordCount: number;
        preview: string;
        fullText: string;
      }
    ) => {
      const displayMessage = message || `📎 ${fileContext.filename}`;
      const fileAttachment = {
        filename: fileContext.filename,
        type: fileContext.type,
        size: fileContext.size,
      };
      await streamChat(
        displayMessage,
        {
          sessionId: state.sessionId,
          message: message || 'User uploaded a file',
          fileContext,
        },
        fileAttachment
      );
    },
    [state.sessionId, streamChat]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const resetSession = useCallback(() => {
    setState({
      messages: [],
      sessionId: null,
      widgetClientId: null,
      widgetVersion: 0,
      stage: 'input',
      panelMode: 'empty',
      isStreaming: false,
      currentTheme: null,
      abVariants: null,
      knowledgeProgress: null,
      suggestions: null,
      activeAgent: null,
      agentActivities: [],
      error: null,
    });
  }, []);

  /** Restore a previous session from the API (full messages + state) */
  const restoreSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/builder/sessions?id=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.success || !data.data) return false;

      const session = data.data;
      const restoredMessages: BuilderMessage[] = (session.messages || []).map(
        (m: {
          role: string;
          content: string;
          timestamp: string;
          crmInstruction?: { provider: string; steps: string[] };
        }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString(),
          ...(m.crmInstruction ? { crmInstruction: m.crmInstruction } : {}),
        })
      );

      setState({
        messages: restoredMessages,
        sessionId: id,
        widgetClientId: session.clientId || null,
        widgetVersion: session.clientId ? Date.now() : 0,
        stage: session.currentStage || 'input',
        panelMode: 'empty',
        isStreaming: false,
        currentTheme: session.themeJson || null,
        abVariants: null,
        knowledgeProgress: null,
        suggestions: null,
        activeAgent: null,
        agentActivities: [],
        error: null,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    sendMessage,
    sendMessageWithFile,
    stopStreaming,
    resetSession,
    restoreSession,
    setSessionId: (id: string) => setState((prev) => ({ ...prev, sessionId: id })),
  };
}
