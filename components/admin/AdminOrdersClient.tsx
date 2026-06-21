'use client';
// components/admin/AdminOrdersClient.tsx
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, MapPin, Phone, Mail, User, FileText, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderStatus } from '@/types';
import OrderStatusBadge from './OrderStatusBadge';
import { formatPhoneForWhatsApp } from '@/lib/whatsapp';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'
];

interface Props { initialOrders: Order[] }

export default function AdminOrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Refetch orders
        supabase
          .from('orders')
          .select('*, order_items(*, product:products(*))')
          .order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setOrders(data); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-flora-brown">Orders</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-gray-400 mr-2">Filter:</span>
          {(['All', ...ORDER_STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-sans border transition-colors
                ${filter === s ? 'bg-gold-600 text-white border-gold-600' : 'border-gray-200 text-gray-600 hover:border-gold-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Order</th>
              <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Customer</th>
              <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Method</th>
              <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Status</th>
              <th className="text-right px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Total</th>
              <th className="text-left px-6 py-3 text-xs tracking-widest uppercase text-gray-400 font-medium">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(order => (
              <tr
                key={order.id}
                className="hover:bg-gold-50/30 cursor-pointer transition-colors"
                onClick={() => setSelected(order)}
              >
                <td className="px-6 py-4">
                  <p className="text-xs text-gray-400">{order.id.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-LK')}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-flora-brown">{order.customer_name}</p>
                  <p className="text-xs text-gray-400">{order.customer_phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs">{order.fulfillment_method === 'Delivery' ? '🚚' : '🏪'} {order.fulfillment_method}</span>
                </td>
                <td className="px-6 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right tabular font-medium">
                  LKR {order.total.toLocaleString()}
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="text-xs border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:border-gold-500"
                    >
                      {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {order.customer_phone && order.customer_phone !== 'N/A' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const message = `🌸 *Chrish Flora* - Order Update\n\nDear ${order.customer_name},\n\nYour order *${order.id.slice(0,8).toUpperCase()}* status: *${order.status}*\n\nTotal: LKR ${order.total.toLocaleString()}\n\nThank you! 🌸`;
                          const phone = formatPhoneForWhatsApp(order.customer_phone);
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="p-1.5 text-[#25D366] hover:bg-green-50 rounded-lg transition-colors shrink-0"
                        title="WhatsApp Customer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-4">
        {filtered.map(order => (
          <div
            key={order.id}
            onClick={() => setSelected(order)}
            className="bg-white border border-gray-100 p-4 shadow-sm space-y-3 cursor-pointer"
          >
            {/* Top: Customer name + date */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-sans text-sm font-semibold text-flora-brown">{order.customer_name}</h3>
                <p className="text-xs text-gray-400 font-sans">{new Date(order.created_at).toLocaleDateString('en-LK')}</p>
              </div>
              <span className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
            </div>

            {/* Middle: Status badge + fulfillment method */}
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs font-sans text-gray-500">
                {order.fulfillment_method === 'Delivery' ? '🚚' : '🏪'} {order.fulfillment_method}
              </span>
            </div>

            {/* Bottom: Total + status dropdown */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50" onClick={e => e.stopPropagation()}>
              <span className="font-sans text-sm font-semibold text-gold-700">
                LKR {order.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                {order.customer_phone && order.customer_phone !== 'N/A' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const message = `🌸 *Chrish Flora* - Order Update\n\nDear ${order.customer_name},\n\nYour order *${order.id.slice(0,8).toUpperCase()}* status: *${order.status}*\n\nTotal: LKR ${order.total.toLocaleString()}\n\nThank you! 🌸`;
                      const phone = formatPhoneForWhatsApp(order.customer_phone);
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="p-2 text-[#25D366] hover:bg-green-50 border border-gray-100 bg-white rounded-lg transition-colors shrink-0"
                    title="WhatsApp Customer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </button>
                )}
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                  className="text-xs border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:border-gold-500 h-10 rounded"
                >
                  {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-10 text-gray-400 font-sans">No orders found.</p>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="bg-flora-brown text-flora-cream px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <p className="font-sans text-xs text-flora-cream/50">Order ID</p>
                <p className="font-serif text-xl">{selected.id.slice(0, 16)}...</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-flora-cream/70 hover:text-flora-cream">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-touch">
              {/* Status */}
              <div className="flex items-center justify-between">
                <OrderStatusBadge status={selected.status} />
                <p className="text-xs text-gray-400 font-sans">
                  {new Date(selected.created_at).toLocaleString('en-LK')}
                </p>
              </div>

              {/* Customer Narrative */}
              <section>
                <h3 className="font-sans text-xs tracking-widest uppercase text-gold-600 mb-3">Customer</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-flora-brown">{selected.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-400 flex-shrink-0" />
                    <span>{selected.customer_email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm w-full">
                    <Phone size={16} className="text-gray-400 flex-shrink-0" />
                    <span>{selected.customer_phone}</span>
                    {selected.customer_phone && selected.customer_phone !== 'N/A' && (
                      <button
                        onClick={() => {
                          const msg = `🌸 Hello ${selected.customer_name}! Your Chrish Flora order (${selected.id.slice(0,8).toUpperCase()}) is *${selected.status}*. Total: LKR ${selected.total.toLocaleString()}. Thank you! 🌸`;
                          window.open(`https://wa.me/${formatPhoneForWhatsApp(selected.customer_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="ml-auto flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-sans px-3 py-1.5 rounded-full hover:bg-[#1DA855] transition-colors shrink-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Logistics */}
              <section>
                <h3 className="font-sans text-xs tracking-widest uppercase text-gold-600 mb-3">Logistics</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-gray-400 flex-shrink-0" />
                    <span>{selected.fulfillment_method}</span>
                  </div>
                  {selected.delivery_address && (
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{selected.delivery_address}</span>
                    </div>
                  )}
                  {selected.delivery_distance_km && (
                    <p className="text-xs text-gray-400 ml-7">
                      Distance: {selected.delivery_distance_km.toFixed(2)} km
                    </p>
                  )}
                  {selected.order_note && (
                    <div className="flex items-start gap-3 mt-1">
                      <FileText size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 italic">"{selected.order_note}"</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Items — Visual Fulfillment Checklist */}
              <section>
                <h3 className="font-sans text-xs tracking-widest uppercase text-gold-600 mb-3">
                  Items (Visual Checklist)
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-xs text-gray-400 font-sans font-medium">Product</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-400 font-sans font-medium">SKU</th>
                      <th className="text-center px-3 py-2 text-xs text-gray-400 font-sans font-medium">Qty</th>
                      <th className="text-right px-3 py-2 text-xs text-gray-400 font-sans font-medium">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(selected.order_items || []).map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-olive-100 flex-shrink-0 overflow-hidden">
                              {item.product?.image_url ? (
                                <Image src={item.product.image_url} alt={item.product?.name} width={48} height={48} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">🌸</div>
                              )}
                            </div>
                            <span className="font-medium text-flora-brown">{item.product?.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gold-600 font-sans">{item.product?.sku}</td>
                        <td className="px-3 py-3 text-center tabular">{item.quantity}</td>
                        <td className="px-3 py-3 text-right tabular">LKR {item.unit_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Financial Summary */}
              <section className="border-t border-gray-100 pt-4">
                <h3 className="font-sans text-xs tracking-widest uppercase text-gold-600 mb-3">Financial Summary</h3>
                <div className="space-y-1 text-sm font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Asset Value (Subtotal)</span>
                    <span className="tabular">LKR {selected.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery Charge</span>
                    <span className="tabular">LKR {selected.delivery_charge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-medium text-flora-brown">
                    <span>Grand Total</span>
                    <span className="tabular font-serif text-xl text-gold-700">
                      LKR {selected.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </section>

            </div>

            {/* Update Status (Sticky Footer) */}
            <div className="bg-white p-4 md:p-6 border-t border-gray-100 flex gap-3 shrink-0 pb-safe">
              <select
                value={selected.status}
                onChange={e => handleStatusChange(selected.id, e.target.value as OrderStatus)}
                className="flex-1 border border-gray-200 px-4 py-3 text-sm font-sans bg-white focus:outline-none focus:border-gold-500 h-12"
              >
                {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={() => setSelected(null)}
                className="btn-gold px-6 py-3 h-12 flex items-center justify-center font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
