'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Grid2x2, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { createClient } from '@/lib/supabase/client';

interface MobileBottomNavProps {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

export default function MobileBottomNav({ cartOpen, setCartOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    fetchUser();
  }, []);

  const isHomeActive = pathname === '/storefront';
  const isShopActive = pathname === '/storefront/products';
  const isAccountActive = pathname === '/auth/login' || pathname.startsWith('/storefront/account');

  const accountHref = user ? '/storefront/account' : '/auth/login';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden pb-[env(safe-area-inset-bottom)] h-[calc(64px+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(92,74,0,0.06)] transition-all duration-200">
      <div className="grid grid-cols-4 h-16 items-center w-full">
        {/* Home */}
        <Link
          href="/storefront"
          className="flex flex-col items-center justify-center relative h-full w-full select-none"
        >
          {isHomeActive && (
            <span className="absolute top-2 w-1.5 h-1.5 bg-gold rounded-full" />
          )}
          <div
            className={`flex flex-col items-center justify-center transition-colors duration-200 ${
              isHomeActive ? 'text-gold' : 'text-brown/35'
            }`}
          >
            <Home size={22} className="transition-transform duration-150 active:scale-90" />
            <span className="text-[10px] font-sans tracking-wide mt-1">Home</span>
          </div>
        </Link>

        {/* Shop */}
        <Link
          href="/storefront/products"
          className="flex flex-col items-center justify-center relative h-full w-full select-none"
        >
          {isShopActive && (
            <span className="absolute top-2 w-1.5 h-1.5 bg-gold rounded-full" />
          )}
          <div
            className={`flex flex-col items-center justify-center transition-colors duration-200 ${
              isShopActive ? 'text-gold' : 'text-brown/35'
            }`}
          >
            <Grid2x2 size={22} className="transition-transform duration-155 active:scale-90" />
            <span className="text-[10px] font-sans tracking-wide mt-1">Shop</span>
          </div>
        </Link>

        {/* Cart */}
        <button
          onClick={() => setCartOpen(true)}
          className="flex flex-col items-center justify-center relative h-full w-full select-none focus:outline-none"
        >
          {cartOpen && (
            <span className="absolute top-2 w-1.5 h-1.5 bg-gold rounded-full" />
          )}
          <div
            className={`flex flex-col items-center justify-center transition-colors duration-200 ${
              cartOpen ? 'text-gold' : 'text-brown/35'
            }`}
          >
            <div className="relative">
              <ShoppingBag size={22} className="transition-transform duration-155 active:scale-90" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-[14px] bg-gold text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center font-sans tracking-none border border-white">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-sans tracking-wide mt-1">Cart</span>
          </div>
        </button>

        {/* Account */}
        <Link
          href={accountHref}
          className="flex flex-col items-center justify-center relative h-full w-full select-none"
        >
          {isAccountActive && (
            <span className="absolute top-2 w-1.5 h-1.5 bg-gold rounded-full" />
          )}
          <div
            className={`flex flex-col items-center justify-center transition-colors duration-200 ${
              isAccountActive ? 'text-gold' : 'text-brown/35'
            }`}
          >
            <User size={22} className="transition-transform duration-155 active:scale-90" />
            <span className="text-[10px] font-sans tracking-wide mt-1">Account</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
