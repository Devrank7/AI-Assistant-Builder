'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  clientId: string;
  connectedIntegrations: { provider: string; status: string }[];
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function TestSandbox({ clientId, connectedIntegrations }: Props) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/builder/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: userMsg, conversationId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]);
        setConversationId(data.data.conversationId);
        setLogs((prev) => [...prev, `Response received at ${new Date().toLocaleTimeString()}`]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not get response' }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setLogs([]);
    setConversationId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            style={{ color: '#22d3ee' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <span className="text-xs font-medium" style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}>
            Test Sandbox
          </span>
        </div>
        <button
          onClick={reset}
          className="rounded-lg px-2.5 py-1 text-xs transition-all duration-200"
          style={{
            color: '#4a5068',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#4a5068';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}
        >
          Reset
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs" style={{ color: '#2d3348' }}>
            Send a message to test your widget
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={
              msg.role === 'user'
                ? {
                    marginLeft: 'auto',
                    background: 'rgba(6,182,212,0.1)',
                    border: '1px solid rgba(6,182,212,0.15)',
                    color: '#67e8f9',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                  }
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#4a5068' }}>
            <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-cyan-500" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4">
        <div
          className="flex gap-2 rounded-xl p-1 transition-all duration-200"
          style={{
            background: isFocused ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.02)',
            border: isFocused ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Test your widget..."
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none"
            style={{ color: '#e8eaed' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: '#fff',
            }}
          >
            Send
          </button>
        </div>
      </div>

      {connectedIntegrations.length > 0 && (
        <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="mt-3 mb-2 text-xs font-medium" style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}>
            Integrations
          </p>
          {connectedIntegrations.map((int, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background: int.status === 'connected' ? '#10b981' : '#f59e0b',
                  boxShadow:
                    int.status === 'connected' ? '0 0 6px rgba(16,185,129,0.4)' : '0 0 6px rgba(245,158,11,0.4)',
                }}
              />
              <span className="capitalize" style={{ color: '#7a8194' }}>
                {int.provider}
              </span>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="max-h-24 overflow-y-auto px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="mt-3 mb-1 text-xs font-medium" style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}>
            Event Log
          </p>
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs" style={{ color: '#2d3348' }}>
              <svg
                className="h-3 w-3"
                style={{ color: '#34d399' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
