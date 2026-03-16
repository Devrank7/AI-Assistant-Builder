'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceInput } from './useVoiceInput';
import type { Suggestion } from '@/lib/builder/types';

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
  proactiveSuggestions?: Suggestion[] | null;
}

const TOOL_LABELS: Record<string, string> = {
  analyze_site: 'Analyzing website',
  select_theme: 'Applying theme',
  crawl_knowledge: 'Uploading knowledge',
  modify_widget_code: 'Modifying widget code',
  generate_design: 'Generating design',
  modify_design: 'Tweaking design',
  build_deploy: 'Building & deploying',
  rollback: 'Rolling back',
  test_widget: 'Testing widget',
  web_search: 'Searching web',
  web_fetch: 'Fetching page',
  search_api_docs: 'Searching API docs',
  write_integration: 'Writing integration',
  test_integration: 'Testing API key',
  guide_user: 'Showing instructions',
  analyze_opportunities: 'Finding opportunities',
  suggest_improvements: 'Preparing suggestions',
  check_knowledge_gaps: 'Checking knowledge',
};

const TOOL_ICONS: Record<string, string> = {
  analyze_site: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z',
  generate_themes:
    'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z',
  build_widget:
    'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085',
  crawl_knowledge:
    'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25',
};

export default function BuilderChat({
  messages,
  isStreaming,
  error,
  knowledgeProgress,
  onSendMessage,
  suggestions,
  proactiveSuggestions,
}: Props) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
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
    <div className="flex h-full flex-col" style={{ background: '#0a0b10' }}>
      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div
                className="mt-1 mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.1))',
                  border: '1px solid rgba(6,182,212,0.2)',
                }}
              >
                <svg
                  className="h-3.5 w-3.5"
                  style={{ color: '#22d3ee' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
            )}
            <div
              className="max-w-[75%] rounded-2xl px-4 py-3"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(6,182,212,0.15)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#c4c9d4',
                    }
              }
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

              {/* Tool action cards */}
              {msg.toolCards?.map((card, j) => (
                <div
                  key={j}
                  className="mt-2.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background:
                      card.status === 'done'
                        ? 'rgba(16,185,129,0.06)'
                        : card.status === 'error'
                          ? 'rgba(239,68,68,0.06)'
                          : 'rgba(6,182,212,0.06)',
                    border:
                      card.status === 'done'
                        ? '1px solid rgba(16,185,129,0.15)'
                        : card.status === 'error'
                          ? '1px solid rgba(239,68,68,0.15)'
                          : '1px solid rgba(6,182,212,0.15)',
                  }}
                >
                  {card.status === 'running' && (
                    <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-cyan-400" />
                  )}
                  {card.status === 'done' && (
                    <svg
                      className="h-3.5 w-3.5"
                      style={{ color: '#34d399' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  {card.status === 'error' && (
                    <svg
                      className="h-3.5 w-3.5"
                      style={{ color: '#f87171' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span
                    style={{
                      color: card.status === 'done' ? '#34d399' : card.status === 'error' ? '#f87171' : '#22d3ee',
                    }}
                  >
                    {TOOL_LABELS[card.tool] || card.tool}
                  </span>
                </div>
              ))}

              {/* CRM instruction card */}
              {msg.crmInstruction && (
                <div
                  className="mt-3 rounded-xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p
                    className="mb-3 text-sm font-medium capitalize"
                    style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {msg.crmInstruction.provider} Setup
                  </p>
                  <ol
                    className="list-inside list-decimal space-y-2 text-xs leading-relaxed"
                    style={{ color: '#7a8194' }}
                  >
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
          <div className="flex items-center gap-3 pl-10">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: '#06b6d4',
                    animation: 'streamDot 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Knowledge progress */}
        {knowledgeProgress && (
          <div className="pl-10">
            <div
              className="rounded-xl p-4"
              style={{
                background: 'rgba(6,182,212,0.04)',
                border: '1px solid rgba(6,182,212,0.1)',
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: '#22d3ee', fontFamily: "'Outfit', sans-serif" }}>
                  Uploading knowledge
                </span>
                <span className="text-xs" style={{ color: '#4a5068' }}>
                  {knowledgeProgress.uploaded}/{knowledgeProgress.total}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(knowledgeProgress.uploaded / knowledgeProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #06b6d4, #22d3ee)',
                    boxShadow: '0 0 10px rgba(6,182,212,0.4)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="pl-10">
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* Suggestion chips */}
        {suggestions && suggestions.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-2 pl-10">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(s)}
                className="rounded-full px-3.5 py-1.5 text-xs transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#7a8194',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                  e.currentTarget.style.color = '#22d3ee';
                  e.currentTarget.style.background = 'rgba(6,182,212,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#7a8194';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Proactive suggestion cards */}
        {proactiveSuggestions && proactiveSuggestions.length > 0 && !isStreaming && (
          <div className="space-y-2 pl-10">
            {proactiveSuggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(139,92,246,0.15)',
                }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      background:
                        s.category === 'integration'
                          ? 'rgba(6,182,212,0.1)'
                          : s.category === 'knowledge_gap'
                            ? 'rgba(245,158,11,0.1)'
                            : 'rgba(139,92,246,0.1)',
                      color:
                        s.category === 'integration'
                          ? '#22d3ee'
                          : s.category === 'knowledge_gap'
                            ? '#fbbf24'
                            : '#a78bfa',
                      border: `1px solid ${s.category === 'integration' ? 'rgba(6,182,212,0.2)' : s.category === 'knowledge_gap' ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)'}`,
                    }}
                  >
                    {s.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#e8eaed' }}>
                    {s.title}
                  </span>
                </div>
                <p className="mb-3 text-xs" style={{ color: '#7a8194' }}>
                  {s.description}
                </p>
                <div className="flex gap-2">
                  {s.actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => onSendMessage(a.action)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
                      style={{
                        background: 'rgba(6,182,212,0.08)',
                        border: '1px solid rgba(6,182,212,0.2)',
                        color: '#22d3ee',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(6,182,212,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pt-2 pb-5">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 rounded-2xl p-1.5 transition-all duration-300"
          style={{
            background: isFocused ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.03)',
            border: isFocused ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(255,255,255,0.06)',
            boxShadow: isFocused ? '0 0 30px rgba(6,182,212,0.06)' : 'none',
          }}
        >
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200"
              style={{
                background: isListening ? 'rgba(239,68,68,0.15)' : 'transparent',
                color: isListening ? '#f87171' : '#4a5068',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isStreaming ? 'Agent is working...' : 'Describe what you want to build...'}
            disabled={isStreaming}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none disabled:opacity-40"
            style={{
              color: '#e8eaed',
              fontFamily: "'Outfit', sans-serif",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-20"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'transparent',
              color: input.trim() ? '#fff' : '#4a5068',
              boxShadow: input.trim() ? '0 2px 12px rgba(6,182,212,0.3)' : 'none',
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>

      <style>{`
        @keyframes streamDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
