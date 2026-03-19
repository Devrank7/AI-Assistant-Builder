'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/components/ThemeProvider';
import { useVoiceInput } from './useVoiceInput';
import {
  playMessageSound,
  playSendSound,
  playToolStartSound,
  playToolCompleteSound,
  playErrorSound,
  playSuccessSound,
  playClickSound,
} from '@/lib/sounds';
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

interface FileContext {
  filename: string;
  type: string;
  size: number;
  pages?: number;
  wordCount: number;
  preview: string;
  fullText: string;
}

interface Props {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  onSendMessage: (message: string) => void;
  onSendMessageWithFile?: (message: string, fileContext: FileContext) => void;
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
  onSendMessageWithFile,
  suggestions,
  proactiveSuggestions,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput((text) =>
    setInput((prev) => prev + ' ' + text)
  );
  const prevStreamingRef = useRef(isStreaming);

  // Track tool card states for sound triggers
  const prevToolCardsRef = useRef<Map<string, string>>(new Map());
  const prevErrorRef = useRef<string | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Re-scroll to bottom when chat container resizes (e.g. right panel appearing)
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Sound triggers for tool_start, tool_complete, errors, and widget_ready
  useEffect(() => {
    const currentToolCards = new Map<string, string>();
    for (const msg of messages) {
      if (msg.toolCards) {
        for (const card of msg.toolCards) {
          currentToolCards.set(`${msg.timestamp}-${card.tool}`, card.status);
        }
      }
    }

    // Check for new or changed tool cards
    for (const [key, status] of currentToolCards) {
      const prevStatus = prevToolCardsRef.current.get(key);
      if (!prevStatus && status === 'running') {
        playToolStartSound();
      } else if (prevStatus === 'running' && status === 'done') {
        // Play success arpeggio for build_deploy completion (widget_ready)
        if (key.includes('build_deploy')) {
          playSuccessSound();
        } else {
          playToolCompleteSound();
        }
      } else if (prevStatus === 'running' && status === 'error') {
        playErrorSound();
      }
    }

    prevToolCardsRef.current = currentToolCards;
  }, [messages]);

