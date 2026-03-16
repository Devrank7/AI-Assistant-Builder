'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface Widget {
  clientId: string;
  widgetName: string;
  clientType: string;
  createdAt: string;
}

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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">My Widgets</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#12121a] rounded-xl border border-white/10 p-5 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Widgets</h1>
        <Link
          href={builderHref}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Widget
        </Link>
      </div>

      {widgets.length === 0 ? (
        <div className="bg-[#12121a] rounded-xl border border-white/10 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No widgets yet</h3>
          <p className="text-gray-400 mb-6">Create your first AI widget to get started.</p>
          <Link
            href={builderHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Your First Widget
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((widget) => (
            <div
              key={widget.clientId}
              className="bg-[#12121a] rounded-xl border border-white/10 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-white truncate pr-2">
                  {widget.widgetName}
                </h3>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    widget.clientType === 'quick'
                      ? 'bg-yellow-500/15 text-yellow-400'
                      : 'bg-green-500/15 text-green-400'
                  }`}
                >
                  {widget.clientType === 'quick' ? 'Quick' : 'Production'}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-1">
                ID: <span className="font-mono text-gray-400">{widget.clientId}</span>
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Created: {new Date(widget.createdAt).toLocaleDateString()}
              </p>

              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
                <Link
                  href={`/demo/client-website?client=${widget.clientId}`}
                  className="flex-1 text-center px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  Preview
                </Link>
                <Link
                  href={`/dashboard/playground/${widget.clientId}`}
                  className="flex-1 rounded-lg px-3 py-1.5 text-center text-sm text-cyan-400 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
                >
                  Customize
                </Link>
                <button
                  onClick={() => handleDelete(widget.clientId)}
                  disabled={deletingId === widget.clientId}
                  className="flex-1 text-center px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === widget.clientId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
