// app/storefront/products/page.tsx
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/storefront/ProductCard';
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
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-gold-600 font-sans text-xs tracking-[0.4em] uppercase mb-2">
          Full Collection
        </p>
        <h1 className="font-serif text-5xl text-flora-brown">Our Arrangements</h1>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {(products as Product[]).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 text-flora-brown/40 font-sans">
          <p className="text-5xl mb-4">🌸</p>
          <p>No products available at this time.</p>
        </div>
      )}
    </div>
  );
}
