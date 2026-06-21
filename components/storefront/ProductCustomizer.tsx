'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { Product, ProductAddon, CartItemAddon } from '@/types';

interface ProductCustomizerProps {
  product: Product;
  addons: ProductAddon[];
}

export default function ProductCustomizer({ product, addons }: ProductCustomizerProps) {
  const { dispatch, state } = useCart();

  // Filter addons by type
  const wrappingPapers = addons.filter((a) => a.type === 'wrapping_paper');
  const ribbons = addons.filter((a) => a.type === 'ribbon');
  const extras = addons.filter((a) => a.type !== 'wrapping_paper' && a.type !== 'ribbon');

  // State
  const [selectedWrapping, setSelectedWrapping] = useState<ProductAddon | null>(null);
  const [selectedRibbon, setSelectedRibbon] = useState<ProductAddon | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ProductAddon[]>([]);

  // Calculate totals
  const wrappingPrice = selectedWrapping?.price || 0;
  const ribbonPrice = selectedRibbon?.price || 0;
  const extrasPrice = selectedExtras.reduce((sum, a) => sum + a.price, 0);
  const addonsTotal = wrappingPrice + ribbonPrice + extrasPrice;
  const totalPrice = product.price + addonsTotal;

  // Helpers
  const handleExtraToggle = (addon: ProductAddon) => {
    setSelectedExtras((prev) =>
      prev.some((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleAddToCart = () => {
    const selectedAddons: CartItemAddon[] = [];
    if (selectedWrapping) {
      selectedAddons.push({
        id: selectedWrapping.id,
        name: selectedWrapping.name,
        type: selectedWrapping.type,
        price: selectedWrapping.price,
        color_hex: selectedWrapping.color_hex,
      });
    }
    if (selectedRibbon) {
      selectedAddons.push({
        id: selectedRibbon.id,
        name: selectedRibbon.name,
        type: selectedRibbon.type,
        price: selectedRibbon.price,
        color_hex: selectedRibbon.color_hex,
      });
    }
    selectedExtras.forEach((addon) => {
      selectedAddons.push({
        id: addon.id,
        name: addon.name,
        type: addon.type,
        price: addon.price,
        color_hex: addon.color_hex,
      });
    });

    dispatch({
      type: 'ADD_ITEM',
      product,
      addons: selectedAddons,
    });
  };

  const hasAddonsSelected = selectedWrapping !== null || selectedRibbon !== null || selectedExtras.length > 0;

  return (
    <div className="space-y-6 bg-white border border-flora-cream-dark p-6 rounded-2xl">
      <h3 className="font-serif text-lg text-flora-brown uppercase tracking-wider border-b border-flora-cream-dark pb-2">
        🎁 Customize Your Bouquet
      </h3>

      {/* Wrapping Paper Selector */}
      <div className="space-y-2.5">
        <h4 className="font-sans text-[10px] text-gold-600 tracking-widest uppercase font-bold">
          Wrapping Paper
        </h4>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
          {/* None option */}
          <button
            onClick={() => setSelectedWrapping(null)}
            className={`w-[70px] h-[90px] flex flex-col items-center justify-center shrink-0 border-2 rounded-xl transition-all ${
              selectedWrapping === null
                ? 'border-gold-600 bg-gold-50/20'
                : 'border-dashed border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
              ✕ None
            </div>
            <span className="text-[10px] font-sans text-flora-brown mt-1">None</span>
          </button>

          {/* Addons */}
          {wrappingPapers.map((addon) => {
            const isSelected = selectedWrapping?.id === addon.id;
            const isStocked = addon.is_in_stock;

            return (
              <button
                key={addon.id}
                disabled={!isStocked}
                onClick={() => setSelectedWrapping(addon)}
                className={`relative w-[70px] h-[90px] flex flex-col items-center justify-center shrink-0 border-2 rounded-xl transition-all ${
                  isSelected
                    ? 'border-gold-600 bg-gold-50/20'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                } ${!isStocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                {/* Visual circle preview */}
                <div
                  className="w-12 h-12 rounded-full relative overflow-hidden flex-shrink-0 border border-gray-200/50 flex items-center justify-center"
                  style={{
                    backgroundColor: addon.color_hex || undefined,
                    background: !addon.color_hex && !addon.image_url ? 'linear-gradient(135deg, #C8CC7A 0%, #B2B56A 100%)' : undefined,
                  }}
                >
                  {addon.image_url && (
                    <Image
                      src={addon.image_url}
                      alt={addon.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>

                <span className="text-[10px] font-sans text-flora-brown text-center mt-1 truncate max-w-[64px] leading-tight px-0.5">
                  {addon.name.replace(' Wrap', '').replace(' Wrapping', '')}
                </span>
                <span className="text-[9px] text-gold-600 font-bold tabular-nums">
                  +LKR {addon.price}
                </span>

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold-600 flex items-center justify-center shadow">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* Out of stock label */}
                {!isStocked && (
                  <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
                    <span className="bg-black/60 text-white text-[8px] font-sans px-1 py-0.5 rounded uppercase font-bold tracking-wider scale-90">
                      OOS
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ribbon Selector */}
      <div className="space-y-2.5">
        <h4 className="font-sans text-[10px] text-gold-600 tracking-widest uppercase font-bold">
          Ribbon
        </h4>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
          {/* None option */}
          <button
            onClick={() => setSelectedRibbon(null)}
            className={`w-[70px] h-[90px] flex flex-col items-center justify-center shrink-0 border-2 rounded-xl transition-all ${
              selectedRibbon === null
                ? 'border-gold-600 bg-gold-50/20'
                : 'border-dashed border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
              ✕ None
            </div>
            <span className="text-[10px] font-sans text-flora-brown mt-1">None</span>
          </button>

          {/* Addons */}
          {ribbons.map((addon) => {
            const isSelected = selectedRibbon?.id === addon.id;
            const isStocked = addon.is_in_stock;

            return (
              <button
                key={addon.id}
                disabled={!isStocked}
                onClick={() => setSelectedRibbon(addon)}
                className={`relative w-[70px] h-[90px] flex flex-col items-center justify-center shrink-0 border-2 rounded-xl transition-all ${
                  isSelected
                    ? 'border-gold-600 bg-gold-50/20'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                } ${!isStocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              >
                {/* Visual circle preview */}
                <div
                  className="w-12 h-12 rounded-full relative overflow-hidden flex-shrink-0 border border-gray-200/50 flex items-center justify-center"
                  style={{
                    backgroundColor: addon.color_hex || undefined,
                    background: !addon.color_hex && !addon.image_url ? 'linear-gradient(135deg, #C8CC7A 0%, #B2B56A 100%)' : undefined,
                  }}
                >
                  {addon.image_url && (
                    <Image
                      src={addon.image_url}
                      alt={addon.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>

                <span className="text-[10px] font-sans text-flora-brown text-center mt-1 truncate max-w-[64px] leading-tight px-0.5">
                  {addon.name.replace(' Ribbon', '')}
                </span>
                <span className="text-[9px] text-gold-600 font-bold tabular-nums">
                  +LKR {addon.price}
                </span>

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold-600 flex items-center justify-center shadow">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* Out of stock label */}
                {!isStocked && (
                  <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
                    <span className="bg-black/60 text-white text-[8px] font-sans px-1 py-0.5 rounded uppercase font-bold tracking-wider scale-90">
                      OOS
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extras (Checkboxes) */}
      {extras.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-sans text-[10px] text-gold-600 tracking-widest uppercase font-bold border-t border-flora-cream-dark pt-4">
            Extras
          </h4>
          <div className="divide-y divide-gray-50">
            {extras.map((addon) => {
              if (!addon.is_in_stock) return null; // Hide OOS extras completely

              const isChecked = selectedExtras.some((a) => a.id === addon.id);

              return (
                <label
                  key={addon.id}
                  className="flex items-center gap-3 py-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleExtraToggle(addon)}
                    className="w-[18px] h-[18px] border-gray-300 text-gold-600 focus:ring-gold-500 rounded cursor-pointer"
                  />
                  <span className="font-sans text-sm text-flora-brown group-hover:text-gold-600 transition-colors">
                    {addon.name}
                  </span>
                  <span className="price-small text-gold-600 text-xs ml-auto">
                    +LKR {addon.price.toLocaleString('en-LK')}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div
        className={`transition-all duration-300 overflow-hidden border-t border-flora-cream-dark ${
          hasAddonsSelected
            ? 'max-h-[300px] opacity-100 py-4 space-y-2'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex justify-between text-xs text-flora-brown/60 font-sans">
          <span>Bouquet Base Price</span>
          <span className="price-small text-flora-brown">
            LKR {product.price.toLocaleString('en-LK')}
          </span>
        </div>
        {selectedWrapping && (
          <div className="flex justify-between text-xs text-flora-brown/60 font-sans">
            <span>Wrapping: {selectedWrapping.name}</span>
            <span className="price-small text-flora-brown">
              LKR {wrappingPrice.toLocaleString('en-LK')}
            </span>
          </div>
        )}
        {selectedRibbon && (
          <div className="flex justify-between text-xs text-flora-brown/60 font-sans">
            <span>Ribbon: {selectedRibbon.name}</span>
            <span className="price-small text-flora-brown">
              LKR {ribbonPrice.toLocaleString('en-LK')}
            </span>
          </div>
        )}
        {selectedExtras.map((extra) => (
          <div key={extra.id} className="flex justify-between text-xs text-flora-brown/60 font-sans">
            <span>Extra: {extra.name}</span>
            <span className="price-small text-flora-brown">
              LKR {extra.price.toLocaleString('en-LK')}
            </span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between items-baseline">
          <span className="font-serif text-sm font-semibold text-flora-brown">Total price</span>
          <div className="flex items-baseline gap-0.5 text-gold-600">
            <span className="font-sans text-xs text-gold-600/70">LKR</span>
            <span className="price-display text-xl font-bold">
              {totalPrice.toLocaleString('en-LK')}
            </span>
          </div>
        </div>
      </div>

      {/* Add To Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={product.quantity <= 0}
        className="btn-gold w-full py-4 flex items-center justify-center gap-3 text-base font-semibold transition-all duration-200"
      >
        <ShoppingBag size={18} />
        Add to Cart — LKR {totalPrice.toLocaleString('en-LK')}
      </button>
    </div>
  );
}
