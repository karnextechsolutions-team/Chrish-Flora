// app/admin/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { data: recentOrders },
    { data: products },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('products')
      .select('id, name, quantity, price')
      .eq('is_active', true)
      .order('quantity', { ascending: true })
      .limit(5),
  ]);

  return (
    <AdminDashboardClient
      totalOrders={totalOrders || 0}
      pendingOrders={pendingOrders || 0}
      recentOrders={recentOrders || []}
      lowStockProducts={products || []}
    />
  );
}
