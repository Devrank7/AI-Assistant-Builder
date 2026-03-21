'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, Trash2, Loader2, Sparkles, User, X, Film, Zap, BarChart3 } from 'lucide-react';

interface VideoAvatar {
  _id: string;
  name: string;
  provider: 'heygen' | 'did' | 'custom';
  style: string;
  gender: string;
  status: 'active' | 'inactive' | 'processing';
  thumbnailUrl?: string;
  voiceId?: string;
  createdAt: string;
}

export default function VideoAvatarsPage() {
  const [avatars, setAvatars] = useState<VideoAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    provider: 'heygen' as 'heygen' | 'did' | 'custom',
    style: 'professional',
    gender: 'female',
    voiceId: '',
  });

  const fetchAvatars = useCallback(async (attempt = 0) => {
    try {
      const res = await fetch('/api/video-avatars');
      if (res.status === 401 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 800));
        return fetchAvatars(attempt + 1);
      }
      const json = await res.json();
      if (json.success) {
        setAvatars(json.data || []);
        setError('');
      } else {
        setError(json.error || 'Failed to load avatars');
      }
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800));
        return fetchAvatars(attempt + 1);
      }
      setError('Failed to fetch video avatars');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const createAvatar = async () => {
    if (!createForm.name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/video-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setCreateForm({
          name: '',
          provider: 'heygen',
          style: 'professional',
          gender: 'female',
          voiceId: '',
        });
        fetchAvatars();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const deleteAvatar = async (id: string) => {
    try {
      await fetch(`/api/video-avatars/${id}`, { method: 'DELETE' });
      fetchAvatars();
    } catch {
      // ignore
    }
  };

  const generateVideo = async (id: string) => {
    setGenerating(id);
    try {
      await fetch('/api/video-avatars/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: id }),
      });
      fetchAvatars();
    } catch {
      // ignore
    } finally {
      setGenerating(null);
    }
  };

  const activeAvatars = avatars.filter((a) => a.status === 'active').length;
  const totalAvatars = avatars.length;
  const generationsToday = avatars.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.createdAt).toDateString() === today;
  }).length;

  const providerColor = (provider: string) => {
    switch (provider) {
      case 'heygen':
        return 'bg-purple-500/20 text-purple-400';
      case 'did':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'custom':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
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
          <div className="rounded-xl bg-purple-500/20 p-2.5">
            <Video className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Video Avatars</h1>
            <p className="text-sm text-gray-400">Manage AI-powered video avatar personas</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Create Avatar
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Avatars',
            value: totalAvatars,
            icon: Film,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Active',
            value: activeAvatars,
            icon: Zap,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            label: 'Generations Today',
            value: generationsToday,
            icon: BarChart3,
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

      {/* Create Avatar Form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Create New Avatar</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Name</label>
              <input
                type="text"
                placeholder="Avatar name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Provider</label>
              <select
                value={createForm.provider}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    provider: e.target.value as 'heygen' | 'did' | 'custom',
                  })
                }
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                <option value="heygen">HeyGen</option>
                <option value="did">D-ID</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Style</label>
              <select
                value={createForm.style}
                onChange={(e) => setCreateForm({ ...createForm, style: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Gender</label>
              <select
                value={createForm.gender}
                onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-400">Voice ID (optional)</label>
              <input
                type="text"
                placeholder="Voice identifier"
                value={createForm.voiceId}
                onChange={(e) => setCreateForm({ ...createForm, voiceId: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createAvatar}
              disabled={creating || !createForm.name}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Avatar
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading video avatars...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <p>{error}</p>
          <button onClick={() => fetchAvatars()} className="mt-3 text-sm text-blue-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Avatars Grid */}
      {!loading && !error && (
        <>
          {avatars.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-gray-400">
              <Video className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No video avatars yet</p>
              <p className="mt-1 text-sm">Create your first AI avatar to get started</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {avatars.map((avatar, index) => (
                <motion.div
                  key={avatar._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur"
                >
                  {/* Thumbnail Area */}
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                    {avatar.thumbnailUrl ? (
                      <img src={avatar.thumbnailUrl} alt={avatar.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-16 w-16 text-gray-600" />
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${providerColor(avatar.provider)}`}
                      >
                        {avatar.provider}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(avatar.status)}`}>
                        {avatar.status}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="mb-1 font-semibold text-white">{avatar.name}</h3>
                    <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
                      <span className="capitalize">{avatar.style}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-600" />
                      <span className="capitalize">{avatar.gender}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-600" />
                      <span>{new Date(avatar.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => generateVideo(avatar._id)}
                        disabled={generating === avatar._id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-500/20 px-3 py-2 text-sm text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-40"
                      >
                        {generating === avatar._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Generate
                      </button>
                      <button
                        onClick={() => deleteAvatar(avatar._id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
