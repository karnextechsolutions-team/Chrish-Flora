// app/auth/login/page.tsx
import LoginForm from '@/components/ui/LoginForm';
import Link from 'next/link';
import { Suspense } from 'react';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#FEFCF5] relative overflow-hidden select-none">
      
      {/* DECORATIVE BACKGROUND ELEMENTS */}
      {/* Top-left corner blob */}
      <div 
        className="absolute w-[300px] h-[300px] top-[-80px] left-[-80px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #C8CC7A20 0%, transparent 70%)' }}
      />
      {/* Bottom-right corner blob */}
      <div 
        className="absolute w-[250px] h-[250px] bottom-[-60px] right-[-60px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #C9962A15 0%, transparent 70%)' }}
      />
      {/* Top-right small circle */}
      <div 
        className="absolute w-[120px] h-[120px] top-[40px] right-[60px] border border-[#C9962A15] rounded-full pointer-events-none z-0"
      />
      {/* Bottom-left dots */}
      <div className="absolute bottom-[80px] left-[40px] flex flex-col gap-[10px] z-0 pointer-events-none">
        <div className="w-[6px] h-[6px] rounded-full bg-[#C8CC7A40]" />
        <div className="w-[6px] h-[6px] rounded-full bg-[#C8CC7A40]" />
        <div className="w-[6px] h-[6px] rounded-full bg-[#C8CC7A40]" />
      </div>

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-[420px] relative z-10">
        
        {/* TOP BRAND SECTION */}
        <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <Link href="/storefront" className="inline-block focus:outline-none">
            {/* Gold diamond icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold mx-auto mb-4 hover:scale-115 transition-transform duration-200">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="currentColor" />
            </svg>
            <div className="flex items-center justify-center font-serif text-3xl text-brown-dark leading-none">
              <span className="font-light">Chrish</span>
              <span className="font-semibold italic text-gold ml-1.5">Flora</span>
            </div>
          </Link>
          <p className="font-sans text-[11px] tracking-[0.25em] text-brown/40 uppercase mt-2 select-none font-semibold">
            Sri Lanka's Premier Floral Boutique
          </p>
        </div>

        {/* LOGIN CARD */}
        <div 
          className="bg-white p-6 md:p-8 shadow-[0_8px_40px_rgba(92,74,0,0.10)] border border-[#F0EDE4] animate-card-slide-up"
          style={{ borderRadius: '24px', animationDelay: '150ms' }}
        >
          <div className="mb-6 select-none">
            <h2 className="font-serif text-2xl text-brown-dark font-medium mb-1">Welcome Back</h2>
            <p className="font-sans text-sm text-brown/50">Sign in to your account</p>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-brown/45 py-8 font-sans font-medium">Loading form...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* TRUST BADGES */}
        <div className="flex justify-center gap-6 mt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex flex-col items-center">
            <ShieldCheck size={16} className="text-gold/40" />
            <span className="font-sans text-[9px] text-brown/30 font-bold uppercase tracking-wider mt-1 select-none">Secure</span>
          </div>
          <div className="flex flex-col items-center">
            <Lock size={16} className="text-gold/40" />
            <span className="font-sans text-[9px] text-brown/30 font-bold uppercase tracking-wider mt-1 select-none">Private</span>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles size={16} className="text-gold/40" />
            <span className="font-sans text-[9px] text-brown/30 font-bold uppercase tracking-wider mt-1 select-none">Trusted</span>
          </div>
        </div>

      </div>
    </div>
  );
}
