'use client';
// components/storefront/CartDrawer.tsx
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { state, dispatch, subtotal } = useCart();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:max-w-[420px] z-50 bg-flora-cream shadow-2xl
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-flora-cream-dark">
          <h2 className="font-serif text-2xl text-flora-brown">Your Cart</h2>
          <button onClick={onClose} className="p-2 text-flora-brown/50 hover:text-flora-brown transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-touch">
          {state.items.length === 0 ? (
            <div className="text-center py-20 text-flora-brown/40 font-sans">
              <p className="text-4xl mb-3">🛒</p>
              <p>Your cart is empty</p>
            </div>
          ) : (
            state.items.map(item => (
              <div key={item.product.id} className="flex gap-3 sm:gap-4 py-4 border-b border-flora-cream-dark items-start">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-olive-100 flex-shrink-0 overflow-hidden relative">
                  {item.product.image_url ? (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🌸</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <p className="font-serif text-base sm:text-lg text-flora-brown leading-tight truncate">{item.product.name}</p>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_ITEM', productId: item.product.id })}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gold-600 font-sans">{item.product.sku}</p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                    {/* Quantity controls */}
                    <div className="flex items-center bg-white border border-flora-cream-dark">
                      <button
                        onClick={() =>
                          item.quantity === 1
                            ? dispatch({ type: 'REMOVE_ITEM', productId: item.product.id })
                            : dispatch({ type: 'UPDATE_QTY', productId: item.product.id, quantity: item.quantity - 1 })
                        }
                        className="w-11 h-11 flex items-center justify-center text-flora-brown hover:bg-gold-50 transition-colors"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="font-sans text-sm w-6 text-center tabular">{item.quantity}</span>
                      <button
                        onClick={() => dispatch({ type: 'UPDATE_QTY', productId: item.product.id, quantity: item.quantity + 1 })}
                        disabled={item.quantity >= item.product.quantity}
                        className="w-11 h-11 flex items-center justify-center text-flora-brown hover:bg-gold-50 transition-colors disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    {/* Price */}
                    <p className="font-serif text-base sm:text-lg text-gold-700 tabular font-bold">
                      LKR {(item.quantity * item.product.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="px-6 py-6 border-t border-flora-cream-dark space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <span className="font-sans text-sm text-flora-brown/70">Subtotal</span>
              <span className="font-serif text-2xl text-gold-700 tabular">
                LKR {subtotal.toLocaleString()}
              </span>
            </div>
            <Link
              href="/storefront/checkout"
              onClick={onClose}
              className="btn-gold w-full text-center flex items-center justify-center h-14 text-base font-semibold"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={() => dispatch({ type: 'CLEAR_CART' })}
              className="w-full text-center text-xs font-sans text-red-400 hover:text-red-600 transition-colors py-2"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
