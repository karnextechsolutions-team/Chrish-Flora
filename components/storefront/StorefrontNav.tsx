'use client';
// components/storefront/StorefrontNav.tsx
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import CartDrawer from './CartDrawer';
import { createClient } from '@/lib/supabase/client';

export default function StorefrontNav() {
  const { totalItems } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
        if (data) setProfile(data);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-flora-cream/95 backdrop-blur-sm border-b border-flora-cream-dark">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/storefront" className="flex items-center gap-3 group">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif font-bold text-flora-cream"
              style={{ background: 'var(--flora-gold)' }}
            >
              C
            </div>
            <span className="font-serif text-2xl text-flora-brown tracking-wide group-hover:text-gold-600 transition-colors">
              Chrish Flora
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <Link
              href="/storefront"
              className="font-sans text-sm text-flora-brown/70 hover:text-gold-600 transition-colors tracking-wide"
            >
              Home
            </Link>
            <Link
              href="/storefront/products"
              className="font-sans text-sm text-flora-brown/70 hover:text-gold-600 transition-colors tracking-wide"
            >
              Collections
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-sans text-flora-brown/70 hover:text-gold-600 transition-colors min-h-[44px] px-2"
                >
                  <User size={18} />
                  <span>{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-flora-cream-dark shadow-xl py-2 z-50">
                    <div className="px-4 py-2 text-xs text-flora-brown/50 border-b border-flora-cream-dark mb-2">
                      Signed in as {profile?.full_name || 'User'}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-flora-brown hover:bg-flora-cream/50 transition-colors h-11"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:flex items-center gap-2 text-sm font-sans text-flora-brown/70 hover:text-gold-600 transition-colors min-h-[44px] px-2"
              >
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="relative w-11 h-11 flex items-center justify-center text-flora-brown hover:text-gold-600 transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag size={22} />
              {totalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-gold-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden w-11 h-11 flex items-center justify-center text-flora-brown"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-flora-cream-dark bg-flora-cream py-4 px-6 flex flex-col gap-4">
            <Link href="/storefront" className="font-sans text-sm text-flora-brown/70 py-2" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/storefront/products" className="font-sans text-sm text-flora-brown/70 py-2" onClick={() => setMenuOpen(false)}>Collections</Link>
            {user ? (
              <button onClick={handleSignOut} className="font-sans text-sm text-flora-brown/70 text-left py-2">Sign Out ({profile?.full_name})</button>
            ) : (
              <Link href="/auth/login" className="font-sans text-sm text-flora-brown/70 py-2" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
