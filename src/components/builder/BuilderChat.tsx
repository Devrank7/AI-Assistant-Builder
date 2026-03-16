'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useVoiceInput } from './useVoiceInput';
import { playMessageSound, playSendSound } from '@/lib/sounds';
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
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Play chime when AI finishes responding
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.content) {
        playMessageSound();
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    playSendSound();
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: '#08090d' }}>
      {/* Patterned background layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* SVG geometric pattern - subtle constellation/circuit style */}
        {/* CSS-based repeating pattern — more visible */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.45,
            backgroundImage: `
              radial-gradient(circle at 20px 20px, #0e7490 0.8px, transparent 0.8px),
              radial-gradient(circle at 60px 60px, #0e7490 0.8px, transparent 0.8px),
              radial-gradient(circle at 60px 20px, #0891b2 0.5px, transparent 0.5px),
              radial-gradient(circle at 20px 60px, #0891b2 0.5px, transparent 0.5px),
              radial-gradient(circle at 40px 40px, #06b6d4 1px, transparent 1px),
              linear-gradient(45deg, transparent 48%, #0e7490 48%, #0e7490 48.3%, transparent 48.3%),
              linear-gradient(-45deg, transparent 48%, #0e7490 48%, #0e7490 48.3%, transparent 48.3%)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        {/* Radial vignette to soften edges */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, #08090d 90%)',
          }}
        />
        {/* Ambient top glow */}
        <div
          className="absolute -top-[200px] left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(ellipse, #06b6d4, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Secondary warm glow bottom-right */}
        <div
          className="absolute -right-[150px] -bottom-[150px] h-[400px] w-[400px] rounded-full opacity-[0.02]"
          style={{
            background: 'radial-gradient(ellipse, #8b5cf6, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Messages area */}
      <div className="scrollbar-thin relative flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((msg, i) => {
            // Skip empty assistant messages (placeholder before streaming starts)
            if (msg.role === 'assistant' && !msg.content && (!msg.toolCards || msg.toolCards.length === 0)) {
              return null;
            }
            return (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} msg-appear`}
                style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
              >
                {/* Agent avatar */}
                {msg.role === 'assistant' && (
                  <div className="mt-1 mr-3 flex-shrink-0">
                    <div
                      className="relative flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))',
                        border: '1px solid rgba(6,182,212,0.18)',
                        boxShadow: '0 2px 12px rgba(6,182,212,0.08)',
                      }}
                    >
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
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className="group relative max-w-[80%] sm:max-w-[75%]"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #0e7490, #0891b2)',
                          borderRadius: '20px 20px 6px 20px',
                          padding: '12px 18px',
                          color: '#fff',
                          boxShadow: '0 4px 24px rgba(6,182,212,0.12), 0 1px 3px rgba(0,0,0,0.2)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '20px 20px 20px 6px',
                          padding: '14px 18px',
                          color: '#c8cdd8',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
                        }
                  }
                >
                  <div
                    className="text-[13.5px] leading-[1.7]"
                    style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '0.01em' }}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="builder-markdown">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>

                  {/* Tool action cards */}
                  {msg.toolCards && msg.toolCards.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.toolCards.map((card, j) => (
                        <div
                          key={j}
                          className="tool-card-appear flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                          style={{
                            animationDelay: `${j * 0.1}s`,
                            background:
                              card.status === 'done'
                                ? 'rgba(16,185,129,0.06)'
                                : card.status === 'error'
                                  ? 'rgba(239,68,68,0.06)'
                                  : 'rgba(6,182,212,0.05)',
                            border:
                              card.status === 'done'
                                ? '1px solid rgba(16,185,129,0.12)'
                                : card.status === 'error'
                                  ? '1px solid rgba(239,68,68,0.12)'
                                  : '1px solid rgba(6,182,212,0.12)',
                          }}
                        >
                          {card.status === 'running' && (
                            <div className="relative h-4 w-4">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  border: '2px solid rgba(6,182,212,0.15)',
                                }}
                              />
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  border: '2px solid transparent',
                                  borderTopColor: '#22d3ee',
                                  animation: 'toolSpin 0.8s linear infinite',
                                }}
                              />
                            </div>
                          )}
                          {card.status === 'done' && (
                            <div
                              className="flex h-4 w-4 items-center justify-center rounded-full"
                              style={{ background: 'rgba(16,185,129,0.15)' }}
                            >
                              <svg
                                className="h-2.5 w-2.5"
                                style={{ color: '#34d399' }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                          {card.status === 'error' && (
                            <div
                              className="flex h-4 w-4 items-center justify-center rounded-full"
                              style={{ background: 'rgba(239,68,68,0.15)' }}
                            >
                              <svg
                                className="h-2.5 w-2.5"
                                style={{ color: '#f87171' }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                          <span
                            className="text-xs font-medium"
                            style={{
                              color:
                                card.status === 'done' ? '#34d399' : card.status === 'error' ? '#f87171' : '#67e8f9',
                              fontFamily: "'Outfit', sans-serif",
                            }}
                          >
                            {TOOL_LABELS[card.tool] || card.tool}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CRM instruction card */}
                  {msg.crmInstruction && (
                    <div
                      className="mt-4 rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <p
                        className="mb-3 text-sm font-semibold capitalize"
                        style={{ color: '#e8eaed', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {msg.crmInstruction.provider} Setup
                      </p>
                      <ol
                        className="list-inside list-decimal space-y-2 text-xs leading-relaxed"
                        style={{ color: '#8b92a5' }}
                      >
                        {msg.crmInstruction.steps.map((step, k) => (
                          <li key={k}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking skeleton — shows while waiting for AI response */}
          {isStreaming &&
            (!messages.length ||
              messages[messages.length - 1]?.role === 'user' ||
              (messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content)) && (
              <div className="thinking-appear flex justify-start">
                {/* Avatar */}
                <div className="mt-1 mr-3 flex-shrink-0">
                  <div
                    className="relative flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))',
                      border: '1px solid rgba(6,182,212,0.18)',
                    }}
                  >
                    <svg
                      className="thinking-icon h-4 w-4"
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
                </div>
                {/* Skeleton bubble */}
                <div
                  className="max-w-[75%] overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px 20px 20px 6px',
                    padding: '16px 20px',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="space-y-3">
                    {/* Shimmer lines */}
                    <div
                      className="shimmer-line h-3 w-52 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                    <div
                      className="shimmer-line h-3 w-40 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)', animationDelay: '0.15s' }}
                    />
                    <div
                      className="shimmer-line h-3 w-48 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)', animationDelay: '0.3s' }}
                    />
                  </div>
                  {/* Typing dots below skeleton */}
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}
                    >
                      Thinking
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-[4px] w-[4px] rounded-full"
                          style={{
                            background: '#06b6d4',
                            animation: 'streamPulse 1.4s ease-in-out infinite',
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Streaming dots — shows while text is actively being received */}
          {isStreaming &&
            messages[messages.length - 1]?.role === 'assistant' &&
            messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-3 pl-11">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[5px] w-[5px] rounded-full"
                      style={{
                        background: '#06b6d4',
                        animation: 'streamPulse 1.4s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Knowledge progress */}
          {knowledgeProgress && (
            <div className="pl-11">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(6,182,212,0.04)',
                  border: '1px solid rgba(6,182,212,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="text-xs font-semibold tracking-wide"
                    style={{ color: '#22d3ee', fontFamily: "'Outfit', sans-serif" }}
                  >
                    Uploading knowledge
                  </span>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: '#4a5068', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {knowledgeProgress.uploaded}/{knowledgeProgress.total}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(knowledgeProgress.uploaded / knowledgeProgress.total) * 100}%`,
                      background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #67e8f9)',
                      boxShadow: '0 0 16px rgba(6,182,212,0.4)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="pl-11">
              <div
                className="rounded-xl px-4 py-3 text-xs"
                style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  color: '#fca5a5',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {error}
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {suggestions && suggestions.length > 0 && !isStreaming && (
            <div className="flex flex-wrap gap-2 pl-11">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(s)}
                  className="chip-appear rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#8b92a5',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                    e.currentTarget.style.color = '#67e8f9';
                    e.currentTarget.style.background = 'rgba(6,182,212,0.06)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = '#8b92a5';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Proactive suggestion cards */}
          {proactiveSuggestions && proactiveSuggestions.length > 0 && !isStreaming && (
            <div className="space-y-3 pl-11">
              {proactiveSuggestions.map((s, idx) => (
                <div
                  key={s.id}
                  className="suggestion-appear rounded-2xl p-4"
                  style={{
                    animationDelay: `${idx * 0.12}s`,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(139,92,246,0.12)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
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
                        border: `1px solid ${s.category === 'integration' ? 'rgba(6,182,212,0.18)' : s.category === 'knowledge_gap' ? 'rgba(245,158,11,0.18)' : 'rgba(139,92,246,0.18)'}`,
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {s.category.replace('_', ' ')}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: '#e0e4ec', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {s.title}
                    </span>
                  </div>
                  <p
                    className="mb-3 text-xs leading-relaxed"
                    style={{ color: '#6b7280', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {s.description}
                  </p>
                  <div className="flex gap-2">
                    {s.actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => onSendMessage(a.action)}
                        className="rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          background: 'rgba(6,182,212,0.07)',
                          border: '1px solid rgba(6,182,212,0.18)',
                          color: '#22d3ee',
                          fontFamily: "'Outfit', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(6,182,212,0.14)';
                          e.currentTarget.style.boxShadow = '0 0 16px rgba(6,182,212,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(6,182,212,0.07)';
                          e.currentTarget.style.boxShadow = 'none';
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
      </div>

      {/* Input area with frosted glass effect */}
      <div className="relative z-10 px-4 pt-2 pb-5 sm:px-8">
        {/* Top fade gradient */}
        <div
          className="pointer-events-none absolute -top-12 right-0 left-0 h-12"
          style={{ background: 'linear-gradient(to top, #08090d, transparent)' }}
        />

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl overflow-hidden rounded-2xl transition-all duration-400"
          style={{
            background: isFocused ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.025)',
            border: isFocused ? '1px solid rgba(6,182,212,0.2)' : '1px solid rgba(255,255,255,0.06)',
            boxShadow: isFocused
              ? '0 0 40px rgba(6,182,212,0.06), 0 8px 32px rgba(0,0,0,0.2)'
              : '0 4px 24px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {isSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: isListening ? 'rgba(239,68,68,0.12)' : 'transparent',
                  color: isListening ? '#f87171' : '#4a5068',
                }}
              >
                <svg
                  className="h-[18px] w-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
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
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[13.5px] outline-none disabled:opacity-40"
              style={{
                color: '#e0e4ec',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '0.01em',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-400 disabled:cursor-not-allowed disabled:opacity-20"
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'transparent',
                color: input.trim() ? '#fff' : '#4a5068',
                boxShadow: input.trim() ? '0 2px 16px rgba(6,182,212,0.25)' : 'none',
                transform: input.trim() ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes streamPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        @keyframes thinkingAppear {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes iconPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .thinking-appear {
          animation: thinkingAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .thinking-icon {
          animation: iconPulse 2s ease-in-out infinite;
        }
        .shimmer-line {
          background-image: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(6,182,212,0.08) 40%, rgba(255,255,255,0.03) 80%) !important;
          background-size: 200px 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        @keyframes toolSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes msgAppear {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chipAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .msg-appear {
          animation: msgAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tool-card-appear {
          animation: chipAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .chip-appear {
          animation: chipAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .suggestion-appear {
          animation: msgAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }

        /* Markdown styles for assistant messages */
        .builder-markdown p { margin: 0 0 0.5em 0; }
        .builder-markdown p:last-child { margin-bottom: 0; }
        .builder-markdown strong { color: #e0e4ec; font-weight: 600; }
        .builder-markdown em { color: #a5b4c8; font-style: italic; }
        .builder-markdown code {
          background: rgba(6,182,212,0.08);
          border: 1px solid rgba(6,182,212,0.15);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 0.88em;
          color: #67e8f9;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .builder-markdown pre {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 12px 14px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .builder-markdown pre code {
          background: none;
          border: none;
          padding: 0;
          color: #c8cdd8;
        }
        .builder-markdown ul, .builder-markdown ol {
          margin: 0.4em 0;
          padding-left: 1.4em;
        }
        .builder-markdown li { margin: 0.25em 0; }
        .builder-markdown li::marker { color: #22d3ee; }
        .builder-markdown a {
          color: #22d3ee;
          text-decoration: underline;
          text-decoration-color: rgba(34,211,238,0.3);
          text-underline-offset: 2px;
        }
        .builder-markdown a:hover { text-decoration-color: #22d3ee; }
        .builder-markdown h1, .builder-markdown h2, .builder-markdown h3 {
          color: #e8eaed;
          font-weight: 600;
          margin: 0.6em 0 0.3em;
        }
        .builder-markdown h1 { font-size: 1.15em; }
        .builder-markdown h2 { font-size: 1.08em; }
        .builder-markdown h3 { font-size: 1em; }
        .builder-markdown blockquote {
          border-left: 2px solid rgba(6,182,212,0.3);
          margin: 0.5em 0;
          padding: 0.3em 0 0.3em 12px;
          color: #8b92a5;
        }
        .builder-markdown hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 0.8em 0;
        }
      `}</style>
    </div>
  );
}
