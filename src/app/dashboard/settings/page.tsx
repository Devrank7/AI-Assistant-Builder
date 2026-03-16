'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/* ── icons ──────────────────────────────────────────────── */
function IconUser() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
function IconMail() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}
function IconLock() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

/* ── section wrapper ────────────────────────────────────── */
function Section({
  icon,
  title,
  description,
  accentFrom,
  accentTo,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentFrom: string;
  accentTo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0e0e16] transition-all duration-300 hover:border-white/[0.1]">
      {/* top accent */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-50 transition-opacity group-hover:opacity-80"
        style={{ background: `linear-gradient(90deg, ${accentFrom}, ${accentTo})` }}
      />
      <div className="p-7">
        {/* header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{
              background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
              boxShadow: `0 4px 20px ${accentFrom}40`,
            }}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-[11px] text-gray-600">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── input field ────────────────────────────────────────── */
function Field({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  suffix,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold tracking-[0.12em] text-gray-500 uppercase">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white transition-all placeholder:text-gray-700 focus:outline-none ${
            readOnly || disabled
              ? 'cursor-default border-white/[0.04] text-gray-400'
              : 'border-white/[0.08] hover:border-white/[0.12] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20'
          }`}
        />
        {suffix && <div className="absolute right-3">{suffix}</div>}
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */
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

  const planLabel = user?.plan === 'pro' ? 'Pro' : user?.plan === 'basic' ? 'Basic' : 'Free';
  const planColor =
    user?.plan === 'pro' ? 'text-violet-400' : user?.plan === 'basic' ? 'text-blue-400' : 'text-gray-500';

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 pb-12">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/[0.03] blur-[100px]" />

      {/* header */}
      <div className="relative">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account, security, and preferences.</p>
      </div>

      {/* ── PROFILE ──────────────────────────────────── */}
      <Section
        icon={<IconUser />}
        title="Profile"
        description="Your personal information"
        accentFrom="#2563eb"
        accentTo="#7c3aed"
      >
        <div className="space-y-5">
          <Field label="Full Name" id="name" value={name} onChange={setName} placeholder="Enter your name" />

          <Field
            label="Email Address"
            id="email"
            value={user?.email || ''}
            readOnly
            suffix={
              user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  <IconCheck /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  Unverified
                </span>
              )
            }
          />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveProfile}
              disabled={profileLoading || name === user?.name}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-2.5 text-[12px] font-bold tracking-wide text-white uppercase shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/35 disabled:opacity-40 disabled:shadow-none"
            >
              {profileLoading ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : profileSaved ? (
                <IconCheck />
              ) : null}
              {profileLoading ? 'Saving...' : profileSaved ? 'Saved' : 'Save Changes'}
            </button>

            {profileError && <p className="text-xs font-medium text-red-400">{profileError}</p>}
          </div>
        </div>
      </Section>

      {/* ── EMAIL VERIFICATION ───────────────────────── */}
      {!user?.emailVerified && (
        <Section
          icon={<IconMail />}
          title="Email Verification"
          description="Verify your email to unlock all features"
          accentFrom="#d97706"
          accentTo="#ea580c"
        >
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-5">
            <p className="text-sm leading-relaxed text-gray-400">
              Your email address is not verified. Some features may be limited until you verify it.
            </p>
            <div className="mt-4">
              {verificationSent ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <IconCheck />
                  Verification email sent — check your inbox
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSendVerification}
                    disabled={verificationLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[12px] font-bold tracking-wide text-white uppercase shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/35 disabled:opacity-50"
                  >
                    {verificationLoading && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    {verificationLoading ? 'Sending...' : 'Send Verification Email'}
                  </button>
                  {verificationError && <p className="mt-2 text-xs font-medium text-red-400">{verificationError}</p>}
                </>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ── SECURITY / PASSWORD ──────────────────────── */}
      <Section
        icon={<IconLock />}
        title="Security"
        description="Password and authentication settings"
        accentFrom="#059669"
        accentTo="#0d9488"
      >
        <form onSubmit={handleChangePassword} className="space-y-5">
          <Field
            label="Current Password"
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Enter current password"
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="New Password"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Min. 8 characters"
            />
            <Field
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat new password"
            />
          </div>

          {/* password strength indicator */}
          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength =
                    newPassword.length >= 12 &&
                    /[A-Z]/.test(newPassword) &&
                    /\d/.test(newPassword) &&
                    /[^A-Za-z0-9]/.test(newPassword)
                      ? 4
                      : newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /\d/.test(newPassword)
                        ? 3
                        : newPassword.length >= 8
                          ? 2
                          : 1;
                  const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
                  return (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        level <= strength ? colors[strength - 1] : 'bg-white/[0.06]'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600">
                Use 8+ characters with uppercase, numbers, and symbols for stronger security
              </p>
            </div>
          )}

          {passwordError && (
            <div className="rounded-lg border border-red-500/10 bg-red-500/[0.06] px-4 py-2.5 text-xs font-medium text-red-400">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.06] px-4 py-2.5 text-xs font-medium text-emerald-400">
              <IconCheck /> {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-[12px] font-bold tracking-wide text-white uppercase shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-600/35 disabled:opacity-40 disabled:shadow-none"
          >
            {passwordLoading && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* ── PLAN & SUBSCRIPTION ──────────────────────── */}
      <Section
        icon={<IconSparkles />}
        title="Subscription"
        description="Your current plan and billing"
        accentFrom="#7c3aed"
        accentTo="#db2777"
      >
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-pink-600/20">
              <IconShield />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Current Plan: <span className={planColor}>{planLabel}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">
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
          <a
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[11px] font-semibold text-gray-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
          >
            {user?.plan === 'none' ? 'Upgrade' : 'Manage Billing'}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </a>
        </div>
      </Section>

      {/* ── DANGER ZONE ──────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/10 bg-[#0e0e16] p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Danger Zone</h2>
            <p className="text-[11px] text-gray-600">Irreversible actions</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-red-500/[0.08] bg-red-500/[0.03] p-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Delete Account</p>
            <p className="mt-0.5 text-[11px] text-gray-600">Permanently delete your account and all associated data.</p>
          </div>
          <button
            className="rounded-full border border-red-500/20 px-5 py-2 text-[11px] font-bold tracking-wide text-red-400 uppercase transition-all hover:border-red-500/40 hover:bg-red-500/10"
            onClick={() => alert('Please contact support to delete your account.')}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
