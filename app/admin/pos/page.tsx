// app/admin/pos/page.tsx
import { createClient } from '@/lib/supabase/server';
import POSClient from '@/components/admin/POSClient';

export default async function POSPage() {
  const supabase = await createClient();
  
  // Fetch active products to display in the POS terminal grid
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return <POSClient initialProducts={products || []} />;
}
