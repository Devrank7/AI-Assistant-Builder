'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/* ─── Floating Orb Component ─── */
function FloatingOrb({
  size,
  color,
  top,
  left,
  delay,
}: {
  size: number;
  color: string;
  top: string;
  left: string;
  delay: number;
}) {
  return (
    <div
      className="animate-float-slow pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        opacity: 0.3,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

/* ─── Particle Field ─── */
function ParticleField() {
  // Use lazy initializer to generate particles only once on mount
  // Use lazy initializer to generate particles only once on mount
  const [particles, setParticles] = useState<
    {
      id: number;
      x: number;
      y: number;
      size: number;
      delay: number;
      duration: number;
    }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
      }))
    );
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="animate-pulse-glow absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Feature Badge ─── */
function FeatureBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="glass-subtle flex cursor-default items-center gap-2 rounded-full px-4 py-2 text-sm text-gray-300 transition-all duration-300 hover:border-white/10 hover:text-white">
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = useCallback(async () => {
    if (!adminToken.trim()) {
      setError('Please enter admin token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid admin token');
      }
    } catch {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [adminToken, router]);

  const handleClientLogin = useCallback(async () => {
    if (!clientToken.trim()) {
      setError('Please enter your access token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: clientToken }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/cabinet?token=${encodeURIComponent(clientToken)}`);
      } else {
        setError(data.error || 'Invalid client token');
      }
    } catch {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [clientToken, router]);

  const closeModals = () => {
    setShowAdminModal(false);
    setShowClientModal(false);
    setAdminToken('');
    setClientToken('');
    setError('');
  };

  return (
    <div className="bg-gradient-animated relative min-h-screen overflow-hidden">
      {/* Aurora Background */}
      <div className="aurora" />

      {/* Particle Field */}
      <ParticleField />

      {/* Floating Orbs */}
      <FloatingOrb size={500} color="rgba(124, 58, 237, 0.15)" top="-10%" left="-5%" delay={0} />
      <FloatingOrb size={400} color="rgba(0, 229, 255, 0.12)" top="60%" left="70%" delay={3} />
      <FloatingOrb size={300} color="rgba(255, 45, 135, 0.1)" top="30%" left="50%" delay={6} />

      {/* Grid Overlay */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {/* Logo & Title */}
          <div className="animate-slide-up mb-16 text-center">
            {/* Animated Logo */}
            <div className="relative mx-auto mb-8 h-24 w-24">
              <div className="animate-rotate-slow absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--neon-cyan)] via-[var(--accent)] to-[var(--neon-pink)] opacity-50 blur-xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] shadow-2xl shadow-cyan-500/30 backdrop-blur-sm">
                <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V6.5a2.25 2.25 0 00-2.25-2.25h-9.5A2.25 2.25 0 005 6.5v8"
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
              Winbix <span className="gradient-text">AI</span>
            </h1>
            <p className="mx-auto max-w-lg text-xl leading-relaxed text-gray-400">
              Intelligent AI-powered chat widgets with RAG knowledge base, multi-model support, and real-time analytics
            </p>

            {/* Feature Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <FeatureBadge icon="✦" label="Powerful AI" />
              <FeatureBadge icon="◉" label="RAG System" />
              <FeatureBadge icon="⚡" label="Multi-Model" />
              <FeatureBadge icon="📊" label="Analytics" />
              <FeatureBadge icon="🔒" label="Secure" />
            </div>
          </div>

          {/* Login Cards */}
          <div className="stagger grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Admin Card */}
            <button
              onClick={() => {
                setShowAdminModal(true);
                setError('');
              }}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03]"
            >
              {/* Gradient Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="glass relative h-full border-white/5 p-8 text-left group-hover:border-purple-500/30 group-hover:bg-white/[0.06]">
                {/* Glow Dot */}
                <div className="animate-pulse-neon absolute top-4 right-4 h-2 w-2 rounded-full bg-purple-400" />

                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>

                <h2 className="mb-3 text-2xl font-bold text-white transition-colors group-hover:text-purple-300">
                  Admin Panel
                </h2>
                <p className="mb-6 leading-relaxed text-gray-400">
                  Full management dashboard to oversee all clients, widgets, and system analytics
                </p>

                <div className="flex items-center text-sm font-medium text-purple-400 group-hover:text-purple-300">
                  <span>Enter Admin Token</span>
                  <svg
                    className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Client Card */}
            <button
              onClick={() => {
                setShowClientModal(true);
                setError('');
              }}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03]"
            >
              {/* Gradient Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="glass relative h-full border-white/5 p-8 text-left group-hover:border-cyan-500/30 group-hover:bg-white/[0.06]">
                {/* Glow Dot */}
                <div className="animate-pulse-neon absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan-400" />

                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cyan-500/30">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>

                <h2 className="mb-3 text-2xl font-bold text-white transition-colors group-hover:text-cyan-300">
                  Client Cabinet
                </h2>
                <p className="mb-6 leading-relaxed text-gray-400">
                  View widget details, usage statistics, knowledge base, and integration setup
                </p>

                <div className="flex items-center text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
                  <span>Enter Your Token</span>
                  <svg
                    className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Glow Line Separator */}
          <div className="glow-line mt-16 mb-8 h-px" />

          {/* Footer */}
          <p className="text-center text-sm text-gray-600">
            &copy; {new Date().getFullYear()} Winbix AI &middot; Powered by Gemini AI
          </p>
        </div>
      </div>

      {/* ─── Admin Modal ─── */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md"
            >
              {/* Glow behind modal */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent blur-xl" />

              <div className="glass relative rounded-2xl border-purple-500/20 p-8">
                <button
                  onClick={closeModals}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Admin Access</h2>
                  <p className="mt-2 text-sm text-gray-400">Enter your secret admin token to continue</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="password"
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                      placeholder="Enter admin token..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 transition-all focus:border-purple-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <motion.button
                    onClick={handleAdminLogin}
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.97 }}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Access Admin Panel'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Client Modal ─── */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md"
            >
              {/* Glow behind modal */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent blur-xl" />

              <div className="glass relative rounded-2xl border-cyan-500/20 p-8">
                <button
                  onClick={closeModals}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Client Cabinet</h2>
                  <p className="mt-2 text-sm text-gray-400">Enter your access token to view your dashboard</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={clientToken}
                      onChange={(e) => setClientToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
                      placeholder="Enter your access token..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <motion.button
                    onClick={handleClientLogin}
                    disabled={loading}
                    whileHover={loading ? undefined : { scale: 1.02 }}
                    whileTap={loading ? undefined : { scale: 0.97 }}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Access My Cabinet'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
