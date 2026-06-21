'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle, User, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Status messages
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login?returnTo=/storefront/account/settings');
        return;
      }
      setUser(session.user);
      setEmail(session.user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfileSuccess('✓ Profile updated!');
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('✓ Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete account.');
      }
      // Log out client side and redirect
      await supabase.auth.signOut();
      router.push('/storefront');
      window.location.reload();
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed.');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-[#C9962A]" size={32} />
        <p className="text-xs font-sans text-[#5C4A00]/50 tracking-wider uppercase font-semibold">
          Loading settings...
        </p>
      </div>
    );
  }

  const initialLetter = fullName ? fullName.charAt(0).toUpperCase() : '?';

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Title */}
      <div className="border-b border-gray-50 pb-5">
        <h1 className="font-serif text-3xl text-[#5C4A00]">
          Account Settings
        </h1>
        <p className="text-xs text-[#5C4A00]/55 font-sans mt-1">
          Manage your personal details, email credentials, and passwords.
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C8CC7A] to-[#C9962A] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-md uppercase select-none shrink-0">
            {initialLetter}
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#5C4A00]">Profile Photo</h3>
            <p className="text-xs text-[#5C4A00]/50 font-sans mt-0.5">
              Avatar photo is derived from your account initials.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {profileSuccess && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-sans px-4 py-3 rounded-xl">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-sans px-4 py-3 rounded-xl">
              {profileError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#C9962A] transition-colors"
                placeholder="Your full name"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#C9962A] transition-colors"
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60 flex items-center gap-1.5">
              Email Address <Lock size={10} className="text-[#5C4A00]/40" />
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={email}
                className="w-full bg-gray-100/70 border border-gray-150 rounded-xl pl-4 pr-10 py-3 text-sm font-sans text-gray-500 cursor-not-allowed select-none"
              />
              <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">
              Login email cannot be changed. Contact support for updates.
            </p>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="bg-[#C9962A] hover:bg-[#B28221] text-white text-xs font-sans uppercase tracking-widest font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {profileLoading && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </form>
      </section>

      {/* Password Section */}
      <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#5C4A00]">Change Password</h3>
          <p className="text-xs text-[#5C4A00]/50 font-sans mt-0.5">
            Update your account login password.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-xs font-sans px-4 py-3 rounded-xl">
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-sans px-4 py-3 rounded-xl">
              {passwordError}
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#C9962A] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-150 rounded-xl pl-4 pr-10 py-3 text-sm font-sans focus:outline-none focus:border-[#C9962A] transition-colors"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-sans font-bold tracking-wider text-[#5C4A00]/60">
                Confirm Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-150 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-[#C9962A] transition-colors"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-[#C9962A] hover:bg-[#B28221] text-white text-xs font-sans uppercase tracking-widest font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {passwordLoading && <Loader2 size={14} className="animate-spin" />}
            Update Password
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50/10 rounded-2xl p-6 border border-red-150 shadow-sm space-y-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-red-700">Danger Zone</h3>
          <p className="text-xs text-[#5C4A00]/60 font-sans mt-0.5">
            Irreversible actions regarding your membership.
          </p>
        </div>
        <p className="text-xs text-[#5C4A00]/60 font-sans leading-relaxed">
          This will permanently delete your account, credentials, profiles, and detach you from all order histories. This action cannot be undone.
        </p>
        <button
          onClick={() => {
            setDeleteConfirmText('');
            setDeleteError('');
            setShowDeleteModal(true);
          }}
          className="border border-red-200 hover:bg-red-50 text-red-600 text-xs font-sans uppercase tracking-widest font-bold py-3.5 px-6 rounded-xl transition-all"
        >
          Delete Account
        </button>
      </section>

      {/* Account Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="font-serif text-xl font-bold">Delete Account?</h3>
            </div>

            <div className="space-y-3 font-sans text-xs text-[#5C4A00]/70 leading-relaxed">
              <p>
                Are you absolutely sure you want to delete your account? This action is <strong className="text-red-700">permanent</strong> and will remove all profile details.
              </p>
              <p>
                To confirm, type <strong className="text-red-700 select-all">DELETE MY ACCOUNT</strong> below:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-sans p-3 rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-200 text-white text-xs font-sans uppercase tracking-widest font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-sans uppercase tracking-widest font-bold py-3 px-4 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
