'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useBuilderStream } from '@/components/builder/useBuilderStream';
import ProgressPipeline from '@/components/builder/ProgressPipeline';
import BuilderChat from '@/components/builder/BuilderChat';
import ContextPanel from '@/components/builder/ContextPanel';
import TemplateSelector from '@/components/builder/TemplateSelector';

interface SessionSummary {
  _id: string;
  widgetName: string | null;
  status: string;
  clientId: string | null;
  currentStage: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

const STAGE_SUGGESTIONS: Record<string, string[]> = {
  input: [],
  analysis: ['Change colors', 'Different style'],
  design: ['I like this one', 'Show different options'],
  knowledge: ['Add more content', 'Skip knowledge base'],
  deploy: ['Test the widget', 'Connect CRM', 'Change colors'],
  integrations: ['Test CRM integration', 'Add another CRM'],
};

export default function BuilderPage() {
  const stream = useBuilderStream();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const hasPaidPlan = user && user.plan !== 'none';
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!authLoading && user && !hasPaidPlan) {
      router.push('/plans');
    }
  }, [authLoading, user, hasPaidPlan, router]);

  useEffect(() => {
    fetch('/api/builder/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSessions(d.data);
      })
      .catch(() => {});
  }, []);

  // Auto-restore session from URL query param (?session=ID)
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && !restoredRef.current) {
      restoredRef.current = true;
      stream.restoreSession(sessionId);
    }
  }, [searchParams, stream]);

  const handleUrlSubmit = useCallback(
    (input: string) => {
      // If it looks like a URL, wrap it; otherwise send raw message for the agent to handle
      const isUrl = /^https?:\/\//i.test(input) || /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/i.test(input);
      if (isUrl) {
        const normalized = input.startsWith('http') ? input : `https://${input}`;
        stream.sendMessage(`Create a widget for ${normalized}`);
      } else {
        stream.sendMessage(input);
      }
    },
    [stream]
  );

  const handleVariantSelect = useCallback(
    (index: number) => {
      stream.sendMessage(`I choose variant ${index + 1}`);
    },
    [stream]
  );

  const loadSession = useCallback(
    async (id: string) => {
      await stream.restoreSession(id);
      setShowSessions(false);
    },
    [stream]
  );

  const startNewSession = useCallback(() => {
    if (!hasPaidPlan) {
      router.push('/dashboard/billing');
      return;
    }
    stream.resetSession();
    setShowSessions(false);
  }, [stream, hasPaidPlan, router]);

  const isEmptyState = stream.stage === 'input' && stream.messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-hidden" style={{ background: '#08090d' }}>
      {/* Font loader */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {!isEmptyState && <ProgressPipeline currentStage={stream.stage} />}

      <div className="flex flex-1 overflow-hidden">
        {isEmptyState ? (
          <div className="flex-1" style={{ background: '#08090d' }}>
            <TemplateSelector
              onSubmitUrl={handleUrlSubmit}
              sessions={sessions}
              onSelectSession={loadSession}
              onNewSession={startNewSession}
            />
          </div>
        ) : (
          <>
            {/* Chat area - takes remaining space */}
            <div className="flex min-w-0 flex-1 flex-col">
              {stream.stage === 'deploy' && stream.sessionId && (
                <div
                  className="flex items-center gap-3 px-5 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.015)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <Link
                    href={`/dashboard/playground/${stream.sessionId}`}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300"
                    style={{
                      background: 'rgba(6,182,212,0.07)',
                      border: '1px solid rgba(6,182,212,0.18)',
                      color: '#22d3ee',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(6,182,212,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(6,182,212,0.07)';
                      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.18)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                      />
                    </svg>
                    Open Playground
                  </Link>
                </div>
              )}
              <BuilderChat
                messages={stream.messages}
                isStreaming={stream.isStreaming}
                error={stream.error}
                knowledgeProgress={stream.knowledgeProgress}
                onSendMessage={(msg) => stream.sendMessage(msg)}
                suggestions={STAGE_SUGGESTIONS[stream.stage]}
                proactiveSuggestions={stream.suggestions}
              />
            </div>

            {/* Right panel - responsive: hidden on mobile, sidebar on desktop */}
            <ContextPanel
              mode={stream.panelMode}
              clientId={stream.widgetClientId || stream.sessionId}
              currentTheme={stream.currentTheme}
              abVariants={stream.abVariants}
              connectedIntegrations={[]}
              onSelectVariant={handleVariantSelect}
            />
          </>
        )}
      </div>
    </div>
  );
}
