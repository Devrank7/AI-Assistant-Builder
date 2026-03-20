'use client';

import { useState, useEffect } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  Shield,
  Trash2,
  Check,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Crown,
  Rocket,
  Zap,
  Palette,
  ArrowUpRight,
  Key,
} from 'lucide-react';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* ── Section wrapper ── */
function SettingsSection({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  children,
  danger,
}: {
  icon: typeof User;
  iconColor?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-[#111118] ${
        danger ? 'border-red-200/60 dark:border-red-500/10' : 'border-gray-200/60 dark:border-white/[0.06]'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)' }}
    >
      {/* Top accent line */}
      {!danger && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-40"
          style={{ background: `linear-gradient(90deg, ${iconColor || '#6B7280'}, ${iconColor || '#6B7280'}40)` }}
        />
      )}
      {danger && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-500/60 to-red-500/20" />}

      <div className="p-6">
        {/* Section header */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={
              danger
                ? { background: 'rgba(239,68,68,0.06)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.12)' }
                : {
                    background: `linear-gradient(135deg, ${iconColor || '#6B7280'}15, ${iconColor || '#6B7280'}20)`,
                    color: iconColor || '#6B7280',
                    boxShadow: `0 0 0 1px ${iconColor || '#6B7280'}15`,
                  }
            }
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </motion.div>
  );
}

/* ── Password strength ── */
function PasswordStrength({ password }: { password: string }) {
  const strength =
    password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
      ? 4
      : password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
        ? 3
        : password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
          ? 2
          : 1;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-1.5"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: level <= strength ? colors[strength - 1] : 'rgba(107,114,128,0.1)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium" style={{ color: colors[strength - 1] }}>
          {labels[strength - 1]}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">Use 8+ chars with uppercase, numbers & symbols</p>
      </div>
    </motion.div>
  );
}

/* ── Inline alert ── */
function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium"
      style={{
        background: isSuccess ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        color: isSuccess ? '#10B981' : '#EF4444',
      }}
    >
      {isSuccess ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {message}
    </motion.div>
  );
}

