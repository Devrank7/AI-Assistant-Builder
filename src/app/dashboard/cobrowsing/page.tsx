'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Eye,
  Clock,
  Users,
  Loader2,
  Trash2,
  Play,
  Pause,
  StopCircle,
  Highlighter,
  Timer,
  Plus,
  X,
  User,
  Globe,
} from 'lucide-react';

interface Highlight {
  selector: string;
  label: string;
  color: string;
  timestamp: string;
}

interface CoBrowsingSession {
  _id: string;
  sessionId: string;
  clientId: string;
  visitorId: string;
  agentUserId: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  pageUrl: string;
  pageTitle: string;
  highlights: Highlight[];
  scrollPosition: { x: number; y: number };
  startedAt: string;
  endedAt?: string;
}

export default function CoBrowsingPage() {
  const [sessions, setSessions] = useState<CoBrowsingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<CoBrowsingSession | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ clientId: '', visitorId: '' });
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/cobrowsing');
      const json = await res.json();
      if (json.success) {
        setSessions(json.data || []);
      } else {
        setError(json.error || 'Failed to load sessions');
      }
    } catch (err) {
      setError('Failed to fetch co-browsing sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const createSession = async () => {
    if (!createForm.clientId || !createForm.visitorId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/cobrowsing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setCreateForm({ clientId: '', visitorId: '' });
        fetchSessions();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await fetch(`/api/cobrowsing/${sessionId}`, { method: 'DELETE' });
      if (selectedSession?.sessionId === sessionId) setSelectedSession(null);
      fetchSessions();
    } catch {
      // ignore
    }
  };

  const getDuration = (start: string, end?: string) => {
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = endTime - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'paused');
  const totalSessions = sessions.length;
  const avgDuration =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => {
            const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
            return sum + (end - new Date(s.startedAt).getTime());
          }, 0) /
            sessions.length /
            60000
        )
      : 0;

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'ended':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      case 'ended':
        return <StopCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/20 p-2.5">
            <Monitor className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Co-Browsing</h1>
            <p className="text-sm text-gray-400">Browse alongside your visitors in real-time</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Active Sessions',
            value: activeSessions.length,
            icon: Eye,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          { label: 'Total Sessions', value: totalSessions, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          {
            label: 'Avg Duration',
            value: `${avgDuration}m`,
            icon: Timer,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-sm text-gray-400">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Create Session Modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Start New Co-Browsing Session</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Client ID</label>
              <input
                type="text"
                placeholder="Enter client ID"
                value={createForm.clientId}
                onChange={(e) => setCreateForm({ ...createForm, clientId: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Visitor ID</label>
              <input
                type="text"
                placeholder="Enter visitor ID"
                value={createForm.visitorId}
                onChange={(e) => setCreateForm({ ...createForm, visitorId: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createSession}
              disabled={creating || !createForm.clientId || !createForm.visitorId}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Session
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl bg-white/[0.05] px-4 py-2 text-gray-300 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading co-browsing sessions...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <p>{error}</p>
          <button onClick={fetchSessions} className="mt-3 text-sm text-blue-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Sessions List */}
      {!loading && !error && (
        <>
          {sessions.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-gray-400">
              <Eye className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No co-browsing sessions yet</p>
              <p className="mt-1 text-sm">Start a new session to browse alongside your visitors</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`cursor-pointer rounded-2xl border bg-white/[0.03] p-5 backdrop-blur transition-all hover:bg-white/[0.05] ${
                    selectedSession?.sessionId === session.sessionId
                      ? 'border-blue-500/40 ring-1 ring-blue-500/20'
                      : 'border-white/[0.06]'
                  }`}
                  onClick={() => setSelectedSession(selectedSession?.sessionId === session.sessionId ? null : session)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-white">{session.visitorId}</span>
                      </div>
                      <span
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(session.status)}`}
                      >
                        {statusIcon(session.status)}
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(session.startedAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5" />
                          <span>{getDuration(session.startedAt, session.endedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Highlighter className="h-3.5 w-3.5" />
                          <span>{session.highlights?.length || 0}</span>
                        </div>
                      </div>
                      {session.status !== 'ended' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            endSession(session.sessionId);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          End
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedSession?.sessionId === session.sessionId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-3 border-t border-white/[0.06] pt-4"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        <div>
                          <span className="text-xs text-gray-400">Client ID</span>
                          <p className="mt-0.5 font-mono text-xs text-white">{session.clientId}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Session ID</span>
                          <p className="mt-0.5 font-mono text-xs text-white">{session.sessionId}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Page</span>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-white">
                            <Globe className="h-3 w-3 flex-shrink-0 text-gray-500" />
                            {session.pageUrl || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400">Started</span>
                          <p className="mt-0.5 text-xs text-white">{new Date(session.startedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {session.highlights && session.highlights.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-400">Highlights</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {session.highlights.map((h, i) => (
                              <span
                                key={i}
                                className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-2 py-1 text-xs text-gray-300"
                              >
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: h.color }} />
                                {h.label || h.selector}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
