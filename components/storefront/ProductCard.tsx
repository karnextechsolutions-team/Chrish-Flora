'use client';
// components/storefront/ProductCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { dispatch, state } = useCart();
  const inCart = state.items.find(i => i.product.id === product.id);
  const isOutOfStock = product.quantity <= 0;

  return (
    <div className="card group flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-md">
      {/* Image */}
      <Link href={`/storefront/products/${product.slug}`} className="relative aspect-[4/3] bg-olive-100 overflow-hidden block">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-olive-300">
            🌸
          </div>
        )}
        {/* Stock badge */}
        <div className="absolute top-3 left-3">
          {isOutOfStock ? (
            <span className="badge-status bg-red-100 text-red-700 border border-red-200">
              OUT OF STOCK
            </span>
          ) : (
            <span className="badge-status bg-green-100 text-green-700 border border-green-200">
              IN STOCK ({product.quantity} UNITS)
            </span>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-sans text-gold-600 tracking-widest uppercase mb-1">
          {product.sku}
        </p>
        <Link href={`/storefront/products/${product.slug}`}>
          <h3 className="font-serif text-xl text-flora-brown mb-1 leading-tight hover:text-gold-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="text-sm font-sans text-flora-brown/60 leading-relaxed mb-4 line-clamp-2 flex-1">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-flora-cream-dark flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center justify-between">
          <p className="font-serif text-2xl text-gold-700 tabular text-center sm:text-left">
            LKR {product.price.toLocaleString('en-LK')}
          </p>
          <button
            onClick={() => dispatch({ type: 'ADD_ITEM', product })}
            disabled={isOutOfStock}
            className="btn-gold h-11 px-4 text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <ShoppingBag size={15} />
            {inCart ? 'Add More' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
