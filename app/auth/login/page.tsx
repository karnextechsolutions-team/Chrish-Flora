// app/auth/login/page.tsx
import LoginForm from '@/components/ui/LoginForm';
import Link from 'next/link';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #BEC96A 0%, #C8CC7A 60%, #d4d880 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/storefront">
            <h1 className="font-serif text-5xl sm:text-6xl text-flora-brown">Chrish Flora</h1>
          </Link>
          <p className="font-sans text-sm text-gold-700 tracking-widest uppercase mt-2">
            Sign In
          </p>
        </div>
        <div className="bg-white shadow-xl p-6 md:p-8">
          <h2 className="font-serif text-2xl text-flora-brown mb-6">Welcome Back</h2>
          <Suspense fallback={<div className="text-center text-sm">Loading...</div>}>
            <LoginForm />
          </Suspense>
          <div className="mt-6 text-center text-sm font-sans text-flora-brown/70">
            Don't have an account? <Link href="/auth/register" className="text-gold-600 hover:underline">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
