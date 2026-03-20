'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, Play, Trash2, Edit3, Loader2, User, Mic, Globe, Sparkles } from 'lucide-react';

interface VideoAvatarItem {
  _id: string;
  clientId: string;
  name: string;
  avatarUrl: string;
  voiceId: string;
  provider: 'heygen' | 'did' | 'custom';
  style: 'professional' | 'casual' | 'friendly';
  gender: 'male' | 'female' | 'neutral';
  language: string;
  isActive: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const PROVIDERS = [
  { value: 'heygen', label: 'HeyGen' },
  { value: 'did', label: 'D-ID' },
  { value: 'custom', label: 'Custom' },
];

const STYLES = ['professional', 'casual', 'friendly'];
const GENDERS = ['male', 'female', 'neutral'];

export default function VideoAvatarsPage() {
  const [avatars, setAvatars] = useState<VideoAvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testText, setTestText] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; duration: number } | null>(null);
  const [clientId, setClientId] = useState('');
  const [form, setForm] = useState({
    name: '',
    provider: 'heygen' as 'heygen' | 'did' | 'custom',
    style: 'professional' as 'professional' | 'casual' | 'friendly',
    gender: 'neutral' as 'male' | 'female' | 'neutral',
    language: 'en',
    voiceId: '',
  });

  const fetchAvatars = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/video-avatars?clientId=${clientId}`);
      const json = await res.json();
      if (json.success) setAvatars(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchAvatars();
  }, [clientId, fetchAvatars]);

  const createAvatar = async () => {
    if (!form.name || !clientId) return;
    try {
      await fetch('/api/video-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, ...form }),
      });
      setShowCreate(false);
      setForm({ name: '', provider: 'heygen', style: 'professional', gender: 'neutral', language: 'en', voiceId: '' });
      fetchAvatars();
    } catch {
      // ignore
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

  const generatePreview = async (avatarId: string) => {
    if (!testText) return;
    setTestingId(avatarId);
    setVideoResult(null);
    try {
      const res = await fetch('/api/video-avatars/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, text: testText }),
      });
      const json = await res.json();
      if (json.success) setVideoResult(json.data);
    } catch {
      // ignore
    } finally {
      setTestingId(null);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Video className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Video Avatars</h1>
            <p className="text-sm text-gray-400">Create AI-powered video responses for your widgets</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Create Avatar
        </button>
      </motion.div>

      {/* Client ID Selector */}
      <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <label className="mb-2 block text-sm text-gray-400">Select Widget / Client ID</label>
        <input
          type="text"
          placeholder="Enter client ID..."
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
        />
      </motion.div>

      {/* Create Modal */}
      {showCreate && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">Create New Avatar</h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name</label>
              <input
                type="text"
                placeholder="Avatar name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Provider</label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as 'heygen' | 'did' | 'custom' })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Style</label>
              <select
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value as 'professional' | 'casual' | 'friendly' })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' | 'neutral' })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Language</label>
              <input
                type="text"
                placeholder="en"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Voice ID</label>
              <input
                type="text"
                placeholder="Voice identifier"
                value={form.voiceId}
                onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createAvatar}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Avatar Gallery */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {avatars.length === 0 && clientId && (
            <motion.div variants={fadeUp} className="col-span-full py-12 text-center text-gray-400">
              <User className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>No avatars created yet</p>
            </motion.div>
          )}
          {avatars.map((avatar) => (
            <motion.div
              key={avatar._id}
              variants={fadeUp}
              className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:bg-white/10"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{avatar.name}</h3>
                  <span className="text-xs text-gray-400 capitalize">
                    {avatar.provider} / {avatar.style}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => deleteAvatar(avatar._id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  <span className="capitalize">{avatar.gender}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{avatar.language}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Mic className="h-3.5 w-3.5" />
                  <span>{avatar.voiceId || 'No voice set'}</span>
                </div>
              </div>

              {/* Test Area */}
              <div className="border-t border-white/10 pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type text to generate..."
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => generatePreview(avatar._id)}
                    disabled={testingId === avatar._id}
                    className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    {testingId === avatar._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Test
                  </button>
                </div>
              </div>

              <span
                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  avatar.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {avatar.isActive ? 'Active' : 'Inactive'}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Video Preview */}
      {videoResult && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Generated Video Preview</h3>
          </div>
          <div className="flex h-48 items-center justify-center rounded-lg bg-black/30 p-4">
            {videoResult.videoUrl ? (
              <video src={videoResult.videoUrl} controls className="max-h-full rounded" />
            ) : (
              <p className="text-sm text-gray-500">Video generation submitted. Check provider dashboard for result.</p>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">Duration: {videoResult.duration}s</p>
        </motion.div>
      )}
    </motion.div>
  );
}
