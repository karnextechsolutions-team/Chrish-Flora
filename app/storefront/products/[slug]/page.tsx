// app/storefront/products/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/storefront/ProductDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch product
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!product) {
    notFound();
  }

  // Fetch user session for review submission gate
  const { data: { session } } = await supabase.auth.getSession();

  // Fetch approved reviews
  const { data: reviews } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  // Fetch related products (same category, excluding current product)
  let relatedProducts = [];
  if (product.category) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', product.category)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(3);
    if (data) relatedProducts = data;
  }

  return (
    <ProductDetailClient 
      product={product} 
      initialReviews={reviews || []} 
      relatedProducts={relatedProducts}
      userId={session?.user?.id}
    />
  );
}
