'use client';
// components/admin/AdminSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, ShoppingBag, Package, Settings, Store, Monitor, BarChart2, Users, UserCheck, X
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'staff'] },
  { href: '/admin/orders',    icon: ShoppingBag,      label: 'Orders',    roles: ['admin', 'staff'] },
  { href: '/admin/pos',       icon: Monitor,          label: 'POS',       roles: ['admin', 'staff'] },
  { href: '/admin/products',  icon: Package,          label: 'Products',  roles: ['admin'] },
  { href: '/admin/reports',   icon: BarChart2,        label: 'Reports',   roles: ['admin'] },
  { href: '/admin/staff',     icon: Users,            label: 'Staff',     roles: ['admin'] },
  { href: '/admin/customers', icon: UserCheck,        label: 'Customers', roles: ['admin'] },
  { href: '/admin/settings',  icon: Settings,         label: 'Settings',  roles: ['admin'] },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setRole(profile.role);
        }
      }
    };
    fetchRole();
  }, []);

  const filteredItems = role ? navItems.filter(item => item.roles.includes(role)) : [];

  return (
    <>
      {/* 1. Inline Sidebar (Tablet & Desktop) */}
      <aside className="hidden md:flex flex-col w-[60px] lg:w-[280px] bg-flora-brown text-flora-cream min-h-screen sticky top-0 shrink-0 border-r border-white/5 transition-all duration-200">
        {/* Brand */}
        <div className="px-4 lg:px-6 py-6 border-b border-white/10 flex items-center justify-center lg:justify-start">
          <div className="lg:hidden">
            <p className="font-serif text-xl tracking-wide text-flora-cream font-bold">CF</p>
          </div>
          <div className="hidden lg:block">
            <p className="font-serif text-2xl tracking-wide text-flora-cream">Chrish Flora</p>
            <p className="text-xs text-flora-cream/40 font-sans tracking-widest uppercase mt-0.5">
              Admin Console
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-2 lg:px-3 space-y-1">
          {filteredItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 text-sm font-sans transition-all relative group
                  ${active
                    ? 'bg-gold-600 text-white'
                    : 'text-flora-cream/60 hover:bg-white/10 hover:text-flora-cream'}`}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                {/* Tooltip for Tablet */}
                <div className="lg:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-flora-brown border border-white/10 text-white text-xs px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 rounded">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Storefront Link */}
        <div className="px-2 lg:px-3 pb-6">
          <Link
            href="/storefront"
            target="_blank"
            className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 text-sm font-sans text-flora-cream/50 hover:text-flora-cream transition-colors relative group"
          >
            <Store size={18} className="shrink-0" />
            <span className="hidden lg:inline">View Storefront ↗</span>
            {/* Tooltip for Tablet */}
            <div className="lg:hidden absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-flora-brown border border-white/10 text-white text-xs px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 rounded">
              View Storefront
            </div>
          </Link>
        </div>
      </aside>

      {/* 2. Mobile / Tablet Overlay Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />

          {/* Drawer Content */}
          <div className="relative w-[280px] bg-flora-brown text-flora-cream h-full flex flex-col shadow-2xl z-10 animate-slide-in">
            {/* Drawer Header */}
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="font-serif text-2xl tracking-wide text-flora-cream">Chrish Flora</p>
                <p className="text-xs text-flora-cream/40 font-sans tracking-widest uppercase mt-0.5">
                  Admin Console
                </p>
              </div>
              <button onClick={onClose} className="p-1 text-flora-cream/50 hover:text-flora-cream focus:outline-none">
                <X size={20} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scroll-touch">
              {filteredItems.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-sans transition-all
                      ${active
                        ? 'bg-gold-600 text-white'
                        : 'text-flora-cream/60 hover:bg-white/10 hover:text-flora-cream'}`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Storefront Link */}
            <div className="px-3 pb-6">
              <Link
                href="/storefront"
                target="_blank"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-flora-cream/50 hover:text-flora-cream transition-colors"
              >
                <Store size={18} className="shrink-0" />
                View Storefront ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
