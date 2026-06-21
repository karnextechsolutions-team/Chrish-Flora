// app/admin/addons/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminAddonsClient from '@/components/admin/AdminAddonsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAddonsPage() {
  const supabase = await createClient();
  const { data: addons } = await supabase
    .from('product_addons')
    .select('*')
    .order('sort_order', { ascending: true });

  return <AdminAddonsClient initialAddons={addons || []} />;
}
