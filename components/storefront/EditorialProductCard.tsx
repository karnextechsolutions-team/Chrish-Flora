'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { Product } from '@/types';

interface Props {
  product: Product;
  aspectRatioClassName?: string;
}

export default function EditorialProductCard({ product, aspectRatioClassName = 'aspect-[3/4]' }: Props) {
  const { dispatch, state } = useCart();
  const inCart = state.items.find(i => i.product.id === product.id);
  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-2xl">
      <Link href={`/storefront/products/${product.slug}`} className="block">
        <div className={`relative w-full ${aspectRatioClassName} bg-olive-50 overflow-hidden`}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                isOutOfStock ? 'grayscale contrast-75' : ''
              }`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-5xl bg-olive-50/50 ${
              isOutOfStock ? 'grayscale' : ''
            }`}>
              🌸
            </div>
          )}

          {/* Overlay gradient: transparent top -> brown/80 bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />

          {/* Stock Badge (top-left) */}
          <div className="absolute top-4 left-4 z-20">
            {isOutOfStock ? (
              <span className="px-2.5 py-1 text-[9px] font-sans font-bold tracking-widest uppercase bg-red-700 text-white rounded-full shadow-sm">
                OUT OF STOCK
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[9px] font-sans font-bold tracking-widest uppercase bg-olive-400 text-flora-brown rounded-full shadow-sm">
                IN STOCK
              </span>
            )}
          </div>

          {/* Info overlay (bottom of image) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-white flex flex-col justify-end">
            <p className="text-[9px] font-sans text-gold-300 tracking-[0.2em] uppercase mb-1">
              {product.sku || 'SKU-ARR'}
            </p>
            <h3 className="font-serif text-xl md:text-2xl text-white leading-tight mb-2">
              {product.name}
            </h3>
            <p className="font-serif text-lg md:text-xl text-gold-300 mb-4">
              LKR {product.price.toLocaleString('en-LK')}
            </p>

            {/* Add to Cart button */}
            <div className="md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 ease-out">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'ADD_ITEM', product });
                }}
                disabled={isOutOfStock}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-sans tracking-widest uppercase backdrop-blur bg-gold-600/90 hover:bg-gold-700 text-white border border-gold-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ShoppingBag size={14} />
                {inCart ? 'Add More' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
