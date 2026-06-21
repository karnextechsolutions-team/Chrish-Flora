'use client';

// components/ui/LoginForm.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

export default function LoginForm() {
  const [activeTab, setActiveTab] = useState<'customer' | 'staff'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const registerHref = returnTo 
    ? `/auth/register?returnTo=${encodeURIComponent(returnTo)}` 
    : '/auth/register';

  return (
    <div className="space-y-6">
      
      {/* TAB SWITCHER */}
      <div className="bg-gray-100 rounded-xl p-1 grid grid-cols-2 mb-6 select-none">
        <button
          type="button"
          onClick={() => { setActiveTab('customer'); setError(''); }}
          className={`py-2.5 rounded-lg text-sm font-sans font-medium text-center transition-all duration-200 cursor-pointer focus:outline-none ${
            activeTab === 'customer'
              ? 'bg-white text-gold shadow-[0_2px_8px_rgba(92,74,0,0.10)] font-semibold'
              : 'bg-transparent text-brown/40 hover:text-brown/70'
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('staff'); setError(''); }}
          className={`py-2.5 rounded-lg text-sm font-sans font-medium text-center transition-all duration-200 cursor-pointer focus:outline-none ${
            activeTab === 'staff'
              ? 'bg-white text-gold shadow-[0_2px_8px_rgba(92,74,0,0.10)] font-semibold'
              : 'bg-transparent text-brown/40 hover:text-brown/70'
          }`}
        >
          Staff Login
        </button>
      </div>

      {/* LOGIN FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email Address */}
        <div>
          <label className="block text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold mb-2 select-none">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="email@example.com"
            className="w-full bg-gray-100 border-[1.5px] border-transparent rounded-xl px-4 py-3.5 font-sans text-base text-brown-dark placeholder-brown/30 outline-none transition-all duration-200 focus:bg-white focus:border-gold/25 focus:ring-4 focus:ring-gold/[0.08]"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        
        {/* Password */}
        <div className="relative">
          <label className="block text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold mb-2 select-none">
            Password
          </label>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full bg-gray-100 border-[1.5px] border-transparent rounded-xl pl-4 pr-12 py-3.5 font-sans text-base text-brown-dark placeholder-brown/30 outline-none transition-all duration-200 focus:bg-white focus:border-gold/25 focus:ring-4 focus:ring-gold/[0.08]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {/* Eye toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brown/30 hover:text-gold transition-colors focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Staff Specific Warnings / Reset Link */}
        {activeTab === 'staff' ? (
          <div className="space-y-4 pt-1">
            {/* Staff info box */}
            <div className="bg-olive-light/50 rounded-xl p-3 flex gap-2 items-center border border-olive/10 select-none">
              <Info size={14} className="text-gold shrink-0" />
              <p className="font-sans text-xs text-brown/70 leading-relaxed font-medium">
                Staff accounts are managed by your administrator.
              </p>
            </div>
            
            {/* Forgot password */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-sans text-xs text-gold/70 hover:text-gold hover:underline focus:outline-none font-bold tracking-wide"
              >
                Forgot password?
              </button>
            </div>
          </div>
        ) : (
          /* Customer Forgot Password */
          <div className="text-right pt-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-sans text-xs text-gold/70 hover:text-gold hover:underline focus:outline-none font-bold tracking-wide"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="bg-[#FFF0F0] border border-[#FFD0D0] rounded-xl p-3 flex gap-2 items-center text-red-700 animate-card-slide-up">
            <AlertCircle size={16} className="text-[#C0392B] shrink-0" />
            <span className="font-sans text-sm font-semibold text-[#C0392B] leading-tight">
              {error}
            </span>
          </div>
        )}

        {/* Sign In CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-[#8B6914] text-white hover:scale-[1.01] active:scale-100 hover:shadow-[0_6px_20px_rgba(201,150,42,0.40)] active:shadow-[0_2px_8px_rgba(201,150,42,0.25)] rounded-xl py-4 font-sans text-sm font-bold tracking-[0.15em] uppercase transition-all duration-200 shadow-[0_4px_16px_rgba(201,150,42,0.30)] flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed select-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2 select-none">
          <div className="flex-1 h-[1px] bg-gray-200" />
          <span className="font-sans text-xs text-brown/30 font-bold uppercase tracking-wider">or</span>
          <div className="flex-1 h-[1px] bg-gray-200" />
        </div>

        {/* Register link */}
        <div className="text-center font-sans text-sm text-brown/50 pt-1 select-none">
          Don't have an account?{' '}
          <Link href={registerHref} className="text-gold font-bold hover:underline">
            Create one
          </Link>
        </div>

      </form>
    </div>
  );
}
