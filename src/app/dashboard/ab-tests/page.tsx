'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Table, TableCell } from '@/components/ui';
import { FlaskConical, Play, Pause, Trash2, Plus, Trophy, Users, Target } from 'lucide-react';

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

const statusBadgeVariant = (status: string) => {
  const map: Record<string, 'green' | 'amber' | 'default' | 'blue'> = {
    draft: 'default',
    running: 'green',
    paused: 'amber',
    completed: 'blue',
  };
  return map[status] || 'default';
};

const columns = [
  { key: 'name', label: 'Test Name' },
  { key: 'widget', label: 'Widget' },
  { key: 'variants', label: 'Variants', align: 'center' as const },
  { key: 'visitors', label: 'Visitors', align: 'right' as const },
  { key: 'status', label: 'Status', align: 'center' as const },
  { key: 'actions', label: '', align: 'right' as const, width: '140px' },
];

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const deleteTest = async (testId: string) => {
    await fetch(`/api/ab-tests`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId }),
    });
    fetchTests();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-text-primary text-2xl font-semibold">A/B Tests</h1>
        </div>
        <Card>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-bg-tertiary h-12 animate-pulse rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const emptyState = (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-bg-tertiary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <FlaskConical className="text-text-tertiary h-6 w-6" />
      </div>
      <h2 className="text-text-primary mb-1 text-lg font-semibold">No A/B tests yet</h2>
      <p className="text-text-tertiary mb-6 max-w-sm text-sm">
        A/B tests can be created from the widget builder to test different greetings, themes, or prompts.
      </p>
      <Button variant="primary" size="md">
        <Plus className="h-4 w-4" />
        Create Test
      </Button>
    </Card>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-semibold">A/B Tests</h1>
          <p className="text-text-tertiary mt-1 text-sm">Compare widget variants and measure conversion rates</p>
        </div>
        {tests.length > 0 && (
          <Button variant="primary" size="md" className="shrink-0">
            <Plus className="h-4 w-4" />
            Create Test
          </Button>
        )}
      </div>

      <Card padding="sm">
        <Table<ABTestItem>
          columns={columns}
          data={tests}
          emptyState={emptyState}
          onRowClick={(test) => setExpandedId(expandedId === test._id ? null : test._id)}
          renderRow={(test) => {
            const totalVisitors = test.variants.reduce((s, v) => s + v.visitors, 0);
            return (
              <>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <FlaskConical className="text-text-tertiary h-4 w-4 shrink-0" />
                    <span className="text-text-primary font-medium">{test.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-text-secondary text-sm">{test.clientId}</span>
                </TableCell>
                <TableCell align="center">
                  <span className="text-text-secondary text-sm">{test.variants.length}</span>
                </TableCell>
                <TableCell align="right">
                  <span className="text-text-secondary text-sm">{totalVisitors.toLocaleString()}</span>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={statusBadgeVariant(test.status)}>{test.status}</Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1">
                    {test.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(test._id, 'running');
                        }}
                        title="Start test"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {test.status === 'running' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(test._id, 'paused');
                        }}
                        title="Pause test"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {test.status === 'paused' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(test._id, 'running');
                        }}
                        title="Resume test"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTest(test._id);
                      }}
                      title="Delete test"
                      className="text-text-tertiary hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </>
            );
          }}
        />
      </Card>

      {/* Expanded variant comparison */}
      {expandedId &&
        (() => {
          const test = tests.find((t) => t._id === expandedId);
          if (!test) return null;
          return (
            <div className="space-y-3">
              <h3 className="text-text-secondary text-sm font-medium">Variant Comparison &mdash; {test.name}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {test.variants.map((v) => {
                  const rate = v.visitors > 0 ? ((v.conversions / v.visitors) * 100).toFixed(1) : '0.0';
                  const isWinner = test.winnerVariantId === v.id;
                  return (
                    <Card key={v.id} padding="md" className={isWinner ? 'border-emerald-500/30 bg-emerald-500/5' : ''}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-text-primary text-sm font-medium">{v.label}</span>
                        {isWinner && (
                          <Badge variant="green">
                            <Trophy className="mr-1 h-3 w-3" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <div className="text-text-tertiary flex items-center gap-4 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {v.visitors.toLocaleString()} visitors
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {v.conversions.toLocaleString()} conversions
                        </span>
                        <span className="text-text-primary ml-auto text-sm font-semibold">{rate}% CVR</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
