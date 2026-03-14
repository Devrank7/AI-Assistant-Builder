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
        setLogs((prev) => [...prev, `✓ Response received at ${new Date().toLocaleTimeString()}`]);
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
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
        <span className="text-xs font-medium text-gray-500">Test Sandbox</span>
        <button onClick={reset} className="text-xs text-red-500 hover:text-red-700">
          Reset
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-gray-400">Send a message to test your widget</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg p-2 text-xs ${
              msg.role === 'user' ? 'ml-auto bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && <div className="animate-pulse text-xs text-gray-400">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Test your widget..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-400"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {connectedIntegrations.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Integrations</p>
          {connectedIntegrations.map((int, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${int.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <span className="capitalize">{int.provider}</span>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="max-h-24 overflow-y-auto border-t border-gray-200 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">Log</p>
          {logs.map((log, i) => (
            <p key={i} className="text-xs text-gray-400">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
