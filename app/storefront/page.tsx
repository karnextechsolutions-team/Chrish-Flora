// app/storefront/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/storefront/ProductCard';
import type { Product } from '@/types';

export const revalidate = 60;

export default async function StorefrontHome() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative h-[100svh] md:h-[70vh] md:min-h-[500px] flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #BEC96A 0%, #C8CC7A 40%, #D4D880 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full border border-gold-500/20 opacity-40" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full border border-gold-500/20 opacity-40" />

        <div className="relative z-10 text-center px-6 w-full max-w-xl md:max-w-2xl mx-auto">
          <p className="text-gold-700 font-sans text-xs tracking-[0.4em] uppercase mb-4">
            Luxury Floral Boutique
          </p>
          <h1 className="font-serif text-4xl md:text-8xl text-flora-brown leading-none mb-6">
            Blooms of
            <br />
            <em className="text-gold-700 not-italic">Distinction</em>
          </h1>
          <p className="text-flora-brown/70 font-sans max-w-md mx-auto mb-10 leading-relaxed text-sm md:text-base">
            Handcrafted floral arrangements delivered with care to your doorstep.
            Precise, punctual, breathtaking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xs sm:max-w-none mx-auto px-4 sm:px-0">
            <Link href="/storefront/products" className="btn-gold w-full sm:w-auto text-center flex items-center justify-center min-h-[44px]">
              Shop Collections
            </Link>
            <Link href="#featured" className="btn-outline w-full sm:w-auto text-center flex items-center justify-center min-h-[44px]">
              View Featured
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="featured" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <p className="text-gold-600 font-sans text-xs tracking-[0.4em] uppercase mb-2">
            Handpicked Selection
          </p>
          <h2 className="font-serif text-3xl md:text-5xl text-flora-brown">
            Featured Arrangements
          </h2>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(products as Product[]).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-flora-brown/50 font-sans py-20">
            No products available yet.
          </p>
        )}

        <div className="text-center mt-12">
          <Link href="/storefront/products" className="btn-outline">
            View All Products
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-flora-brown text-flora-cream py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-10 text-center">
          {[
            { icon: '📍', title: 'Precise Delivery', desc: 'Pin your exact location on the map for accurate doorstep delivery.' },
            { icon: '🌸', title: 'Fresh Guaranteed', desc: 'Every arrangement is crafted fresh on the day of your order.' },
            { icon: '⚡', title: 'Real-Time Stock', desc: 'Live inventory so you only see what is truly available.' },
          ].map(v => (
            <div key={v.title} className="p-4">
              <div className="text-4xl mb-4">{v.icon}</div>
              <h3 className="font-serif text-2xl text-gold-400 mb-2">{v.title}</h3>
              <p className="text-flora-cream/60 font-sans text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
