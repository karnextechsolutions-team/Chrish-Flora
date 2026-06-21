// app/storefront/account/orders/[id]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, MapPin, Package, 
  CreditCard, Clock, CheckCircle,
  MessageCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Status step config
const STATUS_STEPS = [
  'Pending',
  'Confirmed', 
  'Processing',
  'Out for Delivery',
  'Delivered',
] as const;

const STATUS_COLORS: Record<string, string> = {
  Pending:          'bg-yellow-100 text-yellow-700 border-yellow-200',
  Confirmed:        'bg-blue-100 text-blue-700 border-blue-200',
  Processing:       'bg-purple-100 text-purple-700 border-purple-200',
  'Out for Delivery':'bg-orange-100 text-orange-700 border-orange-200',
  Delivered:        'bg-green-100 text-green-700 border-green-200',
  Cancelled:        'bg-red-100 text-red-700 border-red-200',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15: await params
  const { id } = await params;
  
  const supabase = await createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?returnTo=/storefront/account/orders');

  // Fetch order with items
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        quantity,
        unit_price,
        product:products (
          id,
          name,
          sku,
          image_url
        ),
        order_item_addons (
          id,
          addon_name,
          addon_price
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  // Redirect if not found or not authorized
  if (error || !order) {
    redirect('/storefront/account/orders');
  }

  const items = order.order_items || [];
  const isCancelled = order.status === 'Cancelled';
  const currentStepIndex = STATUS_STEPS.indexOf(
    order.status as any
  );

  // WhatsApp message
  const waMessage = encodeURIComponent(
    `Hi Chrish Flora! I need help with my order #${order.id.slice(0,8).toUpperCase()}`
  );

  // Default store phone from seed data
  const storePhone = '94112345678';

  return (
    <div className="space-y-6">
      
      {/* Back */}
      <Link href="/storefront/account/orders"
        className="inline-flex items-center gap-2 
          text-gold-600 hover:text-gold-700 
          font-sans text-sm font-medium transition-colors">
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-sans text-xs text-gold-600 
              tracking-widest uppercase font-bold mb-1">
              Order
            </p>
            <h1 className="font-serif text-3xl text-flora-brown">
              #{order.id.slice(0,8).toUpperCase()}
            </h1>
            <p className="font-sans text-sm text-flora-brown/50 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-LK', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className={`inline-flex items-center px-4 py-2 
            rounded-full text-sm font-sans font-semibold border
            ${STATUS_COLORS[order.status] || STATUS_COLORS.Pending}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Order Timeline */}
      {!isCancelled ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-serif text-xl text-flora-brown mb-6">
            Order Progress
          </h2>
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-4 left-0 right-0 h-[2px] bg-gray-100 z-0" />
            {/* Progress line */}
            <div 
              className="absolute top-4 left-0 h-[2px] bg-gold-600 z-0 transition-all duration-500"
              style={{ 
                width: currentStepIndex < 0 ? '0%' 
                  : `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` 
              }}
            />
            
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = currentStepIndex > index;
              const isCurrent = currentStepIndex === index;
              return (
                <div key={step} 
                  className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full border-2 
                    flex items-center justify-center transition-all
                    ${isCompleted 
                      ? 'bg-gold-600 border-gold-600' 
                      : isCurrent
                        ? 'bg-white border-gold-600'
                        : 'bg-white border-gray-200'}`}>
                    {isCompleted ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : isCurrent ? (
                      <div className="w-3 h-3 rounded-full bg-gold-600 animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-200" />
                    )}
                  </div>
                  <span className={`text-[9px] font-sans font-bold 
                    tracking-wide uppercase text-center max-w-[60px]
                    ${isCompleted || isCurrent 
                      ? 'text-gold-600' 
                      : 'text-gray-300'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 
          flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full 
            flex items-center justify-center flex-shrink-0">
            ❌
          </div>
          <div>
            <p className="font-sans text-sm font-bold text-red-700">
              Order Cancelled
            </p>
            <p className="font-sans text-xs text-red-500 mt-0.5">
              This order has been cancelled.
              Contact us if you have questions.
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl text-flora-brown">
            Items Ordered
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4 items-center">
              {/* Product image */}
              <div className="w-[72px] h-[72px] flex-shrink-0 rounded-xl overflow-hidden bg-olive-50">
                {item.product?.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={item.product?.name || 'Product'}
                    width={72} height={72}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center 
                    justify-center text-2xl">🌸</div>
                )}
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg text-flora-brown 
                  font-medium leading-tight">
                  {item.product?.name || 'Product'}
                </p>
                <p className="font-sans text-xs text-gold-600 
                  tracking-widest uppercase mt-0.5">
                  {item.product?.sku || ''}
                </p>
                <p className="font-sans text-xs text-flora-brown/50 mt-1 flex items-baseline gap-1">
                  Qty: {item.quantity} × <span className="text-[10px] text-gold-600/70">LKR</span> 
                  <span className="font-sans font-bold tabular-nums text-gold-600">
                    {item.unit_price.toLocaleString('en-LK')}
                  </span>
                </p>

                {/* Addons for this item */}
                {item.order_item_addons?.map((oa: any) => (
                  <div key={oa.id} 
                    className="flex items-center gap-2 ml-4 mt-1">
                    <span className="text-[10px] text-flora-brown/40">└</span>
                    <span className="text-[10px] font-sans text-flora-brown/60">
                      {oa.addon_name}
                    </span>
                    <span className="text-[10px] font-sans text-gold-600 
                      tabular-nums">
                      +LKR {Number(oa.addon_price).toLocaleString('en-LK')}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Line total */}
              <div className="text-right flex-shrink-0">
                <p className="flex items-baseline justify-end gap-1">
                  <span className="font-sans text-xs text-gold-600/70">LKR</span>
                  <span className="font-sans font-bold tabular-nums text-gold-600">
                    {(item.quantity * (item.unit_price + (item.order_item_addons?.reduce((s: number, a: any) => s + Number(a.addon_price), 0) || 0))).toLocaleString('en-LK')}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Info */}
      {order.fulfillment_method === 'Delivery' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-gold-600" />
            <h2 className="font-serif text-xl text-flora-brown">
              Delivery Details
            </h2>
          </div>
          <p className="font-sans text-sm text-flora-brown/70 leading-relaxed">
            {order.delivery_address || 'Address not specified'}
          </p>
          {order.delivery_distance_km && (
            <div className="mt-3 inline-flex items-center gap-1.5
              bg-olive-50 border border-olive-200 
              px-3 py-1.5 rounded-full">
              <span className="text-xs font-sans text-olive-700 font-medium">
                📏 {Number(order.delivery_distance_km).toFixed(1)} km from store
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} className="text-gold-600" />
          <h2 className="font-serif text-xl text-flora-brown">
            Payment Summary
          </h2>
        </div>
        
        <div className="space-y-2 text-sm font-sans">
          <div className="flex justify-between text-flora-brown/60">
            <span>Subtotal</span>
            <span className="flex items-baseline gap-1">
              <span className="font-sans text-xs text-gold-600/70">LKR</span>
              <span className="font-sans font-bold tabular-nums text-flora-brown">
                {Number(order.subtotal).toLocaleString('en-LK')}
              </span>
            </span>
          </div>
          <div className="flex justify-between text-flora-brown/60">
            <span>Delivery Charge</span>
            <span className="flex items-baseline gap-1">
              {order.delivery_charge > 0 ? (
                <>
                  <span className="font-sans text-xs text-gold-600/70">LKR</span>
                  <span className="font-sans font-bold tabular-nums text-flora-brown">
                    {Number(order.delivery_charge).toLocaleString('en-LK')}
                  </span>
                </>
              ) : (
                <span className="font-sans font-semibold text-green-600 uppercase text-xs">FREE</span>
              )}
            </span>
          </div>
          <div className="flex justify-between pt-3 mt-1 
            border-t border-gray-100">
            <span className="font-semibold text-flora-brown text-base">
              Total
            </span>
            <span className="price-display text-2xl text-gold-600 font-bold">
              LKR {Number(order.total).toLocaleString('en-LK')}
            </span>
          </div>
        </div>

        {/* Payment method badge */}
        <div className="mt-4 flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-full text-xs font-sans font-semibold
            ${order.payment_method === 'PayHere'
              ? 'bg-gold-50 text-gold-700 border border-gold-200'
              : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {order.payment_method === 'PayHere' ? '💳' : '💵'}
            {order.payment_method || 'Cash'}
          </span>
          
          {order.payment_status === 'paid' ? (
            <span className="inline-flex items-center gap-1 
              text-xs font-sans text-green-600 font-medium">
              <CheckCircle size={12} />
              Payment Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 
              text-xs font-sans text-amber-600 font-medium">
              <Clock size={12} />
              Payment Pending
            </span>
          )}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-olive-50 border border-olive-100 
        rounded-2xl p-5">
        <p className="font-serif text-lg text-flora-brown mb-1">
          Need help with this order?
        </p>
        <p className="font-sans text-sm text-flora-brown/60 mb-4">
          Our team is ready to assist you.
        </p>
        <div className="flex gap-3">
          <a
            href={`https://wa.me/${storePhone}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] 
              hover:bg-[#1DA855] text-white font-sans text-sm 
              font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <a href={`tel:+${storePhone}`}
            className="flex items-center gap-2 border border-gray-200 
              text-flora-brown font-sans text-sm font-medium 
              px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            📞 Call Us
          </a>
        </div>
      </div>
      
    </div>
  );
}
