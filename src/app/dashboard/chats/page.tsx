'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Badge, Button, StatsCard, EmptyState } from '@/components/ui';
import { MessageSquare, Plus, Rocket, Clock, Search, Paintbrush, CheckCircle2, ChevronRight } from 'lucide-react';

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
      return <CheckCircle2 className="h-4 w-4" />;
    case 'design':
      return <Paintbrush className="h-4 w-4" />;
    case 'analysis':
      return <Search className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'deploy':
      return 'Deployed';
    case 'design':
      return 'Design phase';
    case 'analysis':
      return 'Analyzing';
    case 'knowledge':
      return 'Knowledge base';
    case 'input':
      return 'Getting started';
    default:
      return stage;
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

  const handleOpenChat = useCallback(
    (id: string) => {
      router.push(`/dashboard/builder?session=${id}`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-text-primary text-2xl font-bold">My Chats</h1>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-border bg-bg-secondary animate-pulse rounded-xl border p-5">
              <div className="bg-bg-tertiary mb-2 h-4 w-1/2 rounded" />
              <div className="bg-bg-tertiary h-8 w-1/3 rounded" />
            </div>
          ))}
        </div>
        <Card>
          <div className="divide-border space-y-0 divide-y">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="bg-bg-tertiary h-9 w-9 rounded-lg" />
                  <div className="flex-1">
                    <div className="bg-bg-tertiary mb-2 h-4 w-2/3 rounded" />
                    <div className="bg-bg-tertiary h-3 w-1/3 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">My Chats</h1>
          <p className="text-text-tertiary mt-1 text-sm">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/builder">
          <Button size="md" className="shrink-0">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="Total Chats" value={sessions.length} icon="💬" gradient="blue" />
        <StatsCard label="Deployed" value={deployedCount} icon="🚀" gradient="emerald" />
        <StatsCard label="In Progress" value={inProgressCount} icon="🔧" gradient="amber" />
      </div>

      {/* Filter tabs */}
      {sessions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            { key: 'all' as const, label: 'All', count: sessions.length },
            { key: 'deployed' as const, label: 'Deployed', count: deployedCount },
            { key: 'in_progress' as const, label: 'In Progress', count: inProgressCount },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              <Badge variant={filter === tab.key ? 'blue' : 'default'} className="ml-1.5">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Chat list */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={filter !== 'all' ? 'No chats in this category' : 'No chats yet'}
            description="Start a conversation with the AI Builder to create your first widget."
            action={
              <Link href="/dashboard/builder">
                <Button>Start Building</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padding="sm" className="overflow-hidden">
          <div className="divide-border divide-y">
            {filtered.map((session) => {
              const timeAgo = getTimeAgo(session.updatedAt);
              const isDeployed = session.status === 'deployed';
              const statusLabel = isDeployed ? 'Deployed' : session.status === 'building' ? 'Building' : 'In Progress';
              const statusVariant: 'green' | 'amber' | 'default' = isDeployed
                ? 'green'
                : session.status === 'building'
                  ? 'amber'
                  : 'default';
              const stageLabel = getStageLabel(session.currentStage);

              return (
                <button
                  key={session._id}
                  onClick={() => handleOpenChat(session._id)}
                  className="group hover:bg-bg-tertiary flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors"
                >
                  {/* Stage icon */}
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      isDeployed
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                        : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {getStageIcon(session.currentStage)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary truncate text-sm font-medium">
                        {session.widgetName || session.preview || 'Untitled Chat'}
                      </span>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                    </div>

                    {session.preview && session.widgetName && (
                      <p className="text-text-tertiary mt-0.5 truncate text-xs">{session.preview}</p>
                    )}

                    <div className="text-text-tertiary mt-1 flex items-center gap-3 text-xs">
                      <span>{stageLabel}</span>
                      <span className="text-border">|</span>
                      <span>{session.messageCount} messages</span>
                      <span className="text-border">|</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="text-text-tertiary group-hover:text-text-secondary h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
