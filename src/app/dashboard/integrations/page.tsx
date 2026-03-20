'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Syne } from 'next/font/google';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MotionList, MotionItem, AnimatedNumber, SkeletonCard } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import { Search, ShieldCheck, ExternalLink, Plug, AlertTriangle, Zap, Link2Off } from 'lucide-react';
import Link from 'next/link';
import type { PluginManifest } from '@/lib/integrations/core/types';
import { IntegrationCard } from './components/IntegrationCard';
import { ConnectionWizard } from './components/ConnectionWizard';
import { CategoryFilter } from './components/CategoryFilter';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

interface Connection {
  _id: string;
  provider: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  lastError?: string;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';

  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedManifest, setSelectedManifest] = useState<PluginManifest | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch catalog
  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setManifests(data);
      } else if (data.data && Array.isArray(data.data)) {
        setManifests(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/connections');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConnections(data);
      } else if (data.data && Array.isArray(data.data)) {
        setConnections(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingConnections(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
    if (isPro) {
      fetchConnections();
    } else {
      setLoadingConnections(false);
    }
  }, [isPro, fetchCatalog, fetchConnections]);

  // Match connections to manifests
  const getConnection = useCallback((slug: string) => connections.find((c) => c.provider === slug), [connections]);

  // Compute stats
  const connectedCount = connections.filter((c) => c.isActive && c.status !== 'error').length;
  const availableCount = manifests.filter((m) => m.status === 'active').length;
  const errorCount = connections.filter((c) => c.status === 'error' || c.lastError).length;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: manifests.length };
    for (const m of manifests) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    return counts;
  }, [manifests]);

  // Filter and sort manifests
  const filteredManifests = useMemo(() => {
    let filtered = manifests;

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter((m) => m.category === category);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }

    // Sort: connected first, then available, then coming_soon
    return filtered.sort((a, b) => {
      const connA = getConnection(a.slug);
      const connB = getConnection(b.slug);
      const stateOrder = (m: PluginManifest, conn?: Connection) => {
        if (m.status === 'coming_soon') return 3;
        if (conn && (conn.status === 'error' || conn.lastError)) return 1;
        if (conn && conn.isActive) return 0;
        return 2;
      };
      return stateOrder(a, connA) - stateOrder(b, connB);
    });
  }, [manifests, category, search, getConnection]);

  const loading = loadingCatalog || loadingConnections;

  // Handlers
  const handleConnect = (manifest: PluginManifest) => {
    setSelectedManifest(manifest);
    setWizardOpen(true);
  };

  const handleFix = (manifest: PluginManifest) => {
    setSelectedManifest(manifest);
    setWizardOpen(true);
  };

  const handleDisconnect = async (manifest: PluginManifest) => {
    const conn = getConnection(manifest.slug);
    if (!conn) return;
    try {
      await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn._id }),
      });
      fetchConnections();
    } catch {
      // silently fail
    }
  };

  const handleConnected = () => {
    fetchConnections();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={cn(syne.className, 'text-text-primary text-2xl font-bold')}>Integrations Marketplace</h1>
          <p className="text-text-secondary mt-1 text-sm">Connect your favorite tools to power your widgets</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="text-text-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Pro plan required banner */}
      {!isPro && (
        <Card padding="lg">
          <div className="mb-2 flex items-center gap-3">
            <ShieldCheck className="text-accent h-5 w-5" />
            <h3 className="text-text-primary text-base font-semibold">Pro Plan Required</h3>
          </div>
          <p className="text-text-secondary text-sm">
            Integrations are available on the Pro plan. Upgrade to connect your favorite tools and automatically sync
            data from your AI widget conversations.
          </p>
          <a href="/dashboard/billing">
            <Button variant="primary" size="md" className="mt-4">
              Upgrade to Pro
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </Card>
      )}

      {/* Stat cards */}
      {isPro && !loading && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Connected */}
          <motion.div variants={staggerItem}>
            <Card padding="md" className="relative overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #10B981, #10B98180)' }}
              />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Plug className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-text-tertiary text-xs font-medium">Connected</p>
                  <AnimatedNumber value={connectedCount} className="text-text-primary text-xl font-bold" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Available */}
          <motion.div variants={staggerItem}>
            <Card padding="md" className="relative overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #3B82F6, #3B82F680)' }}
              />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-text-tertiary text-xs font-medium">Available</p>
                  <AnimatedNumber value={availableCount} className="text-text-primary text-xl font-bold" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Errors (only if > 0) */}
          {errorCount > 0 && (
            <motion.div variants={staggerItem}>
              <Card padding="md" className="relative overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, #EF4444, #EF444480)' }}
                />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-text-tertiary text-xs font-medium">Errors</p>
                    <AnimatedNumber value={errorCount} className="text-text-primary text-xl font-bold" />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Category filter */}
      {!loading && manifests.length > 0 && (
        <CategoryFilter active={category} onChange={setCategory} counts={categoryCounts} />
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      )}

      {/* Card grid */}
      {!loading && filteredManifests.length > 0 && (
        <MotionList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredManifests.map((manifest) => {
            const conn = getConnection(manifest.slug);
            return (
              <IntegrationCard
                key={manifest.slug}
                manifest={manifest}
                connection={
                  conn
                    ? {
                        _id: conn._id,
                        status: conn.status,
                        createdAt: conn.createdAt,
                        lastError: conn.lastError,
                      }
                    : undefined
                }
                onConnect={() => handleConnect(manifest)}
                onDisconnect={() => handleDisconnect(manifest)}
                onFix={() => handleFix(manifest)}
              />
            );
          })}
        </MotionList>
      )}

      {/* Empty connections state — Pro user, catalog loaded, no connections yet */}
      {!loading && isPro && manifests.length > 0 && connections.length === 0 && filteredManifests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Plug className="text-text-tertiary h-8 w-8" />
          </div>
          <h3 className="text-text-primary mb-1.5 text-base font-semibold">No integrations connected</h3>
          <p className="text-text-secondary mb-6 max-w-sm text-sm">
            Connect your favorite tools to automate workflows and sync data from your AI widget conversations.
          </p>
        </motion.div>
      )}

      {/* Empty search state */}
      {!loading && filteredManifests.length === 0 && manifests.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="text-text-tertiary mb-3 h-10 w-10" />
          <h3 className="text-text-primary text-base font-semibold">No integrations found</h3>
          <p className="text-text-secondary mt-1 text-sm">
            {search ? `No results for "${search}"` : 'No integrations in this category'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setSearch('');
              setCategory('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Connection wizard */}
      <ConnectionWizard
        open={wizardOpen}
        manifest={selectedManifest}
        onClose={() => {
          setWizardOpen(false);
          setSelectedManifest(null);
        }}
        onConnected={handleConnected}
      />
    </div>
  );
}
