'use client';
// app/auth/reset-password/page.tsx
import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <Link href="/storefront">
          <h1 className="font-serif text-5xl text-flora-brown">Chrish Flora</h1>
        </Link>
        <p className="font-sans text-sm text-gold-700 tracking-widest uppercase mt-2">
          Set New Password
        </p>
      </div>
      <div className="bg-white shadow-xl p-8">
        <h2 className="font-serif text-2xl text-flora-brown mb-6">Setup Password</h2>
        
        {success ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4 rounded text-center">
              Password updated successfully! Redirecting to login...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                className="input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3">
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #BEC96A 0%, #C8CC7A 60%, #d4d880 100%)' }}
    >
      <Suspense fallback={<div className="text-white text-center text-sm font-serif">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
