'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface InstagramConfigState {
  systemPrompt: string;
  pageAccessToken: string;
  pageId: string;
  isActive: boolean;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  processingMessage: string;
}

export default function AdminInstagramPage() {
  const [config, setConfig] = useState<InstagramConfigState>({
    systemPrompt: '',
    pageAccessToken: '',
    pageId: '',
    isActive: false,
    aiModel: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 1024,
    processingMessage: 'Секунду, обрабатываю...',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/instagram-config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching Instagram config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/instagram-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setMessage({ type: 'success', text: 'Instagram configuration saved successfully' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearSessions = async () => {
    if (!confirm('Are you sure you want to clear ALL Instagram chat sessions? This cannot be undone.')) return;
    setClearing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/instagram-config', { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Cleared ${data.deletedCount} chat session(s)` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to clear sessions' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-animated flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-animated relative min-h-screen">
      <div className="aurora" />
      <div className="bg-grid pointer-events-none fixed inset-0 z-0 opacity-20" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] opacity-40 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)]">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="gradient-text text-lg font-bold">WinBix AI</h1>
                <p className="text-[11px] tracking-wide text-gray-500 uppercase">Management Dashboard</p>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              <Link
                href="/admin"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                Settings
              </Link>
              <Link
                href="/admin/instagram"
                className="rounded-lg bg-[var(--neon-cyan)]/10 px-4 py-2 text-sm font-medium text-[var(--neon-cyan)]"
              >
                Instagram
              </Link>
              <Link
                href="#"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                Docs
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2 text-sm text-gray-400 transition-all hover:bg-white/10 hover:text-white"
              >
                Logout
              </Link>
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-pink)] opacity-40 blur-sm" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-pink)] text-xs font-bold text-white">
                  A
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {/* Page Title */}
        <div className="mb-10">
          <h2 className="mb-3 text-4xl font-bold tracking-tight text-white">
            Instagram <span className="gradient-text">Auto-Responder</span>
          </h2>
          <p className="text-lg text-gray-400">Configure AI assistant for Instagram Direct Messages</p>
        </div>

        {/* Status Card */}
        <div className="glass-card mb-8 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${config.isActive && config.pageId && config.pageAccessToken ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}
              />
              <div>
                <h3 className="text-sm font-medium text-white">
                  {config.isActive && config.pageId && config.pageAccessToken ? 'Active' : 'Inactive'}
                </h3>
                <p className="text-xs text-gray-500">
                  {config.pageId ? `Page ID: ${config.pageId}` : 'No Page ID configured'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, isActive: !config.isActive })}
              className={`relative h-7 w-12 rounded-full transition-colors ${config.isActive ? 'bg-[var(--neon-cyan)]' : 'bg-white/20'}`}
            >
              <div
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${config.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">System Prompt</h2>
          <p className="mb-4 text-sm text-gray-500">
            This is the AI personality and instructions. The assistant will use this context when responding to
            Instagram DMs.
          </p>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            className="h-64 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-4 font-mono text-sm leading-relaxed text-white placeholder-gray-600 focus:border-[var(--neon-cyan)] focus:outline-none"
            placeholder="Enter system prompt for Instagram AI assistant..."
          />
          <p className="mt-2 text-xs text-gray-600">{config.systemPrompt.length} characters</p>
        </div>

        {/* Meta API Configuration */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">Meta API Configuration</h2>

          <div className="space-y-6">
            {/* Page ID */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Instagram Page ID</label>
              <input
                type="text"
                value={config.pageId}
                onChange={(e) => setConfig({ ...config, pageId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
                placeholder="e.g. 17841400123456789"
              />
              <p className="mt-1 text-xs text-gray-600">Found in Meta Business Suite or Graph API Explorer</p>
            </div>

            {/* Page Access Token */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Page Access Token</label>
              <div className="flex gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.pageAccessToken}
                  onChange={(e) => setConfig({ ...config, pageAccessToken: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
                  placeholder="EAAGm0PX4ZCps..."
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Long-lived Page Access Token with instagram_manage_messages permission
              </p>
            </div>

            {/* Webhook URL (read-only) */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="https://winbix-ai.xyz/api/webhooks/instagram"
                  readOnly
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText('https://winbix-ai.xyz/api/webhooks/instagram')}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Copy
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Verify Token: <code className="text-gray-400">winbix_instagram_verify</code>
              </p>
            </div>
          </div>
        </div>

        {/* AI Model Settings */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">AI Model Settings</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Model */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Model</label>
              <select
                value={config.aiModel}
                onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (fast)</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro (balanced)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (quality)</option>
              </select>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: Number(e.target.value) })}
                min={128}
                max={4096}
                step={128}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
              />
            </div>

            {/* Temperature */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-gray-400">
                Temperature: <span className="text-white">{config.temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
                className="w-full accent-[var(--neon-cyan)]"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Features */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">Supported Message Types</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-2 text-2xl">💬</div>
              <h3 className="text-sm font-medium text-white">Text Messages</h3>
              <p className="mt-1 text-xs text-gray-500">Responds to regular text DMs with AI-generated answers</p>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-2 text-2xl">🎤</div>
              <h3 className="text-sm font-medium text-white">Voice Messages</h3>
              <p className="mt-1 text-xs text-gray-500">Transcribes voice messages and responds with text</p>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-2 text-2xl">📸</div>
              <h3 className="text-sm font-medium text-white">Photos</h3>
              <p className="mt-1 text-xs text-gray-500">Analyzes images using multimodal AI and responds</p>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="glass-card mb-8 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
            <svg className="h-5 w-5 text-[var(--neon-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Advanced Settings
          </h2>

          <div className="space-y-6">
            {/* Processing Message */}
            <div>
              <label className="mb-2 block text-sm text-gray-400">Voice/Photo Processing Message</label>
              <input
                type="text"
                value={config.processingMessage}
                onChange={(e) => setConfig({ ...config, processingMessage: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none"
                placeholder="Секунду, обрабатываю..."
              />
              <p className="mt-1 text-xs text-gray-600">
                This message is sent instantly while the AI processes voice messages or photos. The actual AI response
                follows after processing is complete.
              </p>
            </div>

            {/* Clear Sessions */}
            <div className="border-t border-white/10 pt-6">
              <label className="mb-2 block text-sm text-gray-400">Chat Sessions</label>
              <button
                onClick={handleClearSessions}
                disabled={clearing}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Clear All Sessions'}
              </button>
              <p className="mt-2 text-xs text-gray-600">
                Delete all conversation history for the Instagram assistant. Users can also send{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-gray-400">/clear</code> in DMs to reset their own
                session.
              </p>
            </div>
          </div>
        </div>

        {/* Setup Instructions (collapsible) */}
        <div className="glass-card mb-8 p-6">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">Setup Instructions</h2>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${showSetup ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSetup && (
            <div className="mt-6 space-y-4 text-sm text-gray-400">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  1
                </span>
                <div>
                  <p className="text-white">Create a Meta App</p>
                  <p className="mt-1 text-gray-500">
                    Go to developers.facebook.com and create a new app with &quot;Business&quot; type
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  2
                </span>
                <div>
                  <p className="text-white">Add Instagram Product</p>
                  <p className="mt-1 text-gray-500">
                    In the app dashboard, add the &quot;Instagram&quot; product and connect your Instagram Business
                    account
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  3
                </span>
                <div>
                  <p className="text-white">Configure Webhook</p>
                  <p className="mt-1 text-gray-500">
                    Set webhook URL to{' '}
                    <code className="rounded bg-white/10 px-1 py-0.5 text-[var(--neon-cyan)]">
                      https://winbix-ai.xyz/api/webhooks/instagram
                    </code>{' '}
                    and verify token to{' '}
                    <code className="rounded bg-white/10 px-1 py-0.5 text-[var(--neon-cyan)]">
                      winbix_instagram_verify
                    </code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  4
                </span>
                <div>
                  <p className="text-white">Subscribe to Messages</p>
                  <p className="mt-1 text-gray-500">
                    Subscribe to the <code className="rounded bg-white/10 px-1 py-0.5">messages</code> webhook field
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  5
                </span>
                <div>
                  <p className="text-white">Generate Page Access Token</p>
                  <p className="mt-1 text-gray-500">
                    Generate a long-lived Page Access Token with{' '}
                    <code className="rounded bg-white/10 px-1 py-0.5">instagram_manage_messages</code> permission and
                    enter it above
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--neon-cyan)]/20 text-xs font-bold text-[var(--neon-cyan)]">
                  6
                </span>
                <div>
                  <p className="text-white">Enter Page ID</p>
                  <p className="mt-1 text-gray-500">
                    Copy your Instagram Page ID from the Meta Graph API Explorer or Business Suite and enter it above
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              message.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="neon-button w-full py-3 text-center font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
