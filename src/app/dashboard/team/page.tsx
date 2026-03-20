'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Avatar, Modal, Input } from '@/components/ui';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Crown,
  Eye,
  Pencil,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

interface Member {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

interface AuditLogEntry {
  _id: string;
  actor: string;
  actorType: 'admin' | 'client' | 'system';
  action: string;
  targetId?: string;
  details: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

const ROLE_BADGE_VARIANT: Record<string, 'purple' | 'blue' | 'default' | 'default'> = {
  owner: 'purple',
  admin: 'blue',
  editor: 'default',
  viewer: 'default',
};

const ROLE_ICON: Record<string, typeof Shield> = {
  owner: Crown,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
};

const ACTION_COLORS: Record<string, string> = {
  'client.create': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'client.update': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'client.delete': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'client.suspend': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'client.activate': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'settings.update': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'knowledge.upload': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'knowledge.delete': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'webhook.create': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'webhook.delete': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'payment.setup': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'payment.cancel': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'invoice.create': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'export.data': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'model.change': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'admin.login': 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function buildDescription(log: AuditLogEntry): string {
  const details = log.details as Record<string, string>;
  switch (log.action) {
    case 'client.create':
      return `Created client${details.name ? ` "${details.name}"` : ''}`;
    case 'client.update':
      return `Updated client${details.name ? ` "${details.name}"` : ''}`;
    case 'client.delete':
      return `Deleted client${details.name ? ` "${details.name}"` : ''}`;
    case 'client.suspend':
      return `Suspended client${details.name ? ` "${details.name}"` : ''}`;
    case 'client.activate':
      return `Activated client${details.name ? ` "${details.name}"` : ''}`;
    case 'settings.update':
      return 'Updated organization settings';
    case 'knowledge.upload':
      return `Uploaded knowledge${details.filename ? ` "${details.filename}"` : ''}`;
    case 'knowledge.delete':
      return 'Deleted knowledge entry';
    case 'webhook.create':
      return `Created webhook${details.url ? ` for ${details.url}` : ''}`;
    case 'webhook.delete':
      return 'Deleted webhook';
    case 'payment.setup':
      return 'Set up payment method';
    case 'payment.cancel':
      return 'Cancelled payment';
    case 'invoice.create':
      return `Created invoice${details.amount ? ` for ${details.amount}` : ''}`;
    case 'export.data':
      return 'Exported organization data';
    case 'model.change':
      return `Changed AI model${details.model ? ` to ${details.model}` : ''}`;
    case 'admin.login':
      return 'Admin logged in';
    default:
      return log.action.replace('.', ' ');
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/audit-log?page=${p}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs || []);
        setTotalPages(json.data.pages || 1);
        setTotal(json.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  if (loading) {
    return (
      <Card padding="sm" className="overflow-hidden">
        <div className="divide-border space-y-0 divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-4">
              <div className="bg-bg-tertiary mt-0.5 h-7 w-7 animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="bg-bg-tertiary h-3.5 w-1/3 animate-pulse rounded" />
                <div className="bg-bg-tertiary h-3 w-2/3 animate-pulse rounded" />
              </div>
              <div className="bg-bg-tertiary h-5 w-20 animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card padding="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Activity className="text-text-tertiary h-8 w-8" />
          </div>
          <h3 className="text-text-primary mb-1.5 text-base font-semibold">No activity yet</h3>
          <p className="text-text-secondary max-w-sm text-sm">Actions taken by team members will appear here</p>
        </motion.div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="sm" className="overflow-hidden">
        <motion.div
          key={page}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="divide-border divide-y"
        >
          {logs.map((log) => (
            <motion.div
              key={log._id}
              variants={itemVariants}
              className="hover:bg-bg-tertiary/50 flex items-start gap-3 px-3 py-3.5 transition-colors"
            >
              {/* Timeline dot */}
              <div className="bg-bg-tertiary mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <Clock className="text-text-tertiary h-3.5 w-3.5" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-text-primary text-sm font-medium">{log.actor}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getActionColor(log.action)}`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-text-secondary mt-0.5 text-xs">{buildDescription(log)}</p>
              </div>

              {/* Timestamp */}
              <span className="text-text-tertiary mt-1 shrink-0 text-xs">{formatRelativeTime(log.createdAt)}</span>
            </motion.div>
          ))}
        </motion.div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-text-tertiary text-xs">
            {total} {total === 1 ? 'event' : 'events'} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-text-secondary text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const canManage = user?.orgRole === 'owner' || user?.orgRole === 'admin';

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/org/members');
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    try {
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteEmail('');
        setInviteRole('editor');
        setInviteModalOpen(false);
        fetchMembers();
      } else {
        setError(json.error || 'Failed to invite');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    await fetch('/api/org/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchMembers();
  };

  const closeModal = () => {
    setInviteModalOpen(false);
    setInviteEmail('');
    setInviteRole('editor');
    setError('');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-bg-secondary flex h-9 w-9 items-center justify-center rounded-lg">
            <Users className="text-text-secondary h-4 w-4" />
          </div>
          <div>
            <h1 className="text-text-primary text-lg font-semibold">Team</h1>
            <p className="text-text-tertiary text-xs">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        {canManage && activeTab === 'members' && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'border-accent text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary border-transparent'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
            activeTab === 'activity'
              ? 'border-accent text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary border-transparent'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Activity Log
        </button>
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={closeModal}
        title="Invite team member"
        description="Send an invitation to join your organization."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              <Mail className="h-3.5 w-3.5" />
              {inviting ? 'Sending...' : 'Send invite'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            error={error || undefined}
          />
          <div className="space-y-1.5">
            <label className="text-text-secondary block text-xs font-medium">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="border-border text-text-primary focus:border-accent focus:ring-accent/10 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors focus:ring-2 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'members' ? (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* Members List */}
            <Card padding="sm" className="overflow-hidden">
              {loading ? (
                <div className="space-y-1 p-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-bg-tertiary h-14 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="bg-bg-tertiary mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                    <Users className="text-text-tertiary h-8 w-8" />
                  </div>
                  <h3 className="text-text-primary mb-1.5 text-base font-semibold">Just you for now</h3>
                  <p className="text-text-secondary mb-6 max-w-sm text-sm">
                    Invite team members to collaborate on your widgets
                  </p>
                  {canManage && (
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="bg-accent hover:bg-accent/90 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
                    >
                      Invite Team Member
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="divide-border divide-y">
                  {members.map((m) => {
                    const RoleIcon = ROLE_ICON[m.role] || Eye;
                    return (
                      <div
                        key={m.userId}
                        className="hover:bg-bg-tertiary/50 flex flex-col gap-2 px-3 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={m.name || m.email} size="md" />
                          <div className="min-w-0">
                            <p className="text-text-primary truncate text-sm font-medium">{m.name || m.email}</p>
                            {m.name && <p className="text-text-tertiary truncate text-xs">{m.email}</p>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                          <Badge variant={ROLE_BADGE_VARIANT[m.role] || 'default'}>
                            <RoleIcon className="mr-1 inline h-3 w-3" />
                            {m.role}
                          </Badge>
                          {canManage && m.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(m.userId)}
                              className="text-text-tertiary hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <AuditLogTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
