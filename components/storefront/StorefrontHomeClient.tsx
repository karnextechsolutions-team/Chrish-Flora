'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, ArrowRight, MapPin, Sparkles, Star, Heart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { Product, Banner } from '@/types';
import dynamic from 'next/dynamic';

const HeroBannerSlider = dynamic(
  () => import('@/components/storefront/HeroBannerSlider'),
  { ssr: false }
);

// RevealOnScroll component using Intersection Observer for scrolling animations
function RevealOnScroll({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {children}
    </div>
  );
}

interface StorefrontHomeClientProps {
  products: Product[];
  banners: Banner[];
}

export default function StorefrontHomeClient({ products, banners }: StorefrontHomeClientProps) {
  const { dispatch, state: cartState } = useCart();

  // Wishlist State (Local)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const toggleWishlist = (id: string) => {
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Category Tabs State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Bouquets', 'Arrangements', 'Wreaths', 'Gift Sets', 'Baskets'];

  // Filter products by selected category
  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'All') return true;
    return product.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Micro-animation trigger for adding to cart
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const handleAddToCart = (product: Product) => {
    setAnimatingId(product.id);
    dispatch({ type: 'ADD_ITEM', product });
    setTimeout(() => {
      setAnimatingId(null);
    }, 400);
  };

  // Background colors cycling for circular thumbnails
  const circleBgColors = [
    'bg-[#C8CC7A20]', // olive tint
    'bg-[#C9962A15]', // gold tint
    'bg-olive-light', // light olive
    'bg-[#FFF8E8]',    // warm
    'bg-[#C8CC7A30]'  // olive medium-light tint
  ];

  return (
    <div className="bg-cream min-h-screen text-brown pb-16 md:pb-8">
      
      {/* SECTION 1: HERO BANNER CAROUSEL */}
      <HeroBannerSlider banners={banners} />

      {/* SECTION 2: QUICK CATEGORY SCROLL & CIRCULAR THUMBNAILS */}
      <section className="px-4 pt-8">
        <div className="max-w-7xl mx-auto">
          {/* CATEGORY TABS ROW */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 w-full">
            {categories.map(cat => {
              const isActive = cat.toLowerCase() === selectedCategory.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 text-sm font-sans font-medium px-5 py-2.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-brown-dark text-white shadow-[0_4px_12px_rgba(61,46,0,0.2)]'
                      : 'bg-transparent text-brown/50 hover:text-brown'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* CIRCULAR THUMBNAILS */}
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-4 mt-2 w-full">
            {products.slice(0, 8).map((product, idx) => (
              <Link
                key={product.id}
                href={`/storefront/products/${product.slug}`}
                className="group flex flex-col items-center shrink-0"
              >
                <div className={`w-[80px] h-[80px] md:w-[96px] md:h-[96px] rounded-full overflow-hidden border-2 border-white shadow-[0_4px_16px_rgba(92,74,0,0.12)] transition-all duration-200 group-hover:border-gold group-hover:scale-105 relative flex items-center justify-center ${
                  circleBgColors[idx % circleBgColors.length]
                }`}>
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <span className="font-serif text-2xl font-semibold text-gold leading-none">
                      {product.name[0]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-sans text-brown/70 text-center mt-2 line-clamp-2 max-w-[80px] md:max-w-[96px] leading-tight font-medium">
                  {product.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURED PRODUCTS GRID */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* HEADER ROW */}
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-serif text-2xl text-brown-dark font-medium leading-none">
              Featured
            </h2>
            <Link 
              href="/storefront/products" 
              className="text-sm font-sans font-bold text-gold hover:text-gold-dark transition-colors tracking-wide flex items-center gap-0.5"
            >
              See all &rarr;
            </Link>
          </div>

          {/* PRODUCT GRID */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
              {filteredProducts.map(product => {
                const isOutOfStock = product.quantity <= 0;
                const isWishlisted = wishlist.includes(product.id);

                return (
                  <RevealOnScroll key={product.id}>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-card group flex flex-col transition-all duration-300 hover:shadow-float hover:-translate-y-1 h-full relative">
                      
                      {/* Image Area */}
                      <div className="aspect-square bg-gradient-to-br from-olive-light to-[#FFF8E8] relative overflow-hidden flex-shrink-0">
                        <Link href={`/storefront/products/${product.slug}`} className="block w-full h-full relative p-4">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className={`object-contain p-2.5 transition-transform duration-500 group-hover:scale-105 ${
                                isOutOfStock ? 'grayscale contrast-75' : ''
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              🌸
                            </div>
                          )}
                        </Link>

                        {/* Top Right: Heart button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors focus:outline-none"
                          aria-label="Add to wishlist"
                        >
                          <Heart
                            size={16}
                            className={`transition-colors ${
                              isWishlisted ? 'text-gold fill-gold' : 'text-brown/30'
                            }`}
                          />
                        </button>

                        {/* Top Left: Stock badge */}
                        <div className="absolute top-3 left-3 z-10 select-none">
                          {isOutOfStock ? (
                            <span className="bg-gray-200 text-brown/40 text-[8px] tracking-wide font-sans font-bold px-2 py-1 rounded-full uppercase">
                              OUT OF STOCK
                            </span>
                          ) : (
                            <span className="bg-olive text-brown text-[8px] tracking-wide font-sans font-bold px-2 py-1 rounded-full uppercase">
                              IN STOCK
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 flex flex-col flex-1">
                        {/* SKU */}
                        <span className="text-[9px] font-sans text-gold/70 tracking-[0.2em] uppercase font-bold block mb-1">
                          {product.sku || 'SKU-FLR'}
                        </span>
                        
                        {/* Title */}
                        <Link href={`/storefront/products/${product.slug}`} className="flex-1">
                          <h3 className="font-sans text-sm font-semibold text-brown-dark leading-snug line-clamp-2 min-h-[36px] hover:text-gold transition-colors">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Size Info */}
                        <p className="text-[10px] font-sans text-brown/40 mt-1 font-medium">
                          Standard · Premium
                        </p>

                        {/* Price & Add Row */}
                        <div className="mt-3.5 flex justify-between items-center w-full">
                          <div>
                            <span className="text-[9px] font-sans text-gold/60 font-bold block leading-none">LKR</span>
                            <span className="font-serif text-xl font-bold text-gold tabular-nums leading-none">
                              {product.price.toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isOutOfStock}
                            className={`w-9 h-9 rounded-full bg-gold shadow-button flex items-center justify-center text-white transition-all focus:outline-none select-none disabled:opacity-40 disabled:hover:scale-100 ${
                              animatingId === product.id ? 'animate-bounce ring-4 ring-olive/40' : 'hover:scale-110 active:scale-95'
                            }`}
                            aria-label="Add to cart"
                          >
                            <span className="text-xl font-bold leading-none -mt-0.5">+</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-brown/40 font-sans border border-gray-200 bg-white rounded-2xl p-6">
              <p className="text-4xl mb-3">🌿</p>
              <p className="font-serif text-lg text-brown-dark font-medium">No arrangements found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 4: OCCASIONS STRIP */}
      <section className="bg-olive-light py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="font-serif text-2xl text-brown-dark font-medium px-2 mb-6">
            Shop by Occasion
          </h3>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 w-full">
            {[
              { name: 'Weddings', emoji: '💒', gradient: 'from-[#FDE8EF] to-[#F5C5D5]' },
              { name: 'Birthdays', emoji: '🎂', gradient: 'from-[#FFF3D0] to-[#FFE49A]' },
              { name: 'Romance', emoji: '💝', gradient: 'from-[#FFE0E8] to-[#FFBBD0]' },
              { name: 'Get Well', emoji: '🏥', gradient: 'from-[#E8F5E8] to-[#C8E6C8]' },
              { name: 'Graduation', emoji: '🎓', gradient: 'from-[#E8E0FF] to-[#D0BFFF]' },
              { name: 'Corporate', emoji: '🏢', gradient: 'from-[#E0EFF8] to-[#B8D8F0]' }
            ].map(occasion => (
              <Link
                key={occasion.name}
                href={`/storefront/products?category=${encodeURIComponent(occasion.name)}`}
                className={`group relative flex flex-col justify-between w-[100px] h-[120px] p-3 flex-shrink-0 bg-gradient-to-br ${occasion.gradient} rounded-2xl shadow-sm hover:scale-[1.03] hover:shadow-md transition-all duration-200 select-none`}
              >
                <div className="text-4xl text-center mt-2 group-hover:scale-110 transition-transform duration-200 select-none">
                  {occasion.emoji}
                </div>
                <span className="font-sans text-[11px] font-bold text-brown/85 text-center mt-auto block">
                  {occasion.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: PROMOTIONAL BANNER */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl bg-gradient-to-br from-olive to-olive-dark p-6 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center min-h-[180px] shadow-card">
            
            {/* Absolute circles */}
            <div className="absolute w-[150px] h-[150px] rounded-full border border-white/10 top-[-40px] right-[-40px] pointer-events-none" />
            <div className="absolute w-[100px] h-[100px] rounded-full border border-white/10 bottom-[-30px] right-[60px] pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-10 text-white max-w-sm flex-1">
              <span className="text-white/80 font-sans text-xs tracking-wider uppercase font-bold block mb-1">
                Special Offer
              </span>
              <h3 className="font-serif text-4xl md:text-5xl font-extrabold leading-tight tracking-wide mb-1">
                20% OFF
              </h3>
              <p className="text-white/70 font-sans text-xs font-semibold uppercase tracking-wider mb-4">
                On all bouquets this week
              </p>
              <Link
                href="/storefront/products"
                className="inline-block bg-white hover:bg-gray-100 active:scale-95 text-olive-dark px-5 py-2.5 rounded-xl text-xs font-bold font-sans uppercase tracking-widest shadow-sm transition-all duration-150"
              >
                Shop Now &rarr;
              </Link>
            </div>

            {/* Right: Large flower circle */}
            <div className="absolute md:relative right-4 top-1/2 -translate-y-1/2 md:translate-y-0 md:top-auto md:right-auto z-10 w-[100px] h-[100px] rounded-full bg-white/15 border-2 border-white/20 flex items-center justify-center overflow-hidden">
              <svg width="60" height="60" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white opacity-[0.9] animate-[spin_50s_linear_infinite]">
                <circle cx="18" cy="18" r="4" fill="currentColor" />
                <circle cx="18" cy="11" r="7" fill="currentColor" opacity="0.8" />
                <circle cx="18" cy="25" r="7" fill="currentColor" opacity="0.8" />
                <circle cx="11" cy="18" r="7" fill="currentColor" opacity="0.8" />
                <circle cx="25" cy="18" r="7" fill="currentColor" opacity="0.8" />
                <circle cx="13" cy="13" r="5" fill="currentColor" opacity="0.6" />
                <circle cx="23" cy="23" r="5" fill="currentColor" opacity="0.6" />
                <circle cx="13" cy="23" r="5" fill="currentColor" opacity="0.6" />
                <circle cx="23" cy="13" r="5" fill="currentColor" opacity="0.6" />
              </svg>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 6: TRUST BADGES */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {[
              {
                icon: MapPin,
                title: 'Precise Delivery',
                desc: 'Drop a pin for exact delivery coordinates.'
              },
              {
                icon: Sparkles,
                title: 'Always Fresh',
                desc: 'Crafted fresh on day of order.'
              },
              {
                icon: Star,
                title: '4.9★ Rated',
                desc: "Colombo's loved premium florist."
              }
            ].map((badge, idx) => (
              <div 
                key={badge.title}
                className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm flex flex-col items-center justify-between"
              >
                <div className="w-10 h-10 rounded-full bg-olive-light flex items-center justify-center mb-3">
                  <badge.icon className="text-gold" size={18} strokeWidth={1.5} />
                </div>
                <h4 className="font-sans text-xs font-bold text-brown-dark leading-snug">
                  {badge.title}
                </h4>
                <p className="text-[10px] text-brown/50 leading-relaxed font-medium mt-1">
                  {badge.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