/* ── Inline spinner ── */
function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  // Profile
  const [name, setName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Verification
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileSaved(true);
        await refreshUser();
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        setProfileError(data.error || 'Failed to save');
      }
    } catch {
      setProfileError('Failed to save profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setVerificationSent(true);
      } else {
        setVerificationError(data.error || 'Failed to send verification email');
      }
    } catch {
      setVerificationError('Failed to send verification email');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser();
        setTimeout(() => setPasswordMessage(''), 4000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const planLabel =
    user?.plan === 'pro' ? 'Pro' : user?.plan === 'basic' || user?.plan === 'starter' ? 'Starter' : 'Free';
  const planConfig = {
    Pro: { color: '#8B5CF6', icon: Crown, bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)' },
    Starter: { color: '#3B82F6', icon: Rocket, bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)' },
    Free: { color: '#6B7280', icon: Zap, bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)' },
  }[planLabel] || { color: '#6B7280', icon: Zap, bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)' };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header */}
      <motion.div {...fadeUp}>
        <p className="mb-1 text-[11px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Workspace
        </p>
        <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>Settings</h1>
        <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
          Manage your account, security, and preferences
        </p>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
        {/* ── PROFILE ── */}
        <SettingsSection icon={User} iconColor="#3B82F6" title="Profile" subtitle="Your personal information">
          <div className="space-y-4">
            <Input
              label="Full Name"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                Email Address
              </label>
              <div className="relative flex items-center">
                <input
                  id="email"
                  type="text"
                  value={user?.email || ''}
                  readOnly
                  className="h-10 w-full cursor-default rounded-xl border border-gray-200/60 bg-gray-50/50 px-3.5 text-[13px] text-gray-500 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-gray-400"
                />
                <div className="absolute right-3">
                  {user?.emailVerified ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                      style={{
                        background: 'rgba(16,185,129,0.06)',
                        color: '#10B981',
                        border: '1px solid rgba(16,185,129,0.15)',
                      }}
                    >
                      <Check className="h-2.5 w-2.5" /> Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
                      style={{
                        background: 'rgba(245,158,11,0.06)',
                        color: '#F59E0B',
                        border: '1px solid rgba(245,158,11,0.15)',
                      }}
                    >
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <motion.button
                whileHover={profileLoading || name === user?.name ? undefined : { scale: 1.03, y: -1 }}
                whileTap={profileLoading || name === user?.name ? undefined : { scale: 0.97 }}
                onClick={handleSaveProfile}
                disabled={profileLoading || name === user?.name}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:shadow-none"
              >
                {profileLoading ? <Spinner /> : profileSaved ? <Check className="h-4 w-4" /> : null}
                {profileLoading ? 'Saving...' : profileSaved ? 'Saved' : 'Save Changes'}
              </motion.button>

              <AnimatePresence>{profileError && <Alert type="error" message={profileError} />}</AnimatePresence>
            </div>
          </div>
        </SettingsSection>

        {/* ── EMAIL VERIFICATION ── */}
        {!user?.emailVerified && (
          <SettingsSection
            icon={Mail}
            iconColor="#F59E0B"
            title="Email Verification"
            subtitle="Verify your email to unlock all features"
          >
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}
            >
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                Your email address is not verified. Some features may be limited.
              </p>
              <div className="mt-4">
                {verificationSent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-[13px] font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="h-4 w-4" />
                    Verification email sent — check your inbox
                  </motion.div>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSendVerification}
                      disabled={verificationLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-amber-500/15 transition-shadow hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50"
                    >
                      {verificationLoading && <Spinner />}
                      {verificationLoading ? 'Sending...' : 'Send Verification Email'}
                    </motion.button>
                    <AnimatePresence>
                      {verificationError && (
                        <div className="mt-3">
                          <Alert type="error" message={verificationError} />
                        </div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          </SettingsSection>
        )}

        {/* ── PASSWORD ── */}
        <SettingsSection
          icon={Lock}
          iconColor="#8B5CF6"
          title="Password"
          subtitle="Update your password to keep your account secure"
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password with toggle */}
            <div className="relative">
              <Input
                label="Current Password"
                id="currentPassword"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute top-[34px] right-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <Input
                  label="New Password"
                  id="newPassword"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute top-[34px] right-3 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="Confirm New Password"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            {/* Password strength */}
            <AnimatePresence>{newPassword.length > 0 && <PasswordStrength password={newPassword} />}</AnimatePresence>

            <AnimatePresence>
              {passwordError && <Alert type="error" message={passwordError} />}
              {passwordMessage && <Alert type="success" message={passwordMessage} />}
            </AnimatePresence>

            <motion.button
              whileHover={
                passwordLoading || !currentPassword || !newPassword || !confirmPassword
                  ? undefined
                  : { scale: 1.03, y: -1 }
              }
              whileTap={
                passwordLoading || !currentPassword || !newPassword || !confirmPassword ? undefined : { scale: 0.97 }
              }
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-violet-500/15 transition-all hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:shadow-none"
            >
              {passwordLoading && <Spinner />}
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </motion.button>
          </form>
        </SettingsSection>

        {/* ── SUBSCRIPTION ── */}
        <SettingsSection
          icon={Sparkles}
          iconColor={planConfig.color}
          title="Subscription"
          subtitle="Your current plan and billing"
        >
          <div
            className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: planConfig.bg, border: `1px solid ${planConfig.border}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${planConfig.color}20, ${planConfig.color}30)`,
                  color: planConfig.color,
                }}
              >
                <planConfig.icon className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{planLabel} Plan</p>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  {user?.subscriptionStatus === 'active'
                    ? 'Active subscription'
                    : user?.subscriptionStatus === 'trial'
                      ? 'Trial period'
                      : user?.subscriptionStatus === 'past_due'
                        ? 'Payment past due'
                        : 'No active subscription'}
                </p>
              </div>
            </div>
            <a href="/dashboard/billing" className="shrink-0">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-white/[0.15]"
              >
                {user?.plan === 'none' || user?.plan === 'free' ? 'Upgrade' : 'Manage Billing'}
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.button>
            </a>
          </div>
        </SettingsSection>

        {/* ── WHITE-LABEL ── */}
        <SettingsSection
          icon={Palette}
          iconColor="#8B5CF6"
          title="White-Label"
          subtitle="Custom domain, branding, and widget identity"
        >
          <div
            className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.25))',
                  color: '#8B5CF6',
                }}
              >
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                  White-Label Settings
                  <span
                    className="ml-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      background: 'rgba(139,92,246,0.1)',
                      color: '#8B5CF6',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}
                  >
                    Enterprise
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Custom domain, hide branding, brand colors &amp; logo
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings/white-label" className="shrink-0">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 shadow-sm transition-all hover:border-violet-300/50 hover:bg-violet-50/40 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/[0.06]"
              >
                Configure
                <ArrowUpRight className="h-3.5 w-3.5" />
              </motion.button>
            </Link>
          </div>
        </SettingsSection>

        {/* ── API KEYS ── */}
        <SettingsSection
          icon={Key}
          iconColor="#3B82F6"
          title="API Keys"
          subtitle="Programmatic access to your WinBix AI workspace"
        >
          <div
            className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.25))',
                  color: '#3B82F6',
                }}
              >
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                  Developer API Keys
                  <span
                    className="ml-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                    style={{
                      background: 'rgba(59,130,246,0.1)',
                      color: '#3B82F6',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}
                  >
                    Pro
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Create scoped keys, set expiry, whitelist IPs
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings/api-keys" className="shrink-0">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-300/50 hover:bg-blue-50/40 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-blue-500/20 dark:hover:bg-blue-500/[0.06]"
              >
                Manage
                <ArrowUpRight className="h-3.5 w-3.5" />
              </motion.button>
            </Link>
          </div>
        </SettingsSection>

        {/* ── DANGER ZONE ── */}
        <SettingsSection icon={Trash2} title="Danger Zone" subtitle="Irreversible actions" danger>
          <div
            className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}
          >
            <div>
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Delete Account</p>
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => alert('Please contact support to delete your account.')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200/60 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:shadow-md dark:border-red-500/15 dark:bg-red-500/5 dark:text-red-400 dark:hover:border-red-500/25 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Account
            </motion.button>
          </div>
        </SettingsSection>
      </motion.div>
    </div>
  );
}
