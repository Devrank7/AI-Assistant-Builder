'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
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
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile section */}
      <div className="rounded-xl border border-white/10 bg-[#12121a] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Name</label>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              {user?.name || '-'}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Email</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {user?.email || '-'}
              </div>
              {user?.emailVerified ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-400">
                  Verified
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-400">
                  Unverified
                </span>
              )}
            </div>
          </div>

          {!user?.emailVerified && (
            <div>
              {verificationSent ? (
                <p className="text-sm text-green-400">Verification email sent. Check your inbox.</p>
              ) : (
                <>
                  <button
                    onClick={handleSendVerification}
                    disabled={verificationLoading}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    {verificationLoading ? 'Sending...' : 'Send Verification Email'}
                  </button>
                  {verificationError && <p className="mt-2 text-sm text-red-400">{verificationError}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change password section */}
      <div className="rounded-xl border border-white/10 bg-[#12121a] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1 block text-sm text-gray-400">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm text-gray-400">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm text-gray-400">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Confirm new password"
            />
          </div>

          {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
          {passwordMessage && <p className="text-sm text-green-400">{passwordMessage}</p>}

          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
