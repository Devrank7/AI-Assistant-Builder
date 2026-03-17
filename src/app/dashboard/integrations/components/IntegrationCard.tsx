'use client';

import { PluginManifest } from '@/lib/integrations/core/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MotionItem } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface ConnectionInfo {
  _id: string;
  status: string;
  createdAt: string;
  lastError?: string;
}

interface IntegrationCardProps {
  manifest: PluginManifest;
  connection?: ConnectionInfo;
  onConnect: () => void;
  onDisconnect: () => void;
  onFix: () => void;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  crm: '#3B82F6',
  calendar: '#8B5CF6',
  payment: '#10B981',
  notification: '#F59E0B',
  data: '#06B6D4',
};

const CATEGORY_BADGE_VARIANT: Record<string, 'blue' | 'purple' | 'green' | 'amber'> = {
  crm: 'blue',
  calendar: 'purple',
  payment: 'green',
  notification: 'amber',
  data: 'blue',
};

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  calendar: 'Calendar',
  payment: 'Payment',
  notification: 'Notification',
  data: 'Data',
};

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

type CardState = 'available' | 'connected' | 'error' | 'coming_soon';

function getCardState(manifest: PluginManifest, connection?: ConnectionInfo): CardState {
  if (manifest.status === 'coming_soon') return 'coming_soon';
  if (!connection) return 'available';
  if (connection.status === 'error' || connection.lastError) return 'error';
  return 'connected';
}

export function IntegrationCard({ manifest, connection, onConnect, onDisconnect, onFix }: IntegrationCardProps) {
  const state = getCardState(manifest, connection);
  const accentColor = CATEGORY_GRADIENTS[manifest.category] || '#3B82F6';
  const isComingSoon = state === 'coming_soon';

  return (
    <MotionItem>
      <Card
        padding="sm"
        className={cn('relative flex flex-col overflow-hidden', isComingSoon && 'opacity-60 grayscale')}
      >
        {/* Gradient accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }}
        />

        <div className="flex flex-col gap-3 px-2 pt-3 pb-2">
          {/* Header: Icon + Name + Category */}
          <div className="flex items-start gap-3">
            {/* Provider icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor: `${manifest.color}33`,
                color: manifest.color,
              }}
            >
              {manifest.name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-text-primary truncate text-sm font-semibold">{manifest.name}</h3>
                <Badge variant={CATEGORY_BADGE_VARIANT[manifest.category] || 'blue'}>
                  {CATEGORY_LABELS[manifest.category] || manifest.category}
                </Badge>
              </div>
              <p className="text-text-tertiary mt-0.5 line-clamp-2 text-xs">{manifest.description}</p>
            </div>
          </div>

          {/* Status-specific content */}
          {state === 'connected' && connection && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="green" className="gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Connected
                </Badge>
                <span className="text-text-tertiary text-[11px]">
                  Connected {getRelativeTime(connection.createdAt)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-500"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </div>
          )}

          {state === 'error' && connection && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="red">Error</Badge>
              </div>
              {connection.lastError && <p className="line-clamp-2 text-xs text-red-400">{connection.lastError}</p>}
              <Button
                variant="secondary"
                size="sm"
                className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                onClick={onFix}
              >
                Fix Connection
              </Button>
            </div>
          )}

          {state === 'available' && (
            <Button variant="primary" size="sm" className="w-full" onClick={onConnect}>
              Connect
            </Button>
          )}

          {state === 'coming_soon' && (
            <Badge variant="default" className="self-start">
              Coming Soon
            </Badge>
          )}
        </div>
      </Card>
    </MotionItem>
  );
}
