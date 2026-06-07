'use client';
// components/ui/LoginForm.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error: err, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      // Retrieve user's role from profiles table to decide redirect route
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      if (profile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (profile?.role === 'staff') {
        router.push('/admin/pos');
      } else {
        // Customer redirect
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push('/storefront');
        }
      }
      router.refresh();
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to receive the password reset link.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    setLoading(false);
    
    if (resetError) {
      setError(resetError.message);
    } else {
      alert('A password reset link has been successfully sent to your email.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Login Tab Selectors */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => { setActiveTab('customer'); setError(''); }}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all text-center
            ${activeTab === 'customer'
              ? 'border-gold-500 text-flora-brown font-serif text-base'
              : 'border-transparent text-gray-400 hover:text-gray-600 font-sans'}`}
        >
          Customer Login
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('staff'); setError(''); }}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all text-center
            ${activeTab === 'staff'
              ? 'border-gold-500 text-flora-brown font-serif text-base'
              : 'border-transparent text-gray-400 hover:text-gray-600 font-sans'}`}
        >
          Staff Login
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email Address</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="label mb-0">Password</label>
            {activeTab === 'staff' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-gold-600 hover:text-gold-700 hover:underline"
              >
                Forgot Password?
              </button>
            )}
          </div>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-gold w-full h-[52px] flex items-center justify-center">
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
