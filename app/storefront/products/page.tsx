// app/storefront/products/page.tsx
import { createClient } from '@/lib/supabase/server';
import ProductsClient from '@/components/storefront/ProductsClient';
import type { Product } from '@/types';

export const revalidate = 30;

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="bg-cream min-h-screen">
      <ProductsClient products={(products as Product[]) || []} />
    </div>
  );
}
