'use client';
// components/admin/AdminDashboardClient.tsx
import Link from 'next/link';
import { Package, ShoppingBag, Clock, CheckCircle } from 'lucide-react';
import type { Order, Product } from '@/types';
import OrderStatusBadge from './OrderStatusBadge';

interface Props {
  totalOrders: number;
  pendingOrders: number;
  recentOrders: Order[];
  lowStockProducts: Pick<Product, 'id' | 'name' | 'quantity' | 'price'>[];
}

export default function AdminDashboardClient({ totalOrders, pendingOrders, recentOrders, lowStockProducts }: Props) {
  const stats = [
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Delivered', value: recentOrders.filter(o => o.status === 'Delivered').length, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Low Stock Items', value: lowStockProducts.filter(p => p.quantity < 5).length, icon: Package, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-flora-brown">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-3xl font-serif text-flora-brown">{stat.value}</p>
            <p className="text-sm font-sans text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-serif text-xl text-flora-brown">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-gold-600 font-sans hover:underline">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.slice(0, 6).map(order => (
              <div key={order.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                <div className="flex justify-between items-start lg:items-center lg:flex-1 lg:gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-medium text-flora-brown truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 font-sans">
                      {new Date(order.created_at).toLocaleDateString('en-LK')}
                    </p>
                  </div>
                  <div className="lg:hidden shrink-0">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <div className="flex justify-between lg:justify-end items-center lg:gap-4">
                  <div className="hidden lg:block">
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-baseline gap-0.5 ml-auto">
                    <span className="font-sans text-xs text-gold-600/70">LKR</span>
                    <span className="price-small text-gold-600">
                      {order.total.toLocaleString('en-LK')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400 font-sans">No orders yet.</p>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-serif text-xl text-flora-brown">Low Stock Alert</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {lowStockProducts.map(product => (
              <div key={product.id} className="px-6 py-4">
                <p className="font-sans text-sm font-medium text-flora-brown truncate">{product.name}</p>
                <p className={`text-xs font-sans mt-1 ${product.quantity === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {product.quantity === 0 ? 'OUT OF STOCK' : `${product.quantity} units left`}
                </p>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400 font-sans">All products well stocked.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
