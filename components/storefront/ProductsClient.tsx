'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, Grid, List, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import ProductCard from './ProductCard';
import type { Product } from '@/types';

interface ProductsClientProps {
  products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
  const { dispatch } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Everything');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default list view
  const [showFilters, setShowFilters] = useState(true);

  const categories = ['Everything', 'Bouquets', 'Arrangements', 'Wreaths', 'Gift Sets', 'Baskets', 'Collections'];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'Everything' ||
      product.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) return;
    dispatch({ type: 'ADD_ITEM', product });
  };

  return (
    <div className="bg-cream min-h-screen text-brown px-4 py-6 md:py-10 max-w-7xl mx-auto">
      
      {/* HEADER ROW */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl md:text-4xl text-brown-dark font-medium leading-none">
          Collections
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 transition-colors ${showFilters ? 'text-gold' : 'text-brown/50'}`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal size={22} strokeWidth={1.5} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gold">
          <Search size={18} strokeWidth={2} />
        </span>
        <input
          type="text"
          placeholder="Search collections..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-brown placeholder-brown/40 border border-transparent focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all"
        />
      </div>

      {/* CATEGORY FILTER PILLS */}
      {showFilters && (
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 mb-6 w-full">
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
      )}

      {/* CONTROLS ROW: Results count + Grid/List toggle */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <p className="text-sm font-sans text-brown/50">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'arrangement' : 'arrangements'} available
        </p>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-white shadow-sm text-gold' : 'text-brown/40'
            }`}
            aria-label="List view"
          >
            <List size={18} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-gold' : 'text-brown/40'
            }`}
            aria-label="Grid view"
          >
            <Grid size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* PRODUCT LISTINGS */}
      {filteredProducts.length > 0 ? (
        viewMode === 'grid' ? (
          /* GRID VIEW: 2 columns on mobile, 4 columns on desktop */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8 animate-card-slide-up">
            {filteredProducts.map(product => (
              <div key={product.id} className="h-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW: Horizontal Row Cards (Default) */
          <div className="flex flex-col gap-4 max-w-2xl mx-auto animate-card-slide-up">
            {filteredProducts.map(product => {
              const isOutOfStock = product.quantity <= 0;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(92,74,0,0.06)] hover:shadow-card transition-all duration-300 flex gap-4 w-full relative"
                >
                  {/* Left Content (Flex-1) */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category */}
                      <span className="text-[10px] font-sans font-bold text-olive-dark tracking-wider uppercase block mb-1">
                        {product.category || 'Atelier'}
                      </span>
                      
                      {/* Title */}
                      <Link href={`/storefront/products/${product.slug}`}>
                        <h2 className="font-serif text-xl md:text-2xl text-brown-dark font-medium leading-snug hover:text-gold transition-colors line-clamp-1">
                          {product.name}
                        </h2>
                      </Link>

                      {/* Details */}
                      <p className="text-[11px] font-sans text-brown/40 mt-0.5">
                        Premium · Handcrafted
                      </p>

                      {/* Stock Dot Indicator */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-[10px] font-sans font-semibold tracking-wide uppercase text-brown/60">
                          {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Price + Add Button */}
                    <div className="mt-4 pt-3 flex flex-col gap-2">
                      <div>
                        <span className="text-[10px] font-sans text-gold/60 font-bold block leading-none mb-0.5">LKR</span>
                        <span className="font-serif text-2xl font-bold text-gold tabular-nums leading-none">
                          {product.price.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className="bg-brown-dark hover:bg-gold text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider font-sans w-fit transition-all duration-200 disabled:opacity-40 disabled:hover:bg-brown-dark uppercase mt-1 select-none active:scale-95"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>

                  {/* Right Image (110px square) */}
                  <div className="w-[110px] h-[110px] md:w-[130px] md:h-[130px] flex-shrink-0 rounded-xl overflow-hidden bg-olive-light relative flex items-center justify-center border border-gray-200">
                    <Link href={`/storefront/products/${product.slug}`} className="block w-full h-full relative">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className={`object-cover ${isOutOfStock ? 'grayscale contrast-75' : ''}`}
                          sizes="130px"
                        />
                      ) : (
                        /* SVG Fallback */
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold">
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
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="text-center py-20 text-brown/40 font-sans border border-gray-200 bg-white rounded-2xl p-8 max-w-xl mx-auto">
          <p className="text-5xl mb-4">🌸</p>
          <h2 className="font-serif text-xl font-medium text-brown-dark mb-1">No collections match your criteria.</h2>
          <p className="text-xs">Try clearing filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
