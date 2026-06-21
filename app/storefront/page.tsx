// app/storefront/page.tsx
import { createClient } from '@/lib/supabase/server';
import StorefrontHomeClient from '@/components/storefront/StorefrontHomeClient';

export const revalidate = 60;

export default async function StorefrontHome() {
  const supabase = await createClient();
  
  // Fetch active products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6);

  // Fetch active promotional banners
  const { data: banners } = await supabase
    .from('promotional_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <StorefrontHomeClient 
      products={products || []} 
      banners={banners || []} 
    />
  );
}
