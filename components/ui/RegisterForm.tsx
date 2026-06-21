'use client';

// components/ui/RegisterForm.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', textClass: '', barColor: '' };
    let score = 0;
    
    // length criteria
    if (pwd.length >= 6) score += 1;
    // uppercase check
    if (/[A-Z]/.test(pwd)) score += 1;
    // digit check
    if (/[0-9]/.test(pwd)) score += 1;
    // special character check
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    
    // Map to 1-4 scale
    if (score <= 1) return { score: 1, label: 'Weak', textClass: 'text-red-500', barColor: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', textClass: 'text-orange-500', barColor: 'bg-orange-500' };
    if (score === 3) return { score: 3, label: 'Good', textClass: 'text-gold', barColor: 'bg-gold' };
    if (score >= 4) return { score: 4, label: 'Strong', textClass: 'text-green-600', barColor: 'bg-green-600' };
    
    return { score: 1, label: 'Weak', textClass: 'text-red-500', barColor: 'bg-red-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError('');
    const supabase = createClient();
    
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create/update profile record to include role and phone number
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, full_name: fullName, role: 'customer', phone: phone })
        .select()
        .single();
        
      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation error:', profileError);
      }
    }

    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push('/storefront');
    }
    router.refresh();
  };

  const loginHref = returnTo 
    ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}` 
    : '/auth/login';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Full Name */}
      <div>
        <label className="block text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold mb-2 select-none">
          Full Name
        </label>
        <input
          type="text"
          required
          placeholder="First Last"
          className="w-full bg-gray-100 border-[1.5px] border-transparent rounded-xl px-4 py-3.5 font-sans text-base text-brown-dark placeholder-brown/30 outline-none transition-all duration-200 focus:bg-white focus:border-gold/25 focus:ring-4 focus:ring-gold/[0.08]"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>
      
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

      {/* Phone Number */}
      <div>
        <label className="block text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold mb-2 select-none">
          Phone Number
        </label>
        <input
          type="tel"
          inputMode="tel"
          required
          placeholder="+94 77 123 4567"
          className="w-full bg-gray-100 border-[1.5px] border-transparent rounded-xl px-4 py-3.5 font-sans text-base text-brown-dark placeholder-brown/30 outline-none transition-all duration-200 focus:bg-white focus:border-gold/25 focus:ring-4 focus:ring-gold/[0.08]"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      {/* Password */}
      <div>
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
            autoComplete="new-password"
          />
          {/* Eye Toggle */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brown/30 hover:text-gold transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* PASSWORD STRENGTH SEGMENT INDICATOR */}
        {password && (
          <div className="mt-2 space-y-1 select-none animate-card-slide-up">
            <div className="grid grid-cols-4 gap-1 h-[4px]">
              {[1, 2, 3, 4].map(seg => (
                <div 
                  key={seg} 
                  className={`h-full rounded-full transition-all duration-300 ${
                    seg <= passwordStrength.score ? passwordStrength.barColor : 'bg-gray-200'
                  }`} 
                />
              ))}
            </div>
            <span className={`block text-[10px] font-sans font-bold uppercase tracking-wider ${passwordStrength.textClass}`}>
              {passwordStrength.label} Password
            </span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-[10px] font-sans font-semibold tracking-[0.25em] uppercase text-gold mb-2 select-none">
          Confirm Password
        </label>
        <div className="relative w-full">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            placeholder="••••••••"
            className="w-full bg-gray-100 border-[1.5px] border-transparent rounded-xl pl-4 pr-12 py-3.5 font-sans text-base text-brown-dark placeholder-brown/30 outline-none transition-all duration-200 focus:bg-white focus:border-gold/25 focus:ring-4 focus:ring-gold/[0.08]"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {/* Eye Toggle */}
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-brown/30 hover:text-gold transition-colors focus:outline-none"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#FFF0F0] border border-[#FFD0D0] rounded-xl p-3 flex gap-2 items-center text-red-700 animate-card-slide-up">
          <AlertCircle size={16} className="text-[#C0392B] shrink-0" />
          <span className="font-sans text-sm font-semibold text-[#C0392B] leading-tight">
            {error}
          </span>
        </div>
      )}

      {/* Register CTA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold hover:bg-[#8B6914] text-white hover:scale-[1.01] active:scale-100 hover:shadow-[0_6px_20px_rgba(201,150,42,0.40)] active:shadow-[0_2px_8px_rgba(201,150,42,0.25)] rounded-xl py-4 font-sans text-sm font-bold tracking-[0.15em] uppercase transition-all duration-200 shadow-[0_4px_16px_rgba(201,150,42,0.30)] flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed select-none"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-2 select-none">
        <div className="flex-1 h-[1px] bg-gray-200" />
        <span className="font-sans text-xs text-brown/30 font-bold uppercase tracking-wider">or</span>
        <div className="flex-1 h-[1px] bg-gray-200" />
      </div>

      {/* Login link */}
      <div className="text-center font-sans text-sm text-brown/50 pt-1 select-none">
        Already have an account?{' '}
        <Link href={loginHref} className="text-gold font-bold hover:underline">
          Sign in
        </Link>
      </div>

    </form>
  );
}
