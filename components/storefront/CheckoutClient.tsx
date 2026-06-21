'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown, ChevronUp, User, MapPin, ShoppingBag,
  Sparkles, ShieldCheck, Info, Lock, Shield,
  AlertCircle, CreditCard, Loader2
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { calculateDistanceKm, calculateDeliveryCharge, reverseGeocode } from '@/lib/delivery';
import { createClient } from '@/lib/supabase/client';
import type { StoreSettings } from '@/types';
import PayHereButton from './PayHereButton';

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
  cash_on_delivery_enabled: true,
  online_payment_enabled: true,
};

export default function CheckoutClient({ user, profile, settings }: Props) {
  const router = useRouter();
  const { state, subtotal, dispatch } = useCart();
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) } as any;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [fulfillment, setFulfillment] = useState<'Delivery' | 'Store Pickup'>('Delivery');

  // *** KEY: pin is the single source of truth for map marker ***
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState({ street: '', city: '', postcode: '' });
  const [displayAddress, setDisplayAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: profile?.full_name || '',
    customer_email: user?.email || '',
    customer_phone: profile?.phone || '',
    order_note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [pricingExpanded, setPricingExpanded] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'PayHere' | 'Cash'>(
    s.online_payment_enabled !== false ? 'PayHere' : 'Cash'
  );
  const [showPayHere, setShowPayHere] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // *** FIXED handlePinDrop: distance calculated synchronously, address fetched async ***
  const handlePinDrop = async (lat: number, lng: number) => {
    // Step 1: Update pin immediately → map re-renders with new marker
    setPin({ lat, lng });

    // Step 2: Calculate distance + charge SYNCHRONOUSLY (pure math)
    const dist = calculateDistanceKm(s.hq_lat, s.hq_lng, lat, lng);
    const charge = calculateDeliveryCharge(
      dist,
      s.base_delivery_rate,
      s.base_distance_km,
      s.rate_per_additional_km
    );
    setDistanceKm(dist);
    setDeliveryCharge(Math.round(charge));

    // Step 3: Fetch address asynchronously (non-blocking)
    setGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        setAddress({ street: geo.street, city: geo.city, postcode: geo.postcode });
        setDisplayAddress(geo.display_name);
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
    } finally {
      setGeocoding(false);
    }
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
        delivery_address: fulfillment === 'Delivery'
          ? displayAddress || `${address.street}, ${address.city} ${address.postcode}`
          : null,
        delivery_lat: fulfillment === 'Delivery' ? pin?.lat : null,
        delivery_lng: fulfillment === 'Delivery' ? pin?.lng : null,
        delivery_distance_km: fulfillment === 'Delivery' ? distanceKm : null,
        delivery_charge: fulfillment === 'Delivery' ? deliveryCharge : 0,
        subtotal,
        total,
        status: 'Pending',
        order_note: formData.order_note || null,
        payment_method: paymentMethod,
      };

      const { data: order, error: orderErr } = await supabase
        .from('orders').insert(orderPayload).select().single();
      if (orderErr) throw orderErr;

      const itemsPayload = state.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      for (const item of state.items) {
        await supabase.rpc('decrement_stock', {
          p_product_id: item.product.id,
          p_quantity: item.quantity,
        });
      }

      if (paymentMethod === 'PayHere') {
        setCreatedOrderId(order.id);
        setShowPayHere(true);
        setSubmitting(false);
      } else {
        dispatch({ type: 'CLEAR_CART' });
        router.push(`/storefront/order-confirmation?orderId=${order.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="text-center py-20 font-sans max-w-sm mx-auto">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="font-serif text-2xl mb-2">Your cart is empty</h2>
        <p className="text-sm text-flora-brown/50 mb-6">Explore our curated collections.</p>
        <Link href="/storefront/products"
          className="inline-block bg-gold-600 text-white px-6 py-3 rounded-xl text-xs font-sans tracking-widest uppercase transition-colors hover:bg-gold-700">
          Shop Now
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 font-sans max-w-md mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-200">
        <p className="text-5xl mb-6">🔒</p>
        <h2 className="font-serif text-2xl sm:text-3xl mb-4">Sign in to complete purchase</h2>
        <p className="text-sm text-flora-brown/60 mb-8 leading-relaxed">Your items are safe in your cart.</p>
        <div className="flex flex-col gap-4">
          <Link href="/auth/login?returnTo=/storefront/checkout"
            className="w-full bg-gold-600 hover:bg-gold-700 text-white py-3.5 rounded-xl font-sans text-xs tracking-widest uppercase font-bold transition-all text-center">
            Sign In
          </Link>
          <Link href="/auth/register?returnTo=/storefront/checkout"
            className="w-full border border-gray-200 text-flora-brown hover:bg-gray-50 py-3.5 rounded-xl font-sans text-xs tracking-widest uppercase font-bold transition-all text-center">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-12">

      {/* STEP INDICATOR */}
      <div className="flex items-center justify-between max-w-md mx-auto mb-8 px-4 relative select-none">
        <div className="absolute top-4 left-4 right-4 h-[2px] bg-gray-200 z-0" />
        <div
          className="absolute top-4 left-4 h-[2px] bg-gold-600 z-0 transition-all duration-500"
          style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
        />
        {[
          { num: 1, label: 'Details' },
          { num: 2, label: 'Delivery' },
          { num: 3, label: 'Confirm' },
        ].map(step => (
          <button key={step.num}
            onClick={() => { if (step.num < currentStep) setCurrentStep(step.num as 1 | 2 | 3); }}
            className="relative z-10 flex flex-col items-center gap-1 focus:outline-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs font-bold
              ${currentStep > step.num ? 'bg-olive-400 border-olive-400 text-white'
                : currentStep === step.num ? 'bg-white border-gold-600 text-gold-600 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-400'}`}>
              {currentStep > step.num ? '✓' : step.num}
            </div>
            <span className={`text-[10px] font-sans font-bold tracking-wider uppercase
              ${currentStep >= step.num ? 'text-gold-600' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="max-w-xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 text-sm font-sans p-3.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* LEFT: FORMS */}
        <div className="space-y-6">

          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                  <User size={16} className="text-gold-600" />
                  <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-flora-brown">Contact Details</h2>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'customer_name', label: 'Full Name *', type: 'text', auto: 'name', ph: 'Enter full name' },
                    { key: 'customer_email', label: 'Email Address *', type: 'email', auto: 'email', ph: 'Enter email address' },
                    { key: 'customer_phone', label: 'Phone Number *', type: 'tel', auto: 'tel', ph: 'Enter mobile phone number' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-sans font-bold tracking-wide text-gold-600 uppercase mb-1.5">{f.label}</label>
                      <input
                        type={f.type} autoComplete={f.auto} placeholder={f.ph}
                        style={{ fontSize: '16px' }}
                        className="w-full bg-gray-100 border-none rounded-xl px-4 py-3.5 font-sans text-flora-brown placeholder-flora-brown/30 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:bg-white transition-all"
                        value={(formData as any)[f.key]}
                        onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-gold-600" />
                  <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-flora-brown">Order Notes</h2>
                </div>
                <label className="block text-[10px] font-sans font-bold tracking-wide text-gold-600 uppercase mb-1.5">Special Instructions (optional)</label>
                <textarea rows={3}
                  className="w-full bg-gray-100 border-none rounded-xl px-4 py-3.5 font-sans text-base text-flora-brown placeholder-flora-brown/30 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:bg-white transition-all resize-none"
                  style={{ fontSize: '16px' }}
                  placeholder="E.g. Leave at front door, call before delivery..."
                  value={formData.order_note}
                  onChange={e => setFormData(p => ({ ...p, order_note: e.target.value }))}
                />
              </div>

              <button type="button"
                onClick={() => {
                  if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
                    setError('Please fill in all required contact details.'); return;
                  }
                  setError(''); setCurrentStep(2);
                }}
                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-4 rounded-xl font-serif text-lg font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-95">
                Continue to Delivery
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Fulfillment */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-5">
                  <ShoppingBag size={16} className="text-gold-600" />
                  <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-flora-brown">Fulfillment Method</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['Delivery', 'Store Pickup'] as const).map(method => (
                    <button key={method} type="button" onClick={() => setFulfillment(method)}
                      className={`p-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between min-h-[110px]
                        ${fulfillment === method ? 'border-gold-600 bg-gold-50 text-gold-700' : 'border-gray-200 bg-white text-flora-brown/60 hover:border-gold-300'}`}>
                      <div className="text-2xl mb-2">{method === 'Delivery' ? '🚚' : '🏪'}</div>
                      <div>
                        <div className="font-sans text-sm font-bold">{method}</div>
                        <p className="text-[10px] text-flora-brown/40 mt-0.5">
                          {method === 'Delivery' ? 'We deliver to your door' : 'Collect at Colombo store'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map */}
              {fulfillment === 'Delivery' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-gold-600" />
                    <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-flora-brown">Delivery Location</h2>
                  </div>
                  <p className="text-xs font-sans text-flora-brown/60 mb-4">
                    Click on the map to drop a pin. Press "My Location" for GPS auto-fill.
                  </p>

                  {/* Pricing info */}
                  <div className="mb-4">
                    <button type="button" onClick={() => setPricingExpanded(!pricingExpanded)}
                      className="w-full flex items-center justify-between bg-gold-50 border border-gold-200 rounded-xl px-4 py-3">
                      <span className="flex items-center gap-2 text-gold-700 text-sm font-medium">
                        <Info size={14} /> How is delivery charged?
                      </span>
                      <ChevronDown size={16} className={`text-gold-600 transition-transform ${pricingExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {pricingExpanded && (
                      <div className="mt-2 bg-white border border-gold-100 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { val: `LKR ${s.base_delivery_rate}`, label: 'Base Rate' },
                            { val: `${s.base_distance_km} km`, label: 'Free Distance' },
                            { val: `+${s.rate_per_additional_km}`, label: 'Per Extra KM' },
                          ].map(item => (
                            <div key={item.label} className="text-center p-3 bg-olive-50 rounded-xl">
                              <p className="font-serif text-xl text-gold-600 font-semibold">{item.val}</p>
                              <p className="text-[10px] font-sans text-flora-brown/60 mt-1 tracking-wide uppercase">{item.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-sans text-flora-brown/70 leading-relaxed">
                            <strong>Formula:</strong> First {s.base_distance_km} km = LKR {s.base_delivery_rate}.
                            Then LKR {s.rate_per_additional_km} per additional km.
                          </p>
                          {distanceKm > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-sans text-gold-700 font-medium">Your distance: {distanceKm.toFixed(2)} km</p>
                              {distanceKm <= s.base_distance_km ? (
                                <p className="text-xs text-green-600 mt-0.5">✓ Within base → LKR {s.base_delivery_rate}</p>
                              ) : (
                                <p className="text-xs text-flora-brown/70 mt-0.5">
                                  LKR {s.base_delivery_rate} + ({distanceKm.toFixed(2)} - {s.base_distance_km}) × {s.rate_per_additional_km} =
                                  <strong className="text-gold-600 ml-1">LKR {deliveryCharge.toLocaleString()}</strong>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* *** MAP - pin prop passed so marker re-renders on GPS *** */}
                  <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-gray-200 mb-4">
                    <DeliveryMap
                      hqLat={s.hq_lat}
                      hqLng={s.hq_lng}
                      onPinDrop={handlePinDrop}
                      pin={pin}
                    />
                  </div>

                  {/* Live delivery charge */}
                  {pin && (
                    <div className="mb-4 bg-olive-50 border border-olive-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-olive-200 rounded-full flex items-center justify-center">🚚</div>
                        <div>
                          <p className="text-xs font-sans font-medium text-flora-brown">Delivery to your location</p>
                          <p className="text-[10px] text-flora-brown/50">{distanceKm.toFixed(2)} km from store</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-lg text-gold-600 font-semibold tabular-nums">LKR {deliveryCharge.toLocaleString()}</p>
                        <p className="text-[10px] text-flora-brown/40">Delivery charge</p>
                      </div>
                    </div>
                  )}

                  {geocoding && <p className="text-xs font-sans text-gold-600 animate-pulse mb-3">📍 Fetching address...</p>}

                  {pin && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-sans font-bold tracking-wide text-gold-600 uppercase mb-1.5">Delivery Street Address</label>
                        <input style={{ fontSize: '16px' }}
                          className="w-full bg-gray-100 border-none rounded-xl px-4 py-3.5 font-sans text-flora-brown placeholder-flora-brown/30 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:bg-white transition-all"
                          value={address.street} placeholder="E.g. House No, Street name"
                          onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-sans font-bold tracking-wide text-gold-600 uppercase mb-1.5">City</label>
                          <input style={{ fontSize: '16px' }}
                            className="w-full bg-gray-100 border-none rounded-xl px-4 py-3.5 font-sans text-flora-brown focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:bg-white transition-all"
                            value={address.city} placeholder="Colombo"
                            onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans font-bold tracking-wide text-gold-600 uppercase mb-1.5">Postcode</label>
                          <input style={{ fontSize: '16px' }}
                            className="w-full bg-gray-100 border-none rounded-xl px-4 py-3.5 font-sans text-flora-brown focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:bg-white transition-all"
                            value={address.postcode} placeholder="00300"
                            onChange={e => setAddress(p => ({ ...p, postcode: e.target.value }))} />
                        </div>
                      </div>
                      <div className="text-xs font-sans text-flora-brown/60 bg-olive-50 border border-olive-200 p-3 rounded-xl">
                        📏 Distance from store: <strong>{distanceKm.toFixed(2)} km</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button type="button" onClick={() => setCurrentStep(1)}
                  className="flex-1 border border-gray-200 text-flora-brown/70 bg-white py-4 rounded-xl font-serif text-lg font-bold transition-all hover:bg-gray-50 active:scale-95">
                  Back
                </button>
                <button type="button"
                  onClick={() => {
                    if (fulfillment === 'Delivery' && !pin) {
                      setError('Please drop a pin on the map to set your delivery location.'); return;
                    }
                    setError(''); setCurrentStep(3);
                  }}
                  className="flex-1 bg-gold-600 hover:bg-gold-700 text-white py-4 rounded-xl font-serif text-lg font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-95">
                  Continue to Confirm
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Confirm overview */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <h2 className="font-serif text-2xl text-flora-brown mb-4">Confirm Order</h2>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Customer Name', value: formData.customer_name },
                    { label: 'Phone Number', value: formData.customer_phone },
                    { label: 'Fulfillment', value: fulfillment, gold: true },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-flora-brown/50">{row.label}</span>
                      <span className={`font-semibold ${(row as any).gold ? 'text-gold-600' : ''}`}>{row.value}</span>
                    </div>
                  ))}
                  {fulfillment === 'Delivery' && (
                    <div className="border-b border-gray-100 pb-2">
                      <span className="text-flora-brown/50 block mb-1">Delivery Address</span>
                      <span className="text-xs text-flora-brown/80 leading-relaxed block">
                        {displayAddress || `${address.street}, ${address.city} ${address.postcode}`}
                      </span>
                    </div>
                  )}
                  {formData.order_note && (
                    <div>
                      <span className="text-flora-brown/50 block mb-1">Notes</span>
                      <span className="text-xs text-flora-brown/70 italic">"{formData.order_note}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <h2 className="font-serif text-xl text-flora-brown mb-4">Payment Method</h2>
                <div className="space-y-3">
                  {s.online_payment_enabled !== false && (
                    <button type="button" onClick={() => { setPaymentMethod('PayHere'); setShowPayHere(false); }}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all
                        ${paymentMethod === 'PayHere' ? 'border-gold-600 bg-gold-50' : 'border-gray-200 hover:border-gold-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gold-50 rounded-xl flex items-center justify-center">
                            <CreditCard size={22} className="text-gold-600" />
                          </div>
                          <div>
                            <p className={`font-sans text-sm font-semibold ${paymentMethod === 'PayHere' ? 'text-gold-700' : 'text-flora-brown'}`}>Online Payment</p>
                            <p className="text-xs text-flora-brown/50 mt-0.5">Secure payment via PayHere</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                          ${paymentMethod === 'PayHere' ? 'border-gold-600 bg-gold-600' : 'border-gray-300'}`}>
                          {paymentMethod === 'PayHere' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </div>
                      {paymentMethod === 'PayHere' && (
                        <div className="mt-3 pt-3 border-t border-gold-100">
                          <div className="flex gap-2 flex-wrap mb-2">
                            {[
                              { label: 'VISA', cls: 'bg-blue-50 text-blue-600' },
                              { label: 'MC', cls: 'bg-red-50 text-red-600' },
                              { label: 'AMEX', cls: 'bg-blue-50 text-blue-700' },
                              { label: 'eZ Cash', cls: 'bg-green-50 text-green-600' },
                              { label: 'mCash', cls: 'bg-orange-50 text-orange-600' },
                              { label: 'FriMi', cls: 'bg-purple-50 text-purple-600' },
                            ].map(m => (
                              <span key={m.label} className={`text-[9px] font-sans font-semibold px-2 py-1 rounded-md ${m.cls}`}>{m.label}</span>
                            ))}
                          </div>
                          {process.env.NEXT_PUBLIC_PAYHERE_SANDBOX !== 'false' && (
                            <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                              <AlertCircle size={12} className="text-amber-500 shrink-0" />
                              <p className="text-[10px] font-sans text-amber-700">
                                Test: Card 4916217501611292, any future date, any CVV
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )}

                  {s.cash_on_delivery_enabled !== false && (
                    <button type="button" onClick={() => { setPaymentMethod('Cash'); setShowPayHere(false); }}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all
                        ${paymentMethod === 'Cash' ? 'border-gold-600 bg-gold-50' : 'border-gray-200 hover:border-gold-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl">💵</div>
                          <div>
                            <p className={`font-sans text-sm font-semibold ${paymentMethod === 'Cash' ? 'text-gold-700' : 'text-flora-brown'}`}>Cash on Delivery</p>
                            <p className="text-xs text-flora-brown/50 mt-0.5">Pay when your order arrives</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                          ${paymentMethod === 'Cash' ? 'border-gold-600 bg-gold-600' : 'border-gray-300'}`}>
                          {paymentMethod === 'Cash' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setCurrentStep(2); setShowPayHere(false); }} disabled={submitting}
                    className="flex-1 border border-gray-200 text-flora-brown/70 bg-white py-4 rounded-xl font-serif text-lg font-bold transition-all hover:bg-gray-50 active:scale-95 h-14 flex items-center justify-center">
                    Back
                  </button>
                  {!showPayHere && (
                    <button type="button" onClick={handleSubmit} disabled={submitting}
                      className="flex-[2] bg-gold-600 hover:bg-gold-700 text-white py-4 rounded-xl font-serif text-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 h-14">
                      {submitting ? (
                        <><Loader2 size={18} className="animate-spin" />{paymentMethod === 'PayHere' ? 'Creating...' : 'Placing...'}</>
                      ) : paymentMethod === 'PayHere' ? (
                        <><CreditCard size={18} />Pay — LKR {total.toLocaleString()}</>
                      ) : (
                        <>💵 Place Order — LKR {total.toLocaleString()}</>
                      )}
                    </button>
                  )}
                </div>

                {showPayHere && createdOrderId && (
                  <PayHereButton
                    orderId={createdOrderId} amount={total}
                    customerName={formData.customer_name}
                    customerEmail={formData.customer_email}
                    customerPhone={formData.customer_phone}
                    onSuccess={() => { dispatch({ type: 'CLEAR_CART' }); router.push(`/storefront/order-confirmation?orderId=${createdOrderId}&paid=true`); }}
                    onError={(err) => { setError(`Payment failed: ${err}. Order saved.`); setShowPayHere(false); }}
                  />
                )}

                <div className="flex items-center justify-center gap-4 text-flora-brown/30">
                  <span className="flex items-center gap-1 text-[10px] font-sans"><Shield size={12} />Secure</span>
                  <span className="text-[10px]">·</span>
                  <span className="flex items-center gap-1 text-[10px] font-sans"><Lock size={12} />256-bit SSL</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="relative">
          <button type="button" onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="lg:hidden w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm mb-4">
            <span className="font-serif text-lg text-flora-brown">Order Summary ({state.items.length})</span>
            <div className="flex items-center gap-2">
              <span className="font-serif text-gold-600 font-bold text-lg">LKR {total.toLocaleString()}</span>
              {summaryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          <div className={`${summaryExpanded ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-2xl p-6 lg:sticky lg:top-24 shadow-sm border border-gray-200">
              <h2 className="font-serif text-2xl text-flora-brown mb-5 hidden lg:block">Order Summary</h2>

              <div className="space-y-3.5 max-h-64 overflow-y-auto mb-5 pr-1">
                {state.items.map(item => (
                  <div key={item.product.id} className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-olive-50 flex-shrink-0 border border-gray-200">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🌸</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-semibold text-flora-brown truncate">{item.product.name}</p>
                      <p className="text-[10px] text-flora-brown/40 font-sans uppercase tracking-wider">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-serif text-base font-semibold text-gold-600 tabular-nums shrink-0">
                      LKR {(item.quantity * item.product.price).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm font-sans text-flora-brown/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">LKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-sans">
                  <span className="text-flora-brown/70">
                    {fulfillment === 'Delivery'
                      ? distanceKm > 0
                        ? <span className="flex items-center gap-1.5">🚚 Delivery
                          <span className="text-xs bg-olive-100 text-olive-700 px-2 py-0.5 rounded-full">{distanceKm.toFixed(1)} km</span>
                        </span>
                        : '🚚 Delivery (drop a pin)'
                      : '🏪 Store Pickup'}
                  </span>
                  <span className="tabular-nums font-medium">
                    {fulfillment === 'Delivery'
                      ? deliveryCharge > 0
                        ? <span className="text-gold-600">LKR {deliveryCharge.toLocaleString()}</span>
                        : <span className="text-gray-400 text-xs">Set location</span>
                      : <span className="text-green-600">FREE</span>}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                <span className="font-serif text-xl text-flora-brown">Total</span>
                <span className="font-serif text-2xl font-bold text-gold-600 tabular-nums">LKR {total.toLocaleString()}</span>
              </div>

              {/* Desktop CTA */}
              <div className="hidden lg:block mt-6 space-y-3">
                {currentStep < 3 ? (
                  <button type="button"
                    onClick={() => {
                      if (currentStep === 1) {
                        if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
                          setError('Please fill in all required contact details.'); return;
                        }
                        setError(''); setCurrentStep(2);
                      } else {
                        if (fulfillment === 'Delivery' && !pin) {
                          setError('Please drop a pin on the map.'); return;
                        }
                        setError(''); setCurrentStep(3);
                      }
                    }}
                    className="w-full bg-gold-600 hover:bg-gold-700 text-white py-4 rounded-xl font-serif text-lg font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-95">
                    {currentStep === 1 ? 'Continue to Delivery' : 'Continue to Confirm'}
                  </button>
                ) : showPayHere && createdOrderId ? (
                  <PayHereButton
                    orderId={createdOrderId} amount={total}
                    customerName={formData.customer_name}
                    customerEmail={formData.customer_email}
                    customerPhone={formData.customer_phone}
                    onSuccess={() => { dispatch({ type: 'CLEAR_CART' }); router.push(`/storefront/order-confirmation?orderId=${createdOrderId}&paid=true`); }}
                    onError={(err) => { setError(`Payment failed: ${err}`); setShowPayHere(false); }}
                  />
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full bg-gold-600 hover:bg-gold-700 text-white py-4 rounded-xl font-serif text-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" />{paymentMethod === 'PayHere' ? 'Creating...' : 'Placing...'}</>
                    ) : paymentMethod === 'PayHere' ? (
                      <><CreditCard size={18} />Continue to Pay</>
                    ) : <>💵 Place Order</>}
                  </button>
                )}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-flora-brown/30 font-sans uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-olive-400" /> Secure checkout
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 lg:hidden shadow-lg"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center gap-4 max-w-7xl mx-auto">
          <div>
            <span className="text-[9px] font-sans text-flora-brown/40 uppercase tracking-widest block font-bold">Total</span>
            <span className="font-serif text-xl text-gold-600 font-bold tabular-nums">LKR {total.toLocaleString()}</span>
          </div>
          {currentStep === 1 && (
            <button onClick={() => {
              if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) { setError('Fill in all required fields.'); return; }
              setError(''); setCurrentStep(2);
            }} className="bg-gold-600 text-white h-12 px-6 rounded-xl text-sm font-bold font-sans uppercase tracking-wider">
              Continue
            </button>
          )}
          {currentStep === 2 && (
            <button onClick={() => {
              if (fulfillment === 'Delivery' && !pin) { setError('Please set delivery location.'); return; }
              setError(''); setCurrentStep(3);
            }} className="bg-gold-600 text-white h-12 px-6 rounded-xl text-sm font-bold font-sans uppercase tracking-wider">
              Continue
            </button>
          )}
          {currentStep === 3 && (
            showPayHere && createdOrderId ? (
              <PayHereButton
                orderId={createdOrderId} amount={total}
                customerName={formData.customer_name}
                customerEmail={formData.customer_email}
                customerPhone={formData.customer_phone}
                onSuccess={() => { dispatch({ type: 'CLEAR_CART' }); router.push(`/storefront/order-confirmation?orderId=${createdOrderId}&paid=true`); }}
                onError={(err) => { setError(`Payment failed: ${err}`); setShowPayHere(false); }}
              />
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="bg-gold-600 text-white h-12 px-6 rounded-xl text-sm font-bold font-sans uppercase tracking-wider disabled:opacity-50">
                {submitting ? 'Processing...' : paymentMethod === 'PayHere' ? 'Pay Now' : 'Place Order'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}