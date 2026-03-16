'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, Button, Input, Toggle } from '@/components/ui';
import { User, Mail, Lock, Shield, Trash2, Check, Sparkles, ChevronRight } from 'lucide-react';

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
    user?.plan === 'pro' ? 'text-violet-500' : user?.plan === 'basic' ? 'text-blue-500' : 'text-text-tertiary';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* header */}
      <div>
        <h1 className="text-text-primary text-2xl font-semibold">Settings</h1>
        <p className="text-text-secondary mt-1 text-sm">Manage your account, security, and preferences.</p>
      </div>

      {/* ── PROFILE ──────────────────────────────────── */}
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2.5">
          <User className="text-text-tertiary h-5 w-5" />
          <div>
            <h2 className="text-text-primary text-lg font-semibold">Profile</h2>
            <p className="text-text-secondary text-xs">Your personal information</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Full Name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-text-secondary block text-xs font-medium">
              Email Address
            </label>
            <div className="relative flex items-center">
              <input
                id="email"
                type="text"
                value={user?.email || ''}
                readOnly
                className="border-border text-text-tertiary placeholder:text-text-tertiary h-9 w-full cursor-default rounded-lg border bg-transparent px-3 text-sm opacity-70"
              />
              <div className="absolute right-3">
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500 uppercase">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSaveProfile} disabled={profileLoading || name === user?.name} size="md">
              {profileLoading ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : profileSaved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {profileLoading ? 'Saving...' : profileSaved ? 'Saved' : 'Save Changes'}
            </Button>

            {profileError && <p className="text-xs text-red-500">{profileError}</p>}
          </div>
        </div>
      </Card>

      {/* ── EMAIL VERIFICATION ───────────────────────── */}
      {!user?.emailVerified && (
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-2.5">
            <Mail className="text-text-tertiary h-5 w-5" />
            <div>
              <h2 className="text-text-primary text-lg font-semibold">Email Verification</h2>
              <p className="text-text-secondary text-xs">Verify your email to unlock all features</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-text-secondary text-sm">
              Your email address is not verified. Some features may be limited until you verify it.
            </p>
            <div className="mt-4">
              {verificationSent ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                  <Check className="h-4 w-4" />
                  Verification email sent — check your inbox
                </div>
              ) : (
                <>
                  <Button onClick={handleSendVerification} disabled={verificationLoading} size="md">
                    {verificationLoading && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    {verificationLoading ? 'Sending...' : 'Send Verification Email'}
                  </Button>
                  {verificationError && <p className="mt-2 text-xs text-red-500">{verificationError}</p>}
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── SECURITY / PASSWORD ──────────────────────── */}
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2.5">
          <Lock className="text-text-tertiary h-5 w-5" />
          <div>
            <h2 className="text-text-primary text-lg font-semibold">Password</h2>
            <p className="text-text-secondary text-xs">Update your password to keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="New Password"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                        level <= strength ? colors[strength - 1] : 'bg-bg-secondary'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-text-tertiary text-[11px]">
                Use 8+ characters with uppercase, numbers, and symbols for stronger security
              </p>
            </div>
          )}

          {passwordError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-500">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-500">
              <Check className="h-4 w-4" /> {passwordMessage}
            </div>
          )}

          <Button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            size="md"
          >
            {passwordLoading && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      {/* ── PLAN & SUBSCRIPTION ──────────────────────── */}
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2.5">
          <Sparkles className="text-text-tertiary h-5 w-5" />
          <div>
            <h2 className="text-text-primary text-lg font-semibold">Subscription</h2>
            <p className="text-text-secondary text-xs">Your current plan and billing</p>
          </div>
        </div>

        <div className="border-border bg-bg-primary flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-text-tertiary h-5 w-5 shrink-0" />
            <div>
              <p className="text-text-primary text-sm font-medium">
                Current Plan: <span className={planColor}>{planLabel}</span>
              </p>
              <p className="text-text-tertiary mt-0.5 text-xs">
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
            <Button variant="secondary" size="sm">
              {user?.plan === 'none' ? 'Upgrade' : 'Manage Billing'}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </Card>

      {/* ── DANGER ZONE ──────────────────────────────── */}
      <Card padding="lg" className="border-red-500/20">
        <div className="mb-5 flex items-center gap-2.5">
          <Trash2 className="h-5 w-5 text-red-500" />
          <div>
            <h2 className="text-text-primary text-lg font-semibold">Danger Zone</h2>
            <p className="text-text-secondary text-xs">Irreversible actions</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-text-primary text-sm font-medium">Delete Account</p>
            <p className="text-text-secondary mt-0.5 text-xs">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            className="shrink-0"
            onClick={() => alert('Please contact support to delete your account.')}
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
