'use client';

import { useState, useEffect, useCallback } from 'react';

interface ABVariant {
  id: string;
  label: string;
  config: Record<string, unknown>;
  visitors: number;
  conversions: number;
}

interface ABTestItem {
  _id: string;
  name: string;
  clientId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  winnerVariantId: string | null;
  createdAt: string;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch('/api/ab-tests');
      const json = await res.json();
      if (json.success) setTests(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const updateStatus = async (testId: string, status: string) => {
    await fetch(`/api/ab-tests`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, status }),
    });
    fetchTests();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/15 text-gray-400',
      running: 'bg-green-500/15 text-green-400',
      paused: 'bg-yellow-500/15 text-yellow-400',
      completed: 'bg-blue-500/15 text-blue-400',
    };
    return colors[status] || 'bg-gray-500/15 text-gray-400';
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-white">A/B Tests</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">A/B Tests</h1>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-12 text-center">
          <h2 className="mb-2 text-lg font-semibold text-white">No A/B tests yet</h2>
          <p className="text-gray-500">
            A/B tests can be created from the widget builder to test different greetings, themes, or prompts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const totalVisitors = test.variants.reduce((s, v) => s + v.visitors, 0);
            return (
              <div key={test._id} className="rounded-xl border border-white/10 bg-[#12121a] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{test.name}</h3>
                    <p className="text-xs text-gray-500">
                      Widget: {test.clientId} &middot; {totalVisitors} visitors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(test.status)}`}
                    >
                      {test.status}
                    </span>
                    {test.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(test._id, 'running')}
                        className="rounded-lg bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 transition hover:bg-green-500/25"
                      >
                        Start
                      </button>
                    )}
                    {test.status === 'running' && (
                      <button
                        onClick={() => updateStatus(test._id, 'paused')}
                        className="rounded-lg bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-400 transition hover:bg-yellow-500/25"
                      >
                        Pause
                      </button>
                    )}
                    {test.status === 'paused' && (
                      <button
                        onClick={() => updateStatus(test._id, 'running')}
                        className="rounded-lg bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 transition hover:bg-green-500/25"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>

                {/* Variant Results */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {test.variants.map((v) => {
                    const rate = v.visitors > 0 ? ((v.conversions / v.visitors) * 100).toFixed(1) : '0.0';
                    const isWinner = test.winnerVariantId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="rounded-lg border p-3"
                        style={{
                          borderColor: isWinner ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
                          background: isWinner ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{v.label}</span>
                          {isWinner && <span className="text-xs font-medium text-green-400">Winner</span>}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{v.visitors} visitors</span>
                          <span>{v.conversions} conversions</span>
                          <span className="font-medium text-gray-300">{rate}% CVR</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
