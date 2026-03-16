'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, X, FlaskConical } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }: AuthModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchTab = (newTab: 'login' | 'signup') => {
    setTab(newTab);
    setError('');
  };

  const handleGoogleClick = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Sign-In is not configured.');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
    window.location.href = url;
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        resetForm();
        router.push('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        resetForm();
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = tab === 'signup' ? handleSignUp : handleLogin;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-bg-primary border-border relative w-full max-w-md rounded-2xl border p-8 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="text-text-tertiary hover:text-text-primary hover:bg-bg-secondary absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Logo */}
            <div className="mb-6 text-center">
              <div className="bg-accent mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white">
                <FlaskConical className="h-6 w-6" />
              </div>
              <h2 className="text-text-primary text-xl font-bold">Welcome to WinBix AI</h2>
            </div>

            {/* Tabs — underline style */}
            <div className="border-border mb-6 flex border-b">
              <button
                onClick={() => switchTab('signup')}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === 'signup'
                    ? 'text-text-primary border-accent border-b-2'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                  tab === 'login'
                    ? 'text-text-primary border-accent border-b-2'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Log In
              </button>
            </div>

            {/* Google Sign-In Button */}
            <Button variant="secondary" size="lg" onClick={handleGoogleClick} className="mb-4 w-full gap-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="border-border w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bg-primary text-text-tertiary px-3">or continue with email</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center text-sm text-red-500"
              >
                {error}
              </motion.p>
            )}

            {/* Form */}
            <div className="space-y-4">
              {tab === 'signup' && (
                <div className="relative">
                  <Input
                    label="Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="pl-9"
                  />
                  <User className="text-text-tertiary pointer-events-none absolute top-[2.05rem] left-3 h-4 w-4" />
                </div>
              )}

              <div className="relative">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                />
                <Mail className="text-text-tertiary pointer-events-none absolute top-[2.05rem] left-3 h-4 w-4" />
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Enter your password"
                  className="pr-9 pl-9"
                />
                <Lock className="text-text-tertiary pointer-events-none absolute top-[2.05rem] left-3 h-4 w-4" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-tertiary hover:text-text-primary absolute top-[2.05rem] right-3 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button variant="primary" size="lg" onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Please wait...</span>
                  </div>
                ) : tab === 'signup' ? (
                  'Create Account'
                ) : (
                  'Log In'
                )}
              </Button>
            </div>

            {/* Footer */}
            <p className="text-text-tertiary mt-6 text-center text-xs">
              {tab === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchTab('login')}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => switchTab('signup')}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
