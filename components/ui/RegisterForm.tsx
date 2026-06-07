'use client';
// components/ui/RegisterForm.tsx
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Full Name</label>
        <input
          type="text"
          required
          className="input"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>
      
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
        <label className="label">Phone Number</label>
        <input
          type="tel"
          required
          className="input"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <div>
        <label className="label">Password</label>
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
        <label className="label">Confirm Password</label>
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
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-gold w-full h-[52px] flex items-center justify-center">
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
