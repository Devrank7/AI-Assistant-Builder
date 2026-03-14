'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);

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
    stream.resetSession();
    setShowSessions(false);
  }, [stream]);

  const isEmptyState = stream.stage === 'input' && stream.messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50">
      {!isEmptyState && <ProgressPipeline currentStage={stream.stage} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Sessions Sidebar */}
        <div
          className={`${showSessions ? 'block' : 'hidden'} w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:block`}
        >
          <div className="border-b border-gray-200 p-4">
            <button
              onClick={startNewSession}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              + New Widget
            </button>
          </div>
          <div className="p-2">
            {sessions.map((s) => (
              <button
                key={s._id}
                onClick={() => loadSession(s._id)}
                className={`w-full rounded-lg p-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                  stream.sessionId === s._id ? 'border border-blue-200 bg-blue-50' : ''
                }`}
              >
                <p className="truncate font-medium text-gray-800">{s.widgetName || 'Untitled'}</p>
                <p className="mt-1 text-xs text-gray-400">{new Date(s.updatedAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1">
          {isEmptyState ? (
            <div className="flex-1">
              <TemplateSelector onSubmitUrl={handleUrlSubmit} onSelectTemplate={handleTemplateSelect} />
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col">
                <BuilderChat
                  messages={stream.messages}
                  isStreaming={stream.isStreaming}
                  error={stream.error}
                  knowledgeProgress={stream.knowledgeProgress}
                  onSendMessage={(msg) => stream.sendMessage(msg)}
                  suggestions={STAGE_SUGGESTIONS[stream.stage]}
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

      <button
        onClick={() => setShowSessions(!showSessions)}
        className="fixed bottom-4 left-4 rounded-full border border-gray-200 bg-white p-3 shadow-lg md:hidden"
      >
        📋
      </button>
    </div>
  );
}
