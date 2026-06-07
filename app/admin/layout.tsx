'use client';
// app/admin/layout.tsx
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPos = pathname === '/admin/pos';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuOpen={() => setSidebarOpen(true)} />
        <main className={`flex-1 ${isPos ? 'p-0 overflow-hidden' : 'p-6 lg:p-8 overflow-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
