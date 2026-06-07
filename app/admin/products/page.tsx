// app/admin/products/page.tsx
import { createClient } from '@/lib/supabase/server';
import AdminProductsClient from '@/components/admin/AdminProductsClient';

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('*, product:products(name)')
    .order('created_at', { ascending: false });

  return <AdminProductsClient initialProducts={products || []} initialReviews={reviews || []} />;
}
