'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AccountNavigationProps {
  fullName: string;
  email: string;
}

export default function AccountNavigation({ fullName, email }: AccountNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/storefront');
  };

  const navItems = [
    { label: 'Overview', href: '/storefront/account', icon: LayoutDashboard, exact: true },
    { label: 'My Orders', href: '/storefront/account/orders', icon: ShoppingBag, exact: false },
    { label: 'Settings', href: '/storefront/account/settings', icon: Settings, exact: false },
  ];

  const checkActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const initialLetter = fullName ? fullName.charAt(0).toUpperCase() : '?';

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[240px] border-r border-gray-100 bg-white min-h-[calc(100vh-72px)] p-6 shrink-0">
        {/* User Card */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-gray-50 mb-6">
          <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#C8CC7A] to-[#C9962A] text-white flex items-center justify-center font-serif text-3xl font-bold shadow-md uppercase select-none mb-3">
            {initialLetter}
          </div>
          <h3 className="font-serif text-lg font-bold text-[#5C4A00] truncate max-w-full leading-tight">
            {fullName || 'Customer'}
          </h3>
          <p className="text-xs text-[#5C4A00]/50 truncate max-w-full mt-1">
            {email}
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = checkActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-sans font-medium transition-all rounded-lg border-l-[3px] ${
                  isActive
                    ? 'bg-gold-50/40 border-[#C9962A] text-[#C9962A]'
                    : 'border-transparent text-[#5C4A00]/60 hover:text-[#C9962A] hover:bg-gray-50/50'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#C9962A]' : 'text-[#5C4A00]/40'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Sign Out */}
        <div className="pt-6 border-t border-gray-50 mt-auto">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-sans font-medium text-red-500 hover:text-red-700 hover:bg-red-50/30 transition-all rounded-lg"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TAB BAR */}
      <div className="md:hidden sticky top-[60px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = checkActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-sans font-medium gap-1 transition-all border-b-2 relative ${
                  isActive
                    ? 'border-[#C9962A] text-[#C9962A]'
                    : 'border-transparent text-[#5C4A00]/50 hover:text-[#C9962A]'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
