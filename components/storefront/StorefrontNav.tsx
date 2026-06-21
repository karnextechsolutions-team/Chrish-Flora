'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, User, Search } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import CartDrawer from './CartDrawer';
import { createClient } from '@/lib/supabase/client';

interface StorefrontNavProps {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export default function StorefrontNav({ cartOpen, setCartOpen }: StorefrontNavProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
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
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
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

  const navLinks = [
    { label: 'Home', href: '/storefront' },
    { label: 'Collections', href: '/storefront/products' },
    { label: 'Occasions', href: '/storefront#occasions' },
    { label: 'About', href: '/storefront#about' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 transition-all duration-200">
        
        {/* MOBILE HEADER (md:hidden) */}
        <div className="flex md:hidden items-center justify-between px-5 h-[60px] relative w-full">
          {/* Mobile Left: Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative w-11 h-11 flex items-center justify-start text-brown/60 hover:text-gold transition-colors focus:outline-none"
            aria-label="Open cart"
          >
            <ShoppingBag size={24} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute top-1 left-4 w-5 h-5 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile Center: Logo & Brand Name */}
          <Link href="/storefront" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 select-none">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold shrink-0">
              <circle cx="18" cy="18" r="4" fill="currentColor" />
              <circle cx="18" cy="11" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="18" cy="25" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="11" cy="18" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="25" cy="18" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="13" cy="13" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="23" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="13" cy="23" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="13" r="5" fill="currentColor" opacity="0.6" />
            </svg>
            <span className="font-serif italic text-xl text-brown-dark font-medium leading-none mt-0.5">
              Chrish Flora
            </span>
          </Link>

          {/* Mobile Right: Search & Menu togglers */}
          <div className="flex items-center gap-1">
            <button className="text-brown/60 hover:text-gold transition-colors p-2" aria-label="Search">
              <Search size={24} strokeWidth={1.5} />
            </button>
            <button
              className="text-brown/60 hover:text-gold transition-colors p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* DESKTOP HEADER (hidden on mobile) */}
        <div className="hidden md:flex max-w-7xl mx-auto px-6 h-[72px] items-center justify-between w-full">
          {/* Desktop Left: Logo */}
          <Link href="/storefront" className="flex items-center gap-2 select-none">
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold shrink-0">
              <circle cx="18" cy="18" r="4" fill="currentColor" />
              <circle cx="18" cy="11" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="18" cy="25" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="11" cy="18" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="25" cy="18" r="7" fill="currentColor" opacity="0.8" />
              <circle cx="13" cy="13" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="23" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="13" cy="23" r="5" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="13" r="5" fill="currentColor" opacity="0.6" />
            </svg>
            <span className="font-serif italic text-2xl text-brown-dark font-semibold leading-none">
              Chrish Flora
            </span>
          </Link>

          {/* Desktop Center: Navigation Links */}
          <nav className="flex items-center gap-8 h-full">
            {navLinks.map(link => {
              const isActive = link.href === '/storefront' 
                ? pathname === '/storefront'
                : pathname.startsWith(link.href.split('#')[0]);

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative flex items-center h-full text-sm font-sans tracking-wide font-medium transition-colors border-b-2 py-1 ${
                    isActive 
                      ? 'border-gold text-gold' 
                      : 'border-transparent text-brown/60 hover:text-gold hover:border-gold/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button className="text-brown/60 hover:text-gold transition-colors p-2" aria-label="Search">
              <Search size={20} strokeWidth={1.5} />
            </button>

            {/* Account / User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs font-sans tracking-wide text-brown hover:text-gold transition-colors min-h-[40px] px-2 font-medium"
                >
                  <User size={20} strokeWidth={1.5} />
                  <span>{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-float py-2 z-50 rounded-xl">
                    <div className="px-4 py-2 text-xs text-brown/40 border-b border-gray-200 mb-2">
                      Signed in as {profile?.full_name || 'User'}
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-brown hover:bg-gray-100 transition-colors h-11"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 text-xs font-sans tracking-wide text-brown hover:text-gold transition-colors min-h-[40px] px-2 font-medium"
              >
                <User size={20} strokeWidth={1.5} />
                <span>Sign In</span>
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 flex items-center justify-center text-brown/60 hover:text-gold transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gold text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FULL SCREEN MOBILE OVERLAY MENU */}
        {menuOpen && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col justify-between p-8 md:hidden animate-bloom">
            {/* Top row */}
            <div className="flex items-center justify-between w-full">
              <span className="font-serif italic text-2xl text-brown-dark">
                Chrish Flora
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-brown/60 hover:text-gold transition-colors"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Center Navigation Links */}
            <nav className="flex flex-col items-center justify-center gap-8 my-auto">
              {navLinks.map(link => (
                <Link 
                  key={link.label}
                  href={link.href} 
                  className="font-serif text-4xl text-brown-dark text-center relative py-2 group hover:text-gold transition-colors duration-250"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-250 origin-center" />
                </Link>
              ))}
            </nav>

            {/* Socials & Close */}
            <div className="flex flex-col items-center gap-6 mt-auto">
              <div className="flex items-center gap-6 text-xs text-brown/50 font-sans uppercase tracking-widest font-semibold">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-gold transition-colors">Instagram</a>
                <span>·</span>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-gold transition-colors">Facebook</a>
              </div>
              
              <button 
                onClick={() => setMenuOpen(false)}
                className="text-xs font-sans tracking-[0.25em] text-gold uppercase font-bold py-2 border-b border-gold/30 hover:border-gold transition-colors"
              >
                CLOSE MENU
              </button>
            </div>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
