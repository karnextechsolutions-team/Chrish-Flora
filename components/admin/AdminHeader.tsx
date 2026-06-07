'use client';
// components/admin/AdminHeader.tsx
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';

interface Props {
  onMenuOpen?: () => void;
}

export default function AdminHeader({ onMenuOpen }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuOpen && (
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-flora-brown focus:outline-none"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="font-serif text-lg sm:text-xl text-flora-brown">Management Console</h1>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm font-sans text-gray-500 hover:text-red-600 transition-colors"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </header>
  );
}
