'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  updatedAt: string;
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
  const { user, loading: authLoading } = useAuth();
  const hasPaidPlan = user && user.plan !== 'none';
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);

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

  const handleUrlSubmit = useCallback(
    (url: string) => {
      stream.sendMessage(`Create a widget for ${url}`);
    },
    [stream]
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      stream.sendMessage(`Use the ${templateId} industry template to create my widget`);
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
      try {
        const res = await fetch(`/api/builder/sessions?id=${id}`);
        const data = await res.json();
        if (data.success) {
          stream.setSessionId(id);
          setShowSessions(false);
        }
      } catch {}
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
    <div className="flex h-[calc(100vh-64px)] flex-col" style={{ background: '#08090d' }}>
      {/* Font loader */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {!isEmptyState && <ProgressPipeline currentStage={stream.stage} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content — full width */}
        <div className="flex flex-1">
          {isEmptyState ? (
            <div className="flex-1" style={{ background: '#08090d' }}>
              <TemplateSelector onSubmitUrl={handleUrlSubmit} onSelectTemplate={handleTemplateSelect} />
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col">
                {stream.stage === 'deploy' && stream.sessionId && (
                  <div
                    className="flex items-center gap-3 px-5 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.015)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Link
                      href={`/dashboard/playground/${stream.sessionId}`}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all duration-200"
                      style={{
                        background: 'rgba(6,182,212,0.08)',
                        border: '1px solid rgba(6,182,212,0.2)',
                        color: '#22d3ee',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(6,182,212,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.35)';
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(6,182,212,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
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

              <ContextPanel
                mode={stream.panelMode}
                clientId={stream.sessionId}
                currentTheme={stream.currentTheme}
                abVariants={stream.abVariants}
                connectedIntegrations={[]}
                onSelectVariant={handleVariantSelect}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
