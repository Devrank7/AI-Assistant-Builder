'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Card, Button, Badge, Table, TableCell } from '@/components/ui';
import { MessageSquare, ExternalLink, Settings, Trash2, Plus } from 'lucide-react';

interface Widget {
  clientId: string;
  widgetName: string;
  clientType: string;
  createdAt: string;
}

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', width: '120px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'created', label: 'Created', width: '140px' },
  { key: 'actions', label: 'Actions', width: '140px', align: 'right' as const },
];

export default function MyWidgetsPage() {
  const { user } = useAuth();
  const hasPlan = user?.plan && user.plan !== 'none';
  const builderHref = hasPlan ? '/dashboard/builder' : '/plans';
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWidgets = async () => {
    try {
      const res = await fetch('/api/user/widgets');
      const data = await res.json();
      if (data.success && data.data) {
        setWidgets(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this widget? This action cannot be undone.')) {
      return;
    }
    setDeletingId(clientId);
    try {
      const res = await fetch('/api/user/widgets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (data.success) {
        setWidgets((prev) => prev.filter((w) => w.clientId !== clientId));
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-text-primary">My Widgets</h1>
        </div>
        <Card padding="sm">
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-0 animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-1/4" />
                <div className="h-4 bg-bg-tertiary rounded w-16" />
                <div className="h-4 bg-bg-tertiary rounded w-16" />
                <div className="h-4 bg-bg-tertiary rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-tertiary">
        <MessageSquare className="h-6 w-6 text-text-tertiary" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-text-primary">No widgets yet</h3>
      <p className="mb-6 max-w-xs text-sm text-text-secondary">
        Create your first AI widget to get started.
      </p>
      <Link href={builderHref}>
        <Button size="md">
          <Plus className="h-4 w-4" />
          Create Your First Widget
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-text-primary">My Widgets</h1>
        <Link href={builderHref}>
          <Button size="md" className="shrink-0">
            <Plus className="h-4 w-4" />
            New Widget
          </Button>
        </Link>
      </div>

      <Card padding="sm">
        <Table<Widget>
          columns={columns}
          data={widgets}
          emptyState={emptyState}
          renderRow={(widget) => (
            <>
              <TableCell>
                <div>
                  <span className="font-medium text-text-primary">{widget.widgetName}</span>
                  <span className="block text-xs text-text-tertiary font-mono mt-0.5">{widget.clientId}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={widget.clientType === 'quick' ? 'amber' : 'blue'}>
                  {widget.clientType === 'quick' ? 'Quick' : 'Production'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="green">Active</Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">
                  {new Date(widget.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell align="right">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={`/demo/client-website?client=${widget.clientId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href={`/dashboard/playground/${widget.clientId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    disabled={deletingId === widget.clientId}
                    onClick={(e) => { e.stopPropagation(); handleDelete(widget.clientId); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </>
          )}
        />
      </Card>
    </div>
  );
}
