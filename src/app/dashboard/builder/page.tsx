'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SessionSummary {
  _id: string;
  widgetName: string | null;
  status: string;
  updatedAt: string;
}

type BuilderStatus = 'chatting' | 'building' | 'preview' | 'deployed';

export default function BuilderPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<BuilderStatus>('chatting');
  const [loading, setLoading] = useState(false);
  const [buildLoading, setBuildLoading] = useState(false);
  const [hasTheme, setHasTheme] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/builder/sessions');
      const data = await res.json();
      if (data.success && data.data) {
        setSessions(data.data);
      }
    } catch {
      // ignore
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/builder/sessions?id=${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const s = data.data;
        setSessionId(s._id);
        setMessages(s.messages || []);
        setStatus(s.status || 'chatting');
        setHasTheme(!!s.themeJson);
        setClientId(s.clientId || null);
        setWidgetName(s.widgetName || null);
        setShowSessions(false);
      }
    } catch {
      // ignore
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setStatus('chatting');
    setHasTheme(false);
    setClientId(null);
    setWidgetName(null);
    setShowSessions(false);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const { sessionId: newSessionId, message, themeJson, status: newStatus, widgetName: name } = data.data;
        setSessionId(newSessionId);

        const assistantMessage: Message = {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (themeJson) {
          setHasTheme(true);
        }
        if (newStatus) {
          setStatus(newStatus);
        }
        if (name) {
          setWidgetName(name);
        }
      } else {
        const errorMsg: Message = {
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong. Please try again.'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const buildWidget = async () => {
    if (!sessionId || buildLoading) return;

    setBuildLoading(true);
    setStatus('building');

    try {
      const res = await fetch('/api/builder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setClientId(data.data.clientId);
        setStatus('deployed');
        setWidgetName(data.data.widgetName || widgetName);

        const successMsg: Message = {
          role: 'assistant',
          content: `Your widget has been built and deployed successfully!\n\n**Widget ID:** ${data.data.clientId}\n\n**Embed code:**\n\`\`\`html\n<script src="${window.location.origin}/quickwidgets/${data.data.clientId}/script.js"></script>\n\`\`\`\n\nYou can see the preview on the right panel. Add the embed code to your website to go live!`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, successMsg]);
      } else {
        setStatus('chatting');
        const errorMsg: Message = {
          role: 'assistant',
          content: `Build failed: ${data.error || 'Unknown error'}. You can try modifying the theme and building again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      setStatus('chatting');
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Build failed due to a network error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setBuildLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusBadge = () => {
    const styles: Record<BuilderStatus, string> = {
      chatting: 'bg-blue-500/15 text-blue-400',
      building: 'bg-yellow-500/15 text-yellow-400',
      preview: 'bg-purple-500/15 text-purple-400',
      deployed: 'bg-green-500/15 text-green-400',
    };
    const labels: Record<BuilderStatus, string> = {
      chatting: 'Chatting',
      building: 'Building...',
      preview: 'Preview',
      deployed: 'Deployed',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
        {status === 'building' && (
          <svg className="mr-1.5 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {labels[status]}
      </span>
    );
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like rendering for code blocks and bold
    const parts = content.split(/(```[\s\S]*?```|\*\*.*?\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const firstLine = code.indexOf('\n');
        const codeContent = firstLine > -1 ? code.slice(firstLine + 1) : code;
        return (
          <pre key={i} className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-gray-300">
            <code>{codeContent}</code>
          </pre>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-blue-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      // Handle newlines
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl gap-4">
      {/* Sessions sidebar toggle */}
      {showSessions && (
        <div className="absolute inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setShowSessions(false)} />
      )}

      {/* Sessions panel */}
      {showSessions && (
        <div className="absolute top-0 left-0 z-50 h-full w-72 border-r border-white/10 bg-[#0d0d14] p-4 lg:relative lg:z-auto lg:w-64 lg:flex-shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Sessions</h3>
            <button
              onClick={startNewSession}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
            >
              New
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 3rem)' }}>
            {sessions.map((s) => (
              <button
                key={s._id}
                onClick={() => loadSession(s._id)}
                className={`w-full rounded-lg border border-white/5 p-3 text-left transition-colors hover:bg-white/5 ${
                  sessionId === s._id ? 'border-blue-500/30 bg-blue-500/10' : 'bg-[#12121a]'
                }`}
              >
                <p className="truncate text-sm text-white">{s.widgetName || 'Untitled'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500 capitalize">{s.status}</span>
                  <span className="text-xs text-gray-600">{new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {sessions.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No sessions yet</p>}
          </div>
        </div>
      )}

      {/* Chat panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#12121a]">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSessions(!showSessions);
                if (!showSessions) loadSessions();
              }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              title="Sessions"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white">{widgetName || 'AI Widget Builder'}</h2>
              <p className="text-xs text-gray-500">{user?.plan === 'none' ? 'Free plan' : `${user?.plan} plan`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge()}
            {hasTheme && status !== 'deployed' && (
              <button
                onClick={buildWidget}
                disabled={buildLoading}
                className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buildLoading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Building...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                      />
                    </svg>
                    Build Widget
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                <svg
                  className="h-8 w-8 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">AI Widget Builder</h3>
              <p className="max-w-sm text-sm text-gray-400">
                Describe your business and preferences. I&apos;ll create a custom chat widget tailored to your brand.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  'I need a widget for my dental clinic',
                  'Create a dark-themed widget for my SaaS',
                  'Build a widget matching my restaurant brand',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' ? 'bg-blue-500 text-white' : 'border border-white/5 bg-[#1a1a24] text-gray-300'
                  }`}
                >
                  <div className="leading-relaxed break-words whitespace-pre-wrap">
                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/5 bg-[#1a1a24] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your widget..."
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 transition-colors outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Preview panel */}
      <div className="hidden w-96 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#12121a] lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Widget Preview</h3>
          {clientId && <p className="mt-0.5 text-xs text-gray-500">ID: {clientId}</p>}
        </div>

        <div className="flex flex-1 items-center justify-center p-4">
          {status === 'deployed' && clientId ? (
            <div className="flex h-full w-full flex-col">
              <iframe
                src={`/demo/client-website?client=${clientId}&website=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : '') + '/quickwidgets/' + clientId + '/script.js')}`}
                className="flex-1 rounded-lg border border-white/10"
                title="Widget Preview"
              />
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs font-medium text-gray-400">Embed code:</p>
                  <code className="block text-xs break-all text-blue-300">
                    {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/quickwidgets/${clientId}/script.js"></script>`}
                  </code>
                </div>
              </div>
            </div>
          ) : status === 'building' ? (
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-3 text-sm text-gray-400">Building your widget...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                <svg
                  className="h-6 w-6 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {hasTheme ? 'Click "Build Widget" to see the preview' : 'Preview will appear here after building'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
