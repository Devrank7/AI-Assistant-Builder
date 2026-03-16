'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, Button, Badge, Avatar, Modal, Input } from '@/components/ui';
import { Users, UserPlus, Mail, Shield, Trash2, Crown, Eye, Pencil } from 'lucide-react';

interface Member {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
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

export default function TeamPage() {
  const { user } = useAuth();
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
        {canManage && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </Button>
        )}
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

      {/* Members List */}
      <Card padding="sm" className="overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-bg-tertiary h-14 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="text-text-tertiary h-8 w-8" />
            <p className="text-text-secondary text-sm">No team members yet</p>
            {canManage && (
              <Button size="sm" className="mt-2" onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Invite your first member
              </Button>
            )}
          </div>
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
    </div>
  );
}
