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
import WidgetInjector from '@/components/builder/WidgetInjector';

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

/** "Preview on Site" button — opens demo page with widget embedded on the client's website */
function PreviewOnSiteButton({
  clientId,
  currentTheme,
}: {
  clientId: string;
  currentTheme: Record<string, unknown> | null;
}) {
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    // Try to get site URL from theme or info.json
    const domain = currentTheme?.domain as string;
    if (domain) {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      setSiteUrl(url);
      return;
    }
    fetch(`/quickwidgets/${clientId}/info.json`)
      .then((r) => r.json())
      .then((d) => {
        if (d.website) {
          const url = d.website.startsWith('http') ? d.website : `https://${d.website}`;
          setSiteUrl(url);
        }
      })
      .catch(() => {});
  }, [clientId, currentTheme]);

  const handleClick = () => {
    if (!siteUrl) return;
    const demoUrl = `/demo/client-website?client=${clientId}&website=${encodeURIComponent(siteUrl)}`;
    window.open(demoUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      disabled={!siteUrl}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: 'rgba(168,85,247,0.07)',
        border: '1px solid rgba(168,85,247,0.18)',
        color: '#c084fc',
        fontFamily: "'Outfit', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!siteUrl) return;
        e.currentTarget.style.background = 'rgba(168,85,247,0.12)';
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(168,85,247,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(168,85,247,0.07)';
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.18)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
        />
      </svg>
      Preview on Site
    </button>
  );
}

const STAGE_SUGGESTIONS: Record<string, string[]> = {
  input: [],
  analysis: ['Change colors', 'Different style'],
  design: ['I like this one', 'Show different options'],
  knowledge: ['Add more content', 'Skip knowledge base'],
  customize: ['Change colors', 'Connect Google Calendar', 'Change greeting message', 'Make it darker'],
  deploy: ['Test the widget', 'Connect CRM', 'Change colors'],
  integrations: ['Test CRM integration', 'Add another CRM'],
};

export default function BuilderPage() {
  const stream = useBuilderStream();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const hasPaidPlan = user && user.plan !== 'none'; // 'free' plan also has access
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!authLoading && user && !hasPaidPlan) {
      router.push('/plans');
    }
  }, [authLoading, user, hasPaidPlan, router]);

  useEffect(() => {
    fetch('/api/builder/sessions', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSessions(d.data);
      })
      .catch(() => {});
  }, []);

  // Restore session from URL query param (?session=ID or ?client=CLIENT_ID)
  // Without params, show empty state (TemplateSelector) so user can choose
  useEffect(() => {
    if (restoredRef.current) return;

    const sessionId = searchParams.get('session');
    if (sessionId) {
      restoredRef.current = true;
      stream.restoreSession(sessionId);
      return;
    }

    const clientParam = searchParams.get('client');
    if (clientParam) {
      restoredRef.current = true;
      fetch('/api/builder/sessions', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            const match = d.data.find((s: SessionSummary) => s.clientId === clientParam);
            if (match) {
              stream.restoreSession(match._id);
            }
          }
        })
        .catch(() => {});
      return;
    }

    // No URL params — show empty state, don't auto-restore
    restoredRef.current = true;
  }, [searchParams, stream]);

  // Keep URL in sync with active session so reload preserves it
  useEffect(() => {
    if (stream.sessionId && !searchParams.get('session')) {
      const url = new URL(window.location.href);
      url.searchParams.set('session', stream.sessionId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [stream.sessionId, searchParams]);

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
    // Clear session from URL so auto-restore doesn't bring back the old session
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    url.searchParams.delete('client');
    window.history.replaceState({}, '', url.toString());
  }, [stream, hasPaidPlan, router]);

  const isEmptyState = stream.stage === 'input' && stream.messages.length === 0;

  return (
    <div className="bg-bg-primary flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-hidden">
      {/* Font loader */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {!isEmptyState && <ProgressPipeline currentStage={stream.stage} />}

      <div className="flex flex-1 overflow-hidden">
        {isEmptyState ? (
          <div className="bg-bg-primary flex-1">
            <TemplateSelector
              onSubmitUrl={handleUrlSubmit}
              sessions={sessions}
              onSelectSession={loadSession}
              onNewSession={startNewSession}
            />
          </div>
        ) : (
          <>
            {/* Chat area - takes full width (widget is injected directly on page) */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Action bar — shows when widget is built or deployed */}
              {stream.widgetClientId && (
                <div className="border-border bg-bg-secondary/30 flex items-center justify-center gap-3 border-b px-5 py-3">
                  {/* Preview on Site button */}
                  <PreviewOnSiteButton clientId={stream.widgetClientId} currentTheme={stream.currentTheme} />

                  {/* Install on Site button */}
                  <Link
                    href={`/dashboard/widgets/${stream.widgetClientId}/install`}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300"
                    style={{
                      background: 'rgba(16,185,129,0.07)',
                      border: '1px solid rgba(16,185,129,0.18)',
                      color: '#34d399',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(16,185,129,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(16,185,129,0.07)';
                      e.currentTarget.style.borderColor = 'rgba(16,185,129,0.18)';
                    }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                      />
                    </svg>
                    Install on Site
                  </Link>

                  {stream.stage === 'deploy' && stream.sessionId && (
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
                  )}
                </div>
              )}
              <BuilderChat
                messages={stream.messages}
                isStreaming={stream.isStreaming}
                error={stream.error}
                knowledgeProgress={stream.knowledgeProgress}
                onSendMessage={(msg) => stream.sendMessage(msg)}
                onSendMessageWithFile={(msg, fileCtx) => stream.sendMessageWithFile(msg, fileCtx)}
                suggestions={STAGE_SUGGESTIONS[stream.stage]}
                proactiveSuggestions={stream.suggestions}
              />
            </div>

            {/* Right panel — only for AB compare, integrations, etc. (NOT for live preview) */}
            {stream.panelMode !== 'empty' && stream.panelMode !== 'live_preview' && (
              <ContextPanel
                mode={stream.panelMode}
                clientId={stream.widgetClientId || stream.sessionId}
                currentTheme={stream.currentTheme}
                abVariants={stream.abVariants}
                connectedIntegrations={[]}
                onSelectVariant={handleVariantSelect}
              />
            )}

            {/* Inject widget script directly into the page */}
            <WidgetInjector clientId={stream.widgetClientId} version={stream.widgetVersion} />
          </>
        )}
      </div>
    </div>
  );
}
