// app/admin/orders/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminOrdersClient from '@/components/admin/AdminOrdersClient';

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(*))')
    .order('created_at', { ascending: false });

  return <AdminOrdersClient initialOrders={orders || []} />;
}
