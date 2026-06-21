'use client';

// components/storefront/ProductCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag, Heart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { dispatch } = useCart();
  const isOutOfStock = product.quantity <= 0;

  // Wishlist State (Local)
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Micro-animation trigger
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    
    setIsAdding(true);
    dispatch({ type: 'ADD_ITEM', product });
    setTimeout(() => {
      setIsAdding(false);
    }, 400);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card group flex flex-col transition-all duration-300 hover:shadow-float hover:-translate-y-1 h-full relative">
      
      {/* Image Area: Square, gradient bg */}
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

        {/* TOP RIGHT: Heart icon button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors focus:outline-none"
          aria-label="Add to wishlist"
        >
          <Heart
            size={16}
            className={`transition-colors ${
              isWishlisted ? 'text-gold fill-gold' : 'text-brown/30'
            }`}
          />
        </button>

        {/* TOP LEFT: Stock badge */}
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
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-9 h-9 rounded-full bg-gold shadow-button flex items-center justify-center text-white transition-all focus:outline-none select-none disabled:opacity-40 disabled:hover:scale-100 ${
              isAdding ? 'animate-bounce ring-4 ring-olive/40' : 'hover:scale-110 active:scale-95'
            }`}
            aria-label="Add to cart"
          >
            <span className="text-xl font-bold leading-none -mt-0.5">+</span>
          </button>
        </div>
      </div>

    </div>
  );
}
