'use client';
// components/storefront/CheckoutClient.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { calculateDistanceKm, calculateDeliveryCharge, reverseGeocode } from '@/lib/delivery';
import { createClient } from '@/lib/supabase/client';
import type { StoreSettings } from '@/types';

// Leaflet must be dynamic (no SSR)
const DeliveryMap = dynamic(() => import('@/components/map/DeliveryMap'), { ssr: false });

interface Props {
  user: any;
  profile: { full_name: string; phone: string } | null;
  settings: StoreSettings | null;
}

const DEFAULT_SETTINGS = {
  hq_lat: 6.9271,
  hq_lng: 79.8612,
  base_delivery_rate: 300,
  base_distance_km: 5,
  rate_per_additional_km: 50,
};

export default function CheckoutClient({ user, profile, settings }: Props) {
  const router = useRouter();
  const { state, subtotal, dispatch } = useCart();
  const s = settings || DEFAULT_SETTINGS;

  const [fulfillment, setFulfillment] = useState<'Delivery' | 'Store Pickup'>('Delivery');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState({ street: '', city: '', postcode: '' });
  const [displayAddress, setDisplayAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [formData, setFormData] = useState({
    customer_name: profile?.full_name || '',
    customer_email: user?.email || '',
    customer_phone: profile?.phone || '',
    order_note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Recalculate delivery charge when pin changes
  useEffect(() => {
    if (!pin) { setDistanceKm(0); setDeliveryCharge(0); return; }
    const dist = calculateDistanceKm(s.hq_lat, s.hq_lng, pin.lat, pin.lng);
    const charge = calculateDeliveryCharge(
      dist,
      s.base_delivery_rate,
      s.base_distance_km,
      s.rate_per_additional_km
    );
    setDistanceKm(dist);
    setDeliveryCharge(Math.round(charge));
  }, [pin, s]);

  const handlePinDrop = async (lat: number, lng: number) => {
    setPin({ lat, lng });
    setGeocoding(true);
    const geo = await reverseGeocode(lat, lng);
    if (geo) {
      setAddress({ street: geo.street, city: geo.city, postcode: geo.postcode });
      setDisplayAddress(geo.display_name);
    }
    setGeocoding(false);
  };

  const total = subtotal + (fulfillment === 'Delivery' ? deliveryCharge : 0);

  const handleSubmit = async () => {
    if (state.items.length === 0) { setError('Your cart is empty.'); return; }
    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
      setError('Please fill in all required fields.'); return;
    }
    if (fulfillment === 'Delivery' && !pin) {
      setError('Please drop a pin on the map for your delivery location.'); return;
    }
    setSubmitting(true);
    setError('');

    try {
      const supabase = createClient();

      const orderPayload = {
        user_id: user?.id || null,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        fulfillment_method: fulfillment,
        delivery_address: fulfillment === 'Delivery' ? displayAddress || `${address.street}, ${address.city} ${address.postcode}` : null,
        delivery_lat: fulfillment === 'Delivery' ? pin?.lat : null,
        delivery_lng: fulfillment === 'Delivery' ? pin?.lng : null,
        delivery_distance_km: fulfillment === 'Delivery' ? distanceKm : null,
        delivery_charge: fulfillment === 'Delivery' ? deliveryCharge : 0,
        subtotal,
        total,
        status: 'Pending',
        order_note: formData.order_note || null,
      };

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderErr) throw orderErr;

      const itemsPayload = state.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // Deduct inventory
      for (const item of state.items) {
        await supabase.rpc('decrement_stock', {
          p_product_id: item.product.id,
          p_quantity: item.quantity,
        });
      }

      dispatch({ type: 'CLEAR_CART' });
      router.push(`/storefront/order-confirmation?orderId=${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="text-center py-20 text-flora-brown/50 font-sans">
        <p className="text-5xl mb-4">🛒</p>
        <p>Your cart is empty. <a href="/storefront/products" className="text-gold-600 underline">Shop now</a></p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-flora-brown font-sans max-w-md mx-auto card p-6 sm:p-10 border border-flora-cream-dark">
        <p className="text-5xl mb-6">🔒</p>
        <h2 className="font-serif text-2xl sm:text-3xl mb-4">Please sign in to complete your purchase</h2>
        <p className="text-sm text-flora-brown/60 mb-8 leading-relaxed">
          You need an account to checkout. Your cart items are saved securely and will be here when you return.
        </p>
        <div className="flex flex-col gap-4">
          <Link href="/auth/login?returnTo=/storefront/checkout" className="btn-gold w-full flex items-center justify-center py-3 min-h-[44px]">
            Sign In
          </Link>
          <Link href="/auth/register?returnTo=/storefront/checkout" className="btn-outline w-full flex items-center justify-center py-3 min-h-[44px]">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-28 lg:pb-0">
      {/* LEFT: Form */}
      <div className="space-y-8">
        {/* Contact */}
        <section className="card p-6">
          <h2 className="font-serif text-2xl text-flora-brown mb-5">Contact Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={formData.customer_name}
                onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                autoComplete="name" />
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input type="email" className="input" value={formData.customer_email}
                onChange={e => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                autoComplete="email" />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="tel" className="input" value={formData.customer_phone}
                onChange={e => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                autoComplete="tel" />
            </div>
          </div>
        </section>

        {/* Fulfillment */}
        <section className="card p-6">
          <h2 className="font-serif text-2xl text-flora-brown mb-5">Fulfillment Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['Delivery', 'Store Pickup'] as const).map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setFulfillment(method)}
                className={`p-4 border text-sm font-sans transition-all text-left flex flex-col justify-between min-h-[110px]
                  ${fulfillment === method
                    ? 'border-gold-600 bg-gold-50 text-gold-700'
                    : 'border-flora-cream-dark text-flora-brown/60 hover:border-gold-300'}`}
              >
                <div>
                  <div className="text-2xl mb-2">{method === 'Delivery' ? '🚚' : '🏪'}</div>
                  <div className="font-medium">{method}</div>
                </div>
                {method === 'Delivery' && (
                  <div className="text-[10px] text-flora-brown/50 mt-1">Pin your location on map</div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Map for Delivery */}
        {fulfillment === 'Delivery' && (
          <section className="card p-6">
            <h2 className="font-serif text-2xl text-flora-brown mb-2">Delivery Location</h2>
            <p className="text-sm font-sans text-flora-brown/60 mb-4">
              Drop a pin at your exact delivery location. Use "My Location" for GPS precision.
            </p>
            <div className="h-[250px] md:h-[300px] w-full overflow-hidden border border-flora-cream-dark">
              <DeliveryMap
                hqLat={s.hq_lat}
                hqLng={s.hq_lng}
                onPinDrop={handlePinDrop}
                pin={pin}
              />
            </div>
            {geocoding && (
              <p className="text-xs font-sans text-gold-600 mt-2">📍 Detecting address...</p>
            )}
            {pin && !geocoding && (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="label">Street</label>
                  <input className="input" value={address.street}
                    onChange={e => setAddress(p => ({ ...p, street: e.target.value }))}
                    autoComplete="street-address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={address.city}
                      onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                      autoComplete="address-level2" />
                  </div>
                  <div>
                    <label className="label">Postcode</label>
                    <input className="input" value={address.postcode}
                      onChange={e => setAddress(p => ({ ...p, postcode: e.target.value }))}
                      autoComplete="postal-code" />
                  </div>
                </div>
                <div className="text-xs font-sans text-flora-brown/60 bg-olive-50 border border-olive-200 p-2">
                  📏 Distance from store: <strong>{distanceKm.toFixed(2)} km</strong>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Order Note */}
        <section className="card p-6">
          <h2 className="font-serif text-2xl text-flora-brown mb-5">Order Notes</h2>
          <label className="label">Special Instructions (optional)</label>
          <textarea
            rows={3}
            className="input resize-none h-auto min-h-[80px]"
            placeholder="E.g. Leave at reception, call before arrival..."
            value={formData.order_note}
            onChange={e => setFormData(p => ({ ...p, order_note: e.target.value }))}
          />
        </section>
      </div>

      {/* RIGHT: Order Summary Accordion on Mobile / Sticky Card on Desktop */}
      <div className="space-y-4 lg:space-y-0">
        {/* Accordion Trigger for mobile */}
        <button
          type="button"
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="lg:hidden w-full flex items-center justify-between p-4 bg-white border border-flora-cream-dark text-left"
        >
          <span className="font-serif text-lg text-flora-brown">Order Summary ({state.items.length} items)</span>
          <div className="flex items-center gap-2">
            <span className="font-serif text-gold-700 font-semibold">LKR {total.toLocaleString()}</span>
            {summaryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        <div className={`${summaryExpanded ? 'block' : 'hidden'} lg:block`}>
          <div className="card p-6 lg:sticky lg:top-24 bg-white">
            <h2 className="font-serif text-2xl text-flora-brown mb-5 hidden lg:block">Order Summary</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-5 scroll-touch">
              {state.items.map(item => (
                <div key={item.product.id} className="flex gap-3 items-start">
                  <div className="w-14 h-14 bg-olive-100 flex-shrink-0 overflow-hidden relative">
                    {item.product.image_url ? (
                      <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🌸</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base text-flora-brown leading-tight truncate">{item.product.name}</p>
                    <p className="text-xs text-gold-600 font-sans">{item.product.sku}</p>
                    <p className="text-xs text-flora-brown/60 font-sans">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-sans text-sm tabular text-flora-brown font-medium shrink-0">
                    LKR {(item.quantity * item.product.price).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-flora-cream-dark pt-4 space-y-2">
              <div className="flex justify-between text-sm font-sans">
                <span className="text-flora-brown/70">Subtotal</span>
                <span className="tabular">LKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-sans">
                <span className="text-flora-brown/70">
                  {fulfillment === 'Delivery' ? `Delivery (${distanceKm.toFixed(1)} km)` : 'Store Pickup'}
                </span>
                <span className="tabular">
                  {fulfillment === 'Delivery'
                    ? `LKR ${deliveryCharge.toLocaleString()}`
                    : 'FREE'}
                </span>
              </div>
            </div>

            <div className="border-t border-flora-cream-dark mt-4 pt-4 flex justify-between items-center">
              <span className="font-serif text-xl text-flora-brown">Total</span>
              <span className="font-serif text-3xl text-gold-700 tabular">
                LKR {total.toLocaleString()}
              </span>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm font-sans p-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-gold w-full mt-6 hidden lg:flex items-center justify-center gap-2 min-h-[44px]"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
            <p className="text-center text-xs font-sans text-flora-brown/40 mt-3 hidden lg:block">
              By placing your order, you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-flora-cream-dark p-4 z-40 lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex justify-between items-center gap-4 max-w-7xl mx-auto">
          <div>
            <span className="text-[10px] font-sans text-gray-400 uppercase tracking-wider block">Total Amount</span>
            <span className="font-serif text-xl text-gold-700 font-bold tabular">LKR {total.toLocaleString()}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-gold h-12 px-6 flex items-center justify-center gap-2 text-sm font-semibold rounded shrink-0"
          >
            {submitting ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
