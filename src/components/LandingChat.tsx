'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LANDING_CLIENT_ID = 'landing';

const FALLBACK_RESPONSES: Record<string, string> = {
  pricing:
    'WinBix AI offers two plans:\n\n**Basic** — $29/mo: 1 widget, 1,000 conversations/mo, email support, basic analytics.\n\n**Pro** — $79/mo: Unlimited widgets, unlimited conversations, priority support, advanced analytics, CRM integrations, and omnichannel (Telegram, WhatsApp, Instagram).\n\nBoth plans include a free trial. Visit our pricing section or /plans for details!',
  features:
    'WinBix AI widgets include:\n- AI-powered chat trained on your business knowledge\n- Lead collection and CRM integration\n- Omnichannel support (Website, Telegram, WhatsApp, Instagram)\n- Multilingual support (auto-detects language)\n- Custom branding to match your site\n- Real-time analytics dashboard\n- Voice input and text-to-speech',
  default:
    "Hi! I'm WinBix AI's assistant. I can help you learn about our AI chat widgets, pricing, features, and how to get started. What would you like to know?",
};

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('pric') || lower.includes('cost') || lower.includes('plan')) {
    return FALLBACK_RESPONSES.pricing;
  }
  if (lower.includes('feature') || lower.includes('what') || lower.includes('can')) {
    return FALLBACK_RESPONSES.features;
  }
  return 'Thanks for your interest in WinBix AI! We offer AI-powered chat widgets that help businesses automate customer support, collect leads, and boost conversions. Would you like to know about our features or pricing?';
}

export default function LandingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: FALLBACK_RESPONSES.default,
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Build conversation history for the API
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: LANDING_CLIENT_ID,
          message: trimmed,
          conversationHistory,
        }),
      });

      if (!res.ok || !res.body) {
        // Fallback to local responses
        setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(trimmed) }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Non-JSON data, might be raw text
              if (data.trim()) {
                assistantContent += data;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            }
          }
        }
      }

      // If we got no content from streaming, use fallback
      if (!assistantContent.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: getFallbackResponse(trimmed),
          };
          return updated;
        });
      }
    } catch {
      // Network error — use fallback
      setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(trimmed) }]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages]);

  return (
    <>
      {/* Chat bubble trigger */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 transition-shadow hover:shadow-xl hover:shadow-blue-500/40"
            aria-label="Open chat"
          >
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Pulse indicator */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-400" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="border-border fixed right-4 bottom-4 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/50"
            style={{ height: '520px', background: 'rgba(10, 12, 22, 0.98)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
              <div className="text-text-primary flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                AI
              </div>
              <div className="flex-1">
                <p className="text-text-primary text-sm font-semibold">WinBix AI</p>
                <p className="text-text-secondary text-xs">Ask me anything about our platform</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:bg-bg-tertiary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition"
                aria-label="Close chat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-text-primary rounded-tr-sm bg-blue-600/25'
                        : 'bg-bg-tertiary text-text-secondary rounded-tl-sm'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.content || (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="bg-text-secondary h-1.5 w-1.5 animate-bounce rounded-full"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="bg-text-secondary h-1.5 w-1.5 animate-bounce rounded-full"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="bg-text-secondary h-1.5 w-1.5 animate-bounce rounded-full"
                          style={{ animationDelay: '300ms' }}
                        />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions (show only when few messages) */}
            {messages.length <= 2 && (
              <div className="border-border flex flex-wrap gap-2 border-t px-4 py-2">
                {['What features do you offer?', 'Show me pricing', 'How does it work?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => {
                        const fakeEvent = { trim: () => q } as unknown;
                        void fakeEvent;
                        setInput('');
                        const userMsg: Message = { role: 'user', content: q };
                        setMessages((prev) => [...prev, userMsg]);
                        // Trigger response
                        setIsStreaming(true);
                        fetch('/api/chat/stream', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            clientId: LANDING_CLIENT_ID,
                            message: q,
                            conversationHistory: messages.map((m) => ({
                              role: m.role,
                              parts: [{ text: m.content }],
                            })),
                          }),
                        })
                          .then(async (res) => {
                            if (!res.ok || !res.body) {
                              setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(q) }]);
                              return;
                            }
                            const reader = res.body.getReader();
                            const decoder = new TextDecoder();
                            let content = '';
                            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });
                              for (const line of chunk.split('\n')) {
                                if (line.startsWith('data: ')) {
                                  const d = line.slice(6);
                                  if (d === '[DONE]') continue;
                                  try {
                                    const p = JSON.parse(d);
                                    if (p.text) {
                                      content += p.text;
                                      setMessages((prev) => {
                                        const u = [...prev];
                                        u[u.length - 1] = { role: 'assistant', content };
                                        return u;
                                      });
                                    }
                                  } catch {
                                    if (d.trim()) {
                                      content += d;
                                      setMessages((prev) => {
                                        const u = [...prev];
                                        u[u.length - 1] = { role: 'assistant', content };
                                        return u;
                                      });
                                    }
                                  }
                                }
                              }
                            }
                            if (!content.trim()) {
                              setMessages((prev) => {
                                const u = [...prev];
                                u[u.length - 1] = { role: 'assistant', content: getFallbackResponse(q) };
                                return u;
                              });
                            }
                          })
                          .catch(() => {
                            setMessages((prev) => [...prev, { role: 'assistant', content: getFallbackResponse(q) }]);
                          })
                          .finally(() => setIsStreaming(false));
                      }, 0);
                    }}
                    className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition hover:bg-blue-500/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-border border-t px-4 py-3">
              <div className="border-border bg-bg-tertiary flex items-center gap-2 rounded-xl border px-4 py-2.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  disabled={isStreaming}
                  className="text-text-primary placeholder-text-tertiary flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={isStreaming || !input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 transition hover:bg-blue-500/30 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-text-tertiary mt-1.5 text-center text-[10px]">Powered by WinBix AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
