// app/admin/sales/page.tsx
import { createClient } from '@/lib/supabase/server';
import SalesClient from '@/components/admin/SalesClient';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, sku, image_url))')
    .order('created_at', { ascending: false });

  const { data: settings } = await supabase
    .from('store_settings')
    .select('*')
    .single();

  return <SalesClient initialOrders={orders || []} storeSettings={settings} />;
}
