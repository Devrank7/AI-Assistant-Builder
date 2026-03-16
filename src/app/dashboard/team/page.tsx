'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Member {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/15 text-purple-400',
  admin: 'bg-blue-500/15 text-blue-400',
  editor: 'bg-cyan-500/15 text-cyan-400',
  viewer: 'bg-gray-500/15 text-gray-400',
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Team</h1>

      {/* Invite Form */}
      {canManage && (
        <div className="rounded-xl border border-white/10 bg-[#12121a] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Invite Member</h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/30 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Members List */}
      <div className="rounded-xl border border-white/10 bg-[#12121a]">
        {loading ? (
          <div className="space-y-3 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No team members yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_COLORS[m.role]}`}>
                    {m.role}
                  </span>
                  {canManage && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      className="text-xs text-red-400/60 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
