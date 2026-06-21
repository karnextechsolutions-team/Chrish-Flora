'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Bell, X, ExternalLink, Calendar, ShoppingBag } from 'lucide-react';
import type { Order } from '@/types';

export default function NewOrderNotification() {
  const [notifications, setNotifications] = useState<Order[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Note 1: G5
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.value = 783.99; // G5
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.15);
      
      // Note 2: C6 (delayed)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1046.50; // C6
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 120);
    } catch (e) {
      console.warn('AudioContext chime failed (needs user interaction first):', e);
    }
  };

  useEffect(() => {
    // Subscribe to new order inserts
    const channel = supabase
      .channel('admin-new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        
        // Add to notifications queue
        setNotifications((prev) => [newOrder, ...prev]);
        
        // Play success chime
        playSuccessChime();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleViewOrder = (id: string) => {
    dismissNotification(id);
    router.push('/admin/orders');
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {notifications.map((order) => (
        <div
          key={order.id}
          className="bg-white/95 backdrop-blur border border-gold-200 shadow-2xl rounded-2xl p-4 pointer-events-auto animate-slide-in flex flex-col gap-3 relative transition-all"
        >
          {/* Close button */}
          <button
            onClick={() => dismissNotification(order.id)}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 relative shrink-0">
              <Bell size={16} className="animate-swing" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-ping" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-sm font-bold text-flora-brown">New Order Received!</p>
              <p className="font-mono text-[10px] text-gold-600 font-semibold uppercase mt-0.5">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Body details */}
          <div className="text-xs font-sans text-gray-600 border-t border-b border-gray-100 py-2.5 space-y-1">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-semibold text-gray-800">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Fulfillment:</span>
              <span className="font-semibold text-gray-800">{order.fulfillment_method}</span>
            </div>
            {order.requested_delivery_date && (
              <div className="flex justify-between items-center text-gold-700">
                <span className="flex items-center gap-1"><Calendar size={11} /> Requested:</span>
                <span className="font-bold">
                  {order.requested_delivery_date} {order.requested_delivery_time ? `@ ${order.requested_delivery_time.split(' - ')[0]}` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span>Total Amount:</span>
              <div className="flex items-baseline gap-0.5 font-sans">
                <span className="text-[9px] text-gold-600/70">LKR</span>
                <span className="price-small text-gold-600 text-sm">
                  {order.total.toLocaleString('en-LK')}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleViewOrder(order.id)}
              className="flex-1 bg-gold-600 hover:bg-gold-700 text-white font-sans text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ShoppingBag size={13} />
              View Orders
            </button>
            <button
              onClick={() => dismissNotification(order.id)}
              className="px-3 border border-gray-200 text-gray-500 hover:text-gray-700 font-sans text-xs font-semibold py-2 rounded-xl hover:bg-gray-50 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
