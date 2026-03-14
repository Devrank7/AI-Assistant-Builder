'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceInput } from './useVoiceInput';

interface ToolCard {
  tool: string;
  status: 'running' | 'done' | 'error';
  result?: Record<string, unknown>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCards?: ToolCard[];
  crmInstruction?: { provider: string; steps: string[] };
}

interface Props {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  onSendMessage: (message: string) => void;
  suggestions?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  analyze_site: 'Analyzing website',
  generate_themes: 'Generating designs',
  select_theme: 'Applying theme',
  build_widget: 'Building widget',
  crawl_knowledge: 'Uploading knowledge',
  connect_crm: 'Connecting CRM',
  set_panel_mode: 'Updating view',
};

export default function BuilderChat({
  messages,
  isStreaming,
  error,
  knowledgeProgress,
  onSendMessage,
  suggestions,
}: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput((text) =>
    setInput((prev) => prev + ' ' + text)
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {/* Tool action cards */}
              {msg.toolCards?.map((card, j) => (
                <div
                  key={j}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-xs"
                >
                  {card.status === 'running' && <span className="animate-spin">⏳</span>}
                  {card.status === 'done' && <span className="text-green-500">✓</span>}
                  {card.status === 'error' && <span className="text-red-500">✗</span>}
                  <span className="text-gray-600">{TOOL_LABELS[card.tool] || card.tool}</span>
                </div>
              ))}

              {/* CRM instruction card */}
              {msg.crmInstruction && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-sm font-medium capitalize">{msg.crmInstruction.provider} Setup</p>
                  <ol className="list-inside list-decimal space-y-1 text-xs text-gray-600">
                    {msg.crmInstruction.steps.map((step, k) => (
                      <li key={k}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="flex gap-1 px-4">
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Knowledge progress */}
        {knowledgeProgress && (
          <div className="px-4">
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              <p className="mb-1">
                Uploading knowledge... {knowledgeProgress.uploaded}/{knowledgeProgress.total}
              </p>
              <div className="h-1.5 w-full rounded-full bg-blue-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${(knowledgeProgress.uploaded / knowledgeProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4">
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</div>
          </div>
        )}

        {/* Suggestion chips */}
        {suggestions && suggestions.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(s)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-200 p-4">
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`rounded-full p-2 transition-colors ${
              isListening ? 'animate-pulse bg-red-500 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🎤
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isStreaming ? 'AI is working...' : 'Type a message...'}
          disabled={isStreaming}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
