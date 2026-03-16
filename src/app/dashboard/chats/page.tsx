'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ChatSession {
  _id: string;
  widgetName: string | null;
  status: string;
  clientId: string | null;
  currentStage: string;
  updatedAt: string;
  messageCount: number;
  preview: string | null;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStageIcon(stage: string) {
  switch (stage) {
    case 'deploy':
    case 'workspace':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'design':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
          />
        </svg>
      );
    case 'analysis':
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      );
  }
}

export default function MyChatsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deployed' | 'in_progress'>('all');

  useEffect(() => {
    fetch('/api/builder/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSessions(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter === 'deployed') return s.status === 'deployed';
    if (filter === 'in_progress') return s.status !== 'deployed';
    return true;
  });

  const deployedCount = sessions.filter((s) => s.status === 'deployed').length;
  const inProgressCount = sessions.filter((s) => s.status !== 'deployed').length;

  const handleOpenChat = (id: string) => {
    // Navigate to builder with session ID as query param
    router.push(`/dashboard/builder?session=${id}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">My Chats</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-[#12121a] p-5">
              <div className="mb-3 h-5 w-2/3 rounded bg-white/10" />
              <div className="mb-2 h-4 w-1/3 rounded bg-white/10" />
              <div className="h-3 w-1/4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Chats</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/builder"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Chat
        </Link>
      </div>

      {/* Filter tabs */}
      {sessions.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          {[
            { key: 'all' as const, label: 'All', count: sessions.length },
            { key: 'deployed' as const, label: 'Deployed', count: deployedCount },
            { key: 'in_progress' as const, label: 'In Progress', count: inProgressCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === tab.key
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  filter === tab.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Chat list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-12 text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          <h3 className="mb-2 text-lg font-semibold text-white">
            {filter !== 'all' ? 'No chats in this category' : 'No chats yet'}
          </h3>
          <p className="mb-6 text-gray-400">Start a conversation with the AI Builder to create your first widget.</p>
          <Link
            href="/dashboard/builder"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500"
          >
            Start Building
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const timeAgo = getTimeAgo(session.updatedAt);
            const isDeployed = session.status === 'deployed';
            const statusColor = isDeployed ? '#34d399' : session.status === 'building' ? '#fbbf24' : '#67e8f9';
            const statusLabel = isDeployed ? 'Deployed' : session.status === 'building' ? 'Building' : 'In Progress';
            const stageLabel =
              session.currentStage === 'deploy'
                ? 'Deployed'
                : session.currentStage === 'design'
                  ? 'Design phase'
                  : session.currentStage === 'analysis'
                    ? 'Analyzing'
                    : session.currentStage === 'knowledge'
                      ? 'Knowledge base'
                      : session.currentStage === 'input'
                        ? 'Getting started'
                        : session.currentStage;

            return (
              <button
                key={session._id}
                onClick={() => handleOpenChat(session._id)}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.04] bg-[#12121a] p-5 text-left transition-all duration-200 hover:border-cyan-500/20 hover:bg-[#14141e] hover:shadow-lg hover:shadow-cyan-500/[0.03]"
              >
                {/* Stage icon */}
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{
                    background: isDeployed ? 'rgba(52,211,153,0.08)' : 'rgba(6,182,212,0.08)',
                    color: isDeployed ? '#34d399' : '#22d3ee',
                    border: `1px solid ${isDeployed ? 'rgba(52,211,153,0.15)' : 'rgba(6,182,212,0.15)'}`,
                  }}
                >
                  {getStageIcon(session.currentStage)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate text-sm font-medium text-white/90">
                      {session.widgetName || session.preview || 'Untitled Chat'}
                    </span>
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `${statusColor}15`,
                        color: statusColor,
                        border: `1px solid ${statusColor}30`,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {session.preview && session.widgetName && (
                    <p className="mt-1 truncate text-xs text-gray-500">{session.preview}</p>
                  )}

                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-600">
                    <span>{stageLabel}</span>
                    <span className="text-gray-700">|</span>
                    <span>{session.messageCount} messages</span>
                    <span className="text-gray-700">|</span>
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="h-5 w-5 flex-shrink-0 text-gray-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-cyan-500/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
