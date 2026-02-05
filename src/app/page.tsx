'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
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
  };

  const handleClientLogin = async () => {
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
  };

  const closeModals = () => {
    setShowAdminModal(false);
    setShowClientModal(false);
    setAdminToken('');
    setClientToken('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-animated flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] flex items-center justify-center shadow-2xl shadow-cyan-500/20">
            <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI Widget <span className="gradient-text">Platform</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your AI-powered chat widgets
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Button */}
          <button
            onClick={() => { setShowAdminModal(true); setError(''); }}
            className="glass-card p-8 text-left group hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 border border-white/10 hover:border-purple-500/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
              Admin Panel
            </h2>
            <p className="text-gray-400">
              Access the full management dashboard to manage all clients and widgets
            </p>
            <div className="mt-6 flex items-center text-purple-400 font-medium">
              <span>Enter Admin Token</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>

          {/* Client Button */}
          <button
            onClick={() => { setShowClientModal(true); setError(''); }}
            className="glass-card p-8 text-left group hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 border border-white/10 hover:border-cyan-500/30"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
              Client Cabinet
            </h2>
            <p className="text-gray-400">
              View your widget information, usage statistics, and integration details
            </p>
            <div className="mt-6 flex items-center text-cyan-400 font-medium">
              <span>Enter Your Token</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-12">
          © {new Date().getFullYear()} AI Widget Platform. All rights reserved.
        </p>
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="glass-card p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Admin Access</h2>
              <p className="text-gray-400 mt-2">Enter your secret admin token</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin token..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                autoFocus
              />
              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Access Admin Panel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="glass-card p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Client Cabinet</h2>
              <p className="text-gray-400 mt-2">Enter your access token</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                value={clientToken}
                onChange={(e) => setClientToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClientLogin()}
                placeholder="Enter your access token..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                autoFocus
              />
              <button
                onClick={handleClientLogin}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Access My Cabinet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
