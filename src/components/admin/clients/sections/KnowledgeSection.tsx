'use client';

import { useState, useEffect } from 'react';

interface KnowledgeSectionProps {
  clientId: string;
}

interface KnowledgeChunk {
  _id: string;
  title?: string;
  content: string;
}

export function KnowledgeSection({ clientId }: KnowledgeSectionProps) {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/knowledge?clientId=${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setChunks(json.data ?? json ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No knowledge chunks found</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--admin-text-muted)]">{chunks.length} chunks</p>
      {chunks.map((chunk) => (
        <div
          key={chunk._id}
          className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-4 py-3"
        >
          {chunk.title && <p className="mb-1 text-sm font-medium text-[var(--admin-text-primary)]">{chunk.title}</p>}
          <p className="line-clamp-2 text-xs text-[var(--admin-text-muted)]">{chunk.content}</p>
        </div>
      ))}
    </div>
  );
}