  // Play error sound when error prop changes
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      playErrorSound();
    }
    prevErrorRef.current = error;
  }, [error]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum size is 25 MB.');
      return;
    }
    setAttachedFile(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming || isUploading) return;
    if (!attachedFile && !input.trim()) return;

    if (attachedFile && onSendMessageWithFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachedFile);

        const res = await fetch('/api/builder/upload-file', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Failed to process file');
          setIsUploading(false);
          return;
        }

        playSendSound();
        onSendMessageWithFile(input.trim(), {
          filename: data.metadata.filename,
          type: data.metadata.type,
          size: data.metadata.size,
          pages: data.metadata.pages,
          wordCount: data.metadata.wordCount,
          preview: data.preview,
          fullText: data.text,
        });

        setInput('');
        setAttachedFile(null);
      } catch (err) {
        alert('Failed to upload file. Please try again.');
        console.error('File upload error:', err);
      } finally {
        setIsUploading(false);
      }
    } else if (input.trim()) {
      playSendSound();
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: isDark ? '#08090d' : '#f8fafc' }}
    >
      {/* Patterned background layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* SVG geometric pattern - subtle constellation/circuit style */}
        {/* CSS-based repeating pattern — more visible */}
        <div
          className="absolute inset-0"
          style={{
            opacity: isDark ? 0.45 : 0.25,
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
            background: isDark
              ? 'radial-gradient(ellipse at 50% 40%, transparent 40%, #08090d 90%)'
              : 'radial-gradient(ellipse at 50% 40%, transparent 40%, #f8fafc 90%)',
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
      <div ref={chatContainerRef} className="scrollbar-thin relative flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-7">
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
                      className="agent-avatar relative flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.10))',
                        border: '1px solid rgba(6,182,212,0.22)',
                        boxShadow: '0 2px 16px rgba(6,182,212,0.10), 0 0 0 1px rgba(6,182,212,0.05)',
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
                  className={`group relative max-w-[80%] sm:max-w-[75%] ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #0e7490, #0891b2)',
                          borderRadius: '20px 20px 6px 20px',
                          padding: '13px 20px',
                          color: '#fff',
                          boxShadow:
                            '0 4px 28px rgba(6,182,212,0.15), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }
                      : {
                          background: isDark ? 'rgba(255,255,255,0.028)' : 'rgba(255,255,255,0.95)',
                          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '20px 20px 20px 6px',
                          padding: '15px 20px',
                          color: isDark ? '#c8cdd8' : '#111827',
                          backdropFilter: 'blur(16px)',
                          boxShadow: isDark
                            ? '0 2px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)'
                            : '0 2px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                        }
                  }
                >
                  <div
                    className="text-[13.5px] leading-[1.75]"
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
                    <div className="mt-4 space-y-2.5">
                      {msg.toolCards.map((card, j) => (
                        <div
                          key={j}
                          className={`tool-card-appear flex items-center gap-3 rounded-xl px-4 py-3 ${card.status === 'done' ? 'tool-card-done' : card.status === 'error' ? 'tool-card-error' : 'tool-card-running'}`}
                          style={{
                            animationDelay: `${j * 0.1}s`,
                            background:
                              card.status === 'done'
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(52,211,153,0.03))'
                                : card.status === 'error'
                                  ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(248,113,113,0.03))'
                                  : 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(139,92,246,0.03))',
                            border:
                              card.status === 'done'
                                ? '1px solid rgba(16,185,129,0.15)'
                                : card.status === 'error'
                                  ? '1px solid rgba(239,68,68,0.15)'
                                  : '1px solid rgba(6,182,212,0.15)',
                            boxShadow:
                              card.status === 'done'
                                ? '0 2px 12px rgba(16,185,129,0.06)'
                                : card.status === 'error'
                                  ? '0 2px 12px rgba(239,68,68,0.06)'
                                  : '0 2px 12px rgba(6,182,212,0.06)',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          {card.status === 'running' && (
                            <div className="relative h-[18px] w-[18px] flex-shrink-0">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  border: '2px solid rgba(6,182,212,0.12)',
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
                              {/* Subtle glow behind spinner */}
                              <div
                                className="absolute inset-[-2px] rounded-full"
                                style={{
                                  background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)',
                                  animation: 'streamPulse 2s ease-in-out infinite',
                                }}
                              />
                            </div>
                          )}
                          {card.status === 'done' && (
                            <div
                              className="tool-check-appear flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
                              style={{ background: 'rgba(16,185,129,0.18)' }}
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
                              className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
                              style={{ background: 'rgba(239,68,68,0.18)' }}
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
                            className="text-xs font-medium tracking-wide"
                            style={{
                              color:
                                card.status === 'done' ? '#34d399' : card.status === 'error' ? '#f87171' : '#67e8f9',
                              fontFamily: "'Outfit', sans-serif",
                              letterSpacing: '0.02em',
                            }}
                          >
                            {TOOL_LABELS[card.tool] || card.tool}
                          </span>
                          {card.status === 'running' && (
                            <div className="ml-auto flex items-center gap-1">
                              {[0, 1, 2].map((k) => (
                                <div
                                  key={k}
                                  className="h-[3px] w-[3px] rounded-full"
                                  style={{
                                    background: '#22d3ee',
                                    animation: 'streamPulse 1.4s ease-in-out infinite',
                                    animationDelay: `${k * 0.2}s`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CRM instruction card */}
                  {msg.crmInstruction && (
                    <div
                      className="mt-4 rounded-xl p-4"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <p
                        className="mb-3 text-sm font-semibold capitalize"
                        style={{ color: isDark ? '#e8eaed' : '#111827', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {msg.crmInstruction.provider} Setup
                      </p>
                      <ol
                        className="list-inside list-decimal space-y-2 text-xs leading-relaxed"
                        style={{ color: isDark ? '#8b92a5' : '#6B7280' }}
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
                    className="agent-avatar relative flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.10))',
                      border: '1px solid rgba(6,182,212,0.22)',
                      boxShadow: '0 2px 16px rgba(6,182,212,0.10)',
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
                  className="thinking-bubble max-w-[75%] overflow-hidden"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.028)' : 'rgba(255,255,255,0.95)',
                    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '20px 20px 20px 6px',
                    padding: '18px 22px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: isDark
                      ? '0 2px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.03)'
                      : '0 2px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <div className="space-y-3">
                    {/* Shimmer lines */}
                    <div
                      className="shimmer-line h-[10px] w-52 rounded-full"
                      style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)' }}
                    />
                    <div
                      className="shimmer-line h-[10px] w-36 rounded-full"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
                        animationDelay: '0.15s',
                      }}
                    />
                    <div
                      className="shimmer-line h-[10px] w-44 rounded-full"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
                        animationDelay: '0.3s',
                      }}
                    />
                  </div>
                  {/* Typing indicator below skeleton */}
                  <div className="mt-5 flex items-center gap-2.5">
                    <span
                      className="thinking-label text-[11px] font-medium tracking-wider uppercase"
                      style={{
                        color: isDark ? '#3d4560' : '#9CA3AF',
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.08em',
                      }}
                    >
                      Thinking
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="thinking-dot h-[5px] w-[5px] rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                            animation: 'thinkingDotPulse 1.8s ease-in-out infinite',
                            animationDelay: `${i * 0.25}s`,
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
                    style={{ color: isDark ? '#4a5068' : '#9CA3AF', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {knowledgeProgress.uploaded}/{knowledgeProgress.total}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }}
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
                className="error-appear flex items-center gap-3 rounded-xl px-4 py-3.5 text-xs"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(248,113,113,0.03))',
                  border: '1px solid rgba(239,68,68,0.15)',
                  color: '#fca5a5',
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: '0 2px 12px rgba(239,68,68,0.06)',
                }}
              >
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)' }}
                >
                  <svg
                    className="h-3 w-3"
                    style={{ color: '#f87171' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                {error}
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {suggestions && suggestions.length > 0 && !isStreaming && (
            <div className="flex flex-wrap gap-2.5 pl-11">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playClickSound();
                    onSendMessage(s);
                  }}
                  className="chip-appear rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-300"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    color: isDark ? '#8b92a5' : '#6B7280',
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: '0.01em',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.35)';
                    e.currentTarget.style.color = isDark ? '#67e8f9' : '#0891b2';
                    e.currentTarget.style.background = isDark ? 'rgba(6,182,212,0.07)' : 'rgba(6,182,212,0.08)';
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(6,182,212,0.10), 0 4px 16px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.color = isDark ? '#8b92a5' : '#6B7280';
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
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
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.95)',
                    border: isDark ? '1px solid rgba(139,92,246,0.12)' : '1px solid rgba(139,92,246,0.18)',
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
                      {(s.category || 'suggestion').replace('_', ' ')}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: isDark ? '#e0e4ec' : '#111827', fontFamily: "'Outfit', sans-serif" }}
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
                    {(s.actions || []).map((a, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          playClickSound();
                          onSendMessage(a.action);
                        }}
                        className="rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          background: 'rgba(6,182,212,0.07)',
                          border: '1px solid rgba(6,182,212,0.18)',
                          color: '#22d3ee',
                          fontFamily: "'Outfit', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(6,182,212,0.14)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.12)';
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
          className="pointer-events-none absolute -top-16 right-0 left-0 h-16"
          style={{
            background: isDark
              ? 'linear-gradient(to top, #08090d, transparent)'
              : 'linear-gradient(to top, #f8fafc, transparent)',
          }}
        />

        {/* File preview badge */}
        {attachedFile && (
          <div
            className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl px-3 py-2"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <svg
              className="h-4 w-4 flex-shrink-0"
              style={{ color: '#22d3ee' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span
              className="min-w-0 flex-1 truncate text-xs"
              style={{ color: isDark ? '#e0e4ec' : '#111827', fontFamily: "'Outfit', sans-serif" }}
            >
              {attachedFile.name.length > 30 ? attachedFile.name.slice(0, 27) + '...' : attachedFile.name}
            </span>
            <span className="flex-shrink-0 text-xs" style={{ color: '#6b7280' }}>
              {formatFileSize(attachedFile.size)}
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors"
              style={{ color: '#6b7280' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="input-form mx-auto max-w-2xl overflow-hidden rounded-2xl transition-all duration-500"
          style={{
            background: isFocused
              ? isDark
                ? 'rgba(6,182,212,0.035)'
                : 'rgba(6,182,212,0.04)'
              : isDark
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(255,255,255,0.95)',
            border: isFocused
              ? '1px solid rgba(6,182,212,0.25)'
              : isDark
                ? '1px solid rgba(255,255,255,0.07)'
                : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isFocused
              ? isDark
                ? '0 0 48px rgba(6,182,212,0.08), 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(6,182,212,0.06)'
                : '0 0 48px rgba(6,182,212,0.06), 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(6,182,212,0.06)'
              : isDark
                ? '0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)'
                : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isUploading}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 disabled:opacity-30"
              style={{
                background: attachedFile ? 'rgba(6,182,212,0.12)' : 'transparent',
                color: attachedFile ? '#22d3ee' : isDark ? '#4a5068' : '#9CA3AF',
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
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
            </button>
            {isSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: isListening ? 'rgba(239,68,68,0.12)' : 'transparent',
                  color: isListening ? '#f87171' : isDark ? '#4a5068' : '#9CA3AF',
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
              placeholder={
                isUploading
                  ? 'Uploading file...'
                  : isStreaming
                    ? 'Agent is working...'
                    : 'Describe what you want to build...'
              }
              disabled={isStreaming}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[13.5px] outline-none disabled:opacity-40"
              style={{
                color: isDark ? '#e0e4ec' : '#111827',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '0.01em',
                caretColor: '#22d3ee',
              }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || isStreaming || isUploading}
              className="send-btn flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-20"
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #0891b2, #06b6d4)' : 'transparent',
                color: input.trim() ? '#fff' : isDark ? '#4a5068' : '#9CA3AF',
                boxShadow: input.trim() ? '0 2px 20px rgba(6,182,212,0.30), 0 0 0 1px rgba(6,182,212,0.1)' : 'none',
                transform: input.trim() ? 'scale(1)' : 'scale(0.92)',
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
        @keyframes thinkingDotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes toolCheckPop {
          0% { opacity: 0; transform: scale(0.3); }
          60% { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes errorAppear {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .thinking-appear {
          animation: thinkingAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .thinking-icon {
          animation: iconPulse 2s ease-in-out infinite;
        }
        .thinking-bubble {
          position: relative;
        }
        .thinking-bubble::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.08), rgba(6,182,212,0.15));
          background-size: 200% 200%;
          animation: gradientShift 3s ease-in-out infinite;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          pointer-events: none;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .shimmer-line {
          background-image: linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 0%, rgba(6,182,212,0.10) 40%, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 80%) !important;
          background-size: 200px 100%;
          animation: shimmer 2s ease-in-out infinite;
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
        .tool-check-appear {
          animation: toolCheckPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .error-appear {
          animation: errorAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .chip-appear {
          animation: chipAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .suggestion-appear {
          animation: msgAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Agent avatar subtle breathing glow */
        .agent-avatar::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          background: radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%);
          opacity: 0;
          animation: avatarGlow 3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes avatarGlow {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        /* User bubble subtle shine */
        .user-bubble::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          border-radius: inherit;
          pointer-events: none;
        }

        /* Assistant bubble top edge highlight */
        .assistant-bubble::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}, transparent);
          border-radius: inherit;
          pointer-events: none;
        }

        /* Send button hover glow */
        .send-btn:not(:disabled):hover {
          box-shadow: 0 4px 28px rgba(6,182,212,0.35), 0 0 0 1px rgba(6,182,212,0.15) !important;
          transform: scale(1.05) !important;
        }

        /* Input form subtle transition */
        .input-form {
          position: relative;
        }

        /* Placeholder styling */
        .input-form input::placeholder {
          color: ${isDark ? '#3d4560' : '#9CA3AF'};
          transition: color 0.3s ease;
        }
        .input-form input:focus::placeholder {
          color: ${isDark ? '#4a5068' : '#6B7280'};
        }

        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'}; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.2)'}; }

        /* Markdown styles for assistant messages */
        .builder-markdown p { margin: 0 0 0.5em 0; }
        .builder-markdown p:last-child { margin-bottom: 0; }
        .builder-markdown strong { color: ${isDark ? '#e0e4ec' : '#111827'}; font-weight: 600; }
        .builder-markdown em { color: ${isDark ? '#a5b4c8' : '#6B7280'}; font-style: italic; }
        .builder-markdown code {
          background: ${isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.08)'};
          border: 1px solid ${isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.2)'};
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 0.88em;
          color: ${isDark ? '#67e8f9' : '#0e7490'};
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .builder-markdown pre {
          background: ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'};
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'};
          border-radius: 8px;
          padding: 12px 14px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .builder-markdown pre code {
          background: none;
          border: none;
          padding: 0;
          color: ${isDark ? '#c8cdd8' : '#374151'};
        }
        .builder-markdown ul, .builder-markdown ol {
          margin: 0.4em 0;
          padding-left: 1.4em;
        }
        .builder-markdown li { margin: 0.25em 0; }
        .builder-markdown li::marker { color: ${isDark ? '#22d3ee' : '#0891b2'}; }
        .builder-markdown a {
          color: ${isDark ? '#22d3ee' : '#0891b2'};
          text-decoration: underline;
          text-decoration-color: ${isDark ? 'rgba(34,211,238,0.3)' : 'rgba(8,145,178,0.3)'};
          text-underline-offset: 2px;
        }
        .builder-markdown a:hover { text-decoration-color: ${isDark ? '#22d3ee' : '#0891b2'}; }
        .builder-markdown h1, .builder-markdown h2, .builder-markdown h3 {
          color: ${isDark ? '#e8eaed' : '#111827'};
          font-weight: 600;
          margin: 0.6em 0 0.3em;
        }
        .builder-markdown h1 { font-size: 1.15em; }
        .builder-markdown h2 { font-size: 1.08em; }
        .builder-markdown h3 { font-size: 1em; }
        .builder-markdown blockquote {
          border-left: 2px solid ${isDark ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.4)'};
          margin: 0.5em 0;
          padding: 0.3em 0 0.3em 12px;
          color: ${isDark ? '#8b92a5' : '#6B7280'};
        }
        .builder-markdown hr {
          border: none;
          border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'};
          margin: 0.8em 0;
        }
      `}</style>
    </div>
  );
}
